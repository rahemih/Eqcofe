import { ApiClientError } from "../api/errors.js";

export type CustomerSessionState =
  | { status: "authenticated" }
  | { status: "unauthenticated" }
  | { status: "expired" }
  | { status: "forbidden"; requestId: string | null }
  | { status: "recovery"; requestId: string | null; retryable: boolean };

export type ProtectedCustomerRouteState =
  | { status: "allowed" }
  | { status: "login_required" }
  | { status: "session_expired" }
  | { status: "forbidden"; requestId: string | null }
  | { status: "recovery"; requestId: string | null; retryable: boolean };

export function toProtectedCustomerRouteState(
  session: CustomerSessionState,
): ProtectedCustomerRouteState {
  switch (session.status) {
    case "authenticated":
      return { status: "allowed" };
    case "unauthenticated":
      return { status: "login_required" };
    case "expired":
      return { status: "session_expired" };
    case "forbidden":
      return { status: "forbidden", requestId: session.requestId };
    case "recovery":
      return {
        status: "recovery",
        requestId: session.requestId,
        retryable: session.retryable,
      };
  }
}

export function classifyProtectedCustomerApiError(
  error: unknown,
  hadSessionCookie: boolean,
): ProtectedCustomerRouteState {
  if (error instanceof ApiClientError && error.kind === "http") {
    if (error.status === 401) {
      return hadSessionCookie ? { status: "session_expired" } : { status: "login_required" };
    }
    if (error.status === 403) {
      return { status: "forbidden", requestId: error.requestId };
    }
  }

  return {
    status: "recovery",
    requestId: error instanceof ApiClientError ? error.requestId : null,
    retryable: error instanceof ApiClientError ? error.retryable : false,
  };
}
