import { SupportContactView } from "../features/content/SupportContactView.js";
import "../styles/content.css";

export const handle = { breadcrumb: "تماس با ما" };
export const meta = () => [
  { title: "تماس و پشتیبانی | EQCOFE" },
  { name: "description", content: "مسیرهای امن و معتبر پشتیبانی سفارش، مرجوعی، گارانتی و عمده‌فروشی در EQCOFE." },
  { name: "robots", content: "index,follow" },
];

export default function ContactRoute() {
  return <SupportContactView />;
}
