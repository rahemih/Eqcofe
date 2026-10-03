import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { CheckoutDeliveryView } from "../features/cart-checkout/CheckoutDeliveryView.js";
import {
  handleCheckoutDeliveryAction,
  loadCheckoutDelivery,
  type CheckoutDeliveryActionResult,
} from "../features/cart-checkout/checkout-delivery.server.js";
import "../styles/checkout-flow.css";

export const handle = { breadcrumb: "روش تحویل" };
export const meta = () => [{ title: "روش تحویل | EQCOFE" }, { name: "robots", content: "noindex,nofollow" }];

export async function loader({ request }: { request: Request }) {
  try {
    const result = await loadCheckoutDelivery(request);
    const headers = new Headers();
    for (const cookie of result.setCookies) headers.append("Set-Cookie", cookie);
    return data(result.data, { headers });
  } catch {
    return redirect("/checkout/address");
  }
}

export async function action({ request }: { request: Request }) {
  const result = await handleCheckoutDeliveryAction(request);
  if (result.kind === "redirect") {
    const headers = new Headers();
    for (const cookie of result.setCookies) headers.append("Set-Cookie", cookie);
    return redirect(result.location, { headers });
  }
  return data<CheckoutDeliveryActionResult>(result, { status: result.statusCode });
}

export default function CheckoutDeliveryRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return <main className="checkout-flow-page" aria-busy={busy}><CheckoutDeliveryView data={loaderData} actionData={actionData} busy={busy} /></main>;
}
