import type { ApiClientConfig } from "../api/request.js";
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
    baseUrl,
    timeoutMs,
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
