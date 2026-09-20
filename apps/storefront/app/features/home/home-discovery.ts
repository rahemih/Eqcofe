import type { HomeProductList } from "./home-data.server.js";

export type HomeDiscoveryEntry = {
  id: string;
  slug: string;
  nameFa: string;
};

export type HomeDiscoveryProjection = {
  categories: HomeDiscoveryEntry[];
  brands: HomeDiscoveryEntry[];
};

export function deriveHomeDiscovery(products: HomeProductList): HomeDiscoveryProjection {
  const categories: HomeDiscoveryEntry[] = [];
  const brands: HomeDiscoveryEntry[] = [];
  const categoryIds = new Set<string>();
  const brandIds = new Set<string>();

  for (const item of products.items) {
    const category = discoveryEntry(item.primary_category);
    if (category && !categoryIds.has(category.id)) {
      categoryIds.add(category.id);
      categories.push(category);
    }

    const brand = discoveryEntry(item.brand);
    if (brand && !brandIds.has(brand.id)) {
      brandIds.add(brand.id);
      brands.push(brand);
    }
  }

  return { categories, brands };
}

export function categoryDiscoveryHref(entry: HomeDiscoveryEntry): string {
  return `/category/${encodeURIComponent(entry.slug)}`;
}

export function brandDiscoveryHref(entry: HomeDiscoveryEntry): string {
  return `/search?q=${encodeURIComponent(entry.nameFa)}`;
}

function discoveryEntry(value: unknown): HomeDiscoveryEntry | null {
  if (!isRecord(value)) return null;

  const id = text(value.id);
  const slug = text(value.slug);
  const nameFa = text(value.name_fa);

  if (!id || !slug || !nameFa) return null;
  return { id, slug, nameFa };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
