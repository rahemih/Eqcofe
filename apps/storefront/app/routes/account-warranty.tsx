import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "گارانتی",
};

export default function AccountWarrantyRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-12"
      title="گارانتی"
      targetStep={64}
      routeIntent="/account/warranty/:claim-number?"
    />
  );
}
