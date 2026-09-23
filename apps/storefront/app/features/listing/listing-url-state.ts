export type ListingUrlMode = "search" | "collection";
export type ListingSort = "relevance" | "newest" | "price_asc" | "price_desc";

export type ListingUrlState = {
  q?: string;
  cursor?: string;
  limit?: number;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: ListingSort;
  attributeValueIds?: string[];
};

export type ListingUrlStateErrorCode =
  | "LISTING_QUERY_KEY_UNSUPPORTED"
  | "LISTING_QUERY_DUPLICATE"
  | "LISTING_QUERY_NOT_ALLOWED"
  | "LISTING_QUERY_INVALID"
  | "LISTING_CURSOR_INVALID"
  | "LISTING_LIMIT_INVALID";

export class ListingUrlStateError extends Error {
  readonly code: ListingUrlStateErrorCode;

  constructor(code: ListingUrlStateErrorCode, message: string) {
    super(message);
    this.name = "ListingUrlStateError";
    this.code = code;
  }
}

const ALLOWED_KEYS = new Set([
  "q",
  "cursor",
  "limit",
  "brand",
  "min_price",
  "max_price",
  "available",
  "sort",
  "attribute_value",
]);
const SINGULAR_KEYS = ["q", "cursor", "limit", "brand", "min_price", "max_price", "available", "sort"];
const MAX_QUERY_LENGTH = 200;
const MAX_CURSOR_LENGTH = 1024;
const MAX_SLUG_LENGTH = 180;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MAX_ATTRIBUTES = 12;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseListingUrlState(
  input: string | URLSearchParams,
  mode: ListingUrlMode,
): ListingUrlState {
  const params = input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);

  for (const key of params.keys()) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new ListingUrlStateError(
        "LISTING_QUERY_KEY_UNSUPPORTED",
        `Unsupported listing query key: ${key}`,
      );
    }
  }
  for (const key of SINGULAR_KEYS) singular(params, key);

  const state: ListingUrlState = {};
  const q = singular(params, "q");
  if (q !== undefined) {
    if (mode !== "search") notAllowed("Search query is not valid for this listing URL.");
    const normalized = q.trim();
    if (normalized.length < 1 || normalized.length > MAX_QUERY_LENGTH) invalid("Search query is invalid.");
    state.q = normalized;
  }

  const cursor = singular(params, "cursor");
  if (cursor !== undefined) {
    if (cursor.length < 1 || cursor.length > MAX_CURSOR_LENGTH) {
      throw new ListingUrlStateError("LISTING_CURSOR_INVALID", "Cursor must contain between 1 and 1024 characters.");
    }
    state.cursor = cursor;
  }

  const limit = singular(params, "limit");
  if (limit !== undefined) {
    const parsed = integer(limit, MIN_LIMIT, MAX_LIMIT, "Limit");
    state.limit = parsed;
  }

  const brand = singular(params, "brand");
  if (brand !== undefined) {
    if (brand.length < 1 || brand.length > MAX_SLUG_LENGTH || !SLUG.test(brand)) invalid("Brand is invalid.");
    state.brand = brand;
  }

  const minPrice = singular(params, "min_price");
  const maxPrice = singular(params, "max_price");
  if (minPrice !== undefined) state.minPrice = money(minPrice);
  if (maxPrice !== undefined) state.maxPrice = money(maxPrice);
  if (state.minPrice !== undefined && state.maxPrice !== undefined && state.minPrice > state.maxPrice) {
    invalid("Price range is invalid.");
  }

  const available = singular(params, "available");
  if (available !== undefined) {
    if (available === "true" || available === "1") state.available = true;
    else if (available === "false" || available === "0") state.available = false;
    else invalid("Availability is invalid.");
  }

  const sort = singular(params, "sort");
  if (sort !== undefined) {
    const allowed = mode === "search"
      ? new Set<ListingSort>(["relevance", "newest", "price_asc", "price_desc"])
      : new Set<ListingSort>(["newest", "price_asc", "price_desc"]);
    if (!allowed.has(sort as ListingSort)) invalid("Sort is invalid.");
    state.sort = sort as ListingSort;
  }

  const attributeValueIds = params.getAll("attribute_value");
  if (attributeValueIds.length) {
    if (mode !== "collection") notAllowed("Attribute filters require a category listing.");
    if (attributeValueIds.length > MAX_ATTRIBUTES) invalid("Too many attribute filters.");
    if (attributeValueIds.some((id) => !UUID.test(id))) invalid("Attribute filter is invalid.");
    state.attributeValueIds = [...new Set(attributeValueIds)].sort();
  }

  return state;
}

export function serializeListingUrlState(state: ListingUrlState): string {
  const params = new URLSearchParams();
  if (state.q !== undefined) params.set("q", state.q);
  if (state.brand !== undefined) params.set("brand", state.brand);
  if (state.minPrice !== undefined) params.set("min_price", String(state.minPrice));
  if (state.maxPrice !== undefined) params.set("max_price", String(state.maxPrice));
  if (state.available !== undefined) params.set("available", String(state.available));
  if (state.sort !== undefined) params.set("sort", state.sort);
  for (const id of [...(state.attributeValueIds ?? [])].sort()) params.append("attribute_value", id);
  if (state.limit !== undefined) params.set("limit", String(state.limit));
  if (state.cursor !== undefined) params.set("cursor", state.cursor);
  return params.toString();
}

export function updateListingUrlState(
  current: ListingUrlState,
  patch: Partial<ListingUrlState>,
): ListingUrlState {
  const next: ListingUrlState = { ...current, ...patch };
  const dimensionKeys: Array<keyof ListingUrlState> = [
    "q",
    "limit",
    "brand",
    "minPrice",
    "maxPrice",
    "available",
    "sort",
    "attributeValueIds",
  ];
  const resultSetChanged = dimensionKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(patch, key)
    && !sameValue(patch[key], current[key]),
  );

  if (resultSetChanged) delete next.cursor;
  clean(next);
  return next;
}

export function clearListingFilters(current: ListingUrlState): ListingUrlState {
  return updateListingUrlState(current, {
    brand: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    available: undefined,
    sort: undefined,
    attributeValueIds: undefined,
  });
}

function singular(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  if (values.length > 1) {
    throw new ListingUrlStateError("LISTING_QUERY_DUPLICATE", `Listing query key must be singular: ${key}`);
  }
  return values[0];
}

function money(value: string) {
  if (!/^\d+$/.test(value)) invalid("Price must be an integer Toman amount.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) invalid("Price is invalid.");
  return parsed;
}

function integer(value: string, minimum: number, maximum: number, label: string) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new ListingUrlStateError("LISTING_LIMIT_INVALID", `${label} must be an integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ListingUrlStateError("LISTING_LIMIT_INVALID", `${label} is out of range.`);
  }
  return parsed;
}

function notAllowed(message: string): never {
  throw new ListingUrlStateError("LISTING_QUERY_NOT_ALLOWED", message);
}

function invalid(message: string): never {
  throw new ListingUrlStateError("LISTING_QUERY_INVALID", message);
}

function sameValue(a: unknown, b: unknown) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify([...(Array.isArray(a) ? a : [])].sort())
      === JSON.stringify([...(Array.isArray(b) ? b : [])].sort());
  }
  return a === b;
}

function clean(state: ListingUrlState) {
  for (const key of Object.keys(state) as Array<keyof ListingUrlState>) {
    const value = state[key];
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete state[key];
  }
}
