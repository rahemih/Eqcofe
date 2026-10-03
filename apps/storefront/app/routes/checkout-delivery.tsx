import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { StatePanel } from "../components/StatePanel.js";
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
    return data({ kind: "ready" as const, value: result.data }, { headers });
  } catch {
    return data({ kind: "recovery" as const });
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
  if (loaderData.kind === "recovery") return <main className="checkout-flow-page"><StatePanel variant="recovery" title="روش تحویل فعلاً قابل دریافت نیست" message="بدون نشانی، Cart و پاسخ authoritative روش‌های ارسال، مبلغ یا روش تحویل حدس زده نمی‌شود." /></main>;
  return <main className="checkout-flow-page" aria-busy={busy}><CheckoutDeliveryView data={loaderData.value} actionData={actionData} busy={busy} /></main>;
}
