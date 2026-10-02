export type WishlistActionFeedback =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "unauthenticated"; message: string }
  | { status: "error"; message: string; requestId?: string | null };

export type WishlistMembershipStatus = "ready" | "unauthenticated" | "unavailable";

export type WishlistMembershipView = {
  status: WishlistMembershipStatus;
  productIds: readonly string[];
};

export type WishlistActionPayload =
  Exclude<WishlistActionFeedback, { status: "idle" }>
  & { wishlisted: boolean };

import type { WishlistMutationResult } from "./wishlist-action.server.js";
export function wishlistFeedbackFromMutation(
  result: WishlistMutationResult,
): WishlistActionFeedback {
  if (result.status === "success") {
    return {
      status: "success",
      message: result.wishlisted
        ? (result.alreadyPresent
          ? "این محصول از قبل در علاقه‌مندی‌های شما بود."
          : "محصول به علاقه‌مندی‌های شما افزوده شد.")
        : "محصول از علاقه‌مندی‌های شما حذف شد.",
    };
  }

  if (result.status === "unauthenticated") {
    return {
      status: "unauthenticated",
      message: "برای ذخیره یا حذف محصول از علاقه‌مندی‌ها باید وارد حساب مشتری شوید.",
    };
  }

  return {
    status: "error",
    message: result.retryable
      ? "ثبت علاقه‌مندی کامل نشد؛ دوباره تلاش کنید."
      : "ثبت علاقه‌مندی انجام نشد.",
    requestId: result.requestId,
  };
}
