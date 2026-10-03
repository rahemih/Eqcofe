import { ApiClientError } from "../../platform/api/errors.js";

const CART_ID_COOKIE = "eqcofe_cart_id";
const CART_TOKEN_COOKIE = "eqcofe_cart_token";
const HOST_CART_ID_COOKIE = "__Host-eqcofe_cart_id";
const HOST_CART_TOKEN_COOKIE = "__Host-eqcofe_cart_token";
const CHECKOUT_ID_COOKIE = "eqcofe_checkout_id";
const CHECKOUT_TOKEN_COOKIE = "eqcofe_checkout_token";
const HOST_CHECKOUT_ID_COOKIE = "__Host-eqcofe_checkout_id";
const HOST_CHECKOUT_TOKEN_COOKIE = "__Host-eqcofe_checkout_token";

const CART_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const CHECKOUT_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export type CartCredentials = Readonly<{ cartId: string; cartToken: string }>;
export type CheckoutCredentials = Readonly<{ checkoutId: string; checkoutToken: string }>;

export function readCartCredentials(request: Request): CartCredentials | null {
  const secure = isSecureRequest(request);
  return readCredentialPair(
    request,
    secure ? HOST_CART_ID_COOKIE : CART_ID_COOKIE,
    secure ? HOST_CART_TOKEN_COOKIE : CART_TOKEN_COOKIE,
    "CART",
  );
}

export function readCheckoutCredentials(request: Request): CheckoutCredentials | null {
  const secure = isSecureRequest(request);
  const credentials = readCredentialPair(
    request,
    secure ? HOST_CHECKOUT_ID_COOKIE : CHECKOUT_ID_COOKIE,
    secure ? HOST_CHECKOUT_TOKEN_COOKIE : CHECKOUT_TOKEN_COOKIE,
    "CHECKOUT",
  );
  return credentials
    ? { checkoutId: credentials.cartId, checkoutToken: credentials.cartToken }
    : null;
}

export function requireCartCredentials(request: Request): CartCredentials {
  const value = readCartCredentials(request);
  if (!value) throw credentialError("CART_CREDENTIALS_MISSING", "Cart credentials are missing.");
  return value;
}

export function requireCheckoutCredentials(request: Request): CheckoutCredentials {
  const value = readCheckoutCredentials(request);
  if (!value) throw credentialError("CHECKOUT_CREDENTIALS_MISSING", "Checkout credentials are missing.");
  return value;
}

export function serializeCartCredentials(
  request: Request,
  cartId: string,
  cartToken: string,
): readonly string[] {
  validateCredentials(cartId, cartToken, "CART");
  const secure = isSecureRequest(request);
  return [
    serializeCookie(secure ? HOST_CART_ID_COOKIE : CART_ID_COOKIE, cartId, CART_COOKIE_MAX_AGE_SECONDS, secure),
    serializeCookie(secure ? HOST_CART_TOKEN_COOKIE : CART_TOKEN_COOKIE, cartToken, CART_COOKIE_MAX_AGE_SECONDS, secure),
  ];
}

export function serializeCheckoutCredentials(
  request: Request,
  checkoutId: string,
  checkoutToken: string,
): readonly string[] {
  validateCredentials(checkoutId, checkoutToken, "CHECKOUT");
  const secure = isSecureRequest(request);
  return [
    serializeCookie(secure ? HOST_CHECKOUT_ID_COOKIE : CHECKOUT_ID_COOKIE, checkoutId, CHECKOUT_COOKIE_MAX_AGE_SECONDS, secure),
    serializeCookie(secure ? HOST_CHECKOUT_TOKEN_COOKIE : CHECKOUT_TOKEN_COOKIE, checkoutToken, CHECKOUT_COOKIE_MAX_AGE_SECONDS, secure),
  ];
}

export function clearCheckoutCredentials(request: Request): readonly string[] {
  const secure = isSecureRequest(request);
  return [
    serializeExpiredCookie(secure ? HOST_CHECKOUT_ID_COOKIE : CHECKOUT_ID_COOKIE, secure),
    serializeExpiredCookie(secure ? HOST_CHECKOUT_TOKEN_COOKIE : CHECKOUT_TOKEN_COOKIE, secure),
  ];
}

export function appendCartCheckoutSetCookies(headers: Headers, values: readonly string[]): void {
  for (const value of values) headers.append("Set-Cookie", value);
}

function readCredentialPair(
  request: Request,
  idName: string,
  tokenName: string,
  prefix: "CART" | "CHECKOUT",
): CartCredentials | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const rawId = cookies.get(idName);
  const rawToken = cookies.get(tokenName);
  if (!rawId && !rawToken) return null;
  if (!rawId || !rawToken) {
    throw credentialError(`${prefix}_CREDENTIALS_PARTIAL`, `${prefix} credentials are incomplete.`);
  }

  const id = safeDecode(rawId);
  const token = safeDecode(rawToken);
  const validated = validatedCredentials(id, token, prefix);
  return { cartId: validated.id, cartToken: validated.token };
}

function validateCredentials(id: string | null, token: string | null, prefix: "CART" | "CHECKOUT"): void {
  void validatedCredentials(id, token, prefix);
}

function validatedCredentials(
  id: string | null,
  token: string | null,
  prefix: "CART" | "CHECKOUT",
): { id: string; token: string } {
  if (!id || !isUuid(id) || !token || !isSafeToken(token)) {
    throw credentialError(`${prefix}_CREDENTIALS_INVALID`, `${prefix} credentials are invalid.`);
  }
  return { id, token };
}

function serializeCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function serializeExpiredCookie(name: string, secure: boolean): string {
  const attributes = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

function parseCookieHeader(raw: string | null): Map<string, string> {
  const output = new Map<string, string>();
  for (const part of raw?.split(";") ?? []) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator);
    if (output.has(name)) {
      throw credentialError("CART_CHECKOUT_COOKIE_DUPLICATE", "Duplicate Cart/Checkout credential cookie was rejected.");
    }
    output.set(name, trimmed.slice(separator + 1));
  }
  return output;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

function isSafeToken(value: string): boolean {
  if (!value || value.length > 1024) return false;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || character === ";" || character === ",") return false;
  }
  return true;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function credentialError(code: string, message: string): ApiClientError {
  return new ApiClientError({ kind: "security", code, message, retryable: false });
}
