import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "مرجوعی",
};

export default function AccountReturnRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-E-11"
      title="مرجوعی"
      targetStep={64}
      routeIntent="/account/returns/:return-number?"
    />
  );
}
