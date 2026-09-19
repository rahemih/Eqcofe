import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "دسته‌بندی",
};

export default function CategoryRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-B-02"
      title="دسته‌بندی"
      targetStep={60}
      routeIntent="/category/:slug"
    />
  );
}
