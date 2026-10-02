import { Form } from "react-router";
import type { WishlistActionFeedback } from "./wishlist-action-state.js";

export function WishlistAction({
  productId,
  wishlisted,
  submitting = false,
  feedback = { status: "idle" },
}: {
  productId: string;
  wishlisted: boolean;
  submitting?: boolean;
  feedback?: WishlistActionFeedback;
}) {
  const intent = wishlisted ? "wishlist-remove" : "wishlist-add";
  const label = wishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها";

  return (
    <section className="wishlist-action" aria-labelledby="wishlist-action-title">
      <h2 id="wishlist-action-title">علاقه‌مندی</h2>
      <Form method="post">
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="current_wishlisted" value={wishlisted ? "1" : "0"} />
        <button
          type="submit"
          className="wishlist-action__button"
          aria-pressed={wishlisted}
          disabled={submitting}
        >
          {submitting ? "در حال ثبت…" : label}
        </button>
      </Form>

      <WishlistFeedback feedback={feedback} />
    </section>
  );
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
