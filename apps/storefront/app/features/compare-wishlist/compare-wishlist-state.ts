import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type {
  CompareResponse,
  CompareValidateResponse,
  WishlistListResponse,
} from "./compare-wishlist-contract.js";

export type CompareWishlistFoundationState = {
  compare: {
    validation: AsyncSurfaceState<CompareValidateResponse>;
    result: AsyncSurfaceState<CompareResponse>;
  };
  wishlist: AsyncSurfaceState<WishlistListResponse>;
};

export type CompareWishlistAuthority = {
  compare: "backend";
  wishlist: "backend";
};

export const COMPARE_WISHLIST_AUTHORITY: CompareWishlistAuthority = Object.freeze({
  compare: "backend",
  wishlist: "backend",
});
