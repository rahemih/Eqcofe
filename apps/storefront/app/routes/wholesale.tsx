import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "فروش عمده",
};

export default function WholesaleRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-07"
      title="فروش عمده"
      targetStep={65}
      routeIntent="/wholesale"
    />
  );
}
