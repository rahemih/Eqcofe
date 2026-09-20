import { Link } from "react-router";
import { StatePanel } from "../../components/StatePanel";
import { getMessages } from "../../i18n";
import type { AsyncSurfaceState } from "../../platform/state/surface-state";
import type { HomeProductList } from "./home-data.server";
import { describeHomeProductState } from "./home-product-state";

export function HomeProductState({
  state,
}: {
  state: AsyncSurfaceState<HomeProductList>;
}) {
  const messages = getMessages();
  const presentation = describeHomeProductState(state);
  if (!presentation) return null;

  const hasActions = presentation.retryAllowed || presentation.showSearchAlternative;

  return (
    <section className="home-product-state" aria-label={messages.home.state.regionLabel}>
      <StatePanel
        variant={presentation.variant}
        title={presentation.title}
        message={presentation.message}
        requestId={presentation.requestId}
        urgent={presentation.urgent}
      />

      {hasActions ? (
        <nav className="home-product-state__actions" aria-label={messages.home.state.actionsLabel}>
          {presentation.retryAllowed ? (
            <Link to="/" reloadDocument>
              {messages.home.state.retryAction}
            </Link>
          ) : null}
          {presentation.showSearchAlternative ? (
            <Link to="/search">{messages.home.state.searchAction}</Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
