import { data, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import { StatePanel } from "../components/StatePanel";
import {
  addProductVariantToCart,
  appendGuestCartSetCookies,
  productCartErrorResult,
} from "../features/product-detail/product-detail-cart.server";
import { ProductDetailExperience } from "../features/product-detail/ProductDetailExperience";
import { ProductDetailState } from "../features/product-detail/ProductDetailState";
import { productDetailMeta } from "../features/product-detail/product-detail-seo";
import { loadProductDetailFoundation, type ProductDetailRouteData } from "../features/product-detail/product-detail-data.server";
import { appendCustomerSessionSetCookies } from "../platform/auth/session-cookie.server";
import "../styles/product-detail.css";

export const handle = {
  breadcrumb: "جزئیات محصول",
};

export const meta = ({ loaderData }: { loaderData?: ProductDetailRouteData }) =>
  productDetailMeta(loaderData);

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { slug?: string };
}) {
  const slug = params.slug?.trim();
  if (!slug) throw new Response("Not Found", { status: 404 });

  const result = await loadProductDetailFoundation(request, slug);
  const headers = new Headers();
  appendCustomerSessionSetCookies(headers, result.setCookies);
  return data(result.data, { headers });
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  if (formData.get("intent") !== "add-to-cart") {
    return data(
      { status: "error" as const, message: "درخواست نامعتبر است." },
      { status: 400 },
    );
  }

  const variantId = formData.get("variant_id");
  if (typeof variantId !== "string" || !variantId) {
    return data(
      { status: "error" as const, message: "ابتدا یک مدل معتبر انتخاب کنید." },
      { status: 422 },
    );
  }

  try {
    const result = await addProductVariantToCart(request, variantId);
    const headers = new Headers();
    appendGuestCartSetCookies(headers, result.setCookies);
    return data(
      { status: "success" as const, message: "این مدل به سبد خرید اضافه شد." },
      { headers },
    );
  } catch (error) {
    const result = productCartErrorResult(error);
    return data(result.feedback, { status: result.status });
  }
}

export default function ProductRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const pending = navigation.state === "loading"
    && navigation.location?.pathname.startsWith("/product/");

  if (loaderData.product.status !== "ready") {
    return (
      <>
        {pending ? (
          <p className="product-detail-pending" role="status" aria-live="polite">
            در حال بارگذاری جزئیات محصول…
          </p>
        ) : null}
        <div
          className="product-detail-page"
          data-product-state={loaderData.product.status}
          aria-busy={pending}
        >
          <h1>جزئیات محصول</h1>
          <ProductDetailState state={loaderData.product} retryHref="." />
        </div>
      </>
    );
  }

  const variants = loaderData.variants.status === "ready" ? loaderData.variants.data : null;
  const relatedProducts = loaderData.related.status === "ready" ? loaderData.related.data : null;
  const variantFallback = variants ? null : (
    <section className="product-variants" aria-labelledby="product-variants-title">
      <h2 id="product-variants-title">انتخاب مدل</h2>
      <StatePanel
        variant="recovery"
        title="وضعیت مدل‌ها در دسترس نیست"
        message="اطلاعات قیمت و موجودی مدل‌ها بارگذاری نشد. برای تازه‌سازی دوباره تلاش کنید."
        requestId={"problem" in loaderData.variants ? loaderData.variants.problem.requestId : null}
      />
      <Link to="." reloadDocument className="product-detail-page__retry">تلاش دوباره</Link>
    </section>
  );

  return (
    <>
      {pending ? (
        <p className="product-detail-pending" role="status" aria-live="polite">
          در حال بارگذاری جزئیات محصول…
        </p>
      ) : null}
      <article
        className="product-detail-page"
        data-product-state="ready"
        data-variant-state={loaderData.variants.status}
        aria-busy={pending}
      >
      <ProductDetailExperience
        product={loaderData.product.data}
        variants={variants}
        relatedProducts={relatedProducts}
        media={loaderData.media}
        variantFallback={variantFallback}
        cartFeedback={actionData ?? null}
      />
      </article>
    </>
  );
}
