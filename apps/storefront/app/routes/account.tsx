import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "حساب کاربری",
};

export default function AccountRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-01"
      title="حساب کاربری"
      targetStep={64}
      routeIntent="/account"
    />
  );
}
