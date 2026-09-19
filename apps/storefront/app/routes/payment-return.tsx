import { RoutePlaceholder } from "../components/RoutePlaceholder";

export const handle = {
  breadcrumb: "بازگشت از پرداخت",
};

export default function PaymentReturnRoute() {
  return (
    <RoutePlaceholder
      screenId="SF-D-06"
      title="بازگشت از پرداخت"
      targetStep={63}
      routeIntent="/payment/return"
    />
  );
}
