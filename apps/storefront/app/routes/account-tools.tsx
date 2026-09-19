import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "ابزارهای حساب",
};

export default function AccountToolsRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-06"
      title="ابزارهای حساب"
      targetStep={64}
      routeIntent="/account/tools"
    />
  );
}
