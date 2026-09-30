import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { StatePanel } from "../../components/StatePanel.js";
import {
  readBrowserConnectivityHint,
  subscribeBrowserConnectivityHint,
  type ConnectivityHint,
} from "../../platform/state/connectivity.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { ProductDetailResponse } from "./product-detail-contract.js";
import { describeProductDetailState } from "./product-detail-state.js";

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
