import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "پرسش‌های متداول",
};

export default function FaqRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-05"
      title="پرسش‌های متداول"
      targetStep={66}
      routeIntent="/faq"
    />
  );
}
