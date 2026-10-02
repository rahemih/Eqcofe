import type { ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
  type CustomerSessionBridge,
} from "../../platform/auth/session-cookie.server.js";
import type {
  CompareRequest,
  CompareResponse,
  CompareValidateRequest,
  CompareValidateResponse,
  WishlistAddRequest,
  WishlistAddResponse,
  WishlistListResponse,
  WishlistRemoveRequest,
  WishlistRemoveResponse,
} from "./compare-wishlist-contract.js";

export type CompareWishlistDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type StorefrontDataResult<T> = {
  data: T;
  setCookies: readonly string[];
};

export async function validateCompare(
  request: Pick<Request, "headers">,
  input: CompareValidateRequest,
  options: CompareWishlistDataOptions = {},
): Promise<StorefrontDataResult<CompareValidateResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("post", "/compare/validate", input);
  return resultFromBridge(result.data, bridge);
}

export async function loadCompare(
  request: Pick<Request, "headers">,
  input: CompareRequest,
  options: CompareWishlistDataOptions = {},
): Promise<StorefrontDataResult<CompareResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("post", "/compare", input);
  return resultFromBridge(result.data, bridge);
}

export async function loadWishlist(
  request: Pick<Request, "headers">,
  options: CompareWishlistDataOptions = {},
): Promise<StorefrontDataResult<WishlistListResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("get", "/customer/wishlist", {});
  return resultFromBridge(result.data, bridge);
}

export async function addWishlistProduct(
  request: Pick<Request, "headers">,
  input: WishlistAddRequest,
  options: CompareWishlistDataOptions = {},
): Promise<StorefrontDataResult<WishlistAddResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("post", "/customer/wishlist/{product_id}", input);
  return resultFromBridge(result.data, bridge);
}

export async function removeWishlistProduct(
  request: Pick<Request, "headers">,
  input: WishlistRemoveRequest,
  options: CompareWishlistDataOptions = {},
): Promise<StorefrontDataResult<WishlistRemoveResponse>> {
  const bridge = createCustomerSessionBridge(request, options);
  const result = await bridge.client.request("delete", "/customer/wishlist/{product_id}", input);
  return resultFromBridge(result.data, bridge);
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
