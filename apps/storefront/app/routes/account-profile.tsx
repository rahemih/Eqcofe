import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "پروفایل",
};

export default function AccountProfileRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-02"
      title="پروفایل"
      targetStep={64}
      routeIntent="/account/profile"
    />
  );
}
