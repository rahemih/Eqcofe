import type {
  ApiMethod,
  ApiPath,
  ApiRequestInput,
  ApiSuccessData,
  ApiSuccessResult,
} from "./contract.js";
import { SERVER_DATA_POLICY, isRetryableStatus, isSafeRetryMethod } from "./data-policy.js";
import { ApiClientError, parseApiErrorPayload } from "./errors.js";

export type ApiClientConfig = {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type ApiClient = {
  request<M extends ApiMethod, P extends ApiPath<M>>(
    method: M,
    path: P,
    input: ApiRequestInput<M, P>,
  ): Promise<ApiSuccessResult<M, P>>;
};

type RuntimeInput = {
  pathParams?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export function createApiClient(config: ApiClientConfig): ApiClient {
  const baseUrl = normalizeApiBaseUrl(config.baseUrl);
  const defaultTimeoutMs = normalizeApiTimeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async request<M extends ApiMethod, P extends ApiPath<M>>(
      method: M,
      path: P,
      input: ApiRequestInput<M, P>,
    ): Promise<ApiSuccessResult<M, P>> {
      const runtime = input as RuntimeInput;
      const url = buildUrl(baseUrl, path, runtime.pathParams, runtime.query);
      const timeoutMs = normalizeApiTimeout(runtime.timeoutMs ?? defaultTimeoutMs);
      const safeRetry = isSafeRetryMethod(method);
      const maxAttempts = safeRetry ? SERVER_DATA_POLICY.safeRetry.maxAttempts : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        let timedOut = false;
        let abortedByCaller = false;

        const onAbort = () => {
          abortedByCaller = true;
          controller.abort(runtime.signal?.reason);
        };

        if (runtime.signal?.aborted) {
          throw new ApiClientError({
            kind: "aborted",
            code: "REQUEST_ABORTED",
            message: "API request was aborted before it started.",
          });
        }

        runtime.signal?.addEventListener("abort", onAbort, { once: true });
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs);

        try {
          const response = await fetchImpl(url, {
            method: method.toUpperCase(),
            headers: buildHeaders(runtime.headers, runtime.body),
            ...(runtime.body === undefined ? {} : { body: JSON.stringify(runtime.body) }),
            signal: controller.signal,
            cache: SERVER_DATA_POLICY.cacheMode,
          });

          if (!response.ok && safeRetry && attempt < maxAttempts && isRetryableStatus(response.status)) {
            await drainResponse(response);
            await delay(SERVER_DATA_POLICY.safeRetry.baseDelayMs);
            continue;
          }

          if (!response.ok) {
            throw await toHttpError(response);
          }

          const data = await parseSuccessBody(response) as ApiSuccessData<M, P>;
          return {
            data,
            status: response.status,
            requestId: response.headers.get("x-request-id"),
            headers: headersToRecord(response.headers),
          };
        } catch (error) {
          if (error instanceof ApiClientError) throw error;

          if (abortedByCaller) {
            throw new ApiClientError({
              kind: "aborted",
              code: "REQUEST_ABORTED",
              message: "API request was aborted by the caller.",
            });
          }

          if (timedOut) {
            if (safeRetry && attempt < maxAttempts) {
              await delay(SERVER_DATA_POLICY.safeRetry.baseDelayMs);
              continue;
            }
            throw new ApiClientError({
              kind: "timeout",
              code: "REQUEST_TIMEOUT",
              message: "API request exceeded the configured timeout.",
              retryable: safeRetry,
            });
          }

          if (safeRetry && attempt < maxAttempts) {
            await delay(SERVER_DATA_POLICY.safeRetry.baseDelayMs);
            continue;
          }

          throw new ApiClientError({
            kind: "network",
            code: "NETWORK_ERROR",
            message: "API request failed before a valid HTTP response was received.",
            retryable: safeRetry,
          });
        } finally {
          clearTimeout(timer);
          runtime.signal?.removeEventListener("abort", onAbort);
        }
      }

      throw new ApiClientError({
        kind: "network",
        code: "RETRY_EXHAUSTED",
        message: "API request exhausted its safe retry budget.",
        retryable: false,
      });
    },
  };
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ApiClientError({
      kind: "configuration",
      code: "API_BASE_URL_MISSING",
      message: "API base URL is required.",
    });
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ApiClientError({
      kind: "configuration",
      code: "API_BASE_URL_INVALID",
      message: "API base URL must be an absolute HTTP(S) URL.",
    });
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:")
    || url.username
    || url.password
    || url.search
    || url.hash) {
    throw new ApiClientError({
      kind: "configuration",
      code: "API_BASE_URL_INVALID",
      message: "API base URL must be an HTTP(S) URL without credentials, query, or hash.",
    });
  }

  return url.toString().replace(/\/+$/, "");
}

export function normalizeApiTimeout(value: number): number {
  if (!Number.isFinite(value) || value < 100 || value > 60_000) {
    throw new ApiClientError({
      kind: "configuration",
      code: "API_TIMEOUT_INVALID",
      message: "API timeout must be between 100 and 60000 milliseconds.",
    });
  }
  return Math.floor(value);
}

function buildUrl(
  baseUrl: string,
  pathTemplate: string,
  pathParams: Record<string, unknown> | undefined,
  query: Record<string, unknown> | undefined,
): URL {
  const resolvedPath = pathTemplate.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = pathParams?.[key];
    if (typeof value !== "string" && typeof value !== "number") {
      throw new ApiClientError({
        kind: "configuration",
        code: "PATH_PARAM_MISSING",
        message: `Required path parameter "${key}" is missing.`,
      });
    }
    return encodeURIComponent(String(value));
  });

  const url = new URL(`${baseUrl}${resolvedPath.startsWith("/") ? "" : "/"}${resolvedPath}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    appendQueryValue(url.searchParams, key, value);
  }
  return url;
}

function appendQueryValue(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    for (const item of value) appendQueryValue(params, key, item);
    return;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    params.append(key, String(value));
    return;
  }

  throw new ApiClientError({
    kind: "configuration",
    code: "QUERY_VALUE_UNSUPPORTED",
    message: `Query parameter "${key}" must be a primitive or primitive array.`,
  });
}

function buildHeaders(input: Record<string, unknown> | undefined, body: unknown): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");

  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new ApiClientError({
        kind: "configuration",
        code: "HEADER_VALUE_UNSUPPORTED",
        message: `Header "${key}" must be a primitive value.`,
      });
    }
    headers.set(key, String(value));
  }

  return headers;
}

async function toHttpError(response: Response): Promise<ApiClientError> {
  const payload = await parseJsonSafely(response);
  const parsed = parseApiErrorPayload(payload);
  return new ApiClientError({
    kind: "http",
    code: parsed?.error.code ?? `HTTP_${response.status}`,
    message: parsed?.error.message ?? `API request failed with HTTP ${response.status}.`,
    status: response.status,
    requestId: parsed?.meta.request_id ?? response.headers.get("x-request-id"),
    fieldErrors: parsed?.error.field_errors ?? [],
    retryable: isRetryableStatus(response.status),
  });
}

async function parseSuccessBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return undefined;
  return response.json();
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function drainResponse(response: Response): Promise<void> {
  try {
    await response.arrayBuffer();
  } catch {
    // A retry must not be blocked only because a failed response body could not be drained.
  }
}

function headersToRecord(headers: Headers): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(headers.entries()));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
