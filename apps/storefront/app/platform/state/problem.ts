import { ApiClientError } from "../api/errors.js";

export type PublicProblemKind =
  | "network"
  | "timeout"
  | "server"
  | "not-found"
  | "validation"
  | "conflict"
  | "security"
  | "configuration"
  | "unknown";

export type PublicProblem = {
  kind: PublicProblemKind;
  requestId: string | null;
  status: number | null;
  retryable: boolean;
};

export function toPublicProblem(error: unknown): PublicProblem {
  if (!(error instanceof ApiClientError)) {
    return {
      kind: "unknown",
      requestId: null,
      status: null,
      retryable: false,
    };
  }

  if (error.kind === "network") {
    return baseProblem("network", error);
  }
  if (error.kind === "timeout") {
    return baseProblem("timeout", error);
  }
  if (error.kind === "security") {
    return baseProblem("security", error);
  }
  if (error.kind === "configuration") {
    return baseProblem("configuration", error);
  }
  if (error.kind !== "http") {
    return baseProblem("unknown", error);
  }

  if (error.status === 404) return baseProblem("not-found", error);
  if (error.status === 409) return baseProblem("conflict", error);
  if (error.status === 400 || error.status === 422) return baseProblem("validation", error);
  if (typeof error.status === "number" && error.status >= 500) {
    return baseProblem("server", error);
  }

  return baseProblem("unknown", error);
}

function baseProblem(kind: PublicProblemKind, error: ApiClientError): PublicProblem {
  return {
    kind,
    requestId: error.requestId,
    status: error.status ?? null,
    retryable: error.retryable,
  };
}
