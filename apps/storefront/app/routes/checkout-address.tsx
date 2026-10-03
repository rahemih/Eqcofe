import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { CheckoutAddressView } from "../features/cart-checkout/CheckoutAddressView.js";
import {
  handleCheckoutAddressAction,
  loadCheckoutAddress,
  type CheckoutAddressActionResult,
} from "../features/cart-checkout/checkout-address.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/checkout-flow.css";

export const handle = { breadcrumb: "آدرس سفارش" };
export const meta = () => [{ title: "نشانی سفارش | EQCOFE" }, { name: "robots", content: "noindex,nofollow" }];

export async function loader({ request }: { request: Request }) {
  try {
    const result = await loadCheckoutAddress(request);
    const headers = new Headers();
    appendCustomerSessionSetCookies(headers, result.setCookies);
    return data(result.data, { headers });
  } catch {
    return redirect("/checkout/identity");
  }
}

export async function action({ request }: { request: Request }) {
  const result = await handleCheckoutAddressAction(request);
  if (result.kind === "redirect") {
    const headers = new Headers();
    for (const cookie of result.setCookies) headers.append("Set-Cookie", cookie);
    return redirect(result.location, { headers });
  }
  return data<CheckoutAddressActionResult>(result, { status: result.statusCode });
}

export default function CheckoutAddressRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return <main className="checkout-flow-page" aria-busy={busy}><CheckoutAddressView data={loaderData} actionData={actionData} busy={busy} /></main>;
}
