import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "بازبینی سفارش",
};

export default function CheckoutReviewRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-05"
      title="بازبینی سفارش"
      targetStep={63}
      routeIntent="/checkout/review"
    />
  );
}
