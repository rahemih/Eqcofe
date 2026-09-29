import type { ApiClientConfig } from "../api/request.js";
import { normalizeApiBaseUrl, normalizeApiTimeout } from "../api/request.js";
import { ApiClientError } from "../api/errors.js";

const DEFAULT_API_TIMEOUT_MS = 10_000;

export function readServerApiConfig(env: NodeJS.ProcessEnv = process.env): ApiClientConfig {
  const baseUrl = env.EQCOFE_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new ApiClientError({
      kind: "configuration",
      code: "API_BASE_URL_MISSING",
      message: "EQCOFE_API_BASE_URL must be configured on the server.",
    });
  }

  const timeoutMs = readTimeout(env.EQCOFE_API_TIMEOUT_MS);
  return {
    baseUrl: normalizeApiBaseUrl(baseUrl),
    timeoutMs: normalizeApiTimeout(timeoutMs),
  };
}

function readTimeout(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_API_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 100 || value > 60_000) {
    throw new ApiClientError({
      kind: "configuration",
      code: "API_TIMEOUT_INVALID",
      message: "EQCOFE_API_TIMEOUT_MS must be between 100 and 60000.",
    });
  }
  return Math.floor(value);
}


export type MediaPublicConfig = {
  publicBaseUrl: string | null;
};

export function readServerMediaConfig(env: NodeJS.ProcessEnv = process.env): MediaPublicConfig {
  const raw = env.EQCOFE_MEDIA_PUBLIC_BASE_URL?.trim();
  if (!raw) return { publicBaseUrl: null };
  return { publicBaseUrl: normalizeMediaPublicBaseUrl(raw) };
}

export function normalizeMediaPublicBaseUrl(value: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ApiClientError({
      kind: "configuration",
      code: "MEDIA_PUBLIC_BASE_URL_INVALID",
      message: "EQCOFE_MEDIA_PUBLIC_BASE_URL must be an absolute HTTP(S) URL.",
    });
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:")
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new ApiClientError({
      kind: "configuration",
      code: "MEDIA_PUBLIC_BASE_URL_INVALID",
      message: "EQCOFE_MEDIA_PUBLIC_BASE_URL must be HTTP(S) without credentials, query, or hash.",
    });
  }

  return url.toString().replace(/\/+$/, "");
}
