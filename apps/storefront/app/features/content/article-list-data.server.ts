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
import type { ArticleListResponse } from "./article-contract.js";

const ARTICLE_PAGE_SIZE = 12;
const MAX_CURSOR_LENGTH = 1024;

export type ArticleListRouteData = {
  articles: AsyncSurfaceState<ArticleListResponse>;
  nextCursor: string | null;
  cursorIssue: "invalid" | null;
};

export type LoadArticleListOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export type ArticleListRouteResult = {
  data: ArticleListRouteData;
  setCookies: readonly string[];
};

export async function loadArticleListRouteData(
  request: Request,
  options: LoadArticleListOptions = {},
): Promise<ArticleListRouteResult> {
  const cursor = readOpaqueCursor(new URL(request.url).searchParams.get("cursor"));
  if (cursor.issue) {
    return {
      data: {
        articles: emptyState("no-result"),
        nextCursor: null,
        cursorIssue: "invalid",
      },
      setCookies: [],
    };
  }

  let bridge: CustomerSessionBridge | undefined;
  try {
    bridge = createCustomerSessionBridge(request, options);
    const result = await bridge.client.request("get", "/articles", {
      query: {
        limit: ARTICLE_PAGE_SIZE,
        ...(cursor.value ? { cursor: cursor.value } : {}),
      },
    });
    const response = result.data;
    return {
      data: {
        articles: response.items.length === 0 ? emptyState("no-result") : readyState(response),
        nextCursor: response.next_cursor,
        cursorIssue: null,
      },
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return {
      data: {
        articles: classifyApiFailureState(error, { method: "get", connectivity: "unknown" }),
        nextCursor: null,
        cursorIssue: null,
      },
      setCookies: bridge?.takeSetCookies() ?? [],
    };
  }
}

function readOpaqueCursor(value: string | null): { value: string | null; issue: "invalid" | null } {
  if (value === null || value === "") return { value: null, issue: null };
  if (value.length > MAX_CURSOR_LENGTH) return { value: null, issue: "invalid" };
  return { value, issue: null };
}
