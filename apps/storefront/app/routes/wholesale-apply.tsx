import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "درخواست فروش عمده",
};

export default function WholesaleApplyRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-08"
      title="درخواست فروش عمده"
      targetStep={65}
      routeIntent="/account/wholesale/apply"
    />
  );
}
