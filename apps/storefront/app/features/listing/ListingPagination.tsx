import { Link } from "react-router";
import { faIR } from "../../i18n/fa-IR.js";
import type { ListingPagination as ListingPaginationData } from "./listing-contract.js";
import {
  serializeListingUrlState,
  updateListingUrlState,
  type ListingUrlState,
} from "./listing-url-state.js";

export function ListingPagination({
  basePath,
  state,
  pagination,
}: {
  basePath: string;
  state: ListingUrlState;
  pagination: ListingPaginationData;
}) {
  if (!pagination.has_more || !pagination.next_cursor) return null;
  const next = updateListingUrlState(state, { cursor: pagination.next_cursor });
  const query = serializeListingUrlState(next);
  return (
    <nav className="listing-pagination" aria-label={faIR.listingFilters.paginationLabel}>
      <Link to={query ? `${basePath}?${query}` : basePath}>
        {faIR.listingFilters.nextPage}
      </Link>
    </nav>
  );
}
