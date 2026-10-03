import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import { classifyApiFailureState, emptyState, readyState } from "../../platform/state/surface-state.js";
import type { CartViewResponse } from "./cart-checkout-contract.js";
import { loadGuestCart, removeGuestCartItem, updateGuestCartItem } from "./cart-checkout-data.server.js";

export type CartRouteData = { cart: AsyncSurfaceState<CartViewResponse> };
export type CartActionResult = { ok: boolean; message?: string };

export async function loadCartRouteData(request: Request): Promise<CartRouteData> {
  try {
    const result = await loadGuestCart(request);
    if (!result.data || result.data.data.items.length === 0) return { cart: emptyState("first-use") };
    return { cart: readyState(result.data) };
  } catch (error) {
    return { cart: classifyApiFailureState<CartViewResponse>(error, { method: "get", connectivity: "unknown" }) };
  }
}

export async function mutateCartRoute(request: Request): Promise<CartActionResult> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const itemId = String(form.get("item_id") ?? "");
  if (!UUID_RE.test(itemId)) return { ok: false, message: "شناسه قلم سبد معتبر نیست." };
  try {
    if (intent === "remove") {
      await removeGuestCartItem(request, itemId);
      return { ok: true };
    }
    if (intent === "quantity") {
      const quantity = Number(form.get("quantity"));
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
        return { ok: false, message: "تعداد واردشده معتبر نیست." };
      }
      await updateGuestCartItem(request, itemId, { quantity });
      return { ok: true };
    }
    return { ok: false, message: "عملیات سبد شناخته‌شده نیست." };
  } catch {
    return { ok: false, message: "تغییر سبد قطعی نشد؛ وضعیت فعلی سبد دوباره از سرور دریافت می‌شود." };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
