import { data, useActionData, useLoaderData, useNavigation } from "react-router";
import { AccountAddressesView } from "../features/account/AccountAddressesView.js";
import {
  loadAccountAddresses,
  mutateAccountAddress,
  type AccountMutationResult,
} from "../features/account/account-settings.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = { breadcrumb: "آدرس‌ها" };
export const meta = () => [
  { title: "نشانی‌های من | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const state = await loadAccountAddresses(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({ request }: { request: Request }) {
  const result = await mutateAccountAddress(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data<AccountMutationResult>(result, {
    status: result.ok ? 200 : result.statusCode,
    headers,
  });
}

export default function AccountAddressesRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  return (
    <main aria-busy={navigation.state !== "idle"}>
      <AccountAddressesView
        state={state}
        actionData={actionData}
        busy={navigation.state !== "idle"}
      />
    </main>
  );
}
