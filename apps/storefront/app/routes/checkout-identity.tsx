import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { CheckoutIdentityView } from "../features/cart-checkout/CheckoutIdentityView.js";
import {
  handleCheckoutIdentityAction,
  loadCheckoutIdentity,
  type CheckoutIdentityActionData,
} from "../features/cart-checkout/checkout-identity.server.js";
import { appendCartCheckoutSetCookies } from "../features/cart-checkout/cart-checkout-session.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/checkout-identity.css";

export const handle = { breadcrumb: "ورود به فرایند خرید" };
export const meta = () => [
  { title: "ورود و هویت تسویه‌حساب | EQCOFE" },
  { name: "robots", content: "noindex,nofollow" },
];

export async function loader({ request }: { request: Request }) {
  return data(await loadCheckoutIdentity(request));
}

export async function action({ request }: { request: Request }) {
  const result = await handleCheckoutIdentityAction(request);
  if (result.kind === "redirect") {
    const headers = new Headers();
    const customerCookies = result.setCookies.filter((cookie) =>
      cookie.startsWith("eqcofe_session=") || cookie.startsWith("__Host-eqcofe_session="));
    const cartCookies = result.setCookies.filter((cookie) => !customerCookies.includes(cookie));
    appendCustomerSessionSetCookies(headers, customerCookies);
    appendCartCheckoutSetCookies(headers, cartCookies);
    return redirect(result.location, { headers });
  }
  return data<CheckoutIdentityActionData>(result.data, { status: result.statusCode });
}

export default function CheckoutIdentityRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="checkout-identity-page" aria-busy={busy}>
      <CheckoutIdentityView
        session={loaderData.session}
        actionData={actionData}
        busy={busy}
      />
    </main>
  );
}
