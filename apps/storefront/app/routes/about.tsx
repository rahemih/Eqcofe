import { StaticContentPage } from "../features/content/StaticContentPage.js";
import { aboutContent } from "../features/content/static-content.js";
import "../styles/content.css";

export const handle = { breadcrumb: "درباره ما" };
export const meta = () => [
  { title: "درباره ایکوفی | EQCOFE" },
  { name: "description", content: "معرفی محدوده فعالیت و تجربه خرید EQCOFE." },
];

export default function AboutRoute() {
  return <StaticContentPage {...aboutContent} />;
}
