import { FaqPage } from "../features/content/StaticContentPage.js";
import { faqContent } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "پرسش‌های متداول" };
export const meta = () => [
  { title: "پرسش‌های متداول | EQCOFE" },
  { name: "description", content: "پاسخ‌های عمومی درباره خرید، حساب، پرداخت، عمده‌فروشی و خدمات پس از فروش EQCOFE." },
];

export default function FaqRoute() {
  return <FaqPage {...faqContent} />;
}
