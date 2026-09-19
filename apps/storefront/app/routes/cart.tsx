import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "سبد خرید",
};

export default function CartRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-01"
      title="سبد خرید"
      targetStep={63}
      routeIntent="/cart"
    />
  );
}
