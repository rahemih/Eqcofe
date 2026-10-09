import { createHash } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
  extractCustomerSessionCookieHeader,
} from "../../platform/auth/session-cookie.server.js";
import {
  IRAN_CITIES_1404,
  IRAN_PROVINCES_1404,
  isIranProvinceCityPair1404,
} from "../../../../../shared/reference/iran-geography-1404.js";
import type {
  WholesaleApplication,
  WholesaleApplicationBody,
  WholesaleCustomerType,
  WholesaleLatestApplication,
  WholesaleProfile,
  WholesaleSessionResponse,
} from "./wholesale-contract.js";

export type WholesaleApplicationOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type WholesaleAccountSnapshot =
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] }
  | {
      status: "ready";
      customerType: WholesaleCustomerType;
      application: WholesaleApplication | null;
      setCookies: readonly string[];
    };

export type WholesaleApplicationPageData =
  | Exclude<WholesaleAccountSnapshot, { status: "ready" }>
  | {
      status: "ready";
      customerType: WholesaleCustomerType;
      application: WholesaleApplication | null;
      canApply: boolean;
      provinces: readonly { id: string; name: string }[];
      cities: readonly { id: string; provinceId: string; name: string }[];
      referenceYear: 1404;
      setCookies: readonly string[];
    };

export type WholesaleSubmitResult =
  | {
      ok: true;
      redirectTo: "/account/wholesale";
      outcome: "submitted" | "existing_application" | "already_wholesale";
      setCookies: readonly string[];
    }
  | {
      ok: false;
      statusCode: 401 | 409 | 422 | 503;
      message: string;
      setCookies: readonly string[];
    };

export async function loadWholesaleAccountSnapshot(
  request: Pick<Request, "headers">,
  options: WholesaleApplicationOptions = {},
): Promise<WholesaleAccountSnapshot> {
  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  try {
    const sessionResult = await bridge.client.request("get", "/auth/session", {});
    const session = sessionResult.data as WholesaleSessionResponse;
    void session.data.actor;
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
    }
    return { status: "unavailable", setCookies: bridge.takeSetCookies() };
  }

  try {
    const [profileResult, applicationResult] = await Promise.all([
      bridge.client.request("get", "/customer/profile", {}),
      bridge.client.request("get", "/customer/wholesale/application", {}),
    ]);
    const profile = profileResult.data as WholesaleProfile;
    const application = applicationResult.data as WholesaleLatestApplication;
    return {
      status: "ready",
      customerType: profile.customer_type,
      application: application as WholesaleApplication | null,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", setCookies: bridge.takeSetCookies() };
    }
    return { status: "unavailable", setCookies: bridge.takeSetCookies() };
  }
}

export async function loadWholesaleApplicationPage(
  request: Pick<Request, "headers">,
  options: WholesaleApplicationOptions = {},
): Promise<WholesaleApplicationPageData> {
  const snapshot = await loadWholesaleAccountSnapshot(request, options);
  if (snapshot.status !== "ready") return snapshot;

  return {
    ...snapshot,
    canApply: snapshot.customerType === "retail"
      && (!snapshot.application || snapshot.application.status === "rejected"),
    provinces: IRAN_PROVINCES_1404.map(({ id, name }) => ({ id, name })),
    cities: IRAN_CITIES_1404.map(({ id, provinceId, name }) => ({ id, provinceId, name })),
    referenceYear: 1404,
  };
}

export async function submitWholesaleApplication(
  request: Request,
  options: WholesaleApplicationOptions = {},
): Promise<WholesaleSubmitResult> {
  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation();

  const form = await request.formData();
  const body = parseWholesaleApplication(form);
  if (!body) {
    return {
      ok: false,
      statusCode: 422,
      message: "اطلاعات درخواست عمده کامل یا معتبر نیست.",
      setCookies: bridge.takeSetCookies(),
    };
  }

  try {
    const preflight = await readAuthority(bridge.client);
    if (preflight.customerType === "wholesale") {
      return {
        ok: true,
        redirectTo: "/account/wholesale",
        outcome: "already_wholesale",
        setCookies: bridge.takeSetCookies(),
      };
    }
    if (preflight.application && preflight.application.status !== "rejected") {
      return {
        ok: true,
        redirectTo: "/account/wholesale",
        outcome: "existing_application",
        setCookies: bridge.takeSetCookies(),
      };
    }

    const response = await bridge.client.request("post", "/customer/wholesale/applications", {
      headers: {
        "Idempotency-Key": wholesaleIdempotencyKey(request, body),
      },
      body,
    });

    if (response.status !== 201) {
      return unavailableMutation(bridge.takeSetCookies());
    }

    return {
      ok: true,
      redirectTo: "/account/wholesale",
      outcome: "submitted",
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return {
        ok: false,
        statusCode: 401,
        message: "نشست شما پایان یافته است؛ درخواست جدیدی ثبت نشد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (isConflict(error)) {
      try {
        const authoritative = await readAuthority(bridge.client);
        if (
          authoritative.customerType === "wholesale"
          || (
            authoritative.application
            && authoritative.application.status !== "rejected"
          )
        ) {
          return {
            ok: true,
            redirectTo: "/account/wholesale",
            outcome: authoritative.customerType === "wholesale"
              ? "already_wholesale"
              : "existing_application",
            setCookies: bridge.takeSetCookies(),
          };
        }
      } catch {
        // A conflict without a readable authoritative state must remain a conflict.
      }
      return {
        ok: false,
        statusCode: 409,
        message: "وضعیت درخواست هم‌زمان تغییر کرده است؛ وضعیت فعلی را بررسی و دوباره اقدام کنید.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (isUnprocessable(error)) {
      return {
        ok: false,
        statusCode: 422,
        message: "اطلاعات درخواست از طرف سرور پذیرفته نشد. فیلدها را بررسی کنید.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    return unavailableMutation(bridge.takeSetCookies());
  }
}

function safeBridge(
  request: Pick<Request, "headers">,
  options: WholesaleApplicationOptions,
) {
  try {
    return createCustomerSessionBridge(request, options);
  } catch {
    return null;
  }
}

async function readAuthority(
  client: ReturnType<typeof createCustomerSessionBridge>["client"],
): Promise<{ customerType: WholesaleCustomerType; application: WholesaleApplication | null }> {
  const [profileResult, applicationResult] = await Promise.all([
    client.request("get", "/customer/profile", {}),
    client.request("get", "/customer/wholesale/application", {}),
  ]);
  const profile = profileResult.data as WholesaleProfile;
  const application = applicationResult.data as WholesaleLatestApplication;
  return {
    customerType: profile.customer_type,
    application: application as WholesaleApplication | null,
  };
}

function parseWholesaleApplication(form: FormData): WholesaleApplicationBody | null {
  const business_name = cleanRequired(form.get("business_name"), 250);
  const manager_name = cleanRequired(form.get("manager_name"), 200);
  const business_type = cleanRequired(form.get("business_type"), 100);
  const province_id = String(form.get("province_id") ?? "").trim();
  const city_id = String(form.get("city_id") ?? "").trim();
  const business_identifier = cleanOptional(form.get("business_identifier"), 100);
  const note = cleanOptional(form.get("note"), 4000);

  if (
    !business_name
    || !manager_name
    || !business_type
    || !UUID_RE.test(province_id)
    || !UUID_RE.test(city_id)
    || !isIranProvinceCityPair1404(province_id, city_id)
    || business_identifier === undefined
    || note === undefined
  ) {
    return null;
  }

  return {
    business_name,
    manager_name,
    business_type,
    province_id,
    city_id,
    ...(business_identifier ? { business_identifier } : {}),
    ...(note ? { note } : {}),
  };
}

function cleanRequired(value: unknown, max: number): string | null {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) return null;
  return normalized;
}

function cleanOptional(value: unknown, max: number): string | null | undefined {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > max) return undefined;
  return normalized;
}

function wholesaleIdempotencyKey(request: Request, body: WholesaleApplicationBody): string {
  const sessionCookie = extractCustomerSessionCookieHeader(request) ?? "";
  return createHash("sha256")
    .update("customer-wholesale-application\0")
    .update(sessionCookie)
    .update("\0")
    .update(JSON.stringify(body))
    .digest("hex");
}

function unavailableMutation(setCookies: readonly string[] = []): WholesaleSubmitResult {
  return {
    ok: false,
    statusCode: 503,
    message: "نتیجه ثبت درخواست قطعی نشد؛ موفقیت فرض نمی‌شود. وضعیت فعلی را دوباره بررسی کنید.",
    setCookies,
  };
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.kind === "http" && error.status === 401;
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiClientError && error.kind === "http" && error.status === 409;
}

function isUnprocessable(error: unknown): boolean {
  return error instanceof ApiClientError && error.kind === "http" && error.status === 422;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
