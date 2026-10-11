import { StaticInfoPage } from "../features/content/StaticInfoPage.js";
import { ABOUT_CONTENT } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "درباره ما" };
export const meta = () => [
  { title: "درباره ایکوفی | EQCOFE" },
  { name: "description", content: "درباره محدوده فروشگاه تجهیزات قهوه EQCOFE و مرزهای اطلاعات خرید." },
  { name: "robots", content: "index,follow" },
];

export default function AboutRoute() {
  return <StaticInfoPage content={ABOUT_CONTENT} actions={[{ to: "/search", label: "مشاهده محصولات" }, { to: "/contact", label: "تماس با ایکوفی" }]} />;
}
