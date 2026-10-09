import { ApiClientError } from "../../platform/api/errors.js";
import { createApiClient, type ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
  extractCustomerSessionCookieHeader,
} from "../../platform/auth/session-cookie.server.js";
import { readServerApiConfig } from "../../platform/config/api.server.js";
import {
  appendCartCheckoutSetCookies,
  readCartCredentials,
  serializeCartCredentials,
} from "../cart-checkout/cart-checkout-session.server.js";
import type { ProductCartFeedback } from "./product-detail-cart.js";

export type AddProductVariantToCartOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type AddProductVariantToCartResult = {
  itemCount: number;
  setCookies: readonly string[];
  customerSessionSetCookies: readonly string[];
  customerType: "wholesale" | null;
};

export async function addProductVariantToCart(
  request: Request,
  variantId: string,
  quantityOrOptions: number | AddProductVariantToCartOptions = 1,
  explicitOptions: AddProductVariantToCartOptions = {},
): Promise<AddProductVariantToCartResult> {
  const quantity = typeof quantityOrOptions === "number" ? quantityOrOptions : 1;
  const options = typeof quantityOrOptions === "number" ? explicitOptions : quantityOrOptions;

  if (!isUuid(variantId)) {
    throw new ApiClientError({
      kind: "configuration",
      code: "VARIANT_ID_INVALID",
      message: "Variant id is invalid.",
    });
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
    throw new ApiClientError({
      kind: "configuration",
      code: "CART_QUANTITY_INVALID",
      message: "Cart quantity is invalid.",
    });
  }

  const sessionCookie = extractCustomerSessionCookieHeader(request);
  if (sessionCookie) {
    const wholesale = await tryAddToWholesaleCustomerCart(
      request,
      variantId,
      quantity,
      options,
    );
    if (wholesale) return wholesale;
  }

  return addToGuestCart(request, variantId, quantity, options);
}

async function tryAddToWholesaleCustomerCart(
  request: Request,
  variantId: string,
  quantity: number,
  options: AddProductVariantToCartOptions,
): Promise<AddProductVariantToCartResult | null> {
  const bridge = createCustomerSessionBridge(request, options);

  try {
    const profile = await bridge.client.request("get", "/customer/profile", {});
    if (profile.data.customer_type !== "wholesale") return null;
  } catch (error) {
    if (
      error instanceof ApiClientError
      && error.kind === "http"
      && error.status === 401
    ) {
      return null;
    }
    throw error;
  }

  const existing = readCartCredentials(request);
  let cartId: string;
  let cartToken: string;

  if (existing) {
    try {
      const merged = await bridge.client.request("post", "/customer/cart/merge", {
        body: {
          source_cart_id: existing.cartId,
          source_cart_token: existing.cartToken,
        },
      });
      cartId = merged.data.data.cart.id;
      cartToken = merged.data.data.cart_token;
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.code !== "CART_NOT_GUEST") {
        throw error;
      }
      const accessed = await bridge.client.request("post", "/customer/cart/access", {});
      cartId = accessed.data.data.cart.id;
      cartToken = accessed.data.data.cart_token;
    }
  } else {
    const accessed = await bridge.client.request("post", "/customer/cart/access", {});
    cartId = accessed.data.data.cart.id;
    cartToken = accessed.data.data.cart_token;
  }

  const result = await addItem(
    bridge.client,
    cartId,
    cartToken,
    variantId,
    quantity,
  );

  return {
    itemCount: result.items.length,
    setCookies: serializeCartCredentials(request, cartId, cartToken),
    customerSessionSetCookies: bridge.takeSetCookies(),
    customerType: "wholesale",
  };
}

async function addToGuestCart(
  request: Request,
  variantId: string,
  quantity: number,
  options: AddProductVariantToCartOptions,
): Promise<AddProductVariantToCartResult> {
  const baseConfig = options.config ?? readServerApiConfig();
  const client = createApiClient({
    ...baseConfig,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });

  const credentials = readCartCredentials(request);
  const setCookies: string[] = [];

  if (credentials) {
    try {
      const result = await addItem(
        client,
        credentials.cartId,
        credentials.cartToken,
        variantId,
        quantity,
      );
      return {
        itemCount: result.items.length,
        setCookies,
        customerSessionSetCookies: [],
        customerType: null,
      };
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.code !== "CART_ACCESS_DENIED") {
        throw error;
      }
    }
  }

  const created = await client.request("post", "/cart", {});
  const cartId = created.data.data.cart_id;
  const cartToken = created.data.data.cart_token;
  setCookies.push(...serializeCartCredentials(request, cartId, cartToken));
  const result = await addItem(client, cartId, cartToken, variantId, quantity);
  return {
    itemCount: result.items.length,
    setCookies,
    customerSessionSetCookies: [],
    customerType: null,
  };
}

export function appendGuestCartSetCookies(headers: Headers, values: readonly string[]): void {
  appendCartCheckoutSetCookies(headers, values);
}

export function productCartErrorResult(error: unknown): {
  feedback: ProductCartFeedback;
  status: number;
} {
  if (!(error instanceof ApiClientError)) {
    return {
      feedback: { status: "error", message: "افزودن به سبد انجام نشد. دوباره تلاش کنید." },
      status: 503,
    };
  }

  const messages: Record<string, string> = {
    INSUFFICIENT_STOCK: "موجودی این مدل برای تعداد انتخاب‌شده کافی نیست.",
    SALES_GLOBALLY_DISABLED: "فروش آنلاین در حال حاضر متوقف است.",
    VARIANT_NOT_FOUND: "مدل انتخاب‌شده دیگر در دسترس نیست.",
    CART_ALREADY_IN_CHECKOUT: "این سبد وارد مرحله پرداخت شده است. از صفحه سبد ادامه دهید.",
    CART_QUANTITY_INVALID: "تعداد انتخاب‌شده معتبر نیست.",
    VALIDATION_ERROR: "درخواست افزودن به سبد معتبر نیست.",
    CUSTOMER_COMMERCE_UNAVAILABLE: "وضعیت حساب برای قیمت‌گذاری فعلاً در دسترس نیست.",
  };

  return {
    feedback: {
      status: "error",
      message: messages[error.code] ?? "افزودن به سبد انجام نشد. دوباره تلاش کنید.",
      requestId: error.requestId,
    },
    status: error.status && error.status >= 400 && error.status < 600 ? error.status : 503,
  };
}

async function addItem(
  client: ReturnType<typeof createApiClient>,
  cartId: string,
  cartToken: string,
  variantId: string,
  quantity: number,
) {
  const result = await client.request("post", "/cart/{id}/items", {
    pathParams: { id: cartId },
    headers: { "X-Cart-Token": cartToken },
    body: { variant_id: variantId, quantity },
  });
  return result.data.data;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
