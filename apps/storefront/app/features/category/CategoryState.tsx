import { Link } from "react-router";
import { StatePanel } from "../../components/StatePanel.js";
import { faIR } from "../../i18n/fa-IR.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { CategoryListingResponse } from "../listing/listing-contract.js";
import type { CategoryRouteIssue } from "./category-data.server.js";
import { describeCategoryState } from "./category-state.js";

export function CategoryState({
  state,
  issue,
  retryHref,
}: {
  state: AsyncSurfaceState<CategoryListingResponse>;
  issue: CategoryRouteIssue;
  retryHref: string;
}) {
  const presentation = describeCategoryState(state, issue);
  if (!presentation) return null;

  return (
    <section className="category-state" aria-label={faIR.category.state.regionLabel}>
      <StatePanel
        variant={presentation.variant}
        title={presentation.title}
        message={presentation.message}
        requestId={presentation.requestId}
        urgent={presentation.urgent}
      />
      {presentation.retryAllowed ? (
        <nav className="category-state__actions" aria-label={faIR.category.state.actionsLabel}>
          <Link to={retryHref} reloadDocument>
            {faIR.category.state.retryAction}
          </Link>
        </nav>
      ) : null}
    </section>
  );
}
