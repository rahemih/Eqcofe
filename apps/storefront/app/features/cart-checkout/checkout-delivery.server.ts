import { ApiClientError } from "../../platform/api/errors.js";
import type { ShippingMethodsResponse } from "./cart-checkout-contract.js";
import { createCheckoutQuote, loadCustomerAddresses, loadShippingMethods } from "./cart-checkout-data.server.js";
import {
  readSelectedAddressId,
  serializeReviewSnapshot,
  stableCartIdempotencyKey,
  type CheckoutReviewSnapshot,
} from "./checkout-flow-state.server.js";

export type ShippingMethod = ShippingMethodsResponse["data"][number];
export type CheckoutDeliveryLoaderData = {
  address: Awaited<ReturnType<typeof loadCustomerAddresses>>["data"]["data"][number];
  methods: ShippingMethod[];
};

export type CheckoutDeliveryActionResult =
  | { kind: "redirect"; location: "/checkout/review"; setCookies: readonly string[] }
  | { kind: "data"; statusCode: number; message: string; requestId: string | null };

export async function loadCheckoutDelivery(request: Request): Promise<{
  data: CheckoutDeliveryLoaderData;
  setCookies: readonly string[];
}> {
  const addressId = readSelectedAddressId(request);
  if (!addressId) throw new ApiClientError({ kind: "http", code: "CHECKOUT_ADDRESS_REQUIRED", message: "Address required.", status: 409 });
  const [addresses, methods] = await Promise.all([loadCustomerAddresses(request), loadShippingMethods()]);
  const address = addresses.data.data.find((item) => item.id === addressId);
  if (!address) throw new ApiClientError({ kind: "http", code: "CHECKOUT_ADDRESS_NOT_OWNED", message: "Address missing.", status: 409 });
  return { data: { address, methods: methods.data.data }, setCookies: addresses.setCookies };
}

export async function handleCheckoutDeliveryAction(request: Request): Promise<CheckoutDeliveryActionResult> {
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "quote") return failure(422, "عملیات روش تحویل شناخته‌شده نیست.");
  const shippingMethodId = String(form.get("shipping_method_id") ?? "");
  if (!UUID_RE.test(shippingMethodId)) return failure(422, "روش تحویل معتبر نیست.");
  const couponRaw = String(form.get("coupon_code") ?? "").trim();
  if (couponRaw.length > 100) return failure(422, "کد تخفیف معتبر نیست.");
  const coupon = couponRaw || null;

  try {
    const addressId = readSelectedAddressId(request);
    if (!addressId) return failure(409, "نشانی تسویه‌حساب انتخاب نشده است.");
    const [addresses, methods] = await Promise.all([loadCustomerAddresses(request), loadShippingMethods()]);
    const address = addresses.data.data.find((item) => item.id === addressId);
    const method = methods.data.data.find((item) => item.id === shippingMethodId);
    if (!address) return failure(409, "نشانی انتخاب‌شده دیگر قابل استفاده نیست.");
    if (!method) return failure(409, "روش تحویل انتخاب‌شده دیگر در دسترس نیست.");

    const quoteResult = await createCheckoutQuote(
      request,
      { shipping_method_id: shippingMethodId, coupon_code: coupon },
      stableCartIdempotencyKey(request, "checkout-quote", JSON.stringify({ shippingMethodId, coupon })),
    );
    const quote = quoteResult.data.data;
    const snapshot: CheckoutReviewSnapshot = {
      v: 1,
      checkoutId: quote.checkout_id,
      addressId,
      shipping: { id: method.id, code: method.code, nameFa: method.name_fa, feeToman: method.fee_toman },
      customerType: quote.customer_type,
      subtotalToman: quote.subtotal_toman,
      pricingDiscountToman: quote.pricing_discount_toman,
      marketingDiscountToman: quote.marketing_discount_toman,
      discountToman: quote.discount_toman,
      shippingToman: quote.shipping_toman,
      taxToman: quote.tax_toman,
      totalToman: quote.total_toman,
      expiresAt: quote.expires_at,
    };
    return {
      kind: "redirect",
      location: "/checkout/review",
      setCookies: [
        ...addresses.setCookies,
        ...quoteResult.setCookies,
        serializeReviewSnapshot(request, snapshot, quote.checkout_token),
      ],
    };
  } catch (error) {
    return apiFailure(error);
  }
}

function apiFailure(error: unknown): CheckoutDeliveryActionResult {
  if (error instanceof ApiClientError) {
    const statusCode = error.status === 409 ? 409 : error.status === 422 ? 422 : error.status === 401 ? 401 : error.status === 403 ? 403 : 503;
    return {
      kind: "data",
      statusCode,
      message: statusCode === 409 || statusCode === 422
        ? "قیمت، موجودی یا روش تحویل تغییر کرده است؛ داده‌های معتبر را دوباره بررسی کنید."
        : "محاسبه Quote قطعی نشد؛ نتیجه موفقیت ساخته نمی‌شود.",
      requestId: error.requestId,
    };
  }
  return failure(503, "محاسبه Quote قطعی نشد؛ نتیجه موفقیت ساخته نمی‌شود.");
}

function failure(statusCode: number, message: string): CheckoutDeliveryActionResult {
  return { kind: "data", statusCode, message, requestId: null };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
