import { Form, Link } from "react-router";
import type { CartViewResponse } from "./cart-checkout-contract.js";

export function CartView({ response, busy }: { response: CartViewResponse; busy: boolean }) {
  const cart = response.data;
  return (
    <section className="cart-view" aria-labelledby="cart-items-title">
      <div className="cart-view__main">
        <h2 id="cart-items-title">کالاهای سبد</h2>
        <ul className="cart-items">
          {cart.items.map((item) => (
            <li className="cart-item" key={item.id}>
              <div className="cart-item__identity">
                <strong>{item.product_name}</strong>
                <span>SKU: <bdi>{item.sku}</bdi></span>
              </div>
              <Form method="post" className="cart-item__quantity" aria-label={`تغییر تعداد ${item.product_name}`}>
                <input type="hidden" name="intent" value="quantity" />
                <input type="hidden" name="item_id" value={item.id} />
                <label>
                  تعداد
                  <input name="quantity" type="number" min={1} max={999} defaultValue={item.quantity} inputMode="numeric" disabled={busy} />
                </label>
                <button type="submit" disabled={busy}>به‌روزرسانی</button>
              </Form>
              <Form method="post">
                <input type="hidden" name="intent" value="remove" />
                <input type="hidden" name="item_id" value={item.id} />
                <button className="cart-item__remove" type="submit" disabled={busy} aria-label={`حذف ${item.product_name} از سبد`}>حذف</button>
              </Form>
            </li>
          ))}
        </ul>
      </div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">ادامه خرید</h2>
        <p>قیمت، تخفیف، موجودی و هزینه ارسال در مراحل بعد فقط از پاسخ معتبر سرور محاسبه و نمایش داده می‌شوند.</p>
        <p>تعداد اقلام: {new Intl.NumberFormat("fa-IR").format(cart.items.reduce((sum, item) => sum + item.quantity, 0))}</p>
        <Link className="cart-checkout-link" to="/checkout/identity">ادامه تسویه‌حساب</Link>
      </aside>
    </section>
  );
}
