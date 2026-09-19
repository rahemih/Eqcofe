import type { ApiErrorResponse, ApiFieldError } from "./contract.js";

export type ApiClientErrorKind =
  | "configuration"
  | "network"
  | "timeout"
  | "aborted"
  | "http";

export type ApiClientErrorDetails = {
  kind: ApiClientErrorKind;
  message: string;
  code: string;
  status?: number;
  requestId?: string | null;
  fieldErrors?: readonly ApiFieldError[];
  retryable?: boolean;
};

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind;
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | null;
  readonly fieldErrors: readonly ApiFieldError[];
  readonly retryable: boolean;

  constructor(details: ApiClientErrorDetails) {
    super(details.message);
    this.name = "ApiClientError";
    this.kind = details.kind;
    this.code = details.code;
    this.status = details.status;
    this.requestId = details.requestId ?? null;
    this.fieldErrors = details.fieldErrors ?? [];
    this.retryable = details.retryable ?? false;
  }
}

export function parseApiErrorPayload(value: unknown): ApiErrorResponse | null {
  if (!isRecord(value) || value.success !== false) return null;
  if (!isRecord(value.error) || typeof value.error.code !== "string" || typeof value.error.message !== "string") {
    return null;
  }
  if (!isRecord(value.meta) || typeof value.meta.request_id !== "string") return null;

  const fieldErrors = Array.isArray(value.error.field_errors)
    ? value.error.field_errors.filter(isFieldError)
    : undefined;

  return {
    success: false,
    error: {
      code: value.error.code,
      message: value.error.message,
      ...(isRecord(value.error.details) ? { details: value.error.details } : {}),
      ...(fieldErrors ? { field_errors: fieldErrors } : {}),
    },
    meta: {
      request_id: value.meta.request_id,
    },
  };
}

function isFieldError(value: unknown): value is ApiFieldError {
  return isRecord(value)
    && typeof value.field === "string"
    && typeof value.code === "string"
    && typeof value.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
