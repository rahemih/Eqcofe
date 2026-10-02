import type { WishlistMutationResult } from "./wishlist-action.server.js";
import type { WishlistActionFeedback } from "./WishlistAction.js";

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
