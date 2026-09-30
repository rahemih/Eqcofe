import { faIR } from "../../i18n/fa-IR.js";
import type { ProductDetailRouteData } from "./product-detail-data.server.js";

const SITE_ORIGIN = "https://eqcofe.com";

export function productDetailMeta(data: ProductDetailRouteData | undefined) {
  const product = data?.product.status === "ready" ? data.product.data : null;
  const title = product
    ? `${product.name_fa} | ${faIR.brandName}`
    : `جزئیات محصول | ${faIR.brandName}`;
  const description = product
    ? summarizeMetaText(
        product.short_description?.trim()
        || product.description?.trim()
        || `مشاهده ${product.name_fa} در EQCOFE.`,
      )
    : "جزئیات محصول در فروشگاه تجهیزات قهوه EQCOFE.";

  const entries = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: product ? "index,follow" : "noindex,follow" },
  ];

  if (!product) return entries;
  return [
    ...entries,
    {
      tagName: "link",
      rel: "canonical",
      href: `${SITE_ORIGIN}/product/${encodeURIComponent(product.slug)}`,
    },
  ];
}

function summarizeMetaText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177).trimEnd()}…`;
}
