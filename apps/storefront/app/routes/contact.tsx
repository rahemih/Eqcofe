import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "تماس با ما",
};

export default function ContactRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-F-04"
      title="تماس با ما"
      targetStep={66}
      routeIntent="/contact"
    />
  );
}
