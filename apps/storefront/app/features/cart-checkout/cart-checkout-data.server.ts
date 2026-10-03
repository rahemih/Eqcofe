import type { ApiClientConfig } from "../../platform/api/request.js";
import { createApiClient } from "../../platform/api/request.js";
import { readServerApiConfig } from "../../platform/config/api.server.js";
import {
  createCustomerSessionBridge,
  type CustomerSessionBridge,
} from "../../platform/auth/session-cookie.server.js";
import type {
  CartViewResponse,
  CheckoutOrderBody,
  CheckoutOrderResponse,
  CheckoutQuoteBody,
  CheckoutQuoteResponse,
  CheckoutReserveResponse,
  CustomerAddressCreateBody,
  CustomerAddressCreateResponse,
  CustomerAddressesResponse,
  CustomerAddressUpdateBody,
  CustomerAddressUpdateResponse,
  CustomerCartMergeResponse,
  CustomerCartResponse,
  GuestOrderResponse,
  PaymentInitiateResponse,
  PaymentStatusResponse,
  PaymentVerifyResponse,
  ShippingMethodsResponse,
} from "./cart-checkout-contract.js";
import {
  readCartCredentials,
  requireCartCredentials,
  requireCheckoutCredentials,
  serializeCheckoutCredentials,
} from "./cart-checkout-session.server.js";

export type CartCheckoutDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type StorefrontDataResult<T> = {
  data: T;
  setCookies: readonly string[];
};

export async function loadGuestCart(
  request: Request,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CartViewResponse | null>> {
  const credentials = readCartCredentials(request);
  if (!credentials) return { data: null, setCookies: [] };

  const client = createPlainClient(options);
  const result = await client.request("get", "/cart/{id}", {
    pathParams: { id: credentials.cartId },
    headers: { "X-Cart-Token": credentials.cartToken },
  });
  return { data: result.data, setCookies: [] };
}

export async function loadCustomerCart(
  request: Pick<Request, "headers">,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CustomerCartResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("get", "/customer/cart", {});
  return resultFromBridge(result.data, bridge);
}

export async function mergeGuestCartIntoCustomer(
  request: Request,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CustomerCartMergeResponse>> {
  const cart = requireCartCredentials(request);
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("post", "/customer/cart/merge", {
    headers: { "Idempotency-Key": idempotencyKey },
    body: {
      source_cart_id: cart.cartId,
      source_cart_token: cart.cartToken,
    },
  });
  return resultFromBridge(result.data, bridge);
}

export async function loadShippingMethods(
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<ShippingMethodsResponse>> {
  const client = createPlainClient(options);
  const result = await client.request("get", "/shipping-methods", {});
  return { data: result.data, setCookies: [] };
}

export async function createCheckoutQuote(
  request: Request,
  body: CheckoutQuoteBody,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CheckoutQuoteResponse>> {
  const cart = requireCartCredentials(request);
  const client = createPlainClient(options);
  const result = await client.request("post", "/cart/{id}/quote", {
    pathParams: { id: cart.cartId },
    headers: {
      "X-Cart-Token": cart.cartToken,
      "Idempotency-Key": idempotencyKey,
    },
    body,
  });
  const quote = result.data.data;
  return {
    data: result.data,
    setCookies: serializeCheckoutCredentials(request, quote.checkout_id, quote.checkout_token),
  };
}

export async function reserveCheckout(
  request: Request,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CheckoutReserveResponse>> {
  const checkout = requireCheckoutCredentials(request);
  const client = createPlainClient(options);
  const result = await client.request("post", "/checkout/{id}/reserve", {
    pathParams: { id: checkout.checkoutId },
    headers: {
      "X-Checkout-Token": checkout.checkoutToken,
      "Idempotency-Key": idempotencyKey,
    },
  });
  return { data: result.data, setCookies: [] };
}

export async function createOrderFromCheckout(
  request: Request,
  body: CheckoutOrderBody,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CheckoutOrderResponse>> {
  const checkout = requireCheckoutCredentials(request);
  const client = createPlainClient(options);
  const result = await client.request("post", "/checkout/{id}/order", {
    pathParams: { id: checkout.checkoutId },
    headers: {
      "X-Checkout-Token": checkout.checkoutToken,
      "Idempotency-Key": idempotencyKey,
    },
    body,
  });
  return { data: result.data, setCookies: [] };
}

export async function loadGuestOrder(
  request: Request,
  orderNumber: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<GuestOrderResponse>> {
  const checkout = requireCheckoutCredentials(request);
  const client = createPlainClient(options);
  const result = await client.request("get", "/orders/{number}", {
    pathParams: { number: orderNumber },
    headers: { "X-Checkout-Token": checkout.checkoutToken },
  });
  return { data: result.data, setCookies: [] };
}

export async function initiatePayment(
  request: Request,
  orderNumber: string,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<PaymentInitiateResponse>> {
  const secured = createCheckoutSecurityClient(request, options);
  const result = await secured.client.request("post", "/orders/{order_number}/payments", {
    pathParams: { order_number: orderNumber },
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return { data: result.data, setCookies: [] };
}

export async function verifyPayment(
  request: Request,
  paymentId: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<PaymentVerifyResponse>> {
  const secured = createCheckoutSecurityClient(request, options);
  const result = await secured.client.request("post", "/payments/{payment_id}/verify", {
    pathParams: { payment_id: paymentId },
  });
  return { data: result.data, setCookies: [] };
}

export async function loadPaymentStatus(
  request: Request,
  paymentId: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<PaymentStatusResponse>> {
  const secured = createCheckoutSecurityClient(request, options);
  const result = await secured.client.request("get", "/payments/{payment_id}/status", {
    pathParams: { payment_id: paymentId },
  });
  return { data: result.data, setCookies: [] };
}

export async function loadCustomerAddresses(
  request: Pick<Request, "headers">,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CustomerAddressesResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("get", "/customer/addresses", {});
  return resultFromBridge(result.data, bridge);
}

export async function createCustomerAddress(
  request: Pick<Request, "headers">,
  body: CustomerAddressCreateBody,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CustomerAddressCreateResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("post", "/customer/addresses", {
    headers: { "Idempotency-Key": idempotencyKey },
    body,
  });
  return resultFromBridge(result.data, bridge);
}

export async function updateCustomerAddress(
  request: Pick<Request, "headers">,
  addressId: string,
  body: CustomerAddressUpdateBody,
  idempotencyKey: string,
  options: CartCheckoutDataOptions = {},
): Promise<StorefrontDataResult<CustomerAddressUpdateResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("patch", "/customer/addresses/{id}", {
    pathParams: { id: addressId },
    headers: { "Idempotency-Key": idempotencyKey },
    body,
  });
  return resultFromBridge(result.data, bridge);
}

function createPlainClient(options: CartCheckoutDataOptions) {
  const config = options.config ?? readServerApiConfig();
  return createApiClient({
    ...config,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
}

function createCheckoutSecurityClient(
  request: Request,
  options: CartCheckoutDataOptions,
) {
  const checkout = requireCheckoutCredentials(request);
  const config = options.config ?? readServerApiConfig();
  const transportFetch = options.fetchImpl ?? config.fetchImpl ?? fetch;

  const securedFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.delete("cookie");
    headers.delete("authorization");
    headers.delete("proxy-authorization");
    headers.delete("x-checkout-token");
    headers.set("X-Checkout-Token", checkout.checkoutToken);
    return transportFetch(input, {
      ...init,
      headers,
      credentials: "omit",
    });
  };

  return {
    client: createApiClient({
      ...config,
      fetchImpl: securedFetch,
    }),
  };
}

function resultFromBridge<T>(
  data: T,
  bridge: CustomerSessionBridge,
): StorefrontDataResult<T> {
  return {
    data,
    setCookies: bridge.takeSetCookies(),
  };
}
