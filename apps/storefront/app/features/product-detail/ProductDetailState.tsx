import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { StatePanel, type StatePanelVariant } from "../../components/StatePanel.js";
import {
  readBrowserConnectivityHint,
  subscribeBrowserConnectivityHint,
  type ConnectivityHint,
} from "../../platform/state/connectivity.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { ProductDetailResponse } from "./product-detail-contract.js";

export type ProductDetailStatePresentation = {
  variant: StatePanelVariant;
  title: string;
  message: string;
  requestId: string | null;
  retryAllowed: boolean;
  urgent: boolean;
};

export function ProductDetailState({
  state,
  retryHref,
}: {
  state: AsyncSurfaceState<ProductDetailResponse>;
  retryHref: string;
}) {
  const connectivity = useSyncExternalStore<ConnectivityHint>(
    subscribeBrowserConnectivityHint,
    readBrowserConnectivityHint,
    () => "unknown",
  );
  const presentation = describeProductDetailState(state, connectivity);
  if (!presentation) return null;

  return (
    <section className="product-detail-state" aria-label="وضعیت جزئیات محصول">
      <StatePanel
        variant={presentation.variant}
        title={presentation.title}
        message={presentation.message}
        requestId={presentation.requestId}
        urgent={presentation.urgent}
      />
      {presentation.retryAllowed ? (
        <Link to={retryHref} reloadDocument className="product-detail-page__retry">
          تلاش دوباره
        </Link>
      ) : null}
    </section>
  );
}

export function describeProductDetailState(
  state: AsyncSurfaceState<ProductDetailResponse>,
  connectivity: ConnectivityHint,
): ProductDetailStatePresentation | null {
  if (state.status === "ready") return null;

  if (
    connectivity === "offline"
    && (state.status === "error" || state.status === "recovery")
  ) {
    return {
      variant: "offline",
      title: "اتصال اینترنت در دسترس نیست",
      message: "برای نمایش جزئیات محصول، اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
      requestId: "problem" in state ? state.problem.requestId : null,
      retryAllowed: true,
      urgent: false,
    };
  }

  if (state.status === "loading") {
    return {
      variant: "loading",
      title: "در حال بارگذاری محصول",
      message: "جزئیات محصول در حال دریافت است.",
      requestId: null,
      retryAllowed: false,
      urgent: false,
    };
  }

  if (state.status === "empty") {
    return {
      variant: "empty",
      title: "محصول پیدا نشد",
      message: "این محصول وجود ندارد یا دیگر در فهرست عمومی فروشگاه در دسترس نیست.",
      requestId: null,
      retryAllowed: false,
      urgent: false,
    };
  }

  if (state.status === "forbidden") {
    return {
      variant: "forbidden",
      title: "دسترسی به این محصول ممکن نیست",
      message: "امکان نمایش این محصول با دسترسی فعلی وجود ندارد.",
      requestId: state.requestId,
      retryAllowed: false,
      urgent: false,
    };
  }

  if (state.status === "recovery") {
    return {
      variant: "recovery",
      title: "دریافت جزئیات محصول کامل نشد",
      message: "برای دریافت دوباره اطلاعات محصول تلاش کنید.",
      requestId: state.problem.requestId,
      retryAllowed: true,
      urgent: false,
    };
  }

  if (state.status === "offline") {
    return {
      variant: "offline",
      title: "اتصال اینترنت در دسترس نیست",
      message: "پس از برقراری اتصال، دوباره برای دریافت جزئیات محصول تلاش کنید.",
      requestId: null,
      retryAllowed: true,
      urgent: false,
    };
  }

  return {
    variant: "error",
    title: "جزئیات محصول در دسترس نیست",
    message: "بارگذاری اطلاعات محصول انجام نشد. دوباره تلاش کنید.",
    requestId: state.problem.requestId,
    retryAllowed: true,
    urgent: false,
  };
}
