import { Form, useNavigation } from "react-router";
import type { ProductVariant } from "./product-detail-contract.js";
import { canAddVariantToCart, type ProductCartFeedback } from "./product-detail-cart.js";

export function ProductAddToCart({
  variant,
  feedback,
}: {
  variant: ProductVariant | null;
  feedback: ProductCartFeedback | null;
}) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting"
    && navigation.formData?.get("intent") === "add-to-cart";
  const enabled = canAddVariantToCart(variant);

  return (
    <section className="product-cart" aria-labelledby="product-cart-title">
      <h2 id="product-cart-title">سبد خرید</h2>
      <Form method="post" className="product-cart__form">
        <input type="hidden" name="intent" value="add-to-cart" />
        <input type="hidden" name="variant_id" value={variant?.id ?? ""} />
        <button type="submit" disabled={!enabled || submitting}>
          {submitting ? "در حال افزودن…" : enabled ? "افزودن به سبد خرید" : "این مدل قابل افزودن نیست"}
        </button>
      </Form>
      {feedback ? (
        <p
          className="product-cart__feedback"
          data-status={feedback.status}
          role={feedback.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
