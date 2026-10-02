import { data } from "react-router";
import {
  mutateWishlistProduct,
  type WishlistIntent,
} from "../features/compare-wishlist/wishlist-action.server.js";
import { loadWishlistSnapshot } from "../features/compare-wishlist/wishlist-snapshot.server.js";
import {
  wishlistFeedbackFromMutation,
  type WishlistActionPayload,
} from "../features/compare-wishlist/wishlist-action-state.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";

const ENTITY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loader({ request }: { request: Request }) {
  const snapshot = await loadWishlistSnapshot(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, snapshot.setCookies);
  return data(
    { status: snapshot.status, productIds: snapshot.productIds },
    { headers },
  );
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const productId = formData.get("product_id");
  const currentWishlisted = formData.get("current_wishlisted");

  if (
    (intent !== "wishlist-add" && intent !== "wishlist-remove")
    || typeof productId !== "string"
    || !ENTITY_ID.test(productId)
    || (currentWishlisted !== "0" && currentWishlisted !== "1")
  ) {
    return data<WishlistActionPayload>(
      {
        status: "error",
        wishlisted: currentWishlisted === "1",
        message: "درخواست علاقه‌مندی معتبر نیست.",
        requestId: null,
      },
      { status: 400 },
    );
  }

  const result = await mutateWishlistProduct(request, {
    intent: intent as WishlistIntent,
    productId,
    currentWishlisted: currentWishlisted === "1",
  });

  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  const feedback = wishlistFeedbackFromMutation(result);
  const payload: WishlistActionPayload = {
    ...feedback,
    wishlisted: result.wishlisted,
  };

  return data(payload, {
    status: result.status === "unauthenticated"
      ? 401
      : result.status === "error"
        ? 502
        : 200,
    headers,
  });
}
