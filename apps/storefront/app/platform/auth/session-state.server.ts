import type { ApiClientConfig } from "../api/request.js";
import { ApiClientError } from "../api/errors.js";
import {
  createCustomerSessionBridge,
  extractCustomerSessionCookieHeader,
  type CustomerSessionBridgeOptions,
} from "./session-cookie.server.js";
import type { CustomerSessionState } from "./protected-route.js";

export type CustomerSessionProbeOptions = CustomerSessionBridgeOptions & {
  config?: ApiClientConfig;
};

export async function probeCustomerSession(
  request: Pick<Request, "headers">,
  options: CustomerSessionProbeOptions = {},
): Promise<CustomerSessionState> {
  let cookie: string | null;
  try {
    cookie = extractCustomerSessionCookieHeader(request);
  } catch {
    return { status: "expired" };
  }

  if (!cookie) return { status: "unauthenticated" };

  try {
    const bridge = createCustomerSessionBridge(request, options);
    await bridge.client.request("get", "/auth/session", {});
    return { status: "authenticated" };
  } catch (error) {
    if (error instanceof ApiClientError && error.kind === "http") {
      if (error.status === 401) return { status: "expired" };
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
}
