import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "درباره ما",
};

export default function AboutRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-03"
      title="درباره ما"
      targetStep={66}
      routeIntent="/about"
    />
  );
}
