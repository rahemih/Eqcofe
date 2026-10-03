import { data, useActionData, useLoaderData, useNavigation } from "react-router";
import { CartState } from "../features/cart-checkout/CartState.js";
import { CartView } from "../features/cart-checkout/CartView.js";
import { loadCartRouteData, mutateCartRoute } from "../features/cart-checkout/cart-route-data.server.js";
import "../styles/cart.css";

export const handle = { breadcrumb: "سبد خرید" };
export const meta = () => [{ title: "سبد خرید | EQCOFE" }, { name: "robots", content: "noindex,nofollow" }];

export async function loader({ request }: { request: Request }) { return data(await loadCartRouteData(request)); }
export async function action({ request }: { request: Request }) {
  const result = await mutateCartRoute(request);
  return data(result, { status: result.ok ? 200 : 400 });
}

export default function CartRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <main className="cart-page" aria-busy={busy}>
      <header className="cart-intro"><p>تسویه‌حساب</p><h1>سبد خرید</h1><p>کالاها و تعداد را پیش از ادامه بررسی کنید.</p></header>
      {busy ? <p role="status" aria-live="polite">در حال به‌روزرسانی سبد…</p> : null}
      {actionData && !actionData.ok ? <p className="cart-action-error" role="alert">{actionData.message}</p> : null}
      <CartState state={loaderData.cart} />
      {loaderData.cart.status === "ready" ? <CartView response={loaderData.cart.data} busy={busy} /> : null}
    </main>
  );
}
