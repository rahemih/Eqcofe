import { Link } from "react-router";
import { StatePanel } from "../../components/StatePanel.js";
import { faIR } from "../../i18n/fa-IR.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { SearchListingResponse } from "../listing/listing-contract.js";
import type { SearchQueryIssue } from "./search-data.server.js";
import { describeSearchState } from "./search-state.js";

export function SearchState({
  state,
  queryIssue,
  query,
  retryHref,
}: {
  state: AsyncSurfaceState<SearchListingResponse>;
  queryIssue: SearchQueryIssue;
  query: string | null;
  retryHref: string;
}) {
  const presentation = describeSearchState(state, queryIssue, query);
  if (!presentation) return null;

  return (
    <section className="search-state" aria-label={faIR.search.state.regionLabel}>
      <StatePanel
        variant={presentation.variant}
        title={presentation.title}
        message={presentation.message}
        requestId={presentation.requestId}
        urgent={presentation.urgent}
      />
      {presentation.retryAllowed ? (
        <nav className="search-state__actions" aria-label={faIR.search.state.actionsLabel}>
          <Link to={retryHref} reloadDocument>
            {faIR.search.state.retryAction}
          </Link>
        </nav>
      ) : null}
    </section>
  );
}
