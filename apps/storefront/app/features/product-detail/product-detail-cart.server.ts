import { ApiClientError } from "../../platform/api/errors.js";
import { createApiClient, type ApiClientConfig } from "../../platform/api/request.js";
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
};

export async function addProductVariantToCart(
  request: Request,
  variantId: string,
  options: AddProductVariantToCartOptions = {},
): Promise<AddProductVariantToCartResult> {
  if (!isUuid(variantId)) {
    throw new ApiClientError({
      kind: "configuration",
      code: "VARIANT_ID_INVALID",
      message: "Variant id is invalid.",
    });
  }

  const baseConfig = options.config ?? readServerApiConfig();
  const client = createApiClient({
    ...baseConfig,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });

  const credentials = readCartCredentials(request);
  const setCookies: string[] = [];

  if (credentials) {
    try {
      const result = await addItem(client, credentials.cartId, credentials.cartToken, variantId);
      return { itemCount: result.items.length, setCookies };
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.code !== "CART_ACCESS_DENIED") throw error;
    }
  }

  const created = await client.request("post", "/cart", {});
  const cartId = created.data.data.cart_id;
  const cartToken = created.data.data.cart_token;
  if (!isUuid(cartId) || !isSafeToken(cartToken)) {
    throw new ApiClientError({
      kind: "security",
      code: "CART_CREDENTIALS_INVALID",
      message: "Cart API returned invalid credentials.",
    });
  }

  setCookies.push(...serializeCartCredentials(request, cartId, cartToken));
  const result = await addItem(client, cartId, cartToken, variantId);
  return { itemCount: result.items.length, setCookies };
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
    INSUFFICIENT_STOCK: "موجودی این مدل برای افزودن به سبد کافی نیست.",
    SALES_GLOBALLY_DISABLED: "فروش آنلاین در حال حاضر متوقف است.",
    VARIANT_NOT_FOUND: "مدل انتخاب‌شده دیگر در دسترس نیست.",
    CART_ALREADY_IN_CHECKOUT: "این سبد وارد مرحله پرداخت شده است. از صفحه سبد ادامه دهید.",
    VALIDATION_ERROR: "درخواست افزودن به سبد معتبر نیست.",
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
) {
  const result = await client.request("post", "/cart/{id}/items", {
    pathParams: { id: cartId },
    headers: { "X-Cart-Token": cartToken },
    body: { variant_id: variantId, quantity: 1 },
  });
  return result.data.data;
}
