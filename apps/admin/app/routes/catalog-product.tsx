import { data, Link, useLoaderData, useNavigation } from "react-router";
import { hasCatalogControlCharacters, readAdminCatalogProduct } from "../catalog/catalog-read.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { productId?: string };
}) {
  const productId = params.productId?.trim() ?? "";
  if (!productId || productId.length > 128 || hasCatalogControlCharacters(productId)) {
    return data({ kind: "not_found" as const, requestId: null }, { status: 404 });
  }

  const result = await readAdminCatalogProduct(request, productId);
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, result.setCookies);

  if (result.kind === "denied") {
    return data(
      { kind: "denied" as const, requestId: result.requestId },
      { status: 403, headers },
    );
  }
  if (result.kind === "not_found") {
    return data(
      { kind: "not_found" as const, requestId: result.requestId },
      { status: 404, headers },
    );
  }
  if (result.kind === "unavailable") {
    return data(
      { kind: "unavailable" as const, requestId: result.requestId },
      { status: 503, headers },
    );
  }

  return data(
    {
      kind: "ready" as const,
      product: result.product,
      variants: result.variants,
      requestId: result.requestId,
    },
    { headers },
  );
}

export default function AdminCatalogProductDetailRoute() {
  const state = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  if (state.kind === "denied") {
    return (
      <AdminSurfaceState
        kind="denied"
        description="خواندن این کالا توسط سرور مجاز شناخته نشد. هیچ دادهٔ جزئی یا حدسی نمایش داده نمی‌شود."
        requestId={state.requestId}
        action={{ href: "/catalog/products", label: "بازگشت به فهرست کالا" }}
      />
    );
  }

  if (state.kind === "not_found") {
    return (
      <AdminSurfaceState
        kind="empty"
        title="کالای درخواستی پیدا نشد"
        description="شناسهٔ درخواستی نتیجهٔ canonical ندارد. برای انتخاب کالا از فهرست مدیریت استفاده کنید."
        requestId={state.requestId}
        action={{ href: "/catalog/products", label: "بازگشت به فهرست کالا" }}
      />
    );
  }

  if (state.kind === "unavailable") {
    return (
      <AdminSurfaceState
        kind="error"
        title="جزئیات کالا فعلاً در دسترس نیست"
        description="برای جلوگیری از نمایش دادهٔ قدیمی، جزئیات جایگزین یا cache حدسی استفاده نشده است."
        requestId={state.requestId}
        action={{ href: "/catalog/products", label: "بازگشت به فهرست کالا" }}
      />
    );
  }

  const product = state.product;

  return (
    <section className="catalog-read-page" aria-labelledby="catalog-product-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link>
        <span aria-hidden="true">/</span>
        <Link to="/catalog/products">کالاها</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name_fa}</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">AD-C-01 / AD-C-02 · جزئیات فقط خواندنی</p>
          <h1 id="catalog-product-title">{product.name_fa}</h1>
          <p>
            اطلاعات این صفحه مستقیماً از قرارداد مدیریت خوانده می‌شود. تغییر قیمت،
            موجودی، چرخهٔ انتشار و فروش در این مرحله مجاز نیست.
          </p>
        </div>
        <span className="catalog-read-only-badge">فقط خواندن</span>
      </header>

      {navigation.state !== "idle" ? (
        <div className="catalog-navigation-status" role="status" aria-live="polite">
          در حال بازخوانی اطلاعات…
        </div>
      ) : null}

      <dl className="catalog-detail-grid">
        <div>
          <dt>وضعیت انتشار</dt>
          <dd>{productStatusLabel(product.status)}</dd>
        </div>
        <div>
          <dt>وضعیت فروش</dt>
          <dd>{product.sales_enabled ? "فعال" : "متوقف"}</dd>
        </div>
        <div>
          <dt>نامک</dt>
          <dd><bdi>{product.slug}</bdi></dd>
        </div>
        <div>
          <dt>دستهٔ اصلی</dt>
          <dd>{product.primary_category.name_fa}</dd>
        </div>
        <div>
          <dt>برند</dt>
          <dd>{product.brand?.name_fa ?? "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>قیمت فعلی</dt>
          <dd>{product.price ? formatToman(product.price.current_toman) : "قیمت قابل نمایش نیست"}</dd>
        </div>
        <div>
          <dt>نسخهٔ رکورد</dt>
          <dd><bdi>{String(product.version)}</bdi></dd>
        </div>
        <div>
          <dt>شناسهٔ کالا</dt>
          <dd><bdi>{product.id}</bdi></dd>
        </div>
      </dl>

      {product.additional_categories.length ? (
        <section className="catalog-detail-section" aria-labelledby="catalog-extra-categories">
          <h2 id="catalog-extra-categories">دسته‌های تکمیلی</h2>
          <ul className="catalog-chip-list">
            {product.additional_categories.map((category) => (
              <li key={category.id}>{category.name_fa}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="catalog-detail-section" aria-labelledby="catalog-variants-title">
        <div className="catalog-section-heading">
          <div>
            <h2 id="catalog-variants-title">گونه‌های کالا</h2>
            <p>
              این فهرست از endpoint اختصاصی گونه‌ها خوانده می‌شود؛ ایجاد و ویرایش گونه
              به 68-D تعلق دارد.
            </p>
          </div>
          <span>{state.variants.length.toLocaleString("fa-IR")} گونه</span>
        </div>

        {state.variants.length ? (
          <div className="catalog-table-wrap" role="region" aria-label="گونه‌های کالا" tabIndex={0}>
            <table className="catalog-table">
              <caption>گونه‌های canonical کالا</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">پسوند نام</th>
                  <th scope="col">وضعیت</th>
                  <th scope="col">فروش</th>
                  <th scope="col">قیمت</th>
                </tr>
              </thead>
              <tbody>
                {state.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td><bdi>{variant.sku}</bdi></td>
                    <td>{variant.name_suffix ?? "—"}</td>
                    <td>{variant.status === "active" ? "فعال" : "غیرفعال"}</td>
                    <td>{variant.sales_enabled ? "فعال" : "متوقف"}</td>
                    <td>{variant.price ? formatToman(variant.price.current_toman) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminSurfaceState
            kind="empty"
            compact
            title="گونه‌ای ثبت نشده است"
            description="سرور برای این کالا گونه‌ای برنگرداند. Stage 68-C هیچ گونهٔ موقت یا حدسی ایجاد نمی‌کند."
          />
        )}
      </section>

      <section className="catalog-authority-note" aria-labelledby="catalog-boundary-title">
        <h2 id="catalog-boundary-title">مرز این نما</h2>
        <p>
          تاریخچهٔ ممیزی کاتالوگ endpoint canonical ندارد و در این صفحه ساخته یا شبیه‌سازی
          نمی‌شود. عملیات ویرایشی نیز تا مرحله‌های بعدی غیرفعال است.
        </p>
      </section>
    </section>
  );
}

function productStatusLabel(status: "draft" | "review" | "published" | "archived"): string {
  switch (status) {
    case "draft":
      return "پیش‌نویس";
    case "review":
      return "در بازبینی";
    case "published":
      return "منتشرشده";
    case "archived":
      return "آرشیوشده";
  }
}

function formatToman(value: number): string {
  return value.toLocaleString("fa-IR") + " تومان";
}
