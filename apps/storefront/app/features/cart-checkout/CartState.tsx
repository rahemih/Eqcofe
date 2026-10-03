import { Link } from "react-router";
import { StatePanel } from "../../components/StatePanel.js";
import type { AsyncSurfaceState } from "../../platform/state/surface-state.js";
import type { CartViewResponse } from "./cart-checkout-contract.js";

export function CartState({ state }: { state: AsyncSurfaceState<CartViewResponse> }) {
  if (state.status === "ready") return null;
  if (state.status === "empty") return (
    <div className="cart-state-action">
      <StatePanel variant="empty" emptyReason="first-use" title="سبد خرید خالی است" message="هنوز کالایی برای تسویه‌حساب انتخاب نشده است." />
      <Link to="/search">مشاهده محصولات</Link>
    </div>
  );
  if (state.status === "loading") return <StatePanel variant="loading" loadingMode={state.mode} />;
  if (state.status === "offline") return <StatePanel variant="offline" />;
  if (state.status === "forbidden") return <StatePanel variant="forbidden" requestId={state.requestId} />;
  if (state.status === "recovery") return <StatePanel variant="recovery" requestId={state.problem.requestId} title="سبد دوباره بررسی می‌شود" message="نتیجه قبلی قطعی نبود؛ اطلاعات معتبر سرور دوباره دریافت می‌شود." />;
  return <StatePanel variant="error" urgent title="سبد در دسترس نیست" message="امکان دریافت وضعیت معتبر سبد وجود ندارد. دوباره تلاش کنید." requestId={state.problem.requestId} />;
}
