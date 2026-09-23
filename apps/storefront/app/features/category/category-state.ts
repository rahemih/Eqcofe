import { faIR } from "../../i18n/fa-IR.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { CategoryListingResponse } from "../listing/listing-contract.js";
import type { CategoryRouteIssue } from "./category-data.server.js";

export type CategoryStatePresentation = {
  variant: "loading" | "empty" | "error" | "forbidden" | "offline" | "recovery";
  title: string;
  message: string;
  requestId: string | null;
  urgent: boolean;
  retryAllowed: boolean;
};

export function selectCategoryProducts(
  state: AsyncSurfaceState<CategoryListingResponse>,
): CategoryListingResponse | null {
  if (state.status === "ready") return state.data;
  if ("previous" in state && state.previous) return state.previous;
  return null;
}

export function describeCategoryState(
  state: AsyncSurfaceState<CategoryListingResponse>,
  issue: CategoryRouteIssue,
): CategoryStatePresentation | null {
  if (issue === "missing-slug" || issue === "invalid-query") {
    return {
      variant: "empty",
      title: faIR.category.state.invalid.title,
      message: faIR.category.state.invalid.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (issue === "not-found") {
    return {
      variant: "empty",
      title: faIR.category.state.notFound.title,
      message: faIR.category.state.notFound.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (state.status === "ready") return null;

  if (state.status === "loading") {
    return {
      variant: "loading",
      title: faIR.category.state.loading.title,
      message: faIR.category.state.loading.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (state.status === "empty") {
    if (state.reason === "filtered") {
      return {
        variant: "empty",
        title: faIR.state.empty.filteredTitle,
        message: faIR.state.empty.filteredBody,
        requestId: null,
        urgent: false,
        retryAllowed: false,
      };
    }
    return {
      variant: "empty",
      title: faIR.category.state.empty.title,
      message: faIR.category.state.empty.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
    };
  }

  if (state.status === "forbidden") {
    return {
      variant: "forbidden",
      title: faIR.category.state.forbidden.title,
      message: faIR.category.state.forbidden.body,
      requestId: state.requestId,
      urgent: true,
      retryAllowed: false,
    };
  }

  if (state.status === "offline") {
    return {
      variant: "offline",
      title: faIR.category.state.offline.title,
      message: faIR.category.state.offline.body,
      requestId: null,
      urgent: false,
      retryAllowed: true,
    };
  }

  if (state.status === "recovery") {
    return {
      variant: "recovery",
      title: faIR.category.state.recovery.title,
      message: faIR.category.state.recovery.body,
      requestId: state.problem.requestId,
      urgent: false,
      retryAllowed: state.plan.action === "retry-read",
    };
  }

  return {
    variant: "error",
    title: faIR.category.state.error.title,
    message: faIR.category.state.error.body,
    requestId: state.problem.requestId,
    urgent: true,
    retryAllowed: false,
  };
}
