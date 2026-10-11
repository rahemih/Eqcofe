import { StaticInfoPage } from "../features/content/StaticInfoPage.js";
import { TERMS_CONTENT } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "شرایط استفاده" };
export const meta = () => [
  { title: "شرایط استفاده و قوانین خرید | EQCOFE" },
  { name: "description", content: "قواعد عمومی مصوب استفاده، قیمت، سفارش، پرداخت و خرید عمده در EQCOFE." },
  { name: "robots", content: "index,follow" },
];

export default function TermsRoute() {
  return <StaticInfoPage content={TERMS_CONTENT} actions={[{ to: "/faq", label: "پرسش‌های متداول" }, { to: "/contact", label: "تماس برای راهنمایی" }]} />;
}
