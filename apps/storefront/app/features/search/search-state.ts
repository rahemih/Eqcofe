import { faIR } from "../../i18n/fa-IR.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { SearchListingResponse } from "../listing/listing-contract.js";
import type { SearchQueryIssue } from "./search-data.server.js";

export type SearchStatePresentation = {
  variant: "loading" | "empty" | "error" | "forbidden" | "offline" | "recovery";
  title: string;
  message: string;
  requestId: string | null;
  urgent: boolean;
  retryAllowed: boolean;
};

export function selectSearchResults(
  state: AsyncSurfaceState<SearchListingResponse>,
): SearchListingResponse | null {
  if (state.status === "ready") return state.data;
  if ("previous" in state && state.previous) return state.previous;
  return null;
}

export function describeSearchState(
  state: AsyncSurfaceState<SearchListingResponse>,
  queryIssue: SearchQueryIssue,
  query: string | null,
): SearchStatePresentation | null {
  if (queryIssue === "missing") {
    return {
      variant: "empty",
      title: faIR.search.state.missing.title,
      message: faIR.search.state.missing.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (queryIssue === "invalid") {
    return {
      variant: "empty",
      title: faIR.search.state.invalid.title,
      message: faIR.search.state.invalid.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (state.status === "ready") return null;

  if (state.status === "loading") {
    return {
      variant: "loading",
      title: faIR.search.state.loading.title,
      message: faIR.search.state.loading.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (state.status === "empty") {
    return {
      variant: "empty",
      title: faIR.search.state.empty.title,
      message: query
        ? `${faIR.search.state.empty.body} «${query}»`
        : faIR.search.state.empty.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (state.status === "forbidden") {
    return {
      variant: "forbidden",
      title: faIR.search.state.forbidden.title,
      message: faIR.search.state.forbidden.body,
      requestId: state.requestId,
      urgent: true,
      retryAllowed: false,
    };
  }

  if (state.status === "offline") {
    return {
      variant: "offline",
      title: faIR.search.state.offline.title,
      message: faIR.search.state.offline.body,
      requestId: null,
      urgent: false,
      retryAllowed: true,
    };
  }

  if (state.status === "recovery") {
    return {
      variant: "recovery",
      title: faIR.search.state.recovery.title,
      message: faIR.search.state.recovery.body,
      requestId: state.problem.requestId,
      urgent: false,
      retryAllowed: state.plan.action === "retry-read",
    };
  }

  return {
    variant: "error",
    title: faIR.search.state.error.title,
    message: faIR.search.state.error.body,
    requestId: state.problem.requestId,
    urgent: true,
    retryAllowed: false,
  };
}
