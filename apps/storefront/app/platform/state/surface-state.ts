import type { ApiMethod } from "../api/contract.js";
import { ApiClientError } from "../api/errors.js";
import type { ConnectivityHint } from "./connectivity.js";
import { toPublicProblem, type PublicProblem } from "./problem.js";
import { planRecovery, type RecoveryPlan } from "./recovery-policy.js";

export type LoadingMode = "initial" | "progressive" | "refresh";
export type EmptyReason = "first-use" | "filtered" | "no-result";

export type AsyncSurfaceState<T> =
  | {
      status: "loading";
      mode: LoadingMode;
      previous?: T;
    }
  | {
      status: "ready";
      data: T;
    }
  | {
      status: "empty";
      reason: EmptyReason;
    }
  | {
      status: "error";
      problem: PublicProblem;
      previous?: T;
    }
  | {
      status: "forbidden";
      requestId: string | null;
      previous?: T;
    }
  | {
      status: "offline";
      connectivity: "offline";
      previous?: T;
    }
  | {
      status: "recovery";
      problem: PublicProblem;
      plan: RecoveryPlan;
      previous?: T;
    };

export type FailureStateContext<T> = {
  method: ApiMethod;
  connectivity: ConnectivityHint;
  previous?: T;
  unknownResult?: boolean;
  authoritativeStatusCheckAvailable?: boolean;
};

export function loadingState<T>(
  mode: LoadingMode,
  previous?: T,
): AsyncSurfaceState<T> {
  return previous === undefined
    ? { status: "loading", mode }
    : { status: "loading", mode, previous };
}

export function readyState<T>(data: T): AsyncSurfaceState<T> {
  return { status: "ready", data };
}

export function emptyState<T>(reason: EmptyReason): AsyncSurfaceState<T> {
  return { status: "empty", reason };
}

export function classifyApiFailureState<T>(
  error: unknown,
  context: FailureStateContext<T>,
): AsyncSurfaceState<T> {
  const previous = context.previous;

  if (error instanceof ApiClientError && error.kind === "http" && error.status === 403) {
    return previous === undefined
      ? { status: "forbidden", requestId: error.requestId }
      : { status: "forbidden", requestId: error.requestId, previous };
  }

  if (
    context.connectivity === "offline"
    && error instanceof ApiClientError
    && (error.kind === "network" || error.kind === "timeout")
  ) {
    return previous === undefined
      ? { status: "offline", connectivity: "offline" }
      : { status: "offline", connectivity: "offline", previous };
  }

  const plan = planRecovery({
    method: context.method,
    error,
    connectivity: context.connectivity,
    unknownResult: context.unknownResult,
    authoritativeStatusCheckAvailable: context.authoritativeStatusCheckAvailable,
  });
  const problem = toPublicProblem(error);

  if (plan.action !== "none") {
    return previous === undefined
      ? { status: "recovery", problem, plan }
      : { status: "recovery", problem, plan, previous };
  }

  return previous === undefined
    ? { status: "error", problem }
    : { status: "error", problem, previous };
}
