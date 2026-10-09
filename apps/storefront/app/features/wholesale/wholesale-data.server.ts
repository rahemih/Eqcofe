import { ApiClientError } from "../../platform/api/errors.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import { createCustomerSessionBridge } from "../../platform/auth/session-cookie.server.js";
import type {
  WholesaleApplication,
  WholesaleCustomerType,
  WholesaleLatestApplication,
  WholesaleProfile,
  WholesaleSessionResponse,
} from "./wholesale-contract.js";

export type WholesaleDataOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type WholesalePageData =
  | { status: "guest"; setCookies: readonly string[] }
  | { status: "unavailable"; setCookies: readonly string[] }
  | {
      status: "ready";
      customerType: WholesaleCustomerType;
      application: WholesaleApplication | null;
      setCookies: readonly string[];
    };

export async function loadWholesaleIntroduction(
  request: Pick<Request, "headers">,
  options: WholesaleDataOptions = {},
): Promise<WholesalePageData> {
  let bridge: ReturnType<typeof createCustomerSessionBridge>;
  try {
    bridge = createCustomerSessionBridge(request, options);
  } catch {
    return { status: "unavailable", setCookies: [] };
  }

  try {
    const session = await bridge.client.request("get", "/auth/session", {});
    const typedSession = session.data as WholesaleSessionResponse;
    void typedSession.data.actor;
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "guest", setCookies: bridge.takeSetCookies() };
    }
    return { status: "unavailable", setCookies: bridge.takeSetCookies() };
  }

  try {
    const [profileResult, applicationResult] = await Promise.all([
      bridge.client.request("get", "/customer/profile", {}),
      bridge.client.request("get", "/customer/wholesale/application", {}),
    ]);

    const profile = profileResult.data as WholesaleProfile;
    const application = applicationResult.data as WholesaleLatestApplication;

    return {
      status: "ready",
      customerType: profile.customer_type,
      application: application as WholesaleApplication | null,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    if (isUnauthorized(error)) {
      return { status: "guest", setCookies: bridge.takeSetCookies() };
    }
    return { status: "unavailable", setCookies: bridge.takeSetCookies() };
  }
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError
    && error.kind === "http"
    && error.status === 401;
}
