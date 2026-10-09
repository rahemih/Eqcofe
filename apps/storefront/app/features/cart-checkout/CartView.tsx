import { Form, Link } from "react-router";
import { formatToman } from "../home/home-merchandising.js";
import type { CartViewResponse } from "./cart-checkout-contract.js";

export function CartView({ response, busy }: { response: CartViewResponse; busy: boolean }) {
  const cart = response.data;
  const wholesale = cart.customer_type === "wholesale";
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section
      className="cart-view"
      aria-labelledby="cart-items-title"
      data-wholesale-context={wholesale || undefined}
    >
      <div className="cart-view__main">
        {wholesale ? (
          <section className="cart-wholesale-context" aria-labelledby="cart-wholesale-title">
            <div>
              <span className="cart-wholesale-context__badge">SF-E-10 · حساب عمده فعال</span>
              <h2 id="cart-wholesale-title">قیمت‌گذاری عمده بر اساس تعداد فعلی سبد</h2>
            </div>
            <p>
              نوع مشتری، قیمت هر قلم و اثر تعداد از سرور دریافت شده‌اند. تغییر تعداد باعث
              محاسبه دوباره قیمت می‌شود و هیچ حداقل یا درصد تخفیفی در مرورگر ثابت نشده است.
            </p>
          </section>
        ) : null}

        <h2 id="cart-items-title">کالاهای سبد</h2>
        <ul className="cart-items">
          {cart.items.map((item) => {
            const available = item.availability.available_quantity;
            const lowStock = typeof available === "number" && available < 10;
            const quantityMax = typeof available === "number" && available > 0
              ? Math.min(999, available)
              : 999;

            return (
              <li className="cart-item" key={item.id}>
                <div className="cart-item__identity">
                  <strong>{item.product_name}</strong>
                  <span>SKU: <bdi>{item.sku}</bdi></span>
                  <span className="cart-item__availability" data-in-stock={item.availability.in_stock}>
                    {!item.availability.sales_enabled
                      ? "فروش این کالا فعلاً متوقف است"
                      : !item.availability.in_stock
                        ? "ناموجود"
                        : lowStock
                          ? `فقط ${new Intl.NumberFormat("fa-IR").format(available)} عدد موجود است`
                          : "موجود"}
                  </span>
                </div>

                {item.price ? (
                  <div className="cart-item__pricing" aria-label={`قیمت ${item.product_name}`}>
                    <span>قیمت واحد</span>
                    <strong>{formatToman(item.price.unit_final_toman)}</strong>
                    {item.price.unit_base_toman > item.price.unit_final_toman ? (
                      <del>{formatToman(item.price.unit_base_toman)}</del>
                    ) : null}
                    {item.price.discount_toman > 0 ? (
                      <span className="cart-item__saving">
                        صرفه‌جویی این ردیف: {formatToman(item.price.discount_toman)}
                      </span>
                    ) : null}
                    <span>جمع ردیف: {formatToman(item.price.line_total_toman)}</span>
                  </div>
                ) : (
                  <div className="cart-item__pricing-unavailable" role="status">
                    قیمت معتبر این قلم فعلاً در دسترس نیست؛ برای ادامه باید وضعیت سبد تازه‌سازی شود.
                  </div>
                )}

                <Form method="post" className="cart-item__quantity" aria-label={`تغییر تعداد ${item.product_name}`}>
                  <input type="hidden" name="intent" value="quantity" />
                  <input type="hidden" name="item_id" value={item.id} />
                  <label>
                    تعداد
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      max={quantityMax}
                      defaultValue={item.quantity}
                      inputMode="numeric"
                      disabled={busy || !item.availability.sales_enabled}
                    />
                  </label>
                  <button type="submit" disabled={busy || !item.availability.sales_enabled}>
                    به‌روزرسانی و محاسبه دوباره
                  </button>
                </Form>

                <Form method="post">
                  <input type="hidden" name="intent" value="remove" />
                  <input type="hidden" name="item_id" value={item.id} />
                  <button
                    className="cart-item__remove"
                    type="submit"
                    disabled={busy}
                    aria-label={`حذف ${item.product_name} از سبد`}
                  >
                    حذف
                  </button>
                </Form>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">{wholesale ? "جمع سبد عمده" : "ادامه خرید"}</h2>
        <p>تعداد اقلام: {new Intl.NumberFormat("fa-IR").format(itemCount)}</p>

        {cart.pricing ? (
          <dl className="cart-summary__pricing">
            <div><dt>جمع پایه</dt><dd>{formatToman(cart.pricing.subtotal_toman)}</dd></div>
            {cart.pricing.discount_toman > 0 ? (
              <div><dt>صرفه‌جویی قیمت‌گذاری</dt><dd>{formatToman(cart.pricing.discount_toman)}</dd></div>
            ) : null}
            <div className="cart-summary__total"><dt>جمع فعلی کالاها</dt><dd>{formatToman(cart.pricing.total_toman)}</dd></div>
          </dl>
        ) : (
          <p className="cart-summary__revalidation" role="status">
            جمع معتبر سبد فعلاً قابل محاسبه نیست.
          </p>
        )}

        <p>
          هزینه ارسال، مالیات و تخفیف‌های Checkout فقط در Quote معتبر مرحله بعد قطعی می‌شوند.
        </p>

        {cart.requires_revalidation || !cart.pricing ? (
          <div className="cart-summary__revalidation" role="alert">
            پیش از ادامه، قیمت/موجودی یا تعداد یکی از اقلام باید دوباره معتبر شود.
          </div>
        ) : (
          <Link className="cart-checkout-link" to="/checkout/identity">
            ادامه تسویه‌حساب
          </Link>
        )}
      </aside>
    </section>
  );
}
