import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "سفارش‌ها",
};

export default function AccountOrdersRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-04"
      title="سفارش‌ها"
      targetStep={64}
      routeIntent="/account/orders"
    />
  );
}
