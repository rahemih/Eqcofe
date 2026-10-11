import type { ApiSuccessData } from "../../platform/api/contract.js";
import type { ApiClientConfig } from "../../platform/api/request.js";
import {
  createCustomerSessionBridge,
  type CustomerSessionBridge,
} from "../../platform/auth/session-cookie.server.js";
import {
  classifyApiFailureState,
  emptyState,
  readyState,
  type AsyncSurfaceState,
} from "../../platform/state/surface-state.js";

export type ArchivedCatalogResponse = NonNullable<ApiSuccessData<"get", "/catalog/archive">>;
export type StopSaleCatalogResponse = NonNullable<ApiSuccessData<"get", "/catalog/stop-sale">>;

const PAGE_SIZE = 20;
const MAX_CURSOR_LENGTH = 1024;

export type CatalogStateMode = "archive" | "stop-sale";
export type CatalogStatePayload =
  | { mode: "archive"; state: AsyncSurfaceState<ArchivedCatalogResponse>; nextCursor: string | null; cursorIssue: "invalid" | null }
  | { mode: "stop-sale"; state: AsyncSurfaceState<StopSaleCatalogResponse>; nextCursor: string | null; cursorIssue: "invalid" | null };

export async function loadCatalogStateRouteData(
  request: Request,
  mode: CatalogStateMode,
  options: { config?: ApiClientConfig; fetchImpl?: typeof fetch } = {},
): Promise<{ data: CatalogStatePayload; setCookies: readonly string[] }> {
  const cursor = readOpaqueCursor(new URL(request.url).searchParams.get("cursor"));
  if (cursor.issue) {
    return {
      data: mode === "archive"
        ? { mode, state: emptyState("no-result"), nextCursor: null, cursorIssue: "invalid" }
        : { mode, state: emptyState("no-result"), nextCursor: null, cursorIssue: "invalid" },
      setCookies: [],
    };
  }

  let bridge: CustomerSessionBridge | undefined;
  try {
    bridge = createCustomerSessionBridge(request, options);
    if (mode === "archive") {
      const response = await bridge.client.request("get", "/catalog/archive", {
        query: { limit: PAGE_SIZE, ...(cursor.value ? { cursor: cursor.value } : {}) },
      });
      return {
        data: {
          mode,
          state: response.data.items.length === 0 ? emptyState("no-result") : readyState(response.data),
          nextCursor: response.data.pagination.next_cursor ?? null,
          cursorIssue: null,
        },
        setCookies: bridge.takeSetCookies(),
      };
    }

    const response = await bridge.client.request("get", "/catalog/stop-sale", {
      query: { limit: PAGE_SIZE, ...(cursor.value ? { cursor: cursor.value } : {}) },
    });
    return {
      data: {
        mode,
        state: response.data.items.length === 0 ? emptyState("no-result") : readyState(response.data),
        nextCursor: response.data.pagination.next_cursor ?? null,
        cursorIssue: null,
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const state = classifyApiFailureState(error, { method: "get", connectivity: "unknown" });
    return {
      data: mode === "archive"
        ? { mode, state: state as AsyncSurfaceState<ArchivedCatalogResponse>, nextCursor: null, cursorIssue: null }
        : { mode, state: state as AsyncSurfaceState<StopSaleCatalogResponse>, nextCursor: null, cursorIssue: null },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function readOpaqueCursor(value: string | null): { value: string | null; issue: "invalid" | null } {
  if (value === null || value === "") return { value: null, issue: null };
  if (value.length > MAX_CURSOR_LENGTH) return { value: null, issue: "invalid" };
  return { value, issue: null };
}
