import { randomUUID } from "node:crypto";
import { ApiClientError } from "../../platform/api/errors.js";
import {
  addWishlistProduct,
  loadWishlist,
  removeWishlistProduct,
  type CompareWishlistDataOptions,
} from "./compare-wishlist-data.server.js";

export type WishlistIntent = "wishlist-add" | "wishlist-remove";

export type WishlistMembershipResult =
  | { status: "ready"; wishlisted: boolean; setCookies: readonly string[] }
  | { status: "unauthenticated"; wishlisted: false; setCookies: readonly string[] };

export type WishlistMutationResult =
  | { status: "success"; wishlisted: boolean; alreadyPresent?: boolean; setCookies: readonly string[] }
  | { status: "unauthenticated"; wishlisted: boolean; setCookies: readonly string[] }
  | { status: "error"; wishlisted: boolean; requestId: string | null; retryable: boolean; setCookies: readonly string[] };

export async function loadWishlistMembership(
  request: Pick<Request, "headers">,
  productId: string,
  options: CompareWishlistDataOptions = {},
): Promise<WishlistMembershipResult> {
  try {
    const result = await loadWishlist(request, options);
    return {
      status: "ready",
      wishlisted: result.data.items.some((item) => item.product_id === productId),
      setCookies: result.setCookies,
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "unauthenticated", wishlisted: false, setCookies: [] };
    }
    throw error;
  }
}

export async function mutateWishlistProduct(
  request: Pick<Request, "headers">,
  input: {
    intent: WishlistIntent;
    productId: string;
    idempotencyKey?: string;
    currentWishlisted: boolean;
  },
  options: CompareWishlistDataOptions = {},
): Promise<WishlistMutationResult> {
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  try {
    if (input.intent === "wishlist-add") {
      const result = await addWishlistProduct(
        request,
        {
          pathParams: { product_id: input.productId },
          headers: { "Idempotency-Key": idempotencyKey },
        },
        options,
      );
      return {
        status: "success",
        wishlisted: true,
        alreadyPresent: result.data.already_present,
        setCookies: result.setCookies,
      };
    }

    const result = await removeWishlistProduct(
      request,
      {
        pathParams: { product_id: input.productId },
        headers: { "Idempotency-Key": idempotencyKey },
      },
      options,
    );
    return {
      status: "success",
      wishlisted: false,
      setCookies: result.setCookies,
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return {
        status: "unauthenticated",
        wishlisted: input.currentWishlisted,
        setCookies: [],
      };
    }
    if (error instanceof ApiClientError) {
      return {
        status: "error",
        wishlisted: input.currentWishlisted,
        requestId: error.requestId,
        retryable: error.retryable,
        setCookies: [],
      };
    }
    throw error;
  }
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && error.status === 401;
}
