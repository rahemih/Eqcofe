import type { ApiMethod } from "./contract.js";

export const SERVER_DATA_POLICY = {
  cacheMode: "no-store",
  staleOnError: false,
  automaticMutationRetry: false,
  safeRetry: {
    maxAttempts: 2,
    retryableStatuses: [502, 503, 504],
    baseDelayMs: 100,
  },
} as const;

export function isSafeRetryMethod(method: ApiMethod): boolean {
  return method === "get" || method === "head";
}

export function isRetryableStatus(status: number): boolean {
  return (SERVER_DATA_POLICY.safeRetry.retryableStatuses as readonly number[]).includes(status);
}
