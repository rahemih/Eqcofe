import { Inject, Injectable } from '@nestjs/common';
import { PRICING_PUBLIC_PORT, type PricingPublicPort } from '../../pricing/application/ports/pricing-public.port';
import { INVENTORY_AVAILABILITY_PORT, type InventoryAvailabilityPort } from '../../inventory/application/ports/inventory-public.port';
import { DomainError } from '../../../shared/errors/domain-error';
import { CatalogRepository } from '../infrastructure/catalog.repository';

@Injectable()
export class CatalogQueryService {
  constructor(
    private readonly repo: CatalogRepository,
    @Inject(PRICING_PUBLIC_PORT) private readonly pricing: PricingPublicPort,
    @Inject(INVENTORY_AVAILABILITY_PORT) private readonly inventory: InventoryAvailabilityPort,
  ) {}

  async listProducts(q: any) {
    this.assertQueryKeys(q, ['cursor', 'limit', 'category', 'brand']);
    const limit = this.publicLimit(q.limit, 25, 100);
    const result = await this.repo.listPublic({ category: q.category, brand: q.brand, limit, cursor: q.cursor });
    const prices = await this.pricing.getProductPrices(result.data.map((item: any) => item.id));
    return {
      items: await this.publicCards(result.data, prices),
      pagination: { next_cursor: result.nextCursor, has_more: result.hasMore },
    };
  }

  async search(q: any) {
    this.assertQueryKeys(q, ['q', 'cursor', 'limit']);
    const query = String(q.q ?? '').trim();
    if (!query) throw new DomainError('VALIDATION_ERROR', 'عبارت جستجو الزامی است.');
    if (query.length > 200) throw new DomainError('VALIDATION_ERROR', 'عبارت جستجو بیش از حد طولانی است.');
    const limit = this.publicLimit(q.limit, 25, 100);
    const result = await this.repo.searchPublic({ query, limit, cursor: q.cursor });
    const prices = await this.pricing.getProductPrices(result.data.map((item: any) => item.id));
    return {
      query,
      items: await this.publicCards(result.data, prices),
      pagination: { next_cursor: result.nextCursor, has_more: result.hasMore },
    };
  }

  async suggestions(q: any) {
    this.assertQueryKeys(q, ['q', 'limit']);
    const query = String(q.q ?? '').trim();
    if (!query) return { query, suggestions: [] };
    if (query.length > 200) throw new DomainError('VALIDATION_ERROR', 'عبارت جستجو بیش از حد طولانی است.');
    const limit = this.publicLimit(q.limit, 10, 20);
    return { query, suggestions: await this.repo.searchSuggestions(query, limit) };
  }

  async product(slug: string) {
    const product = await this.repo.publicProductBySlug(slug);
    if (!product) throw new DomainError('PRODUCT_NOT_FOUND', 'محصول پیدا نشد.');
    return this.decorate(product);
  }

  async adminProduct(id: string) {
    const product = await this.repo.adminProductById(id);
    if (!product) throw new DomainError('PRODUCT_NOT_FOUND', 'محصول پیدا نشد.');
    return this.decorate(product);
  }

  async listAdmin(q: any) {
    const result = await this.repo.listAdmin(this.limit(q.limit, 25, 100), q.cursor);
    return {
      items: await Promise.all(result.data.map((item: any) => this.decorate(item))),
      pagination: { next_cursor: result.nextCursor, has_more: result.hasMore },
    };
  }

  async variants(productId: string) {
    const variants = await this.repo.listVariants(productId);
    return Promise.all(variants.map(async (variant: any) => ({
      ...variant,
      product_id: variant.productId,
      name_suffix: variant.nameSuffix,
      sales_enabled: variant.salesEnabled,
      effective_sales_enabled: variant.effectiveSalesEnabled,
      weight_grams: variant.weightGrams,
      attributes: await this.repo.variantAttributes(variant.id),
      price: await this.pricing.getVariantPrice(variant.id),
      availability: null,
    })));
  }

  brands(publicOnly = true) { return this.repo.listBrands(publicOnly); }

  async brand(slug: string) {
    const brand = await this.repo.brandBySlug(slug);
    if (!brand) throw new DomainError('BRAND_NOT_FOUND', 'برند پیدا نشد.');
    return brand;
  }

  categories(publicOnly = true) { return this.repo.listCategories(publicOnly); }

  async category(slug: string) {
    const category = await this.repo.categoryBySlug(slug);
    if (!category) throw new DomainError('CATEGORY_NOT_FOUND', 'دسته پیدا نشد.');
    return category;
  }

  async categoryFilters(slug: string) {
    const category = await this.category(slug);
    const filters = await this.repo.categoryFilters(category.id);
    return {
      category_id: category.id,
      filters: filters.map((filter: any) => ({
        ...filter,
        values: Array.isArray(filter.values) ? filter.values : [],
      })),
    };
  }

  async compare(ids: string[]) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 4) {
      throw new DomainError('COMPARE_LIMIT_EXCEEDED', 'مقایسه بین ۱ تا ۴ محصول مجاز است.');
    }
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length) throw new DomainError('VALIDATION_ERROR', 'محصول تکراری در مقایسه مجاز نیست.');
    const rows = await this.repo.compare(unique);
    if (rows.length !== unique.length) throw new DomainError('PRODUCT_NOT_FOUND', 'یک یا چند محصول قابل مقایسه پیدا نشد.');
    const categories = new Set(rows.map((row: any) => row.primary_category_id));
    if (categories.size !== 1) throw new DomainError('COMPARE_CATEGORY_MISMATCH', 'فقط محصولات یک دسته اصلی قابل مقایسه هستند.');
    const products = await Promise.all(rows.map(async (row: any) => ({
      ...row,
      price: await this.pricing.getProductPrice(row.id),
      specifications: (await this.repo.productAttributes(row.id)).filter((attribute: any) => attribute.is_comparable),
    })));
    return { primary_category_id: rows[0].primary_category_id, products };
  }

  private async publicCards(rows: any[], prices: Record<string, any | null>) {
    const productIds = rows.map((row: any) => String(row.id));
    const variants = await this.repo.listSellableVariantsForProducts(productIds);
    const quantities = await this.inventory.getOnlineSellableQuantities(variants.map((variant: any) => String(variant.id)));
    const stockedProductIds = new Set(
      variants
        .filter((variant: any) => (quantities[String(variant.id)] ?? 0) > 0)
        .map((variant: any) => String(variant.product_id)),
    );
    return rows.map((row: any) => {
      const price = prices[row.id] ?? null;
      return {
        id: row.id,
        slug: row.slug,
        name: row.name_fa,
        brand: row.brand_id ? { id: row.brand_id, name_fa: row.brand_name, slug: row.brand_slug } : null,
        primary_category: { id: row.category_id, name_fa: row.category_name, slug: row.category_slug },
        primary_image: null,
        price,
        availability: {
          sales_enabled: Boolean(row.effective_sales_enabled) && Boolean(price),
          in_stock: stockedProductIds.has(String(row.id)),
        },
      };
    });
  }

  private assertQueryKeys(query: any, allowed: string[]) {
    const allowedSet = new Set(allowed);
    const unsupported = Object.keys(query ?? {}).filter((key) => !allowedSet.has(key));
    if (unsupported.length) {
      throw new DomainError('VALIDATION_ERROR', `پارامتر پشتیبانی‌نشده: ${unsupported.sort().join(', ')}`);
    }
  }

  private publicLimit(value: unknown, fallback: number, maximum: number) {
    if (value === undefined || value === null) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
      throw new DomainError('VALIDATION_ERROR', `محدوده باید عدد صحیح بین ۱ تا ${maximum} باشد.`);
    }
    return parsed;
  }

  private limit(value: unknown, fallback: number, maximum: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.max(1, Math.min(maximum, Math.trunc(parsed)));
  }

  private async decorate(product: any) {
    const variants = await this.variants(product.id);
    const additional = await this.repo.additionalCategories(product.id);
    const media = await this.repo.primaryMedia(product.id);
    const specifications = await this.repo.productAttributes(product.id);
    const price = await this.pricing.getProductPrice(product.id);
    return {
      id: product.id,
      name_fa: product.name_fa,
      name_en: product.name_en ?? null,
      slug: product.slug,
      brand: product.brand_id ? { id: product.brand_id, name_fa: product.brand_name, slug: product.brand_slug ?? '' } : null,
      primary_category: { id: product.primary_category_id, name_fa: product.category_name, slug: product.category_slug ?? '' },
      additional_categories: additional,
      status: product.status,
      sales_enabled: (product.effective_sales_enabled ?? product.sales_enabled) && Boolean(price),
      price,
      published_at: product.published_at ?? null,
      archived_at: product.archived_at ?? null,
      primary_image: media ? { id: media.id, url: media.storage_key, alt_text_fa: media.alt_text_fa ?? null } : null,
      specifications,
      variants,
      version: Number(product.version),
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }
}
