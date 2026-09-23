import { faIR } from "../../i18n/fa-IR.js";
import type { CategoryRouteData } from "../category/category-data.server.js";
import type { SearchRouteData } from "../search/search-data.server.js";

// The canonical host is a site-owned constant: never derive SEO URLs from the
// untrusted request Host header or from a user-supplied query parameter.
const SITE_ORIGIN = "https://eqcofe.com";

export function searchMeta(data: SearchRouteData | undefined) {
  const title = data?.query
    ? `جست‌وجوی «${data.query}» | ${faIR.brandName}`
    : `جست‌وجوی تجهیزات قهوه | ${faIR.brandName}`;
  return [
    { title },
    { name: "description", content: "جست‌وجوی تجهیزات قهوه در فروشگاه EQCOFE." },
    { name: "robots", content: "noindex,follow" },
  ];
}

export function categoryMeta(data: CategoryRouteData | undefined) {
  const category = data?.category;
  const title = category
    ? `${category.name_fa} | ${faIR.brandName}`
    : `دسته‌بندی تجهیزات قهوه | ${faIR.brandName}`;
  const indexable = category !== null && category !== undefined
    && data?.issue === null
    && data?.products.status === "ready"
    && Object.keys(data.urlState).length === 0;
  const entries = [
    { title },
    {
      name: "description",
      content: category?.description?.trim() || `مشاهده محصولات دستهٔ ${category?.name_fa ?? "تجهیزات قهوه"} در EQCOFE.`,
    },
    { name: "robots", content: indexable ? "index,follow" : "noindex,follow" },
  ];
  if (!category) return entries;
  return [
    ...entries,
    { tagName: "link", rel: "canonical", href: `${SITE_ORIGIN}/category/${encodeURIComponent(category.slug)}` },
  ];
}
