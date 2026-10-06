import { data, useLoaderData } from "react-router";
import { AccountOverviewView } from "../features/account/AccountOverviewView.js";
import { loadAccountOverview } from "../features/account/account-data.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/account.css";

export const handle = {
  breadcrumb: "حساب کاربری",
};

export const meta = () => [
  { title: "حساب کاربری | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const result = await loadAccountOverview(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result, { headers });
}

export default function AccountRoute() {
  const state = useLoaderData<typeof loader>();
  return (
    <main aria-busy="false">
      <AccountOverviewView state={state} />
    </main>
  );
}
