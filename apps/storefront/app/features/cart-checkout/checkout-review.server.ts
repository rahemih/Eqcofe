import { ApiClientError } from "../../platform/api/errors.js";
import type { CustomerAddressesResponse } from "./cart-checkout-contract.js";
import {
  createOrderFromCheckout,
  loadCustomerAddresses,
  loadGuestCart,
  reserveCheckout,
} from "./cart-checkout-data.server.js";
import {
  readReviewSnapshot,
  stableCheckoutIdempotencyKey,
  type CheckoutReviewSnapshot,
} from "./checkout-flow-state.server.js";

export type ReviewAddress = CustomerAddressesResponse["data"][number];
export type CheckoutReviewLoaderData = {
  snapshot: CheckoutReviewSnapshot;
  address: ReviewAddress;
  cart: NonNullable<Awaited<ReturnType<typeof loadGuestCart>>["data"]>;
};

export type CheckoutReviewActionResult =
  | { kind: "redirect"; location: string }
  | { kind: "data"; statusCode: number; message: string; requestId: string | null };

export async function loadCheckoutReview(request: Request): Promise<{
  data: CheckoutReviewLoaderData;
  setCookies: readonly string[];
}> {
  const snapshot = readReviewSnapshot(request);
  const [addresses, cart] = await Promise.all([loadCustomerAddresses(request), loadGuestCart(request)]);
  const address = addresses.data.data.find((item) => item.id === snapshot.addressId);
  if (!address) throw new ApiClientError({ kind: "http", code: "CHECKOUT_ADDRESS_NOT_OWNED", message: "Address missing.", status: 409 });
  if (!cart.data || cart.data.data.items.length === 0) {
    throw new ApiClientError({ kind: "http", code: "CHECKOUT_CART_EMPTY", message: "Cart empty.", status: 409 });
  }
  return { data: { snapshot, address, cart: cart.data }, setCookies: addresses.setCookies };
}

export async function handleCheckoutReviewAction(request: Request): Promise<CheckoutReviewActionResult> {
  const form = await request.formData();
  if (String(form.get("intent") ?? "") !== "submit-order") return failure(422, "عملیات ثبت سفارش شناخته‌شده نیست.");
  try {
    const snapshot = readReviewSnapshot(request);
    const addresses = await loadCustomerAddresses(request);
    const address = addresses.data.data.find((item) => item.id === snapshot.addressId);
    if (!address) return failure(409, "نشانی انتخاب‌شده دیگر قابل استفاده نیست.");

    await reserveCheckout(request, stableCheckoutIdempotencyKey(request, "checkout-reserve"));
    const order = await createOrderFromCheckout(
      request,
      { address: toOrderAddress(address) },
      stableCheckoutIdempotencyKey(request, "checkout-order"),
    );
    return { kind: "redirect", location: "/order/" + encodeURIComponent(order.data.data.order_number) + "/outcome" };
  } catch (error) {
    return apiFailure(error);
  }
}

function toOrderAddress(address: ReviewAddress) {
  return {
    recipient_name: address.recipient_name,
    recipient_mobile: address.recipient_mobile,
    province_id: address.province_id,
    city_id: address.city_id,
    postal_code: address.postal_code,
    address_line: address.address_line,
    building_no: address.building_no,
    unit_no: address.unit_no,
  };
}

function apiFailure(error: unknown): CheckoutReviewActionResult {
  if (error instanceof ApiClientError) {
    const statusCode = error.status === 409 ? 409 : error.status === 422 ? 422 : error.status === 401 ? 401 : error.status === 403 ? 403 : 503;
    let message = "ثبت سفارش قطعی نشد؛ بدون ساختن موفقیت، همان درخواست idempotent قابل بازیابی می‌ماند.";
    if (error.code === "CART_CHANGED_SINCE_QUOTE" || error.code === "SHIPPING_METHOD_UNAVAILABLE") {
      message = "Quote دیگر معتبر نیست؛ به مرحله تحویل برگردید و مبلغ را دوباره محاسبه کنید.";
    } else if (error.code === "CHECKOUT_INVALID") {
      message = "زمان Checkout یا Reservation پایان یافته است؛ مبلغ را دوباره محاسبه کنید.";
    } else if (error.code === "ORDER_ALREADY_CREATED") {
      message = "برای این Checkout قبلاً سفارش ساخته شده است؛ نتیجه باید از مسیر بازیابی سفارش بررسی شود.";
    }
    return { kind: "data", statusCode, message, requestId: error.requestId };
  }
  return failure(503, "ثبت سفارش قطعی نشد؛ نتیجه موفقیت ساخته نمی‌شود.");
}

function failure(statusCode: number, message: string): CheckoutReviewActionResult {
  return { kind: "data", statusCode, message, requestId: null };
}
