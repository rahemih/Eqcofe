import { ApiClientError } from "../../platform/api/errors.js";
import {
  CUSTOMER_SESSION_COOKIE_NAMES,
} from "../../platform/auth/session-cookie.server.js";
import { probeCustomerSession, type CustomerSessionProbeOptions } from "../../platform/auth/session-state.server.js";
import {
  accessCustomerCart,
  mergeGuestCartIntoCustomer,
  requestCheckoutOtp,
  verifyCheckoutOtp,
  type CartCheckoutDataOptions,
} from "./cart-checkout-data.server.js";
import {
  readCartCredentials,
  serializeCartCredentials,
} from "./cart-checkout-session.server.js";

export type CheckoutIdentityLoaderData = {
  session: Awaited<ReturnType<typeof probeCustomerSession>>;
};

export type CheckoutIdentityActionData =
  | { status: "otp-requested"; challengeId: string; expiresAt: string; message: string }
  | { status: "validation"; challengeId?: string; message: string }
  | { status: "rate-limited"; challengeId?: string; message: string }
  | { status: "merge-conflict"; message: string }
  | { status: "forbidden"; message: string; requestId: string | null }
  | { status: "recovery"; challengeId?: string; message: string; requestId: string | null };

export type CheckoutIdentityActionResult =
  | { kind: "data"; statusCode: number; data: CheckoutIdentityActionData }
  | { kind: "redirect"; location: "/checkout/address"; setCookies: readonly string[] };

export type CheckoutIdentityOptions = CartCheckoutDataOptions & CustomerSessionProbeOptions;

export async function loadCheckoutIdentity(
  request: Request,
  options: CheckoutIdentityOptions = {},
): Promise<CheckoutIdentityLoaderData> {
  return { session: await probeCustomerSession(request, options) };
}

export async function handleCheckoutIdentityAction(
  request: Request,
  options: CheckoutIdentityOptions = {},
): Promise<CheckoutIdentityActionResult> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "request-otp") {
    const mobile = normalizeIranMobile(String(form.get("mobile") ?? ""));
    if (!mobile) {
      return dataResult(422, {
        status: "validation",
        message: "شماره موبایل معتبر وارد کنید.",
      });
    }

    try {
      const result = await requestCheckoutOtp(request, { mobile }, options);
      return dataResult(200, {
        status: "otp-requested",
        challengeId: result.data.data.challenge_id,
        expiresAt: result.data.data.expires_at,
        message: "کد ورود ارسال شد. کد شش‌رقمی را وارد کنید.",
      });
    } catch (error) {
      return otpFailure(error);
    }
  }

  if (intent === "verify-otp") {
    const challengeId = String(form.get("challenge_id") ?? "");
    const code = String(form.get("code") ?? "").trim();
    if (!UUID_RE.test(challengeId) || !/^\d{6}$/.test(code)) {
      return dataResult(422, {
        status: "validation",
        ...(UUID_RE.test(challengeId) ? { challengeId } : {}),
        message: "کد شش‌رقمی یا شناسه درخواست معتبر نیست.",
      });
    }

    try {
      const verified = await verifyCheckoutOtp(request, {
        challenge_id: challengeId,
        code,
      }, options);
      const authenticatedRequest = requestWithFreshCustomerSession(request, verified.setCookies);
      const cart = await reconcileCheckoutCart(request, authenticatedRequest, options);
      return {
        kind: "redirect",
        location: "/checkout/address",
        setCookies: [
          ...verified.setCookies,
          ...cart.sessionCookies,
          ...serializeCartCredentials(
            request,
            cart.cartId,
            cart.cartToken,
          ),
        ],
      };
    } catch (error) {
      return identityFailure(error, challengeId);
    }
  }

  if (intent === "continue-authenticated") {
    const session = await probeCustomerSession(request, options);
    if (session.status !== "authenticated") {
      return dataResult(401, {
        status: "validation",
        message: "نشست شما معتبر نیست. برای ادامه دوباره با کد یک‌بارمصرف وارد شوید.",
      });
    }

    try {
      const cart = await reconcileCheckoutCart(request, request, options);
      return {
        kind: "redirect",
        location: "/checkout/address",
        setCookies: [
          ...cart.sessionCookies,
          ...serializeCartCredentials(request, cart.cartId, cart.cartToken),
        ],
      };
    } catch (error) {
      return identityFailure(error);
    }
  }

  return dataResult(400, {
    status: "validation",
    message: "درخواست ورود شناخته‌شده نیست.",
  });
}

async function reconcileCheckoutCart(
  originalRequest: Request,
  authenticatedRequest: Request,
  options: CheckoutIdentityOptions,
): Promise<{ cartId: string; cartToken: string; sessionCookies: readonly string[] }> {
  const guest = readCartCredentials(originalRequest);

  if (guest) {
    try {
      const merged = await mergeGuestCartIntoCustomer(authenticatedRequest, options);
      assertCheckoutCartNotEmpty(merged.data.data.cart.items.length);
      return {
        cartId: merged.data.data.cart.id,
        cartToken: merged.data.data.cart_token,
        sessionCookies: merged.setCookies,
      };
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.code !== "CART_NOT_GUEST") throw error;
    }
  }

  const accessed = await accessCustomerCart(authenticatedRequest, options);
  assertCheckoutCartNotEmpty(accessed.data.data.cart.items.length);
  return {
    cartId: accessed.data.data.cart.id,
    cartToken: accessed.data.data.cart_token,
    sessionCookies: accessed.setCookies,
  };
}

function assertCheckoutCartNotEmpty(itemCount: number): void {
  if (itemCount > 0) return;
  throw new ApiClientError({
    kind: "http",
    code: "CART_EMPTY_FOR_CHECKOUT",
    message: "Checkout cannot continue with an empty authoritative cart.",
    status: 409,
    retryable: false,
  });
}

function requestWithFreshCustomerSession(
  request: Request,
  setCookies: readonly string[],
): Request {
  const sessionCookie = lastCustomerSessionCookiePair(setCookies);
  if (!sessionCookie) {
    throw new ApiClientError({
      kind: "security",
      code: "SESSION_COOKIE_MISSING_AFTER_OTP",
      message: "OTP verification did not return an authoritative customer session cookie.",
      retryable: false,
    });
  }

  const cart = readCartCredentials(request);
  const secure = new URL(request.url).protocol === "https:";
  const cookieParts = [sessionCookie];
  if (cart) {
    cookieParts.push(
      `${secure ? "__Host-eqcofe_cart_id" : "eqcofe_cart_id"}=${encodeURIComponent(cart.cartId)}`,
      `${secure ? "__Host-eqcofe_cart_token" : "eqcofe_cart_token"}=${encodeURIComponent(cart.cartToken)}`,
    );
  }

  const headers = new Headers();
  headers.set("cookie", cookieParts.join("; "));
  return new Request(request.url, { headers });
}

function lastCustomerSessionCookiePair(setCookies: readonly string[]): string | null {
  let selected: string | null = null;
  for (const raw of setCookies) {
    const pair = raw.split(";", 1)[0]?.trim() ?? "";
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    const name = pair.slice(0, separator);
    if (CUSTOMER_SESSION_COOKIE_NAMES.includes(name as (typeof CUSTOMER_SESSION_COOKIE_NAMES)[number])) {
      selected = pair;
    }
  }
  return selected;
}

function normalizeIranMobile(value: string): string | null {
  const input = value.replace(/[\s-]/g, "");
  if (!/^(?:\+98|0098|98|0)?9\d{9}$/.test(input)) return null;
  if (input.startsWith("+98")) return "0" + input.slice(3);
  if (input.startsWith("0098")) return "0" + input.slice(4);
  if (input.startsWith("98")) return "0" + input.slice(2);
  return input.startsWith("0") ? input : "0" + input;
}

function otpFailure(error: unknown): CheckoutIdentityActionResult {
  if (error instanceof ApiClientError) {
    if (error.status === 429) {
      return dataResult(429, {
        status: "rate-limited",
        message: "تعداد درخواست‌های کد زیاد است. کمی بعد دوباره تلاش کنید.",
      });
    }
    if (error.status === 401 || error.status === 422) {
      return dataResult(422, {
        status: "validation",
        message: "شماره موبایل یا درخواست ورود معتبر نیست.",
      });
    }
    if (error.status === 403) {
      return dataResult(403, {
        status: "forbidden",
        message: "این درخواست ورود مجاز نیست.",
        requestId: error.requestId,
      });
    }
    return dataResult(503, {
      status: "recovery",
      message: "ارسال کد قطعی نشد. بدون ساختن نتیجه موفقیت، دوباره تلاش کنید.",
      requestId: error.requestId,
    });
  }
  return dataResult(503, {
    status: "recovery",
    message: "ارسال کد قطعی نشد. دوباره تلاش کنید.",
    requestId: null,
  });
}

function identityFailure(error: unknown, challengeId?: string): CheckoutIdentityActionResult {
  if (error instanceof ApiClientError) {
    if (error.status === 429) {
      return dataResult(429, {
        status: "rate-limited",
        ...(challengeId ? { challengeId } : {}),
        message: "تعداد تلاش‌های ورود زیاد شده است. کد تازه درخواست کنید.",
      });
    }
    if (error.status === 401 || error.code === "OTP_INVALID" || error.code === "OTP_EXPIRED_OR_CONSUMED") {
      return dataResult(422, {
        status: "validation",
        ...(challengeId ? { challengeId } : {}),
        message: "کد ورود نامعتبر یا منقضی شده است. کد را بررسی یا کد تازه درخواست کنید.",
      });
    }
    if (error.code === "CART_ALREADY_IN_CHECKOUT" || error.code === "CART_NOT_GUEST" || error.code === "CART_EMPTY_FOR_CHECKOUT") {
      return dataResult(409, {
        status: "merge-conflict",
        message: "وضعیت سبد هم‌زمان تغییر کرده است. به سبد برگردید و وضعیت تازه را بررسی کنید.",
      });
    }
    if (error.status === 403) {
      return dataResult(403, {
        status: "forbidden",
        message: "ادامه تسویه‌حساب برای این نشست مجاز نیست.",
        requestId: error.requestId,
      });
    }
    return dataResult(503, {
      status: "recovery",
      ...(challengeId ? { challengeId } : {}),
      message: "نتیجه ورود یا اتصال سبد قطعی نشد؛ ادامه Checkout انجام نشد.",
      requestId: error.requestId,
    });
  }

  return dataResult(503, {
    status: "recovery",
    ...(challengeId ? { challengeId } : {}),
    message: "نتیجه ورود یا اتصال سبد قطعی نشد؛ ادامه Checkout انجام نشد.",
    requestId: null,
  });
}

function dataResult(
  statusCode: number,
  data: CheckoutIdentityActionData,
): CheckoutIdentityActionResult {
  return { kind: "data", statusCode, data };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
