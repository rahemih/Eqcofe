import { data, useLoaderData } from "react-router";
import { AccountOrdersView } from "../features/account/AccountOrdersView.js";
import { loadAccountOrders } from "../features/account/account-orders.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "سفارش‌ها" };
export const meta = () => [
  { title: "سفارش‌های من | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const state = await loadAccountOrders(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export default function AccountOrdersRoute() {
  const state = useLoaderData<typeof loader>();
  return (
    <main>
      <AccountOrdersView state={state} />
    </main>
  );
}
