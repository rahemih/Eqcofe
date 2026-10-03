import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { CheckoutReviewView } from "../features/cart-checkout/CheckoutReviewView.js";
import {
  appendCheckoutFlowSetCookies,
  handleCheckoutReviewAction,
  loadCheckoutReview,
  partitionCheckoutSetCookies,
  type CheckoutFlowMessage,
  type CheckoutReviewPreparedData,
} from "../features/cart-checkout/checkout-flow.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/checkout-flow.css";

export const handle = { breadcrumb: "بازبینی سفارش" };
export const meta = () => [{ title: "بازبینی سفارش | EQCOFE" }, { name: "robots", content: "noindex,nofollow" }];

function applyCookies(headers: Headers, values: readonly string[]) {
  const cookies = partitionCheckoutSetCookies(values);
  appendCustomerSessionSetCookies(headers, cookies.customer);
  appendCheckoutFlowSetCookies(headers, cookies.flow);
}

export async function loader({ request }: { request: Request }) {
  const result = await loadCheckoutReview(request);
  const headers = new Headers();
  applyCookies(headers, result.setCookies);
  if (result.kind === "redirect") return redirect(result.location, { headers });
  return data(result.data, { status: result.statusCode, headers });
}

export async function action({ request }: { request: Request }) {
  const result = await handleCheckoutReviewAction(request);
  const headers = new Headers();
  applyCookies(headers, result.setCookies);
  if (result.kind === "redirect") return redirect(result.location, { headers });
  return data<CheckoutReviewPreparedData | CheckoutFlowMessage>(result.data, { status: result.statusCode, headers });
}

export default function CheckoutReviewRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() ?? null;
  const navigation = useNavigation();
  return <main className="checkout-flow-page" aria-busy={navigation.state !== "idle"}><CheckoutReviewView loaderData={loaderData} actionData={actionData} busy={navigation.state !== "idle"} /></main>;
}
