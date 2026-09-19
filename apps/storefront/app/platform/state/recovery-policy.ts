import type { ApiMethod } from "../api/contract.js";
import { isSafeRetryMethod } from "../api/data-policy.js";
import { ApiClientError } from "../api/errors.js";
import type { ConnectivityHint } from "./connectivity.js";

export type RecoveryAction =
  | "retry-read"
  | "wait-for-network"
  | "check-authoritative-status"
  | "none";

export type RecoveryPlan = {
  action: RecoveryAction;
  automatic: false;
  reason:
    | "offline-hint"
    | "safe-read-retry"
    | "unknown-mutation-result"
    | "not-retryable";
};

export type RecoveryPlanInput = {
  method: ApiMethod;
  error: unknown;
  connectivity: ConnectivityHint;
  unknownResult?: boolean;
  authoritativeStatusCheckAvailable?: boolean;
};

export function planRecovery(input: RecoveryPlanInput): RecoveryPlan {
  const {
    method,
    error,
    connectivity,
    unknownResult = false,
    authoritativeStatusCheckAvailable = false,
  } = input;

  if (!isSafeRetryMethod(method) && unknownResult) {
    if (authoritativeStatusCheckAvailable) {
      return {
        action: "check-authoritative-status",
        automatic: false,
        reason: "unknown-mutation-result",
      };
    }
    return {
      action: "none",
      automatic: false,
      reason: "unknown-mutation-result",
    };
  }

  if (connectivity === "offline") {
    return {
      action: "wait-for-network",
      automatic: false,
      reason: "offline-hint",
    };
  }

  if (isSafeRetryMethod(method) && isRetryableReadFailure(error)) {
    return {
      action: "retry-read",
      automatic: false,
      reason: "safe-read-retry",
    };
  }

  return {
    action: "none",
    automatic: false,
    reason: "not-retryable",
  };
}

function isRetryableReadFailure(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  if (error.kind === "network" || error.kind === "timeout") return true;
  return error.retryable;
}
