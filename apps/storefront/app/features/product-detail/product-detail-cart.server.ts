import { ApiClientError } from "../../platform/api/errors.js";
import { createApiClient, type ApiClientConfig } from "../../platform/api/request.js";
import { readServerApiConfig } from "../../platform/config/api.server.js";
import type { ProductCartFeedback } from "./product-detail-cart.js";

const CART_ID_COOKIE = "eqcofe_cart_id";
const CART_TOKEN_COOKIE = "eqcofe_cart_token";
const HOST_CART_ID_COOKIE = "__Host-eqcofe_cart_id";
const HOST_CART_TOKEN_COOKIE = "__Host-eqcofe_cart_token";
const CART_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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

  let credentials = readCartCredentials(request);
  const setCookies: string[] = [];

  if (credentials) {
    try {
      const result = await addItem(client, credentials.cartId, credentials.cartToken, variantId);
      return { itemCount: result.items.length, setCookies };
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.code !== "CART_ACCESS_DENIED") throw error;
      credentials = null;
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
  for (const value of values) headers.append("Set-Cookie", value);
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

function readCartCredentials(request: Request): { cartId: string; cartToken: string } | null {
  const secure = new URL(request.url).protocol === "https:";
  const idName = secure ? HOST_CART_ID_COOKIE : CART_ID_COOKIE;
  const tokenName = secure ? HOST_CART_TOKEN_COOKIE : CART_TOKEN_COOKIE;
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const rawId = cookies.get(idName);
  const rawToken = cookies.get(tokenName);
  if (!rawId || !rawToken) return null;

  const cartId = safeDecode(rawId);
  const cartToken = safeDecode(rawToken);
  if (!cartId || !cartToken || !isUuid(cartId) || !isSafeToken(cartToken)) return null;
  return { cartId, cartToken };
}

function serializeCartCredentials(request: Request, cartId: string, cartToken: string): readonly string[] {
  const secure = new URL(request.url).protocol === "https:";
  const idName = secure ? HOST_CART_ID_COOKIE : CART_ID_COOKIE;
  const tokenName = secure ? HOST_CART_TOKEN_COOKIE : CART_TOKEN_COOKIE;
  return [
    serializeCookie(idName, cartId, secure),
    serializeCookie(tokenName, cartToken, secure),
  ];
}

function serializeCookie(name: string, value: string, secure: boolean): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${CART_COOKIE_MAX_AGE_SECONDS}`,
  ];
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
      throw new ApiClientError({
        kind: "security",
        code: "CART_COOKIE_DUPLICATE",
        message: "Duplicate cart cookie was rejected.",
      });
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
