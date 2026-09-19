import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "جزئیات محصول",
};

export default function ProductRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-C-01"
      title="جزئیات محصول"
      targetStep={61}
      routeIntent="/product/:slug"
    />
  );
}
