import { ApiClientError } from "../../platform/api/errors.js";
import type { GuestOrderResponse, GuestPaymentResponse, PaymentStatusResponse } from "./cart-checkout-contract.js";
import { initiatePayment, loadGuestOrder, loadPaymentForOrder, loadPaymentStatus, verifyPayment } from "./cart-checkout-data.server.js";
import { readPaymentHandoff, serializePaymentHandoff, stableCheckoutIdempotencyKey, type CheckoutPaymentHandoff } from "./checkout-flow-state.server.js";

export type PaymentReturnLoaderData = { handoff: CheckoutPaymentHandoff; status: PaymentStatusResponse["data"]; callbackHint: "processed" | "unconfirmed" | null };
export type PaymentActionResult =
  | { kind: "redirect"; location: string; setCookies: readonly string[] }
  | { kind: "data"; statusCode: number; message: string; requestId: string | null; status?: string };
export type OrderOutcomeLoaderData = { order: GuestOrderResponse["data"]; payment: GuestPaymentResponse["data"] | null };

export async function beginPaymentForOrder(request: Request, orderNumber: string, purpose: string) {
  const key = stableCheckoutIdempotencyKey(request, purpose + ":" + orderNumber);
  let result;
  try { result = await initiatePayment(request, orderNumber, key); }
  catch (error) { if (!isAmbiguousTransport(error)) throw error; result = await initiatePayment(request, orderNumber, key); }
  const payment = result.data.data;
  const setCookies = [serializePaymentHandoff(request, orderNumber, payment.payment_id)];
  if (payment.status === "paid" || payment.status === "late_received" || payment.status === "refund_required" || payment.status === "refunded") return { location: outcomeLocation(orderNumber), setCookies };
  if (payment.redirect_url) return { location: safeProviderRedirect(request, payment.redirect_url), setCookies };
  return { location: paymentReturnLocation(payment.payment_id), setCookies };
}

export async function loadPaymentReturn(request: Request): Promise<PaymentReturnLoaderData> {
  const handoff = readPaymentHandoff(request);
  const url = new URL(request.url), queryPaymentId = url.searchParams.get("payment_id");
  if (queryPaymentId && queryPaymentId !== handoff.paymentId) throw new ApiClientError({ kind: "security", code: "PAYMENT_RETURN_MISMATCH", message: "Payment return does not match the signed handoff.", retryable: false });
  const status = await loadPaymentStatus(request, handoff.paymentId), hint = url.searchParams.get("callback");
  return { handoff, status: status.data.data, callbackHint: hint === "processed" || hint === "unconfirmed" ? hint : null };
}

export async function handlePaymentReturnAction(request: Request): Promise<PaymentActionResult> {
  const form = await request.formData(), intent = String(form.get("intent") ?? "");
  try {
    const handoff = readPaymentHandoff(request);
    if (intent === "refresh-status") {
      const status = await loadPaymentStatus(request, handoff.paymentId);
      if (isPaidStatus(status.data.data.status)) return { kind: "redirect", location: outcomeLocation(handoff.orderNumber), setCookies: [] };
      return { kind: "data", statusCode: 200, message: statusMessage(status.data.data.status), requestId: null, status: status.data.data.status };
    }
    if (intent === "verify-payment") {
      const verified = await verifyPayment(request, handoff.paymentId);
      if (isPaidStatus(verified.data.data.status)) return { kind: "redirect", location: outcomeLocation(handoff.orderNumber), setCookies: [] };
      return { kind: "data", statusCode: 200, message: statusMessage(verified.data.data.status), requestId: null, status: verified.data.data.status };
    }
    return failure(422, "عملیات بررسی پرداخت شناخته‌شده نیست.");
  } catch (error) { return apiFailure(error, "نتیجه پرداخت قطعی نشد؛ موفقیت یا شکست حدس زده نمی‌شود."); }
}

export async function loadOrderOutcome(request: Request, orderNumber: string): Promise<OrderOutcomeLoaderData> {
  const order = await loadGuestOrder(request, orderNumber);
  let payment: GuestPaymentResponse["data"] | null = null;
  try { const handoff = readPaymentHandoff(request); if (handoff.orderNumber === orderNumber) payment = (await loadPaymentForOrder(request, orderNumber, handoff.paymentId)).data.data; } catch { payment = null; }
  return { order: order.data.data, payment };
}

export async function handleOrderOutcomeAction(request: Request, orderNumber: string): Promise<PaymentActionResult> {
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "retry-payment") return failure(422, "عملیات بازیابی پرداخت شناخته‌شده نیست.");
  try {
    const order = await loadGuestOrder(request, orderNumber);
    if (order.data.data.order_status !== "pending_confirmation") return failure(409, "این سفارش دیگر در وضعیت قابل پرداخت نیست.");
    try {
      const handoff = readPaymentHandoff(request);
      if (handoff.orderNumber === orderNumber) {
        const current = await loadPaymentStatus(request, handoff.paymentId), status = current.data.data.status;
        if (status === "initiating" || status === "pending" || status === "unknown") return failure(409, "نتیجه پرداخت قبلی هنوز قطعی نیست؛ ابتدا همان پرداخت را بررسی کنید.");
        if (isPaidStatus(status) || status === "refund_required" || status === "refunded") return { kind: "redirect", location: paymentReturnLocation(handoff.paymentId), setCookies: [] };
        return redirectResult(await beginPaymentForOrder(request, orderNumber, "payment-retry:" + handoff.paymentId));
      }
    } catch (error) { if (!(error instanceof ApiClientError) || error.code !== "CHECKOUT_PAYMENT_HANDOFF_MISSING") throw error; }
    if (!["unpaid","failed","cancelled"].includes(order.data.data.payment_status)) {
      return failure(409, "وضعیت پرداخت سفارش هنوز اجازه ایجاد پرداخت تازه نمی‌دهد؛ نتیجه قبلی باید ابتدا قطعی یا بازیابی شود.");
    }
    return redirectResult(await beginPaymentForOrder(request, orderNumber, "payment-recovery"));
  } catch (error) { return apiFailure(error, "پرداخت تازه آغاز نشد؛ وضعیت سفارش و پرداخت قبلی حفظ شده است."); }
}

function redirectResult(value: { location: string; setCookies: readonly string[] }): PaymentActionResult { return { kind: "redirect", location: value.location, setCookies: value.setCookies }; }
function paymentReturnLocation(paymentId: string): string { return "/payment/return?payment_id=" + encodeURIComponent(paymentId); }
function outcomeLocation(orderNumber: string): string { return "/order/" + encodeURIComponent(orderNumber) + "/outcome"; }
function safeProviderRedirect(request: Request, raw: string): string {
  let url: URL; try { url = new URL(raw); } catch { throw new ApiClientError({ kind: "security", code: "PAYMENT_REDIRECT_INVALID", message: "Payment redirect is invalid.", retryable: false }); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ApiClientError({ kind: "security", code: "PAYMENT_REDIRECT_INVALID", message: "Payment redirect protocol is invalid.", retryable: false });
  if (url.username || url.password || url.hash) throw new ApiClientError({ kind: "security", code: "PAYMENT_REDIRECT_INVALID", message: "Payment redirect contains forbidden URL parts.", retryable: false });
  if (new URL(request.url).protocol === "https:" && url.protocol !== "https:") throw new ApiClientError({ kind: "security", code: "PAYMENT_REDIRECT_DOWNGRADE", message: "Payment redirect cannot downgrade HTTPS.", retryable: false });
  return url.toString();
}
function isAmbiguousTransport(error: unknown): boolean { return error instanceof ApiClientError && (error.kind === "network" || error.kind === "timeout" || error.status === 503); }
function isPaidStatus(status: string): boolean { return status === "paid" || status === "late_received"; }
function statusMessage(status: string): string {
  if (status === "paid" || status === "late_received") return "پرداخت به‌صورت authoritative تأیید شد.";
  if (status === "failed" || status === "cancelled") return "پرداخت تأیید نشد؛ پیش از تلاش تازه همین وضعیت authoritative ثبت شده است.";
  if (status === "refund_required" || status === "refunded") return "پرداخت نیازمند مسیر بازپرداخت/پیگیری است و موفقیت سفارش فرض نمی‌شود.";
  return "نتیجه پرداخت هنوز قطعی نیست؛ پرداخت تازه ساخته نمی‌شود.";
}
function apiFailure(error: unknown, fallback: string): PaymentActionResult {
  if (error instanceof ApiClientError) return { kind: "data", statusCode: error.status === 409 ? 409 : error.status === 422 ? 422 : error.status === 401 ? 401 : error.status === 403 ? 403 : 503, message: fallback, requestId: error.requestId };
  return failure(503, fallback);
}
function failure(statusCode: number, message: string): PaymentActionResult { return { kind: "data", statusCode, message, requestId: null }; }
