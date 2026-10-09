import { data, useLoaderData } from "react-router";
import { WholesaleIntroductionView } from "../features/wholesale/WholesaleIntroductionView.js";
import { loadWholesaleIntroduction } from "../features/wholesale/wholesale-data.server.js";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server.js";
import "../styles/wholesale.css";

export const handle = {
  breadcrumb: "فروش عمده",
};

export const meta = () => [
  { title: "خرید عمده تجهیزات قهوه | EQCOFE" },
  {
    name: "description",
    content: "معرفی خرید عمده تجهیزات قهوه، فرایند درخواست و مسیر پیگیری وضعیت در ایکوفی.",
  },
];

export async function loader({ request }: { request: Request }) {
  const result = await loadWholesaleIntroduction(request);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result, { headers });
}

export default function WholesaleRoute() {
  const state = useLoaderData<typeof loader>();
  return <WholesaleIntroductionView state={state} />;
}
