import { data, Link, useLoaderData } from "react-router";
import { StatePanel } from "../components/StatePanel";
import { ProductDetailSummary } from "../features/product-detail/ProductDetailSummary";
import { ProductVariantSelector } from "../features/product-detail/ProductVariantSelector";
import { loadProductDetailFoundation } from "../features/product-detail/product-detail-data.server";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server";
import "../styles/product-detail.css";

export const handle = {
  breadcrumb: "جزئیات محصول",
};

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { slug?: string };
}) {
  const slug = params.slug?.trim();
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const result = await loadProductDetailFoundation(request, slug);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export default function ProductRoute() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.product.status !== "ready") {
    return (
      <div className="product-detail-page" data-product-state={loaderData.product.status}>
        <StatePanel
          variant="danger"
          title="اطلاعات محصول در دسترس نیست"
          message="بارگذاری جزئیات محصول انجام نشد. دوباره تلاش کنید."
          requestId={"problem" in loaderData.product ? loaderData.product.problem.requestId : null}
        />
        <Link to="." reloadDocument className="product-detail-page__retry">تلاش دوباره</Link>
      </div>
    );
  }

  const variants = loaderData.variants.status === "ready" ? loaderData.variants.data : null;

  return (
    <main className="product-detail-page" data-product-state="ready" data-variant-state={loaderData.variants.status}>
      <ProductDetailSummary product={loaderData.product.data} />

      {variants ? (
        <ProductVariantSelector variants={variants} />
      ) : (
        <section className="product-variants" aria-labelledby="product-variants-title">
          <h2 id="product-variants-title">انتخاب مدل</h2>
          <StatePanel
            variant="warning"
            title="وضعیت مدل‌ها در دسترس نیست"
            message="اطلاعات قیمت و موجودی مدل‌ها بارگذاری نشد. برای تازه‌سازی دوباره تلاش کنید."
            requestId={"problem" in loaderData.variants ? loaderData.variants.problem.requestId : null}
          />
          <Link to="." reloadDocument className="product-detail-page__retry">تلاش دوباره</Link>
        </section>
      )}
    </main>
  );
}
