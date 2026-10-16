import { Form, Link, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { createAdminProduct, type CatalogMutationFailure } from "../catalog/catalog-mutation.server.js";
import {
  formBoolean,
  formOptionalText,
  formText,
  isTrustedCatalogFormOrigin,
  type CatalogFormIssue,
} from "../catalog/catalog-form.server.js";
import { readCatalogReferences } from "../catalog/catalog-reference.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";

type ActionData =
  | { kind: "invalid"; issues: readonly CatalogFormIssue[]; requestId: string | null }
  | { kind: "failure"; message: string; requestId: string | null };

export async function loader({ request }: { request: Request }) {
  const refs = await readCatalogReferences(request);
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, refs.setCookies);
  return data(
    {
      brands: refs.brands,
      categories: refs.categories,
      requestId: refs.requestId,
    },
    { headers },
  );
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST" || !isTrustedCatalogFormOrigin(request)) {
    return data<ActionData>(
      { kind: "failure", message: "درخواست ساخت کالا معتبر نیست.", requestId: null },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const issues: CatalogFormIssue[] = [];
  const nameFa = formText(form, "name_fa", { required: true, max: 250 }, issues);
  const nameEn = formOptionalText(form, "name_en", 250, issues);
  const primaryCategoryId = formText(form, "primary_category_id", { required: true, max: 80 }, issues);
  const brandId = formOptionalText(form, "brand_id", 80, issues);
  const slug = formOptionalText(form, "slug", 220, issues);
  const shortDescription = formOptionalText(form, "short_description", 1000, issues);
  const description = formOptionalText(form, "description", 20000, issues);
  const salesEnabled = formBoolean(form, "sales_enabled");

  if (issues.length || !nameFa || !primaryCategoryId) {
    return data<ActionData>(
      { kind: "invalid", issues: Object.freeze(issues), requestId: null },
      { status: 400 },
    );
  }

  const result = await createAdminProduct(request, {
    name_fa: nameFa,
    name_en: nameEn,
    primary_category_id: primaryCategoryId,
    brand_id: brandId,
    slug,
    short_description: shortDescription,
    description,
    sales_enabled: salesEnabled,
  });

  const headers = new Headers();
  appendAdminAuthSetCookies(headers, result.setCookies);

  if (result.kind === "confirmed") {
    throw redirect(
      "/catalog/products/" + encodeURIComponent(result.product.id) + "?outcome=created",
      { headers },
    );
  }

  return mutationFailure(result, headers);
}

export default function AdminCatalogProductCreateRoute() {
  const refs = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <section className="catalog-read-page" aria-labelledby="catalog-create-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link>
        <span aria-hidden="true">/</span>
        <Link to="/catalog/products">کالاها</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">کالای جدید</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">AD-C-01 · 68-D</p>
          <h1 id="catalog-create-title">ایجاد کالای جدید</h1>
          <p>
            کالای جدید در Backend به‌صورت پیش‌نویس ساخته می‌شود. انتشار، آرشیو و وضعیت
            فروش عملیات جداگانه و سرورمحور هستند.
          </p>
        </div>
        <span className="catalog-read-only-badge">ایجاد کنترل‌شده</span>
      </header>

      {actionData ? <MutationMessage value={actionData} /> : null}

      <Form method="post" className="catalog-editor-form" replace>
        <fieldset disabled={busy}>
          <legend>مشخصات اصلی</legend>

          <label>
            <span>نام فارسی *</span>
            <input name="name_fa" maxLength={250} required autoComplete="off" />
          </label>

          <label>
            <span>نام انگلیسی</span>
            <input name="name_en" maxLength={250} autoComplete="off" dir="ltr" />
          </label>

          <label>
            <span>نامک</span>
            <input name="slug" maxLength={220} autoComplete="off" dir="ltr" />
            <small>اگر خالی بماند، رفتار canonical Backend تعیین‌کننده است.</small>
          </label>

          <ReferenceField
            name="primary_category_id"
            label="دستهٔ اصلی *"
            required
            options={refs.categories?.map((item) => ({ id: item.id, label: item.name_fa })) ?? null}
          />

          <ReferenceField
            name="brand_id"
            label="برند"
            options={refs.brands?.map((item) => ({ id: item.id, label: item.name_fa })) ?? null}
          />

          <label className="catalog-editor-wide">
            <span>توضیح کوتاه</span>
            <textarea name="short_description" maxLength={1000} rows={3} />
          </label>

          <label className="catalog-editor-wide">
            <span>توضیحات</span>
            <textarea name="description" maxLength={20000} rows={8} />
          </label>

          <label className="catalog-editor-check">
            <input type="checkbox" name="sales_enabled" defaultChecked />
            <span>فروش در سطح محصول فعال باشد</span>
          </label>
        </fieldset>

        <div className="catalog-editor-actions">
          <button type="submit" className="catalog-primary-action" disabled={busy}>
            {busy ? "در حال ثبت…" : "ایجاد پیش‌نویس"}
          </button>
          <Link to="/catalog/products">انصراف</Link>
        </div>
      </Form>

      <p className="catalog-authority-footnote">
        مجوز ایجاد در لحظهٔ ارسال دوباره توسط سرور بررسی می‌شود. نمایش این فرم به‌تنهایی
        مجوز ایجاد کالا ایجاد نمی‌کند.
      </p>
    </section>
  );
}

function ReferenceField({
  name,
  label,
  required = false,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  options: readonly { id: string; label: string }[] | null;
}) {
  if (options) {
    return (
      <label>
        <span>{label}</span>
        <select name={name} required={required} defaultValue="">
          <option value="">{required ? "انتخاب کنید" : "بدون انتخاب"}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      <span>{label}</span>
      <input name={name} required={required} maxLength={80} autoComplete="off" dir="ltr" />
      <small>فهرست مرجع برای این نشست قابل خواندن نبود؛ شناسهٔ canonical را وارد کنید.</small>
    </label>
  );
}

function MutationMessage({ value }: { value: ActionData }) {
  if (value.kind === "invalid") {
    return (
      <div className="auth-alert" role="alert">
        <p>فرم نیاز به اصلاح دارد.</p>
        <ul>
          {value.issues.map((issue, index) => (
            <li key={issue.field + index}>{issue.message}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="auth-alert" role="alert">
      <p>{value.message}</p>
      {value.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{value.requestId}</bdi></p> : null}
    </div>
  );
}

function mutationFailure(result: CatalogMutationFailure, headers: Headers) {
  if (result.kind === "invalid") {
    const issues = result.fieldErrors.map((item) => ({
      field: item.field,
      message: "مقدار این فیلد توسط سرور پذیرفته نشد.",
    }));
    return data<ActionData>(
      { kind: "invalid", issues, requestId: result.requestId },
      { status: 422, headers },
    );
  }

  const messages: Record<Exclude<CatalogMutationFailure["kind"], "invalid">, string> = {
    denied: "مجوز ایجاد کالا توسط سرور تأیید نشد.",
    conflict: "وضعیت کاتالوگ تغییر کرده است. اطلاعات را دوباره بخوانید.",
    not_found: "مرجع انتخاب‌شده دیگر در دسترس نیست.",
    unknown_outcome: "نتیجهٔ درخواست قطعی نیست. پیش از تکرار عملیات، فهرست کالاها را دوباره بررسی کنید.",
    unavailable: "سرویس کاتالوگ فعلاً قابل بررسی نیست.",
  };
  const status =
    result.kind === "denied" ? 403 :
    result.kind === "conflict" ? 409 :
    result.kind === "not_found" ? 404 :
    result.kind === "unknown_outcome" ? 503 : 503;

  return data<ActionData>(
    { kind: "failure", message: messages[result.kind], requestId: result.requestId },
    { status, headers },
  );
}
