import { useEffect, useId, useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";
import { serializeCompareUrlState } from "../compare-wishlist/compare-url-state.js";
import type { WishlistMembershipView } from "../compare-wishlist/wishlist-action-state.js";
import type { ListingProductCardData } from "./listing-contract.js";
import { ListingProductCard } from "./ListingProductCard.js";
import "../../styles/listing.css";

export type ListingCompareSeed = {
  id: string;
  name: string;
  primaryCategoryId: string | null;
};

const EMPTY_WISHLIST: WishlistMembershipView = {
  status: "unavailable",
  productIds: [],
};

export function ListingGrid({
  products,
  heading,
  wishlist,
  compareSeed = null,
}: {
  products: readonly ListingProductCardData[];
  heading: string;
  wishlist?: WishlistMembershipView;
  compareSeed?: ListingCompareSeed | null;
}) {
  const wishlistFetcher = useFetcher<WishlistMembershipView>();
  const resolvedWishlist = wishlist ?? wishlistFetcher.data ?? EMPTY_WISHLIST;
  const sectionTitleId = useId();
  const compareTitleId = useId();
  const signature = useMemo(
    () => products.map((product) => product.id).join("|"),
    [products],
  );
  const selectionScope = `${signature}::${compareSeed?.id ?? ""}`;
  const initialSelection = compareSeed ? [compareSeed.id] : [];
  const [selection, setSelection] = useState<{ scope: string; ids: string[] }>({
    scope: selectionScope,
    ids: initialSelection,
  });
  const [issue, setIssue] = useState<{ scope: string; message: string | null }>({
    scope: selectionScope,
    message: null,
  });
  const selectedIds = selection.scope === selectionScope
    ? selection.ids
    : initialSelection;
  const selectionIssue = issue.scope === selectionScope ? issue.message : null;

  useEffect(() => {
    if (wishlist === undefined && wishlistFetcher.state === "idle" && wishlistFetcher.data === undefined) {
      void wishlistFetcher.load("/actions/wishlist");
    }
  }, [wishlist, wishlistFetcher]);

  const selectedCategoryId = selectedIds
    .map((id) => {
      if (compareSeed?.id === id) return compareSeed.primaryCategoryId;
      return products.find((product) => product.id === id)?.primary_category?.id ?? null;
    })
    .find((value): value is string => Boolean(value)) ?? null;

  const selectedItems = selectedIds.map((id) => ({
    id,
    name: compareSeed?.id === id
      ? compareSeed.name
      : products.find((product) => product.id === id)?.name ?? id,
    locked: compareSeed?.id === id,
  }));

  const compareHref = selectedIds.length >= 2
    ? `/compare?${serializeCompareUrlState({ productIds: selectedIds })}`
    : null;

  function disabledReason(product: ListingProductCardData): string | null {
    if (selectedIds.includes(product.id)) return null;
    if (!product.primary_category?.id) return "دسته اصلی این محصول برای مقایسه مشخص نیست.";
    if (selectedIds.length >= 4) return "سقف چهار محصول برای مقایسه تکمیل است.";
    if (selectedCategoryId && product.primary_category.id !== selectedCategoryId) {
      return "این محصول با دسته انتخاب‌های فعلی سازگار نیست.";
    }
    return null;
  }

  function removeSelectedProduct(productId: string) {
    if (compareSeed?.id === productId) return;
    setSelection({
      scope: selectionScope,
      ids: selectedIds.filter((id) => id !== productId),
    });
    setIssue({ scope: selectionScope, message: null });
  }

  function toggleCompare(product: ListingProductCardData) {
    if (selectedIds.includes(product.id)) {
      if (compareSeed?.id === product.id) return;
      setSelection({
        scope: selectionScope,
        ids: selectedIds.filter((id) => id !== product.id),
      });
      setIssue({ scope: selectionScope, message: null });
      return;
    }

    const reason = disabledReason(product);
    if (reason) {
      setIssue({ scope: selectionScope, message: reason });
      return;
    }

    setSelection({
      scope: selectionScope,
      ids: [...selectedIds, product.id],
    });
    setIssue({ scope: selectionScope, message: null });
  }

  return (
    <section className="listing-section" aria-labelledby={sectionTitleId}>
      <div className="listing-section__heading">
        <h2 id={sectionTitleId}>{heading}</h2>
        <span>{products.length.toLocaleString("fa-IR")} مورد</span>
      </div>

      <section className="compare-selection" aria-labelledby={compareTitleId}>
        <div className="compare-selection__summary">
          <div>
            <h3 id={compareTitleId}>انتخاب برای مقایسه</h3>
            <p role="status" aria-live="polite" aria-atomic="true">
              {selectedIds.length.toLocaleString("fa-IR")} از ۴ محصول انتخاب شده است.
            </p>
          </div>
          {compareHref ? (
            <Link className="compare-selection__submit" to={compareHref}>
              مقایسه {selectedIds.length.toLocaleString("fa-IR")} محصول
            </Link>
          ) : (
            <span className="compare-selection__hint">برای شروع، حداقل دو محصول هم‌دسته انتخاب کنید.</span>
          )}
        </div>

        {selectedItems.length ? (
          <ul className="compare-selection__items" aria-label="محصولات انتخاب‌شده برای مقایسه">
            {selectedItems.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                {item.locked ? (
                  <span className="compare-selection__seed-note">محصول اصلی</span>
                ) : (
                  <button
                    type="button"
                    className="compare-selection__remove"
                    onClick={() => removeSelectedProduct(item.id)}
                    aria-label={`حذف ${item.name} از انتخاب مقایسه`}
                  >
                    حذف
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        {selectionIssue ? (
          <p className="compare-selection__issue" role="status" aria-live="polite">
            {selectionIssue}
          </p>
        ) : null}
      </section>

      <div className="listing-grid">
        {products.map((product) => {
          const reason = disabledReason(product);
          return (
            <ListingProductCard
              key={product.id}
              product={product}
              compareSelected={selectedIds.includes(product.id)}
              compareDisabledReason={reason}
              onCompareToggle={() => toggleCompare(product)}
              wishlist={resolvedWishlist}
            />
          );
        })}
      </div>
    </section>
  );
}
