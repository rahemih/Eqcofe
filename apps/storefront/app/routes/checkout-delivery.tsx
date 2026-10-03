import { data, redirect, useLoaderData, useNavigation } from "react-router";
import { CheckoutDeliveryView } from "../features/cart-checkout/CheckoutDeliveryView.js";
import { appendCheckoutFlowSetCookies, loadCheckoutDelivery, partitionCheckoutSetCookies } from "../features/cart-checkout/checkout-flow.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/checkout-flow.css";

export const handle = { breadcrumb: "روش تحویل" };
export const meta = () => [{ title: "روش تحویل | EQCOFE" }, { name: "robots", content: "noindex,nofollow" }];

function applyCookies(headers: Headers, values: readonly string[]) {
  const cookies = partitionCheckoutSetCookies(values);
  appendCustomerSessionSetCookies(headers, cookies.customer);
  appendCheckoutFlowSetCookies(headers, cookies.flow);
}

export async function loader({ request }: { request: Request }) {
  const result = await loadCheckoutDelivery(request);
  const headers = new Headers();
  applyCookies(headers, result.setCookies);
  if (result.kind === "redirect") return redirect(result.location, { headers });
  return data(result.data, { status: result.statusCode, headers });
}

export default function CheckoutDeliveryRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  return <main className="checkout-flow-page" aria-busy={navigation.state !== "idle"}><CheckoutDeliveryView data={loaderData} busy={navigation.state !== "idle"} /></main>;
}
