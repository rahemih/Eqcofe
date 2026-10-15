import type { AdminCatalogProduct } from "./catalog-read.server.js";

export function filterLoadedCatalogProducts(
  products: readonly AdminCatalogProduct[],
  query: string,
): readonly AdminCatalogProduct[] {
  const needle = normalizeCatalogSearch(query);
  if (!needle) return products;

  return products.filter((product) => {
    const values = [
      product.name_fa,
      product.name_en ?? "",
      product.slug,
      product.brand?.name_fa ?? "",
      product.brand?.slug ?? "",
      product.primary_category.name_fa,
      product.primary_category.slug,
      ...product.variants.flatMap((variant) => [
        variant.sku,
        variant.barcode ?? "",
        variant.name_suffix ?? "",
      ]),
    ];
    return normalizeCatalogSearch(values.join(" ")).includes(needle);
  });
}

export function normalizeCatalogSearch(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa-IR");
}
