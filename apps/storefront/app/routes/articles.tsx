import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "مقالات",
};

export default function ArticlesRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-01"
      title="مقالات"
      targetStep={66}
      routeIntent="/articles"
    />
  );
}
