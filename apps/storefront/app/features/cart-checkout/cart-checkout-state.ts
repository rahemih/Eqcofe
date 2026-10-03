import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type {
  CartViewResponse,
  CheckoutQuoteResponse,
  CheckoutReserveResponse,
  CheckoutOrderResponse,
  CustomerAddressesResponse,
  ShippingMethodsResponse,
  PaymentInitiateResponse,
  PaymentStatusResponse,
  PaymentVerifyResponse,
  GuestOrderResponse,
} from "./cart-checkout-contract.js";

export type CartCheckoutFoundationState = {
  cart: AsyncSurfaceState<CartViewResponse>;
  quote: AsyncSurfaceState<CheckoutQuoteResponse>;
  addresses: AsyncSurfaceState<CustomerAddressesResponse>;
  shippingMethods: AsyncSurfaceState<ShippingMethodsResponse>;
  reservation: AsyncSurfaceState<CheckoutReserveResponse>;
  order: AsyncSurfaceState<CheckoutOrderResponse>;
  paymentInitiation: AsyncSurfaceState<PaymentInitiateResponse>;
  paymentStatus: AsyncSurfaceState<PaymentStatusResponse>;
  paymentVerification: AsyncSurfaceState<PaymentVerifyResponse>;
  orderOutcome: AsyncSurfaceState<GuestOrderResponse>;
};

export type CartCheckoutAuthority = Readonly<{
  cart: "backend";
  pricing: "backend";
  stock: "backend";
  discount: "backend";
  shipping: "backend";
  reservation: "backend";
  order: "backend";
  payment: "backend";
}>;

export const CART_CHECKOUT_AUTHORITY: CartCheckoutAuthority = Object.freeze({
  cart: "backend",
  pricing: "backend",
  stock: "backend",
  discount: "backend",
  shipping: "backend",
  reservation: "backend",
  order: "backend",
  payment: "backend",
});

export const CART_CHECKOUT_RECOVERY = Object.freeze({
  unsafeMutationRetry: "never-without-authoritative-status",
  paymentReturnAuthority: "backend-status-or-verify",
  unknownResult: "recovery-not-success",
} as const);
