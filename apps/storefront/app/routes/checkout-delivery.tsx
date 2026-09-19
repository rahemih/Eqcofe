import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "روش تحویل",
};

export default function CheckoutDeliveryRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-04"
      title="روش تحویل"
      targetStep={63}
      routeIntent="/checkout/delivery"
    />
  );
}
