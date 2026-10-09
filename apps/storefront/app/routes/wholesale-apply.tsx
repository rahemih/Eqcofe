import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { WholesaleApplicationView } from "../features/wholesale/WholesaleApplicationView.js";
import {
  loadWholesaleApplicationPage,
  submitWholesaleApplication,
  type WholesaleSubmitResult,
} from "../features/wholesale/wholesale-application.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/wholesale.css";

export const handle = {
  breadcrumb: "درخواست فروش عمده",
};

export const meta = () => [
  { title: "درخواست فروش عمده | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  const state = await loadWholesaleApplicationPage(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, state.setCookies);
  return data(state, { headers });
}

export async function action({ request }: { request: Request }) {
  const result = await submitWholesaleApplication(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);

  if (result.ok) {
    return redirect(result.redirectTo, { headers });
  }

  return data<WholesaleSubmitResult>(result, {
    status: result.statusCode,
    headers,
  });
}

export default function WholesaleApplyRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();

  return (
    <main aria-busy={navigation.state !== "idle"}>
      <WholesaleApplicationView
        state={state}
        actionData={actionData}
        busy={navigation.state !== "idle"}
      />
    </main>
  );
}
