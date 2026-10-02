import { ApiClientError } from "../../platform/api/errors.js";
import {
  loadWishlist,
  type CompareWishlistDataOptions,
} from "./compare-wishlist-data.server.js";

export type WishlistSnapshot = {
  status: "ready" | "unauthenticated" | "unavailable";
  productIds: readonly string[];
  setCookies: readonly string[];
};

export async function loadWishlistSnapshot(
  request: Pick<Request, "headers">,
  options: CompareWishlistDataOptions = {},
): Promise<WishlistSnapshot> {
  try {
    const result = await loadWishlist(request, options);
    return {
      status: "ready",
      productIds: result.data.items.map((item) => item.product_id),
      setCookies: result.setCookies,
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "http" && error.status === 401) {
      return {
        status: "unauthenticated",
        productIds: [],
        setCookies: [],
      };
    }

    return {
      status: "unavailable",
      productIds: [],
      setCookies: [],
    };
  }
}

export function isWishlisted(snapshot: WishlistSnapshot, productId: string): boolean {
  return snapshot.status === "ready" && snapshot.productIds.includes(productId);
}
