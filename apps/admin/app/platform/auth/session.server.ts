import type { ApiComponents } from "../api/contract.js";
import { ApiClientError } from "../api/errors.js";
import { createAdminAuthBridge } from "./admin-cookie.server.js";

export type AdminSessionActor = ApiComponents["schemas"]["AdminSessionActor"];
export type AdminSessionProbe =
  | { kind: "authenticated"; actor: AdminSessionActor; setCookies: readonly string[] }
  | { kind: "unauthenticated"; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

export async function probeAdminSession(request: Pick<Request, "headers">): Promise<AdminSessionProbe> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("get", "/admin/auth/session", {});
    const actor = result.data.data.actor;
    if (actor.type !== "staff" || !actor.id || !actor.accountId) return unavailable(bridge, result.requestId);
    return { kind: "authenticated", actor, setCookies: bridge.takeSetCookies() };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (error instanceof ApiClientError && error.kind === "http" && (error.status === 401 || error.status === 403)) {
      return { kind: "unauthenticated", setCookies };
    }
    return {
      kind: "unavailable",
      requestId: error instanceof ApiClientError ? error.requestId : null,
      setCookies,
    };
  }
}

function unavailable(bridge: ReturnType<typeof createAdminAuthBridge>, requestId: string | null): AdminSessionProbe {
  return { kind: "unavailable", requestId, setCookies: bridge.takeSetCookies() };
}
