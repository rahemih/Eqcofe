import { createHash } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';

export const MAX_PUBLIC_LISTING_CANDIDATES = 500;

export type PublicListingKind = 'list' | 'search';
export type PublicListingSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export type PublicListingQuery = {
  cursor?: string;
  limit: number;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort: PublicListingSort;
  attributeValueIds: string[];
};

export type ListingSignals = {
  prices: Record<string, any | null>;
  stockedProductIds: Set<string>;
  attributeValuesByProduct: Map<string, Set<string>>;
};

export type ListingFacetResponse = {
  brands: Array<{ id: string; name_fa: string; slug: string }>;
  price_range: { min_toman: number; max_toman: number } | null;
  availability: { in_stock_count: number; out_of_stock_count: number };
};

export function parsePublicListingQuery(
  raw: any,
  input: {
    kind: PublicListingKind;
    limit: number;
    brand?: string;
    allowAttributes: boolean;
  },
): PublicListingQuery {
  const minPrice = optionalMoney(raw?.min_price, 'حداقل قیمت');
  const maxPrice = optionalMoney(raw?.max_price, 'حداکثر قیمت');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new DomainError('VALIDATION_ERROR', 'بازه قیمت نامعتبر است.');
  }

  const available = optionalBoolean(raw?.available);
  const sort = normalizeSort(raw?.sort, input.kind);
  const attributeValueIds = input.allowAttributes
    ? normalizeAttributeValues(raw?.attribute_value)
    : [];

  if (!input.allowAttributes && raw?.attribute_value !== undefined) {
    throw new DomainError('VALIDATION_ERROR', 'فیلتر ویژگی برای این فهرست پشتیبانی نمی‌شود.');
  }

  return {
    cursor: raw?.cursor,
    limit: input.limit,
    brand: input.brand,
    minPrice,
    maxPrice,
    available,
    sort,
    attributeValueIds,
  };
}

export function applyPublicListingQuery(
  rows: any[],
  signals: ListingSignals,
  query: PublicListingQuery,
  input: {
    kind: PublicListingKind;
    searchQuery?: string;
    category?: string;
    attributeGroups?: string[][];
  },
) {
  const facets = buildFacets(rows, signals);
  const groups = input.attributeGroups ?? [];

  let filtered = rows.filter((row) => {
    const id = String(row.id);
    const price = signals.prices[id] ?? null;
    const inStock = signals.stockedProductIds.has(id);

    if (query.brand && String(row.brand_slug ?? '').toLowerCase() !== query.brand.toLowerCase()) return false;
    if (query.minPrice !== undefined && (!price || Number(price.current_toman) < query.minPrice)) return false;
    if (query.maxPrice !== undefined && (!price || Number(price.current_toman) > query.maxPrice)) return false;
    if (query.available !== undefined && inStock !== query.available) return false;

    if (groups.length) {
      const values = signals.attributeValuesByProduct.get(id) ?? new Set<string>();
      if (!groups.every((group) => group.some((valueId) => values.has(valueId)))) return false;
    }

    return true;
  });

  filtered = [...filtered].sort((a, b) => compareRows(a, b, signals.prices, query.sort));

  const fingerprint = listingFingerprint({
    kind: input.kind,
    searchQuery: input.searchQuery ?? null,
    category: input.category ?? null,
    brand: query.brand ?? null,
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    available: query.available ?? null,
    sort: query.sort,
    attributeValueIds: [...query.attributeValueIds].sort(),
  });

  let start = 0;
  if (query.cursor !== undefined) {
    const decoded = decodePublicListingCursor(query.cursor, fingerprint);
    const index = filtered.findIndex((row) => String(row.id) === decoded.last_id);
    if (index < 0) {
      throw new DomainError('VALIDATION_ERROR', 'نشانگر صفحه دیگر با نتایج فعلی سازگار نیست.');
    }
    start = index + 1;
  }

  const page = filtered.slice(start, start + query.limit + 1);
  const hasMore = page.length > query.limit;
  const data = hasMore ? page.slice(0, query.limit) : page;
  const last = data.at(-1);

  return {
    data,
    facets,
    pagination: {
      next_cursor: hasMore && last
        ? encodePublicListingCursor({ v: 2, kind: 'filtered', fingerprint, last_id: String(last.id) })
        : null,
      has_more: hasMore,
    },
  };
}

export function buildFacets(rows: any[], signals: ListingSignals): ListingFacetResponse {
  const brands = new Map<string, { id: string; name_fa: string; slug: string }>();
  const prices: number[] = [];
  let inStockCount = 0;

  for (const row of rows) {
    if (row.brand_id && row.brand_slug) {
      brands.set(String(row.brand_id), {
        id: String(row.brand_id),
        name_fa: String(row.brand_name ?? ''),
        slug: String(row.brand_slug),
      });
    }
    const price = signals.prices[String(row.id)];
    if (price && Number.isSafeInteger(Number(price.current_toman))) prices.push(Number(price.current_toman));
    if (signals.stockedProductIds.has(String(row.id))) inStockCount += 1;
  }

  return {
    brands: [...brands.values()].sort((a, b) => a.name_fa.localeCompare(b.name_fa, 'fa')),
    price_range: prices.length
      ? { min_toman: Math.min(...prices), max_toman: Math.max(...prices) }
      : null,
    availability: {
      in_stock_count: inStockCount,
      out_of_stock_count: Math.max(0, rows.length - inStockCount),
    },
  };
}

export function normalizeAttributeGroups(
  selectedValueIds: string[],
  definitions: Array<{ id: string; values: Array<{ id: string }> }>,
): string[][] {
  if (!selectedValueIds.length) return [];
  const valueToAttribute = new Map<string, string>();
  for (const definition of definitions) {
    for (const value of definition.values ?? []) valueToAttribute.set(String(value.id), String(definition.id));
  }

  const groups = new Map<string, string[]>();
  for (const id of selectedValueIds) {
    const attributeId = valueToAttribute.get(id);
    if (!attributeId) throw new DomainError('VALIDATION_ERROR', 'مقدار فیلتر ویژگی برای این دسته معتبر نیست.');
    const values = groups.get(attributeId) ?? [];
    values.push(id);
    groups.set(attributeId, values);
  }
  return [...groups.values()];
}

function optionalMoney(value: unknown, label: string) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') throw new DomainError('VALIDATION_ERROR', `${label} نامعتبر است.`);
  const text = String(value);
  if (!/^\d+$/.test(text)) throw new DomainError('VALIDATION_ERROR', `${label} باید عدد صحیح تومان باشد.`);
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new DomainError('VALIDATION_ERROR', `${label} نامعتبر است.`);
  return parsed;
}

function optionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new DomainError('VALIDATION_ERROR', 'فیلتر موجودی نامعتبر است.');
}

function normalizeSort(value: unknown, kind: PublicListingKind): PublicListingSort {
  const fallback: PublicListingSort = kind === 'search' ? 'relevance' : 'newest';
  if (value === undefined || value === null || value === '') return fallback;
  const sort = String(value) as PublicListingSort;
  const allowed = kind === 'search'
    ? new Set<PublicListingSort>(['relevance', 'newest', 'price_asc', 'price_desc'])
    : new Set<PublicListingSort>(['newest', 'price_asc', 'price_desc']);
  if (!allowed.has(sort)) throw new DomainError('VALIDATION_ERROR', 'مرتب‌سازی نامعتبر است.');
  return sort;
}

function normalizeAttributeValues(value: unknown) {
  if (value === undefined || value === null || value === '') return [];
  const raw = Array.isArray(value) ? value : [value];
  if (raw.length > 12) throw new DomainError('VALIDATION_ERROR', 'تعداد فیلترهای ویژگی بیش از حد مجاز است.');
  const ids = [...new Set(raw.map((item) => String(item)))];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (ids.some((id) => !uuid.test(id))) throw new DomainError('VALIDATION_ERROR', 'مقدار فیلتر ویژگی نامعتبر است.');
  return ids.sort();
}

function compareRows(a: any, b: any, prices: Record<string, any | null>, sort: PublicListingSort) {
  if (sort === 'relevance') {
    const rank = Number(a.search_rank ?? 2) - Number(b.search_rank ?? 2);
    if (rank !== 0) return rank;
    return newest(a, b);
  }
  if (sort === 'newest') return newest(a, b);

  const aPrice = prices[String(a.id)]?.current_toman;
  const bPrice = prices[String(b.id)]?.current_toman;
  const aMissing = !Number.isSafeInteger(Number(aPrice));
  const bMissing = !Number.isSafeInteger(Number(bPrice));
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (!aMissing && !bMissing && Number(aPrice) !== Number(bPrice)) {
    return sort === 'price_asc' ? Number(aPrice) - Number(bPrice) : Number(bPrice) - Number(aPrice);
  }
  return newest(a, b);
}

function newest(a: any, b: any) {
  const time = new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime();
  if (time !== 0) return time;
  return String(b.id).localeCompare(String(a.id));
}

function listingFingerprint(input: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function encodePublicListingCursor(payload: { v: 2; kind: 'filtered'; fingerprint: string; last_id: string }) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodePublicListingCursor(raw: string, fingerprint: string) {
  if (typeof raw !== 'string' || raw.length < 1 || raw.length > 1024) {
    throw new DomainError('VALIDATION_ERROR', 'نشانگر صفحه نامعتبر است.');
  }
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    if (decoded.length > 768) throw new Error('invalid');
    const parsed = JSON.parse(decoded);
    if (
      !parsed
      || parsed.v !== 2
      || parsed.kind !== 'filtered'
      || parsed.fingerprint !== fingerprint
      || !/^[0-9a-f-]{36}$/i.test(String(parsed.last_id ?? ''))
    ) throw new Error('invalid');
    return parsed as { v: 2; kind: 'filtered'; fingerprint: string; last_id: string };
  } catch {
    throw new DomainError('VALIDATION_ERROR', 'نشانگر صفحه با فیلترهای فعلی سازگار نیست.');
  }
}
