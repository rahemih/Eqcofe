import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "وضعیت فروش عمده",
};

export default function AccountWholesaleRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-09"
      title="وضعیت فروش عمده"
      targetStep={65}
      routeIntent="/account/wholesale"
    />
  );
}
