import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "نتیجه سفارش",
};

export default function OrderOutcomeRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-07"
      title="نتیجه سفارش"
      targetStep={63}
      routeIntent="/order/:order-number/outcome"
    />
  );
}
