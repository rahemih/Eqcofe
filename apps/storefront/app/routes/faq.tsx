import { Link } from "react-router";
import { FAQ_ITEMS } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "پرسش‌های متداول" };
export const meta = () => [
  { title: "پرسش‌های متداول | EQCOFE" },
  { name: "description", content: "پاسخ‌های عمومی و مصوب درباره قیمت، موجودی، عمده، پرداخت و خدمات پس از فروش EQCOFE." },
  { name: "robots", content: "index,follow" },
];

export default function FaqRoute() {
  return (
    <main className="content-page static-info-page" aria-labelledby="faq-title">
      <header className="content-page__hero">
        <p className="content-page__eyebrow">SF-F-05 · محتوای مصوب</p>
        <h1 id="faq-title">پرسش‌های پرتکرار</h1>
        <p>پاسخ‌های کوتاه زیر فقط قواعد تأییدشده پروژه را توضیح می‌دهند و نتیجه سفارش یا پرونده مشخص را پیش‌بینی نمی‌کنند.</p>
      </header>
      <section className="faq-list" aria-label="پرسش‌ها و پاسخ‌ها">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>
      <nav className="static-info-page__actions" aria-label="راهنمای بیشتر">
        <Link className="content-page__action" to="/policies/terms">شرایط استفاده</Link>
        <Link className="content-page__action" to="/policies/returns-warranty">مرجوعی و گارانتی</Link>
        <Link className="content-page__action" to="/contact">تماس با ما</Link>
      </nav>
    </main>
  );
}
