import { createHash } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import { createCustomerSessionBridge } from "../../platform/auth/session-cookie.server.js";
import {
  IRAN_CITIES_1404,
  IRAN_PROVINCES_1404,
  isIranProvinceCityPair1404,
} from "../../../../../shared/reference/iran-geography-1404.js";
import type {
  AccountAddress,
  AccountAddressCreateBody,
  AccountAddressUpdateBody,
  AccountAddressesResponse,
  AccountProfile,
  AccountProfileUpdateBody,
} from "./account-contract.js";

export type AccountSettingsOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type AccountLoadState<T> =
  | { status: "ready"; data: T; setCookies: readonly string[] }
  | { status: "unauthenticated"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] };

export type AccountProfilePageData = {
  profile: AccountProfile;
};

export type AccountAddressPageData = {
  addresses: readonly AccountAddress[];
  provinces: readonly { id: string; name: string }[];
  cities: readonly { id: string; provinceId: string; name: string }[];
  referenceYear: 1404;
};

export type AccountMutationResult =
  | {
      ok: true;
      message: string;
      setCookies: readonly string[];
      redirectTo?: string;
    }
  | {
      ok: false;
      statusCode: number;
      message: string;
      setCookies: readonly string[];
    };

export async function loadAccountProfile(
  request: Pick<Request, "headers">,
  options: AccountSettingsOptions = {},
): Promise<AccountLoadState<AccountProfilePageData>> {
  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  try {
    const response = await bridge.client.request("get", "/customer/profile", {});
    return {
      status: "ready",
      data: { profile: response.data.data as AccountProfile },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return loadFailure(error, bridge.takeSetCookies());
  }
}

export async function mutateAccountProfile(
  request: Request,
  options: AccountSettingsOptions = {},
): Promise<AccountMutationResult> {
  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation();

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "update-profile") {
      const body = parseProfileUpdate(form);
      if (!body) {
        return invalidMutation("اطلاعات پروفایل معتبر نیست.", bridge.takeSetCookies());
      }
      const result = await bridge.client.request("patch", "/customer/profile", {
        headers: {
          "Idempotency-Key": stableAccountIdempotencyKey(request, "profile-update", JSON.stringify(body)),
        },
        body,
      });
      void result.data;
      return {
        ok: true,
        message: "تغییرات پروفایل با موفقیت ذخیره شد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "logout") {
      await bridge.client.request("post", "/auth/logout", {});
      return {
        ok: true,
        message: "نشست فعلی پایان یافت.",
        redirectTo: "/",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "logout-all") {
      await bridge.client.request("post", "/auth/logout-all", {});
      return {
        ok: true,
        message: "همه نشست‌های حساب پایان یافت.",
        redirectTo: "/",
        setCookies: bridge.takeSetCookies(),
      };
    }

    return invalidMutation("عملیات پروفایل شناخته‌شده نیست.", bridge.takeSetCookies());
  } catch (error) {
    return mutationFailure(error, bridge.takeSetCookies(), "ذخیره تغییرات حساب انجام نشد.");
  }
}

export async function loadAccountAddresses(
  request: Pick<Request, "headers">,
  options: AccountSettingsOptions = {},
): Promise<AccountLoadState<AccountAddressPageData>> {
  const bridge = safeBridge(request, options);
  if (!bridge) return { status: "unavailable", setCookies: [] };

  try {
    const response = await bridge.client.request("get", "/customer/addresses", {});
    const typed = response.data as AccountAddressesResponse;
    return {
      status: "ready",
      data: {
        addresses: typed.data,
        provinces: IRAN_PROVINCES_1404.map(({ id, name }) => ({ id, name })),
        cities: IRAN_CITIES_1404.map(({ id, provinceId, name }) => ({ id, provinceId, name })),
        referenceYear: 1404,
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return loadFailure(error, bridge.takeSetCookies());
  }
}

export async function mutateAccountAddress(
  request: Request,
  options: AccountSettingsOptions = {},
): Promise<AccountMutationResult> {
  const bridge = safeBridge(request, options);
  if (!bridge) return unavailableMutation();

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "create-address") {
      const body = parseAddressCreate(form);
      if (!body) {
        return invalidMutation("اطلاعات نشانی جدید معتبر نیست.", bridge.takeSetCookies());
      }
      if (!isIranProvinceCityPair1404(body.province_id, body.city_id)) {
        return invalidMutation("استان و شهر انتخاب‌شده با مرجع معتبر فروشگاه تطابق ندارند.", bridge.takeSetCookies());
      }
      await bridge.client.request("post", "/customer/addresses", {
        headers: {
          "Idempotency-Key": stableAccountIdempotencyKey(request, "address-create", JSON.stringify(body)),
        },
        body,
      });
      return {
        ok: true,
        message: "نشانی جدید ثبت شد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    const addressId = String(form.get("address_id") ?? "");
    if (!UUID_RE.test(addressId)) {
      return invalidMutation("نشانی انتخاب‌شده معتبر نیست.", bridge.takeSetCookies());
    }

    const listed = await bridge.client.request("get", "/customer/addresses", {});
    const owned = (listed.data as AccountAddressesResponse).data.find((item) => item.id === addressId);
    if (!owned) {
      return {
        ok: false,
        statusCode: 404,
        message: "نشانی در حساب فعلی پیدا نشد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "update-address") {
      const body = parseAddressUpdate(form);
      if (!body) {
        return invalidMutation("اطلاعات ویرایش نشانی معتبر نیست.", bridge.takeSetCookies());
      }
      if (!isIranProvinceCityPair1404(body.province_id, body.city_id)) {
        return invalidMutation("استان و شهر انتخاب‌شده با مرجع معتبر فروشگاه تطابق ندارند.", bridge.takeSetCookies());
      }
      await bridge.client.request("patch", "/customer/addresses/{id}", {
        pathParams: { id: addressId },
        headers: {
          "Idempotency-Key": stableAccountIdempotencyKey(
            request,
            "address-update",
            JSON.stringify({ addressId, body }),
          ),
        },
        body,
      });
      return {
        ok: true,
        message: "نشانی به‌روزرسانی شد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "set-default-address") {
      await bridge.client.request("post", "/customer/addresses/{id}/set-default", {
        pathParams: { id: addressId },
        headers: {
          "Idempotency-Key": stableAccountIdempotencyKey(request, "address-set-default", addressId),
        },
      });
      return {
        ok: true,
        message: "نشانی پیش‌فرض تغییر کرد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    if (intent === "delete-address") {
      await bridge.client.request("delete", "/customer/addresses/{id}", {
        pathParams: { id: addressId },
        headers: {
          "Idempotency-Key": stableAccountIdempotencyKey(request, "address-delete", addressId),
        },
      });
      return {
        ok: true,
        message: "نشانی حذف شد.",
        setCookies: bridge.takeSetCookies(),
      };
    }

    return invalidMutation("عملیات نشانی شناخته‌شده نیست.", bridge.takeSetCookies());
  } catch (error) {
    return mutationFailure(error, bridge.takeSetCookies(), "عملیات نشانی انجام نشد.");
  }
}

function safeBridge(
  request: Pick<Request, "headers">,
  options: AccountSettingsOptions,
) {
  try {
    return createCustomerSessionBridge(request, options);
  } catch {
    return null;
  }
}

function loadFailure<T>(
  error: unknown,
  setCookies: readonly string[],
): AccountLoadState<T> {
  if (isUnauthorized(error)) return { status: "unauthenticated", setCookies };
  return { status: "unavailable", setCookies };
}

function mutationFailure(
  error: unknown,
  setCookies: readonly string[],
  fallback: string,
): AccountMutationResult {
  if (!(error instanceof ApiClientError)) {
    return { ok: false, statusCode: 503, message: fallback, setCookies };
  }

  const statusCode =
    error.status === 401 ? 401 :
    error.status === 403 ? 403 :
    error.status === 404 ? 404 :
    error.status === 409 ? 409 :
    error.status === 422 ? 422 :
    503;

  if (statusCode === 401) {
    return { ok: false, statusCode, message: "نشست شما پایان یافته است؛ هیچ تغییر جدیدی ثبت نشد.", setCookies };
  }
  if (statusCode === 403 || statusCode === 404) {
    return { ok: false, statusCode, message: "این مورد در حساب فعلی قابل دسترسی نیست.", setCookies };
  }
  if (statusCode === 409) {
    return { ok: false, statusCode, message: "اطلاعات هم‌زمان تغییر کرده است؛ نسخه تازه را بررسی و دوباره تلاش کنید.", setCookies };
  }
  if (statusCode === 422) {
    return { ok: false, statusCode, message: error.message || "اطلاعات واردشده معتبر نیست.", setCookies };
  }

  return {
    ok: false,
    statusCode,
    message: "نتیجه عملیات قطعی نشد؛ وضعیت فعلی حساب را دوباره دریافت کنید و موفقیت را فرض نکنید.",
    setCookies,
  };
}

function parseProfileUpdate(form: FormData): AccountProfileUpdateBody | null {
  const firstName = cleanNullable(form.get("first_name"), 100);
  const lastName = cleanNullable(form.get("last_name"), 100);
  const rawEmail = String(form.get("email") ?? "").trim().toLowerCase();
  if (firstName === undefined || lastName === undefined) return null;
  if (rawEmail.length > 320) return null;
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) return null;
  return {
    first_name: firstName,
    last_name: lastName,
    email: rawEmail || null,
  };
}

function parseAddressCreate(form: FormData): AccountAddressCreateBody | null {
  const common = parseAddressFields(form);
  if (!common) return null;
  return {
    ...common,
    is_default: form.get("is_default") === "on",
  };
}

function parseAddressUpdate(form: FormData): AccountAddressUpdateBody | null {
  return parseAddressFields(form);
}

function parseAddressFields(form: FormData) {
  const recipient_name = cleanRequired(form.get("recipient_name"), 150);
  const recipient_mobile = normalizeDigits(form.get("recipient_mobile"));
  const province_id = String(form.get("province_id") ?? "").trim();
  const city_id = String(form.get("city_id") ?? "").trim();
  const postal_code = normalizeDigits(form.get("postal_code"));
  const address_line = cleanRequired(form.get("address_line"), 1000);
  const building_no = cleanNullable(form.get("building_no"), 30);
  const unit_no = cleanNullable(form.get("unit_no"), 30);

  if (
    !recipient_name ||
    !/^09\d{9}$/.test(recipient_mobile) ||
    !UUID_RE.test(province_id) ||
    !UUID_RE.test(city_id) ||
    !/^\d{10}$/.test(postal_code) ||
    !address_line ||
    building_no === undefined ||
    unit_no === undefined
  ) return null;

  return {
    recipient_name,
    recipient_mobile,
    province_id,
    city_id,
    postal_code,
    address_line,
    building_no,
    unit_no,
  };
}

function cleanRequired(value: unknown, max: number): string | null {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) return null;
  return normalized;
}

function cleanNullable(value: unknown, max: number): string | null | undefined {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > max) return undefined;
  return normalized;
}

function normalizeDigits(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function stableAccountIdempotencyKey(request: Request, purpose: string, material: string): string {
  const hash = createHash("sha256");
  for (const part of ["customer-account", purpose, request.headers.get("cookie") ?? "", material]) {
    hash.update(part).update("\0");
  }
  return hash.digest("hex");
}

function invalidMutation(
  message: string,
  setCookies: readonly string[],
): AccountMutationResult {
  return { ok: false, statusCode: 422, message, setCookies };
}

function unavailableMutation(): AccountMutationResult {
  return {
    ok: false,
    statusCode: 503,
    message: "سرویس حساب موقتاً در دسترس نیست؛ هیچ تغییری ثبت‌شده فرض نمی‌شود.",
    setCookies: [],
  };
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.kind === "http" && error.status === 401;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
