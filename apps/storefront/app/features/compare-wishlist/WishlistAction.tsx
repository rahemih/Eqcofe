import { useId } from "react";
import { useFetcher } from "react-router";
import type {
  WishlistActionFeedback,
  WishlistActionPayload,
  WishlistMembershipStatus,
} from "./wishlist-action-state.js";

export function WishlistAction({
  productId,
  wishlisted,
  membershipStatus = "ready",
  feedback: externalFeedback,
}: {
  productId: string;
  wishlisted: boolean;
  membershipStatus?: WishlistMembershipStatus;
  feedback?: WishlistActionFeedback;
}) {
  const fetcher = useFetcher<WishlistActionPayload>();
  const headingId = useId();
  const actionWishlisted = fetcher.data?.status === "success"
    ? fetcher.data.wishlisted
    : wishlisted;
  const submitting = fetcher.state !== "idle";
  const feedback = fetcher.data
    ?? externalFeedback
    ?? initialMembershipFeedback(membershipStatus);
  const intent = actionWishlisted ? "wishlist-remove" : "wishlist-add";
  const label = actionWishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها";

  return (
    <section className="wishlist-action" aria-labelledby={headingId}>
      <h3 id={headingId}>علاقه‌مندی</h3>
      <fetcher.Form method="post" action="/actions/wishlist">
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="current_wishlisted" value={actionWishlisted ? "1" : "0"} />
        <button
          type="submit"
          className="wishlist-action__button"
          aria-pressed={actionWishlisted}
          disabled={submitting}
        >
          {submitting ? "در حال ثبت…" : label}
        </button>
      </fetcher.Form>

      {membershipStatus === "unavailable" && fetcher.data === undefined ? (
        <p className="wishlist-action__hint">
          وضعیت فعلی علاقه‌مندی در دسترس نیست؛ افزودن محصول همچنان به‌صورت امن و تکرارپذیر انجام می‌شود.
        </p>
      ) : null}
      <WishlistFeedback feedback={feedback} />
    </section>
  );
}

function initialMembershipFeedback(
  status: WishlistMembershipStatus,
): WishlistActionFeedback {
  if (status === "unauthenticated") {
    return {
      status: "unauthenticated",
      message: "برای ذخیره محصول در علاقه‌مندی‌ها باید وارد حساب مشتری شوید.",
    };
  }
  return { status: "idle" };
}

function WishlistFeedback({ feedback }: { feedback: WishlistActionFeedback }) {
  if (feedback.status === "idle") return null;

  const urgent = feedback.status === "error";
  return (
    <div
      className="wishlist-action__feedback"
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      data-status={feedback.status}
    >
      <p>{feedback.message}</p>
      {"requestId" in feedback && feedback.requestId ? (
        <p>
          <span>شناسه پیگیری: </span>
          <bdi dir="ltr">{feedback.requestId}</bdi>
        </p>
      ) : null}
    </div>
  );
}
