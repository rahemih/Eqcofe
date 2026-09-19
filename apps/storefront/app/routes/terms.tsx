import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "شرایط استفاده",
};

export default function TermsRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-06"
      title="شرایط استفاده"
      targetStep={66}
      routeIntent="/policies/terms"
    />
  );
}
