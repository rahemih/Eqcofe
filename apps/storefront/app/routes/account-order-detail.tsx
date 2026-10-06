import { data, useActionData, useLoaderData, useNavigation } from "react-router";
import { AccountOrderDetailView } from "../features/account/AccountOrderDetailView.js";
import {
  loadAccountOrderDetail,
  mutateAccountOrder,
  type AccountOrderMutationResult,
} from "../features/account/account-orders.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "جزئیات سفارش" };
export const meta = () => [
  { title: "جزئیات سفارش | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { orderNumber?: string };
}) {
  const state = await loadAccountOrderDetail(request, params.orderNumber);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { orderNumber?: string };
}) {
  const result = await mutateAccountOrder(request, params.orderNumber);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data<AccountOrderMutationResult>(result, {
    status: result.ok ? 200 : result.statusCode,
    headers,
  });
}

export default function AccountOrderDetailRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main aria-busy={busy}>
      <AccountOrderDetailView state={state} actionData={actionData} busy={busy} />
    </main>
  );
}
