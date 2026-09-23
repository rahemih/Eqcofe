export type ListingUrlMode = "search" | "collection";

export type ListingUrlState = {
  q?: string;
  cursor?: string;
  limit?: number;
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

const ALLOWED_KEYS = new Set(["q", "cursor", "limit"]);
const MAX_QUERY_LENGTH = 200;
const MAX_CURSOR_LENGTH = 1024;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

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

  const q = singular(params, "q");
  const cursor = singular(params, "cursor");
  const limit = singular(params, "limit");
  const state: ListingUrlState = {};

  if (q !== undefined) {
    if (mode !== "search") {
      throw new ListingUrlStateError(
        "LISTING_QUERY_NOT_ALLOWED",
        "Search query is not valid for this listing URL.",
      );
    }
    const normalized = q.trim();
    if (normalized.length < 1 || normalized.length > MAX_QUERY_LENGTH) {
      throw new ListingUrlStateError(
        "LISTING_QUERY_INVALID",
        "Search query must contain between 1 and 200 characters.",
      );
    }
    state.q = normalized;
  }

  if (cursor !== undefined) {
    if (cursor.length < 1 || cursor.length > MAX_CURSOR_LENGTH) {
      throw new ListingUrlStateError(
        "LISTING_CURSOR_INVALID",
        "Cursor must contain between 1 and 1024 characters.",
      );
    }
    state.cursor = cursor;
  }

  if (limit !== undefined) {
    if (!/^[1-9]\d{0,2}$/.test(limit)) {
      throw new ListingUrlStateError(
        "LISTING_LIMIT_INVALID",
        "Limit must be an integer between 1 and 100.",
      );
    }
    const parsed = Number(limit);
    if (!Number.isSafeInteger(parsed) || parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
      throw new ListingUrlStateError(
        "LISTING_LIMIT_INVALID",
        "Limit must be an integer between 1 and 100.",
      );
    }
    state.limit = parsed;
  }

  return state;
}

export function serializeListingUrlState(state: ListingUrlState): string {
  const params = new URLSearchParams();
  if (state.q !== undefined) params.set("q", state.q);
  if (state.cursor !== undefined) params.set("cursor", state.cursor);
  if (state.limit !== undefined) params.set("limit", String(state.limit));
  return params.toString();
}

export function updateListingUrlState(
  current: ListingUrlState,
  patch: Partial<ListingUrlState>,
): ListingUrlState {
  const next: ListingUrlState = { ...current, ...patch };
  const resultSetChanged =
    (Object.prototype.hasOwnProperty.call(patch, "q") && patch.q !== current.q)
    || (Object.prototype.hasOwnProperty.call(patch, "limit") && patch.limit !== current.limit);

  if (resultSetChanged) delete next.cursor;
  if (next.q === undefined) delete next.q;
  if (next.cursor === undefined) delete next.cursor;
  if (next.limit === undefined) delete next.limit;
  return next;
}

function singular(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  if (values.length > 1) {
    throw new ListingUrlStateError(
      "LISTING_QUERY_DUPLICATE",
      `Listing query key must be singular: ${key}`,
    );
  }
  return values[0];
}
