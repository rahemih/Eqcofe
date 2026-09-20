import { faIR } from "../../i18n/fa-IR.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { HomeProductList } from "./home-data.server.js";

export type HomeStatePanelVariant = "loading" | "empty" | "error" | "forbidden" | "offline" | "recovery";

export type HomeProductStatePresentation = {
  variant: HomeStatePanelVariant;
  title: string;
  message: string;
  requestId: string | null;
  urgent: boolean;
  retryAllowed: boolean;
  showSearchAlternative: boolean;
};

export function selectHomeProducts(
  state: AsyncSurfaceState<HomeProductList>,
): HomeProductList | null {
  if (state.status === "ready") return state.data;
  if ("previous" in state && state.previous) return state.previous;
  return null;
}

export function describeHomeProductState(
  state: AsyncSurfaceState<HomeProductList>,
): HomeProductStatePresentation | null {
  if (state.status === "ready") return null;

  if (state.status === "loading") {
    const copy = state.mode === "progressive"
      ? faIR.home.state.progressive
      : state.mode === "refresh"
        ? faIR.home.state.refresh
        : faIR.home.state.initial;
    return {
      variant: "loading",
      title: copy.title,
      message: copy.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
      showSearchAlternative: false,
    };
  }

  if (state.status === "empty") {
    return {
      variant: "empty",
      title: faIR.home.state.empty.title,
      message: faIR.home.state.empty.body,
      requestId: null,
      urgent: false,
      retryAllowed: false,
      showSearchAlternative: true,
    };
  }

  if (state.status === "forbidden") {
    return {
      variant: "forbidden",
      title: faIR.home.state.forbidden.title,
      message: faIR.home.state.forbidden.body,
      requestId: state.requestId,
      urgent: true,
      retryAllowed: false,
      showSearchAlternative: true,
    };
  }

  if (state.status === "offline") {
    return {
      variant: "offline",
      title: faIR.home.state.offline.title,
      message: faIR.home.state.offline.body,
      requestId: null,
      urgent: false,
      retryAllowed: true,
      showSearchAlternative: true,
    };
  }

  if (state.status === "recovery") {
    return {
      variant: "recovery",
      title: faIR.home.state.recovery.title,
      message: faIR.home.state.recovery.body,
      requestId: state.problem.requestId,
      urgent: false,
      retryAllowed: state.plan.action === "retry-read",
      showSearchAlternative: true,
    };
  }

  return {
    variant: "error",
    title: faIR.home.state.error.title,
    message: faIR.home.state.error.body,
    requestId: state.problem.requestId,
    urgent: true,
    retryAllowed: false,
    showSearchAlternative: true,
  };
}
