import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "مقایسه محصولات",
};

export default function CompareRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-C-04"
      title="مقایسه محصولات"
      targetStep={62}
      routeIntent="/compare"
    />
  );
}
