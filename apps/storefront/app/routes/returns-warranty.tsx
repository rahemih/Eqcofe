import { StaticInfoPage } from "../features/content/StaticInfoPage.js";
import { RETURNS_CONTENT } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "مرجوعی و گارانتی" };
export const meta = () => [
  { title: "سیاست مرجوعی و گارانتی | EQCOFE" },
  { name: "description", content: "فرایند عمومی و مصوب درخواست مرجوعی و گارانتی در EQCOFE بدون وعده eligibility پرونده خاص." },
  { name: "robots", content: "index,follow" },
];

export default function ReturnsWarrantyRoute() {
  return <StaticInfoPage content={RETURNS_CONTENT} actions={[{ to: "/account/orders", label: "بررسی سفارش‌های من" }, { to: "/contact", label: "تماس با پشتیبانی" }]} />;
}
