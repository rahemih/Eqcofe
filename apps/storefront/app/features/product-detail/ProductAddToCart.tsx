import { Form, useNavigation } from "react-router";
import type { ProductCustomerType, ProductVariant } from "./product-detail-contract.js";
import { canAddVariantToCart, type ProductCartFeedback } from "./product-detail-cart.js";

export function ProductAddToCart({
  variant,
  feedback,
  customerType,
}: {
  variant: ProductVariant | null;
  feedback: ProductCartFeedback | null;
  customerType: ProductCustomerType | null;
}) {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting"
    && navigation.formData?.get("intent") === "add-to-cart";
  const enabled = canAddVariantToCart(variant);
  const wholesale = customerType === "wholesale";

  return (
    <section
      className="product-cart"
      aria-labelledby="product-cart-title"
      data-wholesale-context={wholesale || undefined}
    >
      <div className="product-cart__heading">
        <h2 id="product-cart-title">سبد خرید</h2>
        {wholesale ? <span className="product-cart__wholesale-badge">حساب عمده فعال</span> : null}
      </div>

      {wholesale ? (
        <div className="product-cart__wholesale-context" role="status">
          <strong>خرید عمده تأییدشده</strong>
          <p>
            قیمت نمایش‌داده‌شده در بخش مدل، قیمت کاتالوگ است. قیمت معتبر عمده و اثر تعداد
            پس از افزودن، از Pricing سرور در سبد خرید دوباره محاسبه می‌شود.
          </p>
        </div>
      ) : null}

      <Form method="post" className="product-cart__form">
        <input type="hidden" name="intent" value="add-to-cart" />
        <input type="hidden" name="variant_id" value={variant?.id ?? ""} />

        {wholesale ? (
          <label className="product-cart__quantity">
            تعداد
            <input
              name="quantity"
              type="number"
              min={1}
              max={999}
              step={1}
              defaultValue={1}
              inputMode="numeric"
              disabled={!enabled || submitting}
              aria-describedby="product-cart-quantity-help"
            />
            <small id="product-cart-quantity-help">
              هیچ حداقل یا درصد تخفیفی در مرورگر ثابت نشده است؛ قیمت با تعداد فعلی توسط سرور تعیین می‌شود.
            </small>
          </label>
        ) : null}

        <button type="submit" disabled={!enabled || submitting}>
          {submitting
            ? "در حال افزودن…"
            : enabled
              ? wholesale
                ? "افزودن با محاسبه قیمت عمده"
                : "افزودن به سبد خرید"
              : "این مدل قابل افزودن نیست"}
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
