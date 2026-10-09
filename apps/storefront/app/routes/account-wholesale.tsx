import { data, useLoaderData } from "react-router";
import { WholesaleStatusView } from "../features/wholesale/WholesaleStatusView.js";
import { loadWholesaleAccountSnapshot } from "../features/wholesale/wholesale-application.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/wholesale.css";

export const handle = {
  breadcrumb: "وضعیت فروش عمده",
};

export const meta = () => [
  { title: "وضعیت درخواست فروش عمده | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const state = await loadWholesaleAccountSnapshot(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export default function AccountWholesaleRoute() {
  const state = useLoaderData<typeof loader>();
  return (
    <main>
      <WholesaleStatusView state={state} />
    </main>
  );
}
