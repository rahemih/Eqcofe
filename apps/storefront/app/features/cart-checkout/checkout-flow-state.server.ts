import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import {
  readCartCredentials,
  readCheckoutCredentials,
  requireCartCredentials,
  requireCheckoutCredentials,
} from "./cart-checkout-session.server.js";

const ADDRESS_COOKIE = "eqcofe_checkout_address_id";
const HOST_ADDRESS_COOKIE = "__Host-eqcofe_checkout_address_id";
const REVIEW_COOKIE = "eqcofe_checkout_review";
const HOST_REVIEW_COOKIE = "__Host-eqcofe_checkout_review";
const PAYMENT_COOKIE = "eqcofe_checkout_payment";
const HOST_PAYMENT_COOKIE = "__Host-eqcofe_checkout_payment";
const MAX_AGE_SECONDS = 15 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CheckoutPaymentHandoff = Readonly<{
  v: 1;
  checkoutId: string;
  orderNumber: string;
  paymentId: string;
  createdAt: string;
  expiresAt: string;
}>;

export type CheckoutReviewSnapshot = Readonly<{
  v: 1;
  checkoutId: string;
  addressId: string;
  shipping: Readonly<{ id: string; code: string; nameFa: string; feeToman: number }>;
  customerType: "retail" | "wholesale";
  subtotalToman: number;
  pricingDiscountToman: number;
  marketingDiscountToman: number;
  discountToman: number;
  shippingToman: number;
  taxToman: number;
  totalToman: number;
  expiresAt: string;
}>;

export function readSelectedAddressId(request: Request): string | null {
  const value = readCookie(request, isSecure(request) ? HOST_ADDRESS_COOKIE : ADDRESS_COOKIE);
  if (!value) return null;
  const decoded = safeDecode(value);
  if (!decoded || !UUID_RE.test(decoded)) throw securityError("CHECKOUT_ADDRESS_COOKIE_INVALID");
  return decoded;
}

export function serializeSelectedAddressId(request: Request, addressId: string): string {
  if (!UUID_RE.test(addressId)) throw securityError("CHECKOUT_ADDRESS_ID_INVALID");
  return serializeCookie(isSecure(request) ? HOST_ADDRESS_COOKIE : ADDRESS_COOKIE, addressId, request);
}

export function stableCartIdempotencyKey(request: Request, purpose: string, material: string): string {
  const cart = requireCartCredentials(request);
  return digest("cart", purpose, cart.cartId, cart.cartToken, material);
}

export function stableCheckoutIdempotencyKey(request: Request, purpose: string): string {
  const checkout = requireCheckoutCredentials(request);
  return digest("checkout", purpose, checkout.checkoutId, checkout.checkoutToken);
}

export function stableCustomerIdempotencyKey(request: Request, purpose: string, material: string): string {
  return digest("customer", purpose, request.headers.get("cookie") ?? "", material);
}

export function serializeReviewSnapshot(request: Request, snapshot: CheckoutReviewSnapshot, checkoutToken: string): string {
  validateSnapshot(snapshot);
  if (!checkoutToken || checkoutToken.length < 32) throw securityError("CHECKOUT_REVIEW_TOKEN_INVALID");
  const payload = Buffer.from(JSON.stringify(snapshot), "utf8").toString("base64url");
  if (payload.length > 3000) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_TOO_LARGE");
  const signature = createHmac("sha256", checkoutToken).update(payload).digest("base64url");
  return serializeCookie(isSecure(request) ? HOST_REVIEW_COOKIE : REVIEW_COOKIE, payload + "." + signature, request);
}

export function readReviewSnapshot(request: Request): CheckoutReviewSnapshot {
  const checkout = requireCheckoutCredentials(request);
  const raw = readCookie(request, isSecure(request) ? HOST_REVIEW_COOKIE : REVIEW_COOKIE);
  if (!raw) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_MISSING");
  const decoded = safeDecode(raw);
  if (!decoded) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_INVALID");
  const parts = decoded.split(".");
  if (parts.length !== 2) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_INVALID");
  const [payload, supplied] = parts;
  if (!payload || !supplied) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_INVALID");
  const expected = createHmac("sha256", checkout.checkoutToken).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "base64url"); } catch { throw securityError("CHECKOUT_REVIEW_SNAPSHOT_INVALID"); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_TAMPERED");
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw securityError("CHECKOUT_REVIEW_SNAPSHOT_INVALID"); }
  const snapshot = parsed as CheckoutReviewSnapshot;
  validateSnapshot(snapshot);
  if (snapshot.checkoutId !== checkout.checkoutId) throw securityError("CHECKOUT_REVIEW_CHECKOUT_MISMATCH");
  if (new Date(snapshot.expiresAt).getTime() <= Date.now()) throw securityError("CHECKOUT_REVIEW_EXPIRED");
  return snapshot;
}

export function serializePaymentHandoff(request: Request, orderNumber: string, paymentId: string): string {
  const checkout = requireCheckoutCredentials(request);
  if (!isSafeOrderNumber(orderNumber) || !UUID_RE.test(paymentId)) throw securityError("CHECKOUT_PAYMENT_HANDOFF_INVALID");
  const issuedAt = new Date();
  const value: CheckoutPaymentHandoff = { v: 1, checkoutId: checkout.checkoutId, orderNumber, paymentId, createdAt: issuedAt.toISOString(), expiresAt: new Date(issuedAt.getTime() + MAX_AGE_SECONDS * 1000).toISOString() };
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = createHmac("sha256", checkout.checkoutToken).update(payload).digest("base64url");
  return serializeCookie(isSecure(request) ? HOST_PAYMENT_COOKIE : PAYMENT_COOKIE, payload + "." + signature, request);
}

export function readPaymentHandoff(request: Request): CheckoutPaymentHandoff {
  const checkout = requireCheckoutCredentials(request);
  const raw = readCookie(request, isSecure(request) ? HOST_PAYMENT_COOKIE : PAYMENT_COOKIE);
  if (!raw) throw securityError("CHECKOUT_PAYMENT_HANDOFF_MISSING");
  const decoded = safeDecode(raw);
  if (!decoded) throw securityError("CHECKOUT_PAYMENT_HANDOFF_INVALID");
  const parts = decoded.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw securityError("CHECKOUT_PAYMENT_HANDOFF_INVALID");
  const [payload, supplied] = parts, expected = createHmac("sha256", checkout.checkoutToken).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "base64url"); } catch { throw securityError("CHECKOUT_PAYMENT_HANDOFF_INVALID"); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw securityError("CHECKOUT_PAYMENT_HANDOFF_TAMPERED");
  let value: CheckoutPaymentHandoff;
  try { value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CheckoutPaymentHandoff; } catch { throw securityError("CHECKOUT_PAYMENT_HANDOFF_INVALID"); }
  if (value.v !== 1 || value.checkoutId !== checkout.checkoutId || !isSafeOrderNumber(value.orderNumber) || !UUID_RE.test(value.paymentId)) throw securityError("CHECKOUT_PAYMENT_HANDOFF_INVALID");
  const created = new Date(value.createdAt).getTime(), expires = new Date(value.expiresAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(expires) || expires <= Date.now() || expires - created > MAX_AGE_SECONDS * 1000 + 1000) throw securityError("CHECKOUT_PAYMENT_HANDOFF_EXPIRED");
  return Object.freeze(value);
}

export function hasCartCredentials(request: Request): boolean {
  try { return readCartCredentials(request) !== null; } catch { return false; }
}

export function hasCheckoutCredentials(request: Request): boolean {
  try { return readCheckoutCredentials(request) !== null; } catch { return false; }
}

function validateSnapshot(value: CheckoutReviewSnapshot): void {
  if (!value || value.v !== 1 || !UUID_RE.test(value.checkoutId) || !UUID_RE.test(value.addressId)) throw securityError("CHECKOUT_REVIEW_SNAPSHOT_INVALID");
  if (!value.shipping || !UUID_RE.test(value.shipping.id) || !value.shipping.code || !value.shipping.nameFa) throw securityError("CHECKOUT_REVIEW_SHIPPING_INVALID");
  for (const amount of [value.shipping.feeToman,value.subtotalToman,value.pricingDiscountToman,value.marketingDiscountToman,value.discountToman,value.shippingToman,value.taxToman,value.totalToman]) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw securityError("CHECKOUT_REVIEW_AMOUNT_INVALID");
  }
  if (value.customerType !== "retail" && value.customerType !== "wholesale") throw securityError("CHECKOUT_REVIEW_CUSTOMER_TYPE_INVALID");
  if (!Number.isFinite(new Date(value.expiresAt).getTime())) throw securityError("CHECKOUT_REVIEW_EXPIRY_INVALID");
}

function isSafeOrderNumber(value: string): boolean { return /^[A-Za-z0-9_-]{1,80}$/.test(value); }

function digest(...parts: string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part).update("\0");
  return hash.digest("hex");
}

function readCookie(request: Request, name: string): string | null {
  let found: string | null = null;
  for (const part of request.headers.get("cookie")?.split(";") ?? []) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0 || trimmed.slice(0, separator) !== name) continue;
    if (found !== null) throw securityError("CHECKOUT_STATE_COOKIE_DUPLICATE");
    found = trimmed.slice(separator + 1);
  }
  return found;
}

function serializeCookie(name: string, value: string, request: Request): string {
  const secure = isSecure(request);
  const attrs = [name + "=" + encodeURIComponent(value), "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=" + MAX_AGE_SECONDS];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
function safeDecode(value: string): string | null { try { return decodeURIComponent(value); } catch { return null; } }
function isSecure(request: Request): boolean { return new URL(request.url).protocol === "https:"; }
function securityError(code: string): ApiClientError { return new ApiClientError({ kind:"security", code, message:code, retryable:false }); }
