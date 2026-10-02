import { useId } from "react";
import { useFetcher } from "react-router";
import "../../styles/wishlist.css";
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
  const hintId = `${headingId}-hint`;
  const feedbackId = `${headingId}-feedback`;
  const actionWishlisted = fetcher.data?.status === "success"
    ? fetcher.data.wishlisted
    : wishlisted;
  const submitting = fetcher.state !== "idle";
  const feedback = fetcher.data
    ?? externalFeedback
    ?? initialMembershipFeedback(membershipStatus);
  const intent = actionWishlisted ? "wishlist-remove" : "wishlist-add";
  const label = actionWishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها";
  const showUnavailableHint = membershipStatus === "unavailable" && fetcher.data === undefined;
  const describedBy = [
    showUnavailableHint ? hintId : null,
    feedback.status !== "idle" ? feedbackId : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <section
      className="wishlist-action"
      aria-labelledby={headingId}
      aria-busy={submitting}
    >
      <h3 id={headingId}>علاقه‌مندی</h3>
      <fetcher.Form method="post" action="/actions/wishlist" aria-busy={submitting}>
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="current_wishlisted" value={actionWishlisted ? "1" : "0"} />
        <button
          type="submit"
          className="wishlist-action__button"
          aria-pressed={actionWishlisted}
          aria-describedby={describedBy}
          disabled={submitting}
        >
          {submitting ? "در حال ثبت…" : label}
        </button>
      </fetcher.Form>

      {showUnavailableHint ? (
        <p id={hintId} className="wishlist-action__hint">
          وضعیت فعلی علاقه‌مندی در دسترس نیست؛ افزودن محصول همچنان به‌صورت امن و تکرارپذیر انجام می‌شود.
        </p>
      ) : null}
      <WishlistFeedback id={feedbackId} feedback={feedback} />
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

function WishlistFeedback({
  id,
  feedback,
}: {
  id: string;
  feedback: WishlistActionFeedback;
}) {
  if (feedback.status === "idle") return null;

  const urgent = feedback.status === "error";
  return (
    <div
      id={id}
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
