import { data, useActionData, useLoaderData, useNavigation } from "react-router";
import { AccountWarrantyView } from "../features/account/AccountWarrantyView.js";
import {
  loadAccountWarranty,
  mutateAccountWarranty,
  type AccountAfterSalesMutationResult,
} from "../features/account/account-after-sales.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "گارانتی" };
export const meta = () => [
  { title: "گارانتی من | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { claimNumber?: string };
}) {
  const state = await loadAccountWarranty(request, params.claimNumber);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { claimNumber?: string };
}) {
  const result = await mutateAccountWarranty(request, params.claimNumber);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data<AccountAfterSalesMutationResult>(result, {
    status: result.ok ? 200 : result.statusCode,
    headers,
  });
}

export default function AccountWarrantyRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main aria-busy={busy}>
      <AccountWarrantyView state={state} actionData={actionData} busy={busy} />
    </main>
  );
}
