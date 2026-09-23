import { Form, Link } from "react-router";
import { faIR } from "../../i18n/fa-IR.js";
import type {
  CategoryFilterDefinition,
  ListingFacets,
} from "./listing-contract.js";
import {
  clearListingFilters,
  serializeListingUrlState,
  updateListingUrlState,
  type ListingUrlMode,
  type ListingUrlState,
} from "./listing-url-state.js";
import "../../styles/listing-controls.css";

export function ListingControls({
  mode,
  basePath,
  state,
  facets,
  categoryFilters = [],
}: {
  mode: ListingUrlMode;
  basePath: string;
  state: ListingUrlState;
  facets: ListingFacets;
  categoryFilters?: readonly CategoryFilterDefinition[];
}) {
  const enabled = facets.filtering_available;
  const selectedAttributes = new Set(state.attributeValueIds ?? []);
  const selectedCount =
    Number(Boolean(state.brand))
    + Number(state.available === true)
    + Number(state.minPrice !== undefined || state.maxPrice !== undefined)
    + selectedAttributes.size;
  const clearState = clearListingFilters(state);
  const clearHref = href(basePath, clearState);

  return (
    <section className="listing-controls" aria-labelledby="listing-controls-title">
      <div className="listing-controls__header">
        <div>
          <p className="listing-controls__eyebrow">{faIR.listingFilters.eyebrow}</p>
          <h2 id="listing-controls-title">{faIR.listingFilters.title}</h2>
        </div>
        <p className="listing-controls__status" role="status" aria-live="polite">
          {selectedCount.toLocaleString("fa-IR")} {faIR.listingFilters.selectedSuffix}
        </p>
      </div>

      {!enabled ? (
        <p className="listing-controls__disabled" role="status">
          {facets.disabled_reason ?? faIR.listingFilters.disabledReason}
        </p>
      ) : null}

      <Form method="get" action={basePath} className="listing-controls__form">
        {state.q ? <input type="hidden" name="q" value={state.q} /> : null}
        {state.limit ? <input type="hidden" name="limit" value={state.limit} /> : null}

        <label className="listing-control">
          <span>{faIR.listingFilters.sortLabel}</span>
          <select
            name="sort"
            defaultValue={state.sort ?? (mode === "search" ? "relevance" : "newest")}
            disabled={!enabled}
          >
            {mode === "search" ? (
              <option value="relevance">{faIR.listingFilters.sortRelevance}</option>
            ) : null}
            <option value="newest">{faIR.listingFilters.sortNewest}</option>
            <option value="price_asc">{faIR.listingFilters.sortPriceAsc}</option>
            <option value="price_desc">{faIR.listingFilters.sortPriceDesc}</option>
          </select>
        </label>

        <fieldset className="listing-control listing-control--choice" disabled={!enabled}>
          <legend>{faIR.listingFilters.availabilityLabel}</legend>
          <label>
            <input
              type="checkbox"
              name="available"
              value="true"
              defaultChecked={state.available === true}
            />
            <span>{faIR.listingFilters.inStockOnly}</span>
          </label>
        </fieldset>

        <label className="listing-control">
          <span>{faIR.listingFilters.brandLabel}</span>
          <select name="brand" defaultValue={state.brand ?? ""} disabled={!enabled}>
            <option value="">{faIR.listingFilters.allBrands}</option>
            {facets.brands.map((brand) => (
              <option key={brand.id} value={brand.slug}>{brand.name_fa}</option>
            ))}
          </select>
        </label>

        <fieldset className="listing-control listing-control--price" disabled={!enabled || !facets.price_range}>
          <legend>{faIR.listingFilters.priceLabel}</legend>
          <label>
            <span>{faIR.listingFilters.minPrice}</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              name="min_price"
              defaultValue={state.minPrice ?? ""}
              placeholder={facets.price_range ? String(facets.price_range.min_toman) : undefined}
            />
          </label>
          <label>
            <span>{faIR.listingFilters.maxPrice}</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              name="max_price"
              defaultValue={state.maxPrice ?? ""}
              placeholder={facets.price_range ? String(facets.price_range.max_toman) : undefined}
            />
          </label>
          <small>{faIR.listingFilters.tomanHint}</small>
        </fieldset>

        {categoryFilters.map((filter) => (
          <fieldset className="listing-control listing-control--choice" key={filter.id} disabled={!enabled}>
            <legend>{filter.name_fa}</legend>
            {filter.values.map((value) => (
              <label key={value.id}>
                <input
                  type="checkbox"
                  name="attribute_value"
                  value={value.id}
                  defaultChecked={selectedAttributes.has(value.id)}
                />
                <span>{filterValueLabel(value)}</span>
              </label>
            ))}
          </fieldset>
        ))}

        <div className="listing-controls__actions">
          <button type="submit" disabled={!enabled}>{faIR.listingFilters.apply}</button>
          <Link to={clearHref}>{faIR.listingFilters.clear}</Link>
        </div>
      </Form>

      {selectedCount > 0 ? (
        <nav className="listing-selections" aria-label={faIR.listingFilters.selectionSummary}>
          {state.brand ? (
            <SelectionChip
              label={faIR.listingFilters.brandSelection}
              href={href(basePath, updateListingUrlState(state, { brand: undefined }))}
            />
          ) : null}
          {state.available === true ? (
            <SelectionChip
              label={faIR.listingFilters.inStockOnly}
              href={href(basePath, updateListingUrlState(state, { available: undefined }))}
            />
          ) : null}
          {state.minPrice !== undefined || state.maxPrice !== undefined ? (
            <SelectionChip
              label={priceSelection(state)}
              href={href(basePath, updateListingUrlState(state, { minPrice: undefined, maxPrice: undefined }))}
            />
          ) : null}
          {[...(state.attributeValueIds ?? [])].map((id) => (
            <SelectionChip
              key={id}
              label={attributeLabel(id, categoryFilters)}
              href={href(
                basePath,
                updateListingUrlState(state, {
                  attributeValueIds: (state.attributeValueIds ?? []).filter((value) => value !== id),
                }),
              )}
            />
          ))}
        </nav>
      ) : null}
    </section>
  );
}

function SelectionChip({ label, href: to }: { label: string; href: string }) {
  return (
    <Link className="listing-selection" to={to}>
      <span>{label}</span>
      <span aria-hidden="true">×</span>
      <span className="sr-only">{faIR.listingFilters.removeSelection}</span>
    </Link>
  );
}

function href(basePath: string, state: ListingUrlState) {
  const query = serializeListingUrlState(state);
  return query ? `${basePath}?${query}` : basePath;
}

function priceSelection(state: ListingUrlState) {
  const format = new Intl.NumberFormat("fa-IR");
  const min = state.minPrice === undefined ? faIR.listingFilters.noMinimum : format.format(state.minPrice);
  const max = state.maxPrice === undefined ? faIR.listingFilters.noMaximum : format.format(state.maxPrice);
  return `${min} تا ${max} تومان`;
}

function attributeLabel(id: string, filters: readonly CategoryFilterDefinition[]) {
  for (const filter of filters) {
    const value = filter.values.find((item) => item.id === id);
    if (value) return `${filter.name_fa}: ${filterValueLabel(value)}`;
  }
  return faIR.listingFilters.attributeSelection;
}

function filterValueLabel(value: CategoryFilterDefinition["values"][number]) {
  if (value.value_text) return value.value_text;
  if (value.value_numeric !== null && value.value_numeric !== undefined) {
    return String(value.value_numeric);
  }
  if (value.value_boolean !== null && value.value_boolean !== undefined) {
    return value.value_boolean ? faIR.listingFilters.booleanYes : faIR.listingFilters.booleanNo;
  }
  return value.normalized_value ?? faIR.listingFilters.unknownValue;
}
