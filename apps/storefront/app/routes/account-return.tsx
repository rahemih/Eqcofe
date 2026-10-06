import { data, useActionData, useLoaderData, useNavigation } from "react-router";
import { AccountReturnsView } from "../features/account/AccountReturnsView.js";
import {
  loadAccountReturns,
  mutateAccountReturn,
  type AccountAfterSalesMutationResult,
} from "../features/account/account-after-sales.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "مرجوعی" };
export const meta = () => [
  { title: "مرجوعی‌های من | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { returnNumber?: string };
}) {
  const state = await loadAccountReturns(request, params.returnNumber);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { returnNumber?: string };
}) {
  const result = await mutateAccountReturn(request, params.returnNumber);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data<AccountAfterSalesMutationResult>(result, {
    status: result.ok ? 200 : result.statusCode,
    headers,
  });
}

export default function AccountReturnRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main aria-busy={busy}>
      <AccountReturnsView state={state} actionData={actionData} busy={busy} />
    </main>
  );
}
