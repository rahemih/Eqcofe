import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "جست‌وجو",
};

export default function SearchRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-B-03"
      title="جست‌وجو"
      targetStep={60}
      routeIntent="/search?q="
    />
  );
}
