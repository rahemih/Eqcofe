import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "ورود به فرایند خرید",
};

export default function CheckoutIdentityRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-02"
      title="ورود به فرایند خرید"
      targetStep={63}
      routeIntent="/checkout/identity"
    />
  );
}
