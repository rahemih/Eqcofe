import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "آدرس‌ها",
};

export default function AccountAddressesRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-03"
      title="آدرس‌ها"
      targetStep={64}
      routeIntent="/account/addresses"
    />
  );
}
