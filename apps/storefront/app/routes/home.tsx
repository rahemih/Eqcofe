import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "خانه",
};

export default function HomeRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-B-01"
      title="خانه"
      targetStep={59}
      routeIntent="/"
    />
  );
}
