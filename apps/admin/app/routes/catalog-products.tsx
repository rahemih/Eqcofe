import { useMemo, useState } from "react";
import { data, Link, useLoaderData, useNavigation } from "react-router";
import { filterLoadedCatalogProducts } from "../catalog/catalog-filter.js";
import {
  normalizeCatalogCursor,
  readAdminCatalogPage,
} from "../catalog/catalog-read.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const cursorInput = normalizeCatalogCursor(url.searchParams.get("cursor"));
  if (!cursorInput.ok) {
    return data({ kind: "invalid_cursor" as const }, { status: 400 });
  }

  const result = await readAdminCatalogPage(request, cursorInput.cursor);
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, result.setCookies);

  if (result.kind === "denied") {
    return data(
      { kind: "denied" as const, requestId: result.requestId },
      { status: 403, headers },
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
      items: result.items,
      pagination: result.pagination,
      requestId: result.requestId,
    },
    { headers },
  );
}

export default function AdminCatalogProductsRoute() {
  const state = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [filter, setFilter] = useState("");

  if (state.kind === "invalid_cursor") {
    return (
      <AdminSurfaceState
        kind="error"
        title="نشانی صفحهٔ کالا معتبر نیست"
        description="نشانگر صفحه‌بندی فقط به‌صورت مقدار opaque دریافت می‌شود و در مرورگر تفسیر یا بازسازی نمی‌شود."
        action={{ href: "/catalog/products", label: "بازگشت به صفحهٔ اول" }}
      />
    );
  }

  if (state.kind === "denied") {
    return (
      <AdminSurfaceState
        kind="denied"
        description="این خواندن توسط مجوزهای سرور تأیید نشد. نمایش مقصد در منو به‌تنهایی مجوز دسترسی ایجاد نمی‌کند."
        requestId={state.requestId}
        action={{ href: "/", label: "بازگشت به نمای کلی" }}
      />
    );
  }

  if (state.kind === "unavailable") {
    return (
      <AdminSurfaceState
        kind="error"
        title="فهرست کالا فعلاً در دسترس نیست"
        description="برای جلوگیری از نمایش دادهٔ قدیمی یا حدسی، نتیجه‌ای جایگزین نشده است. پس از برقراری سرویس دوباره تلاش کنید."
        requestId={state.requestId}
        action={{ href: "/catalog/products", label: "تلاش دوباره" }}
      />
    );
  }

  const filteredProducts = useMemo(
    () => filterLoadedCatalogProducts(state.items, filter),
    [state.items, filter],
  );

  return (
    <section className="catalog-read-page" aria-labelledby="catalog-products-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link>
        <span aria-hidden="true">/</span>
        <span>کالا و قیمت</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">کالاها</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">AD-C-01 · فقط خواندن در 68-C</p>
          <h1 id="catalog-products-title">کالاها</h1>
          <p>
            این نما دادهٔ canonical مدیریت را می‌خواند. ایجاد، ویرایش، انتشار، آرشیو و
            تغییر فروش در این مرحله فعال نیست.
          </p>
        </div>
        <span className="catalog-read-only-badge">فقط خواندن</span>
      </header>

      {navigation.state !== "idle" ? (
        <div className="catalog-navigation-status" role="status" aria-live="polite">
          در حال دریافت صفحهٔ درخواستی…
        </div>
      ) : null}

      {state.items.length === 0 ? (
        <AdminSurfaceState
          kind="empty"
          title="کالایی در این صفحه وجود ندارد"
          description="سرور برای این نشانگر صفحه‌بندی هیچ ردیفی برنگرداند. هیچ نتیجهٔ حدسی یا محلی جایگزین نشده است."
          action={{ href: "/catalog/products", label: "بازگشت به صفحهٔ اول" }}
        />
      ) : (
        <>
          <label className="catalog-local-filter">
            <span>فیلتر ردیف‌های بارگذاری‌شده</span>
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.currentTarget.value)}
              placeholder="نام، نامک، برند، دسته یا SKU"
              autoComplete="off"
            />
            <small>
              این فیلتر فقط روی {state.items.length.toLocaleString("fa-IR")} ردیف همین صفحه
              اجرا می‌شود و جستجوی سراسری کاتالوگ نیست.
            </small>
          </label>

          <div className="catalog-table-wrap" role="region" aria-label="فهرست کالاها" tabIndex={0}>
            <table className="catalog-table">
              <caption>کالاهای بارگذاری‌شده از endpoint مدیریت</caption>
              <thead>
                <tr>
                  <th scope="col">نام کالا</th>
                  <th scope="col">وضعیت انتشار</th>
                  <th scope="col">فروش</th>
                  <th scope="col">دستهٔ اصلی</th>
                  <th scope="col">مشاهده</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name_fa}</strong>
                      <small><bdi>{product.slug}</bdi></small>
                    </td>
                    <td>{productStatusLabel(product.status)}</td>
                    <td>{product.sales_enabled ? "فعال" : "متوقف"}</td>
                    <td>{product.primary_category.name_fa}</td>
                    <td>
                      <Link
                        className="catalog-row-link"
                        to={"/catalog/products/" + encodeURIComponent(product.id)}
                      >
                        جزئیات
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 ? (
            <p className="catalog-filter-empty" role="status">
              در ردیف‌های همین صفحه موردی مطابق فیلتر پیدا نشد. برای دیدن همهٔ ردیف‌های
              بارگذاری‌شده، فیلتر را پاک کنید.
            </p>
          ) : null}

          <nav className="catalog-pagination" aria-label="صفحه‌بندی کالا">
            <Link to="/catalog/products">صفحهٔ اول</Link>
            {state.pagination.next_cursor ? (
              <Link
                to={"?cursor=" + encodeURIComponent(state.pagination.next_cursor)}
                rel="next"
              >
                صفحهٔ بعد
              </Link>
            ) : (
              <span>صفحهٔ بعدی اعلام نشده است</span>
            )}
          </nav>
        </>
      )}
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
