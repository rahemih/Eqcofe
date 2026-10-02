export type CompareUrlState = {
  productIds: string[];
};

export type CompareUrlStateErrorCode =
  | "COMPARE_QUERY_KEY_UNSUPPORTED"
  | "COMPARE_PRODUCT_ID_INVALID"
  | "COMPARE_PRODUCT_DUPLICATE"
  | "COMPARE_PRODUCT_LIMIT_EXCEEDED";

export class CompareUrlStateError extends Error {
  readonly code: CompareUrlStateErrorCode;

  constructor(code: CompareUrlStateErrorCode, message: string) {
    super(message);
    this.name = "CompareUrlStateError";
    this.code = code;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRODUCTS = 4;

export function parseCompareUrlState(input: string | URLSearchParams): CompareUrlState {
  const params = input instanceof URLSearchParams
    ? new URLSearchParams(input)
    : new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);

  for (const key of params.keys()) {
    if (key !== "product") {
      throw new CompareUrlStateError(
        "COMPARE_QUERY_KEY_UNSUPPORTED",
        `Unsupported compare query key: ${key}`,
      );
    }
  }

  const productIds = params.getAll("product");
  if (productIds.length > MAX_PRODUCTS) {
    throw new CompareUrlStateError(
      "COMPARE_PRODUCT_LIMIT_EXCEEDED",
      "Compare selection cannot contain more than four products.",
    );
  }
  if (productIds.some((id) => !UUID.test(id))) {
    throw new CompareUrlStateError(
      "COMPARE_PRODUCT_ID_INVALID",
      "Compare product identifiers must be canonical UUIDs.",
    );
  }
  if (new Set(productIds.map((id) => id.toLowerCase())).size !== productIds.length) {
    throw new CompareUrlStateError(
      "COMPARE_PRODUCT_DUPLICATE",
      "Compare product identifiers must be unique.",
    );
  }

  return { productIds: [...productIds].sort((a, b) => a.localeCompare(b)) };
}

export function serializeCompareUrlState(state: CompareUrlState): string {
  const params = new URLSearchParams();
  for (const id of [...state.productIds].sort((a, b) => a.localeCompare(b))) {
    params.append("product", id);
  }
  return params.toString();
}

export function removeCompareProduct(state: CompareUrlState, productId: string): CompareUrlState {
  return {
    productIds: state.productIds.filter((id) => id !== productId),
  };
}
