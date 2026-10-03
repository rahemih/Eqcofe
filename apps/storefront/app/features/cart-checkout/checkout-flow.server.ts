import { createHash, randomUUID } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import type {
  CheckoutOrderBody,
  CheckoutQuoteBody,
  CheckoutQuoteResponse,
  CheckoutReserveResponse,
  CustomerAddressCreateBody,
  CustomerAddressUpdateBody,
  CustomerAddressesResponse,
  ShippingMethodsResponse,
} from "./cart-checkout-contract.js";
import {
  createCheckoutQuote,
  createCustomerAddress,
  createOrderFromCheckout,
  loadCustomerAddresses,
  loadShippingMethods,
  reserveCheckout,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "./cart-checkout-data.server.js";

type CustomerAddress = CustomerAddressesResponse["data"][number];
type ShippingMethod = ShippingMethodsResponse["data"][number];
type Quote = CheckoutQuoteResponse["data"];
type Reservation = CheckoutReserveResponse["data"];

export type CheckoutFlowMessage = { status: "error"; message: string; requestId: string | null };
export type CheckoutAddressLoaderData = { addresses: readonly CustomerAddress[]; idempotencyKey: string };
export type CheckoutAddressPageData = CheckoutAddressLoaderData | CheckoutFlowMessage;
export type CheckoutDeliveryLoaderData = {
  address: CustomerAddress;
  methods: readonly ShippingMethod[];
  quoteIdempotencyKey: string;
  reservationIdempotencyKey: string;
};
export type CheckoutDeliveryPageData = CheckoutDeliveryLoaderData | CheckoutFlowMessage;
export type CheckoutReviewLoaderData = {
  address: CustomerAddress;
  shippingMethod: ShippingMethod;
  quoteIdempotencyKey: string;
  reservationIdempotencyKey: string;
};
export type CheckoutReviewPageData = CheckoutReviewLoaderData | CheckoutFlowMessage;
export type CheckoutReviewPreparedData = {
  status: "prepared";
  quote: Quote;
  reservation: Reservation;
  address: CustomerAddress;
  shippingMethod: ShippingMethod;
  orderIdempotencyKey: string;
};
export type CheckoutFlowRedirect = { kind: "redirect"; location: string; setCookies: readonly string[] };
export type CheckoutFlowData<T> = { kind: "data"; statusCode: number; data: T; setCookies: readonly string[] };

export async function loadCheckoutAddress(request: Request): Promise<CheckoutFlowData<CheckoutAddressPageData> | CheckoutFlowRedirect> {
  try {
    const result = await loadCustomerAddresses(request);
    return {
      kind: "data",
      statusCode: 200,
      data: { addresses: result.data.data, idempotencyKey: randomUUID() },
      setCookies: result.setCookies,
    };
  } catch (error) {
    if (isUnauthorized(error)) return { kind: "redirect", location: "/checkout/identity", setCookies: [] };
    return flowFailure(error, 200);
  }
}

export async function handleCheckoutAddressAction(request: Request): Promise<CheckoutFlowData<CheckoutFlowMessage> | CheckoutFlowRedirect> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const idempotencyKey = uuidField(form, "idempotency_key");
  try {
    if (intent === "select") {
      const addressId = uuidField(form, "address_id");
      const listed = await loadCustomerAddresses(request);
      if (!listed.data.data.some((item) => item.id === addressId)) return validationFailure("نشانی انتخاب‌شده متعلق به این حساب نیست.");
      return { kind: "redirect", location: "/checkout/delivery", setCookies: [...listed.setCookies, ...serializeAddressSelection(request, addressId)] };
    }
    if (intent === "create") {
      const created = await createCustomerAddress(request, createAddressBody(form), idempotencyKey);
      return { kind: "redirect", location: "/checkout/delivery", setCookies: [...created.setCookies, ...serializeAddressSelection(request, created.data.data.id)] };
    }
    if (intent === "update") {
      const addressId = uuidField(form, "address_id");
      const updated = await updateCustomerAddress(request, addressId, updateAddressBody(form), idempotencyKey);
      return { kind: "redirect", location: "/checkout/address", setCookies: updated.setCookies };
    }
    if (intent === "set-default") {
      const addressId = uuidField(form, "address_id");
      const updated = await setDefaultCustomerAddress(request, addressId, idempotencyKey);
      return { kind: "redirect", location: "/checkout/address", setCookies: updated.setCookies };
    }
    return validationFailure("عملیات نشانی شناخته‌شده نیست.");
  } catch (error) {
    if (isUnauthorized(error)) return { kind: "redirect", location: "/checkout/identity", setCookies: [] };
    return flowFailure(error);
  }
}

export async function loadCheckoutDelivery(request: Request): Promise<CheckoutFlowData<CheckoutDeliveryPageData> | CheckoutFlowRedirect> {
  const selected = readSelection(request);
  if (!selected.addressId) return { kind: "data", statusCode: 200, data: { status: "error", message: "ابتدا یک نشانی تحویل معتبر انتخاب کنید.", requestId: null }, setCookies: [] };
  try {
    const [addresses, methods] = await Promise.all([loadCustomerAddresses(request), loadShippingMethods()]);
    const address = addresses.data.data.find((item) => item.id === selected.addressId);
    if (!address) return { kind: "redirect", location: "/checkout/address", setCookies: addresses.setCookies };
    return {
      kind: "data", statusCode: 200,
      data: { address, methods: methods.data.data, quoteIdempotencyKey: randomUUID(), reservationIdempotencyKey: randomUUID() },
      setCookies: addresses.setCookies,
    };
  } catch (error) {
    if (isUnauthorized(error)) return { kind: "redirect", location: "/checkout/identity", setCookies: [] };
    return flowFailure(error, 200);
  }
}

export async function loadCheckoutReview(request: Request): Promise<CheckoutFlowData<CheckoutReviewPageData> | CheckoutFlowRedirect> {
  const selected = readSelection(request);
  if (!selected.addressId) return { kind: "data", statusCode: 200, data: { status: "error", message: "ابتدا نشانی تحویل را انتخاب کنید.", requestId: null }, setCookies: [] };
  if (!selected.shippingMethodId) return { kind: "data", statusCode: 200, data: { status: "error", message: "ابتدا روش تحویل را انتخاب کنید.", requestId: null }, setCookies: [] };
  try {
    const [addresses, methods] = await Promise.all([loadCustomerAddresses(request), loadShippingMethods()]);
    const address = addresses.data.data.find((item) => item.id === selected.addressId);
    const shippingMethod = methods.data.data.find((item) => item.id === selected.shippingMethodId);
    if (!address) return { kind: "redirect", location: "/checkout/address", setCookies: addresses.setCookies };
    if (!shippingMethod) return { kind: "redirect", location: "/checkout/delivery", setCookies: addresses.setCookies };
    return {
      kind: "data", statusCode: 200,
      data: { address, shippingMethod, quoteIdempotencyKey: randomUUID(), reservationIdempotencyKey: randomUUID() },
      setCookies: addresses.setCookies,
    };
  } catch (error) {
    if (isUnauthorized(error)) return { kind: "redirect", location: "/checkout/identity", setCookies: [] };
    return flowFailure(error, 200);
  }
}

export async function handleCheckoutReviewAction(
  request: Request,
): Promise<CheckoutFlowData<CheckoutReviewPreparedData | CheckoutFlowMessage> | CheckoutFlowRedirect> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const selected = readSelection(request);
  if (!selected.addressId) return { kind: "redirect", location: "/checkout/address", setCookies: [] };
  try {
    if (intent === "prepare") {
      const shippingMethodId = uuidField(form, "shipping_method_id");
      const quoteKey = uuidField(form, "quote_idempotency_key");
      const reservationKey = uuidField(form, "reservation_idempotency_key");
      const [addresses, methods] = await Promise.all([loadCustomerAddresses(request), loadShippingMethods()]);
      const address = addresses.data.data.find((item) => item.id === selected.addressId);
      const shippingMethod = methods.data.data.find((item) => item.id === shippingMethodId);
      if (!address) return { kind: "redirect", location: "/checkout/address", setCookies: addresses.setCookies };
      if (!shippingMethod) return { kind: "redirect", location: "/checkout/delivery", setCookies: addresses.setCookies };
      const coupon = String(form.get("coupon_code") ?? "").trim();
      const quoteBody: CheckoutQuoteBody = { shipping_method_id: shippingMethodId, coupon_code: coupon || null };
      const quote = await createCheckoutQuote(request, quoteBody, quoteKey);
      const reservation = await reserveCheckout(requestWithSetCookies(request, quote.setCookies), reservationKey);
      return {
        kind: "data", statusCode: 200,
        data: { status: "prepared", quote: quote.data.data, reservation: reservation.data.data, address, shippingMethod, orderIdempotencyKey: randomUUID() },
        setCookies: [...addresses.setCookies, ...quote.setCookies, ...serializeShippingSelection(request, shippingMethodId)],
      };
    }
    if (intent === "create-order") {
      const orderKey = uuidField(form, "order_idempotency_key");
      const addresses = await loadCustomerAddresses(request);
      const address = addresses.data.data.find((item) => item.id === selected.addressId);
      if (!address) return { kind: "redirect", location: "/checkout/address", setCookies: addresses.setCookies };
      const body: CheckoutOrderBody = { address: orderAddressSnapshot(address) };
      const order = await createOrderFromCheckout(request, body, orderKey);
      return {
        kind: "redirect",
        location: `/order/${encodeURIComponent(order.data.data.order_number)}/outcome`,
        setCookies: [...addresses.setCookies, ...clearSelection(request)],
      };
    }
    return validationFailure("عملیات بازبینی شناخته‌شده نیست.");
  } catch (error) {
    if (isUnauthorized(error)) return { kind: "redirect", location: "/checkout/identity", setCookies: [] };
    return flowFailure(error);
  }
}

export function partitionCheckoutSetCookies(values: readonly string[]) {
  const customer: string[] = [];
  const flow: string[] = [];
  for (const value of values) {
    const name = value.split("=", 1)[0] ?? "";
    if (name === "eqcofe_session" || name === "__Host-eqcofe_session") customer.push(value);
    else flow.push(value);
  }
  return { customer, flow };
}

export function appendCheckoutFlowSetCookies(headers: Headers, values: readonly string[]): void {
  for (const value of values) headers.append("Set-Cookie", value);
}

function createAddressBody(form: FormData): CustomerAddressCreateBody {
  const provinceName = textField(form, "province_name", 100);
  const cityName = textField(form, "city_name", 100);
  const addressLine = textField(form, "address_line", 800);
  return {
    recipient_name: textField(form, "recipient_name", 150),
    recipient_mobile: mobileField(form),
    province_id: stableGeoId("province", provinceName),
    city_id: stableGeoId("city", cityName, provinceName),
    postal_code: postalField(form),
    address_line: `${provinceName}، ${cityName}، ${addressLine}`,
    building_no: optionalText(form, "building_no", 30),
    unit_no: optionalText(form, "unit_no", 30),
    location_metadata: { province_name: provinceName, city_name: cityName, source: "storefront_checkout_compatibility_bridge" },
    is_default: String(form.get("is_default") ?? "") === "on",
  };
}

function updateAddressBody(form: FormData): CustomerAddressUpdateBody {
  return {
    recipient_name: textField(form, "recipient_name", 150),
    recipient_mobile: mobileField(form),
    postal_code: postalField(form),
    address_line: textField(form, "address_line", 1000),
    building_no: optionalText(form, "building_no", 30),
    unit_no: optionalText(form, "unit_no", 30),
  };
}

function orderAddressSnapshot(address: CustomerAddress): CheckoutOrderBody["address"] {
  return {
    recipient_name: address.recipient_name, recipient_mobile: address.recipient_mobile,
    province_id: address.province_id, city_id: address.city_id, postal_code: address.postal_code,
    address_line: address.address_line, building_no: address.building_no, unit_no: address.unit_no,
  };
}

function stableGeoId(kind: "province" | "city", label: string, parent = ""): string {
  const normalized = [kind, parent, label].map((part) => part.trim().replace(/\s+/g, " ").toLocaleLowerCase("fa-IR")).join("|");
  const chars = createHash("sha256").update("eqcofe-checkout-geo|" + normalized).digest("hex").slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = "8";
  const hex = chars.join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function uuidField(form: FormData, name: string): string {
  const value = String(form.get(name) ?? "").trim();
  if (!UUID_RE.test(value)) throw new ApiClientError({ kind: "security", code: "CHECKOUT_FIELD_INVALID", message: name + " is invalid.", retryable: false });
  return value;
}
function textField(form: FormData, name: string, max: number): string {
  const value = String(form.get(name) ?? "").trim().replace(/\s+/g, " ");
  if (!value || value.length > max) throw new ApiClientError({ kind: "http", code: "ADDRESS_INVALID", message: name + " is invalid.", status: 422, retryable: false });
  return value;
}
function optionalText(form: FormData, name: string, max: number): string | null {
  const value = String(form.get(name) ?? "").trim().replace(/\s+/g, " ");
  if (!value) return null;
  if (value.length > max) throw new ApiClientError({ kind: "http", code: "ADDRESS_INVALID", message: name + " is invalid.", status: 422, retryable: false });
  return value;
}
function mobileField(form: FormData): string {
  const value = String(form.get("recipient_mobile") ?? "").replace(/[\s-]/g, "");
  if (!/^09\d{9}$/.test(value)) throw new ApiClientError({ kind: "http", code: "ADDRESS_INVALID", message: "mobile invalid", status: 422, retryable: false });
  return value;
}
function postalField(form: FormData): string {
  const value = String(form.get("postal_code") ?? "").replace(/\s/g, "");
  if (!/^\d{10}$/.test(value)) throw new ApiClientError({ kind: "http", code: "ADDRESS_INVALID", message: "postal invalid", status: 422, retryable: false });
  return value;
}
function validationFailure(message: string): CheckoutFlowData<CheckoutFlowMessage> {
  return { kind: "data", statusCode: 422, data: { status: "error", message, requestId: null }, setCookies: [] };
}
function flowFailure(error: unknown, statusOverride?: number): CheckoutFlowData<CheckoutFlowMessage> {
  const requestId = error instanceof ApiClientError ? error.requestId : null;
  const statusCode = statusOverride ?? (error instanceof ApiClientError && error.status && error.status >= 400 && error.status < 500 ? error.status : 503);
  const message = error instanceof ApiClientError && error.status === 409
    ? "وضعیت Checkout هم‌زمان تغییر کرده است. اطلاعات تازه را بازبینی و دوباره تلاش کنید."
    : error instanceof ApiClientError && error.status === 422
      ? "اطلاعات ارسال‌شده معتبر نیست. موارد مشخص‌شده را بازبینی کنید."
      : "نتیجه عملیات قطعی نشد؛ بدون فرض موفقیت، دوباره از وضعیت معتبر سرور ادامه دهید.";
  return { kind: "data", statusCode, data: { status: "error", message, requestId }, setCookies: [] };
}
function isUnauthorized(error: unknown): boolean { return error instanceof ApiClientError && error.status === 401; }

function requestWithSetCookies(request: Request, values: readonly string[]): Request {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  for (const value of values) {
    const pair = value.split(";", 1)[0]?.trim() ?? "";
    const separator = pair.indexOf("=");
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  const headers = new Headers();
  headers.set("cookie", [...cookies.entries()].map(([name, value]) => name + "=" + value).join("; "));
  return new Request(request.url, { headers });
}

function readSelection(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return {
    addressId: decodeUuid(cookies.get(secure ? "__Host-eqcofe_checkout_address" : "eqcofe_checkout_address")),
    shippingMethodId: decodeUuid(cookies.get(secure ? "__Host-eqcofe_checkout_shipping" : "eqcofe_checkout_shipping")),
  };
}
function serializeAddressSelection(request: Request, addressId: string): readonly string[] {
  const secure = new URL(request.url).protocol === "https:";
  return [serializeCookie(secure ? "__Host-eqcofe_checkout_address" : "eqcofe_checkout_address", addressId, secure), expireCookie(secure ? "__Host-eqcofe_checkout_shipping" : "eqcofe_checkout_shipping", secure)];
}
function serializeShippingSelection(request: Request, shippingMethodId: string): readonly string[] {
  const secure = new URL(request.url).protocol === "https:";
  return [serializeCookie(secure ? "__Host-eqcofe_checkout_shipping" : "eqcofe_checkout_shipping", shippingMethodId, secure)];
}
function clearSelection(request: Request): readonly string[] {
  const secure = new URL(request.url).protocol === "https:";
  return [expireCookie(secure ? "__Host-eqcofe_checkout_address" : "eqcofe_checkout_address", secure), expireCookie(secure ? "__Host-eqcofe_checkout_shipping" : "eqcofe_checkout_shipping", secure)];
}
function serializeCookie(name: string, value: string, secure: boolean): string {
  const attrs = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=900"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
function expireCookie(name: string, secure: boolean): string {
  const attrs = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
function parseCookieHeader(raw: string | null): Map<string,string> {
  const result = new Map<string,string>();
  for (const chunk of raw?.split(";") ?? []) {
    const part = chunk.trim(); if (!part) continue;
    const separator = part.indexOf("="); if (separator <= 0) continue;
    const name = part.slice(0, separator);
    if (result.has(name)) throw new ApiClientError({ kind: "security", code: "CHECKOUT_COOKIE_DUPLICATE", message: "Duplicate checkout state cookie.", retryable: false });
    result.set(name, part.slice(separator + 1));
  }
  return result;
}
function decodeUuid(raw: string | undefined): string | null {
  if (!raw) return null;
  try { const value = decodeURIComponent(raw); return UUID_RE.test(value) ? value : null; } catch { return null; }
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
