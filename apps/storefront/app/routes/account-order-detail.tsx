import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "جزئیات سفارش",
};

export default function AccountOrderDetailRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-05"
      title="جزئیات سفارش"
      targetStep={64}
      routeIntent="/account/orders/:order-number"
    />
  );
}
