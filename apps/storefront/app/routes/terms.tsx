import { StaticContentPage } from "../features/content/StaticContentPage.js";
import { termsContent } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "شرایط استفاده" };
export const meta = () => [
  { title: "شرایط استفاده و قوانین خرید | EQCOFE" },
  { name: "description", content: "شرایط عمومی استفاده، قیمت، سفارش، پرداخت و حساب در فروشگاه EQCOFE." },
];

export default function TermsRoute() {
  return <StaticContentPage {...termsContent} />;
}
