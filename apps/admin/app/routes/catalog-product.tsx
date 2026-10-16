import { useEffect, useRef } from "react";
import { data, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  archiveAdminProduct,
  createAdminVariant,
  publishAdminProduct,
  resumeAdminProductSales,
  resumeAdminVariantSales,
  stopAdminProductSales,
  stopAdminVariantSales,
  unarchiveAdminProduct,
  updateAdminProduct,
  updateAdminVariant,
  type CatalogMutationFailure,
  type ProductMutationResult,
} from "../catalog/catalog-mutation.server.js";
import {
  formBoolean,
  formOptionalText,
  formPositiveInteger,
  formText,
  formVersion,
  isTrustedCatalogFormOrigin,
  type CatalogFormIssue,
} from "../catalog/catalog-form.server.js";
import { hasCatalogControlCharacters, readAdminCatalogProduct } from "../catalog/catalog-read.server.js";
import { readCatalogReferences } from "../catalog/catalog-reference.server.js";
import { CatalogProductEditor } from "../catalog/CatalogProductEditor.js";
import { CatalogProductLifecycle } from "../catalog/CatalogProductLifecycle.js";
import { CatalogVariantAdministration } from "../catalog/CatalogVariantAdministration.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";
import { AdminSurfaceState } from "../platform/state/AdminSurfaceState.js";

type ActionData =
  | { kind: "confirmed" | "accepted"; message: string; requestId: string | null }
  | { kind: "invalid"; message: string; issues: readonly CatalogFormIssue[]; requestId: string | null }
  | { kind: "failure"; message: string; requestId: string | null };

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { productId?: string };
}) {
  const productId = params.productId?.trim() ?? "";
  if (!validIdentifier(productId)) {
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

  const refs = await readCatalogReferences(request);
  appendAdminAuthSetCookies(headers, refs.setCookies);

  return data(
    {
      kind: "ready" as const,
      product: result.product,
      variants: result.variants,
      brands: refs.brands,
      categories: refs.categories,
      requestId: result.requestId ?? refs.requestId,
    },
    { headers },
  );
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { productId?: string };
}) {
  if (request.method !== "POST" || !isTrustedCatalogFormOrigin(request)) {
    return data<ActionData>(
      { kind: "failure", message: "درخواست تغییر کاتالوگ معتبر نیست.", requestId: null },
      { status: 403 },
    );
  }

  const productId = params.productId?.trim() ?? "";
  if (!validIdentifier(productId)) {
    return data<ActionData>(
      { kind: "failure", message: "شناسهٔ کالا معتبر نیست.", requestId: null },
      { status: 404 },
    );
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  let result: ProductMutationResult | null = null;
  let successMessage = "";

  if (intent === "update-product") {
    const issues: CatalogFormIssue[] = [];
    const version = formVersion(form, "version", issues);
    const nameFa = formText(form, "name_fa", { required: true, max: 250 }, issues);
    const nameEn = formOptionalText(form, "name_en", 250, issues);
    const slug = formText(form, "slug", { required: true, max: 220 }, issues);
    const primaryCategoryId = formText(form, "primary_category_id", { required: true, max: 80 }, issues);
    const brandId = formOptionalText(form, "brand_id", 80, issues);
    const shortDescription = formOptionalText(form, "short_description", 1000, issues);
    const description = formOptionalText(form, "description", 20000, issues);
    const additionalCategoryIds = parseAdditionalCategoryIds(form, issues);

    if (issues.length || !version || !nameFa || !slug || !primaryCategoryId) {
      return invalidAction(issues);
    }

    result = await updateAdminProduct(request, productId, version, {
      name_fa: nameFa,
      name_en: nameEn,
      slug,
      primary_category_id: primaryCategoryId,
      brand_id: brandId,
      short_description: shortDescription,
      description,
      additional_category_ids: additionalCategoryIds,
    });
    successMessage = "مشخصات کالا با نسخهٔ تأییدشدهٔ سرور ثبت شد.";
  } else if (intent === "publish-product") {
    result = await publishAdminProduct(request, productId);
    successMessage = "Backend انتشار کالا را تأیید کرد.";
  } else if (intent === "archive-product") {
    const issues: CatalogFormIssue[] = [];
    const reason = formText(form, "reason", { required: true, max: 1000 }, issues);
    if (issues.length || !reason) return invalidAction(issues);
    result = await archiveAdminProduct(request, productId, reason);
    successMessage = "Backend آرشیو کالا و توقف فروش آن را تأیید کرد.";
  } else if (intent === "unarchive-product") {
    const issues: CatalogFormIssue[] = [];
    const reason = formOptionalText(form, "reason", 1000, issues);
    if (issues.length) return invalidAction(issues);
    result = await unarchiveAdminProduct(request, productId, reason);
    successMessage = "کالا از آرشیو خارج شد و وضعیت canonical دوباره خوانده شد.";
  } else if (intent === "stop-product-sales") {
    const issues: CatalogFormIssue[] = [];
    const reason = formOptionalText(form, "reason", 1000, issues);
    if (issues.length) return invalidAction(issues);
    result = await stopAdminProductSales(request, productId, reason);
    successMessage = "Backend توقف فروش محصول را تأیید کرد.";
  } else if (intent === "resume-product-sales") {
    const issues: CatalogFormIssue[] = [];
    const reason = formOptionalText(form, "reason", 1000, issues);
    if (issues.length) return invalidAction(issues);
    result = await resumeAdminProductSales(request, productId, reason);
    successMessage = "Backend ازسرگیری فروش محصول را تأیید کرد.";
  } else if (intent === "create-variant") {
    const issues: CatalogFormIssue[] = [];
    const sku = formText(form, "sku", { required: true, max: 120 }, issues);
    const barcode = formOptionalText(form, "barcode", 120, issues);
    const nameSuffix = formOptionalText(form, "name_suffix", 180, issues);
    const weightGrams = formPositiveInteger(form, "weight_grams", issues);
    const salesEnabled = formBoolean(form, "sales_enabled");
    if (issues.length || !sku) return invalidAction(issues);

    result = await createAdminVariant(request, productId, {
      sku,
      barcode,
      name_suffix: nameSuffix,
      sales_enabled: salesEnabled,
      weight_grams: weightGrams,
    });
    successMessage = "گونهٔ جدید توسط Backend ساخته و وضعیت محصول دوباره خوانده شد.";
  } else if (intent === "update-variant") {
    const issues: CatalogFormIssue[] = [];
    const variantId = formText(form, "variant_id", { required: true, max: 128 }, issues);
    const version = formVersion(form, "version", issues);
    const sku = formText(form, "sku", { required: true, max: 120 }, issues);
    const barcode = formOptionalText(form, "barcode", 120, issues);
    const nameSuffix = formOptionalText(form, "name_suffix", 180, issues);
    const weightGrams = formPositiveInteger(form, "weight_grams", issues);
    const statusRaw = formText(form, "status", { required: true, max: 16 }, issues);
    const status = statusRaw === "active" || statusRaw === "inactive" ? statusRaw : null;
    if (!status && statusRaw) issues.push({ field: "status", message: "وضعیت گونه معتبر نیست." });
    if (issues.length || !variantId || !version || !sku || !status) return invalidAction(issues);

    result = await updateAdminVariant(request, productId, variantId, version, {
      sku,
      barcode,
      name_suffix: nameSuffix,
      status,
      weight_grams: weightGrams,
    });
    successMessage = "گونه با If-Match نسخهٔ فعلی ثبت شد.";
  } else if (intent === "stop-variant-sales" || intent === "resume-variant-sales") {
    const issues: CatalogFormIssue[] = [];
    const variantId = formText(form, "variant_id", { required: true, max: 128 }, issues);
    const reason = formOptionalText(form, "reason", 1000, issues);
    if (issues.length || !variantId) return invalidAction(issues);

    result =
      intent === "stop-variant-sales"
        ? await stopAdminVariantSales(request, productId, variantId, reason)
        : await resumeAdminVariantSales(request, productId, variantId, reason);
    successMessage =
      intent === "stop-variant-sales"
        ? "Backend توقف فروش گونه را تأیید کرد."
        : "Backend ازسرگیری فروش گونه را تأیید کرد.";
  } else {
    return data<ActionData>(
      { kind: "failure", message: "عملیات کاتالوگ شناخته‌شده نیست.", requestId: null },
      { status: 400 },
    );
  }

  if (!result) {
    return data<ActionData>(
      { kind: "failure", message: "نتیجهٔ عملیات کاتالوگ قابل تعیین نیست.", requestId: null },
      { status: 500 },
    );
  }
  return mutationActionResult(result, successMessage);
}

export default function AdminCatalogProductDetailRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

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
          <p className="destination-kicker">AD-C-01 / AD-C-02 · 68-D</p>
          <h1 id="catalog-product-title">{product.name_fa}</h1>
          <p>
            مشخصات، چرخهٔ انتشار و گونه‌ها از قرارداد canonical مدیریت استفاده می‌کنند.
            قیمت، موجودی، رسانه و ساختار taxonomy در این مرحله خارج از محدوده‌اند.
          </p>
        </div>
        <span className="catalog-read-only-badge">چرخهٔ کنترل‌شده</span>
      </header>

      {busy ? (
        <div className="catalog-navigation-status" role="status" aria-live="polite">
          در حال ثبت یا بازخوانی وضعیت canonical…
        </div>
      ) : null}

      {actionData ? <CatalogActionNotice value={actionData} /> : null}

      <dl className="catalog-detail-grid">
        <div><dt>وضعیت انتشار</dt><dd>{productStatusLabel(product.status)}</dd></div>
        <div><dt>وضعیت فروش</dt><dd>{product.sales_enabled ? "فعال" : "متوقف"}</dd></div>
        <div><dt>نامک</dt><dd><bdi>{product.slug}</bdi></dd></div>
        <div><dt>دستهٔ اصلی</dt><dd>{product.primary_category.name_fa}</dd></div>
        <div><dt>برند</dt><dd>{product.brand?.name_fa ?? "ثبت نشده"}</dd></div>
        <div><dt>قیمت فعلی</dt><dd>{product.price ? formatToman(product.price.current_toman) : "قیمت قابل نمایش نیست"}</dd></div>
        <div><dt>نسخهٔ رکورد</dt><dd><bdi>{String(product.version)}</bdi></dd></div>
        <div><dt>شناسهٔ کالا</dt><dd><bdi>{product.id}</bdi></dd></div>
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

      <CatalogProductEditor
        product={product}
        brands={state.brands}
        categories={state.categories}
        busy={busy}
      />

      <CatalogProductLifecycle product={product} busy={busy} />

      <CatalogVariantAdministration
        variants={state.variants}
        busy={busy}
        productArchived={product.status === "archived"}
      />

      <section className="catalog-authority-note" aria-labelledby="catalog-boundary-title">
        <h2 id="catalog-boundary-title">مرز این مرحله</h2>
        <p>
          قیمت و موجودی این صفحه فقط خواندنی هستند. ساختار ویژگی‌ها/برند/دسته به 68-E،
          رسانه به 68-F و کنترل گروهی فروش به 68-G تعلق دارد. هیچ audit-history ساختگی
          نمایش داده نمی‌شود.
        </p>
      </section>
    </section>
  );
}

function validIdentifier(value: string): boolean {
  return Boolean(value) && value.length <= 128 && !hasCatalogControlCharacters(value);
}

function parseAdditionalCategoryIds(form: FormData, issues: CatalogFormIssue[]): string[] {
  const raw = form.get("additional_category_ids");
  if (raw === null || raw === "") return [];
  if (typeof raw !== "string" || raw.length > 2000 || hasCatalogControlCharacters(raw)) {
    issues.push({ field: "additional_category_ids", message: "شناسه‌های دستهٔ تکمیلی معتبر نیستند." });
    return [];
  }

  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (values.length > 25 || values.some((item) => item.length > 80)) {
    issues.push({ field: "additional_category_ids", message: "تعداد یا طول شناسه‌های دستهٔ تکمیلی معتبر نیست." });
    return [];
  }
  return [...new Set(values)];
}

function invalidAction(issues: readonly CatalogFormIssue[]) {
  return data<ActionData>(
    { kind: "invalid", message: "فرم نیاز به اصلاح دارد.", issues: Object.freeze([...issues]), requestId: null },
    { status: 400 },
  );
}

function mutationActionResult(result: ProductMutationResult, successMessage: string) {
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, result.setCookies);

  if (result.kind === "confirmed") {
    return data<ActionData>(
      { kind: "confirmed", message: successMessage, requestId: result.requestId },
      { headers },
    );
  }

  if (result.kind === "accepted") {
    return data<ActionData>(
      {
        kind: "accepted",
        message: "درخواست توسط سرور پذیرفته شد، اما 202 نتیجهٔ نهایی نیست. وضعیت canonical دوباره خوانده شده است؛ پیش از تکرار عملیات همین وضعیت را بررسی کنید.",
        requestId: result.requestId,
      },
      { status: 202, headers },
    );
  }

  return mutationFailure(result, headers);
}

function mutationFailure(result: CatalogMutationFailure, headers: Headers) {
  if (result.kind === "invalid") {
    const issues = result.fieldErrors.map((item) => ({
      field: item.field,
      message: "مقدار این فیلد توسط سرور پذیرفته نشد.",
    }));
    return data<ActionData>(
      { kind: "invalid", message: "Backend فرم را نپذیرفت.", issues, requestId: result.requestId },
      { status: 422, headers },
    );
  }

  const messages: Record<Exclude<CatalogMutationFailure["kind"], "invalid">, string> = {
    denied: "مجوز این عملیات توسط سرور تأیید نشد.",
    conflict: "رکورد از زمان مشاهده تغییر کرده است. صفحه دوباره خوانده می‌شود؛ تغییر را بدون بررسی تکرار نکنید.",
    not_found: "رکورد انتخاب‌شده دیگر در دسترس نیست.",
    unknown_outcome: "نتیجهٔ mutation قطعی نیست. عملیات را کورکورانه تکرار نکنید؛ ابتدا وضعیت کالا را دوباره بررسی کنید.",
    unavailable: "سرویس کاتالوگ فعلاً نتیجهٔ معتبر برنگرداند.",
  };

  const status =
    result.kind === "denied" ? 403 :
    result.kind === "conflict" ? 409 :
    result.kind === "not_found" ? 404 : 503;

  return data<ActionData>(
    { kind: "failure", message: messages[result.kind], requestId: result.requestId },
    { status, headers },
  );
}

function CatalogActionNotice({ value }: { value: ActionData }) {
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    noticeRef.current?.focus();
  }, [value]);

  return (
    <div
      ref={noticeRef}
      tabIndex={-1}
      className={value.kind === "confirmed" ? "catalog-action-outcome" : "auth-alert"}
      role={value.kind === "confirmed" ? "status" : "alert"}
    >
      <p>{value.message}</p>
      {value.kind === "invalid" && value.issues.length ? (
        <ul>{value.issues.map((issue, index) => <li key={issue.field + index}>{issue.message}</li>)}</ul>
      ) : null}
      {value.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{value.requestId}</bdi></p> : null}
    </div>
  );
}

function productStatusLabel(status: "draft" | "review" | "published" | "archived"): string {
  switch (status) {
    case "draft": return "پیش‌نویس";
    case "review": return "در بازبینی";
    case "published": return "منتشرشده";
    case "archived": return "آرشیوشده";
  }
}

function formatToman(value: number): string {
  return value.toLocaleString("fa-IR") + " تومان";
}
