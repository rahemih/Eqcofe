import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "مقاله",
};

export default function ArticleDetailRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-02"
      title="مقاله"
      targetStep={66}
      routeIntent="/articles/:slug"
    />
  );
}
