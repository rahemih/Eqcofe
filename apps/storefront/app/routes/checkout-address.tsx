import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "آدرس سفارش",
};

export default function CheckoutAddressRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-03"
      title="آدرس سفارش"
      targetStep={63}
      routeIntent="/checkout/address"
    />
  );
}
