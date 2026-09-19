import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "مرجوعی و گارانتی",
};

export default function ReturnsWarrantyRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-07"
      title="مرجوعی و گارانتی"
      targetStep={66}
      routeIntent="/policies/returns-warranty"
    />
  );
}
