import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { CheckoutReviewView } from "../features/cart-checkout/CheckoutReviewView.js";
import {
  handleCheckoutReviewAction,
  loadCheckoutReview,
  type CheckoutReviewActionResult,
} from "../features/cart-checkout/checkout-review.server.js";
import "../styles/checkout-flow.css";

export const handle = { breadcrumb: "بازبینی سفارش" };
export const meta = () => [{ title: "بازبینی سفارش | EQCOFE" }, { name: "robots", content: "noindex,nofollow" }];

export async function loader({ request }: { request: Request }) {
  try {
    const result = await loadCheckoutReview(request);
    const headers = new Headers();
    for (const cookie of result.setCookies) headers.append("Set-Cookie", cookie);
    return data(result.data, { headers });
  } catch {
    return redirect("/checkout/delivery");
  }
}

export async function action({ request }: { request: Request }) {
  const result = await handleCheckoutReviewAction(request);
  if (result.kind === "redirect") return redirect(result.location);
  return data<CheckoutReviewActionResult>(result, { status: result.statusCode });
}

export default function CheckoutReviewRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return <main className="checkout-flow-page" aria-busy={busy}><CheckoutReviewView data={loaderData} actionData={actionData} busy={busy} /></main>;
}
