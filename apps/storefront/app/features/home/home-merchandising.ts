import type { HomeProductList } from "./home-data.server.js";

export type HomeMerchandisingProduct = {
  id: string;
  slug: string;
  name: string;
  currentToman: number;
  salesEnabled: boolean;
  inStock: boolean;
};

const HOME_MERCHANDISING_LIMIT = 6;

export function deriveHomeMerchandising(
  products: HomeProductList,
): HomeMerchandisingProduct[] {
  const result: HomeMerchandisingProduct[] = [];

  for (const item of products.items) {
    if (result.length >= HOME_MERCHANDISING_LIMIT) break;

    const id = text(item.id);
    const slug = text(item.slug);
    const name = text(item.name);
    const currentToman = money(item.price?.current_toman);

    if (!id || !slug || !name || currentToman === null) continue;

    result.push({
      id,
      slug,
      name,
      currentToman,
      salesEnabled: item.availability?.sales_enabled === true,
      inStock: item.availability?.in_stock === true,
    });
  }

  return result;
}

export function productMerchandisingHref(
  product: Pick<HomeMerchandisingProduct, "slug">,
): string {
  return `/product/${encodeURIComponent(product.slug)}`;
}

export function formatToman(value: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function money(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isSafeInteger(value) || value < 0) return null;
  return value;
}
