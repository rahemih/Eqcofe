import { data, useActionData, useLoaderData, useNavigation } from "react-router";
import { AccountToolsView } from "../features/account/AccountToolsView.js";
import {
  loadAccountTools,
  mutateAccountTools,
  type AccountToolsMutationResult,
} from "../features/account/account-tools.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "ابزارهای مشتری" };
export const meta = () => [
  { title: "ابزارهای مشتری | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const state = await loadAccountTools(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({ request }: { request: Request }) {
  const result = await mutateAccountTools(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data<AccountToolsMutationResult>(result, {
    status: result.ok ? 200 : result.statusCode,
    headers,
  });
}

export default function AccountToolsRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main aria-busy={busy}>
      <AccountToolsView state={state} actionData={actionData} busy={busy} />
    </main>
  );
}
