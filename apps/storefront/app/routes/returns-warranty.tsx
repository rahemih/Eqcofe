import { StaticContentPage } from "../features/content/StaticContentPage.js";
import { returnsWarrantyContent } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "مرجوعی و گارانتی" };
export const meta = () => [
  { title: "سیاست مرجوعی و گارانتی | EQCOFE" },
  { name: "description", content: "فرایند عمومی مرجوعی و گارانتی و مرجع بررسی هر پرونده در EQCOFE." },
];

export default function ReturnsWarrantyRoute() {
  return <StaticContentPage {...returnsWarrantyContent} />;
}
