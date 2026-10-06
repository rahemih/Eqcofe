import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { AccountProfileView } from "../features/account/AccountProfileView.js";
import {
  loadAccountProfile,
  mutateAccountProfile,
  type AccountMutationResult,
} from "../features/account/account-settings.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "پروفایل" };
export const meta = () => [
  { title: "پروفایل و امنیت | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const state = await loadAccountProfile(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({ request }: { request: Request }) {
  const result = await mutateAccountProfile(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  if (result.ok && result.redirectTo) return redirect(result.redirectTo, { headers });
  return data<AccountMutationResult>(result, {
    status: result.ok ? 200 : result.statusCode,
    headers,
  });
}

export default function AccountProfileRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  return (
    <main aria-busy={navigation.state !== "idle"}>
      <AccountProfileView
        state={state}
        actionData={actionData}
        busy={navigation.state !== "idle"}
      />
    </main>
  );
}
