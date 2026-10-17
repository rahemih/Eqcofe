import { Form, Link, data, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  readAdminAssignmentWorkspace,
  setAdminAssignments,
  type StructureMutationResult,
} from "../catalog/catalog-structure.server.js";
import {
  formText,
  isTrustedCatalogFormOrigin,
  type CatalogFormIssue,
} from "../catalog/catalog-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";

type ActionData =
  | { kind: "success" | "accepted"; message: string; requestId: string | null }
  | { kind: "invalid"; issues: readonly CatalogFormIssue[]; requestId: string | null }
  | { kind: "failure"; message: string; requestId: string | null };

export async function loader({ request, params }: { request: Request; params: { productId?: string } }) {
  const productId = boundedId(params.productId ?? null);
  if (!productId) throw data("Not Found", { status: 404 });
  const variantId = boundedId(new URL(request.url).searchParams.get("variant"));
  const state = await readAdminAssignmentWorkspace(request, productId, variantId);
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, state.setCookies);
  return data({ state }, {
    status: state.kind === "ready" ? 200 : state.kind === "denied" ? 403 : state.kind === "not_found" ? 404 : 503,
    headers,
  });
}

export async function action({ request, params }: { request: Request; params: { productId?: string } }) {
  const productId = boundedId(params.productId ?? null);
  if (!productId || request.method !== "POST" || !isTrustedCatalogFormOrigin(request)) {
    return data<ActionData>({ kind: "failure", message: "درخواست تخصیص ویژگی معتبر نیست.", requestId: null }, { status: 403 });
  }
  const url = new URL(request.url);
  const variantId = boundedId(url.searchParams.get("variant"));
  const target = variantId ? { type: "variant" as const, id: variantId } : { type: "product" as const, id: productId };
  const form = await request.formData();
  const issues: CatalogFormIssue[] = [];
  const intent = formText(form, "intent", { required: true, max: 60 }, issues);
  if (intent !== "replace-assignments") issues.push({ field: "intent", message: "عملیات تخصیص معتبر نیست." });

  const values: Array<{ attribute_id: string; attribute_value_id: string }> = [];
  const seen = new Set<string>();
  for (const [name, raw] of form.entries()) {
    if (!name.startsWith("attribute:")) continue;
    const attributeId = boundedId(name.slice("attribute:".length));
    if (!attributeId || seen.has(attributeId)) {
      issues.push({ field: name, message: "شناسه ویژگی معتبر یا یکتا نیست." });
      continue;
    }
    seen.add(attributeId);
    if (typeof raw !== "string" || raw === "") continue;
    const attributeValueId = boundedId(raw);
    if (!attributeValueId) {
      issues.push({ field: name, message: "مقدار انتخاب‌شده معتبر نیست." });
      continue;
    }
    values.push({ attribute_id: attributeId, attribute_value_id: attributeValueId });
  }

  if (issues.length) return data<ActionData>({ kind: "invalid", issues, requestId: null }, { status: 400 });
  const result = await setAdminAssignments(request, productId, target, values);
  return mutationResponse(result);
}

export default function AdminCatalogProductAttributesRoute() {
  const { state } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const busy = useNavigation().state !== "idle";

  if (state.kind !== "ready") {
    const message = state.kind === "denied" ? "مجوز مشاهده مشخصات توسط سرور تأیید نشد." : state.kind === "not_found" ? "کالا یا گونه موردنظر پیدا نشد." : "خواندن مشخصات canonical فعلاً ممکن نیست.";
    return <section className="catalog-read-page"><div className="auth-alert" role="alert"><p>{message}</p>{state.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{state.requestId}</bdi></p> : null}</div></section>;
  }

  const current = new Map(state.assignments.map((item) => [item.attribute_id, item.attribute_value_id]));
  const currentVariant = state.target.type === "variant" ? state.variants.find((variant) => variant.id === state.target.id) : null;

  return (
    <section className="catalog-read-page" aria-labelledby="catalog-assignment-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <Link to="/catalog/products">کالاها</Link><span aria-hidden="true">/</span>
        <Link to={"/catalog/products/" + encodeURIComponent(state.product.id)}>{state.product.name_fa}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">مشخصات</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">AD-C-03 · 68-E</p>
          <h1 id="catalog-assignment-title">تخصیص مشخصات {state.target.type === "product" ? "کالا" : "گونه"}</h1>
          <p>
            {state.target.type === "product"
              ? `کالای «${state.product.name_fa}» · دسته اصلی: ${state.product.primary_category.name_fa}`
              : `گونه ${currentVariant?.sku ?? state.target.id} از «${state.product.name_fa}»`}
          </p>
        </div>
        <span className="catalog-read-only-badge">جایگزینی کامل مجموعه</span>
      </header>

      <nav className="catalog-editor-actions" aria-label="هدف تخصیص">
        <Link to={"/catalog/products/" + encodeURIComponent(state.product.id) + "/attributes"} aria-current={state.target.type === "product" ? "page" : undefined}>خود کالا</Link>
        {state.variants.map((variant) => (
          <Link
            key={variant.id}
            to={"/catalog/products/" + encodeURIComponent(state.product.id) + "/attributes?variant=" + encodeURIComponent(variant.id)}
            aria-current={state.target.type === "variant" && state.target.id === variant.id ? "page" : undefined}
          >
            گونه {variant.sku}
          </Link>
        ))}
      </nav>

      {actionData ? <Outcome value={actionData} /> : null}

      <Form method="post" className="catalog-editor-form">
        <input type="hidden" name="intent" value="replace-assignments" />
        <fieldset disabled={busy}>
          <legend>مجموعهٔ کامل مشخصات</legend>
          {state.attributes.length ? state.attributes.map((attribute) => (
            <label key={attribute.id}>
              <span>{attribute.name_fa}{attribute.unit ? ` (${attribute.unit})` : ""}</span>
              <select name={"attribute:" + attribute.id} defaultValue={current.get(attribute.id) ?? ""}>
                <option value="">بدون تخصیص</option>
                {attribute.values.map((value) => (
                  <option key={value.id} value={value.id}>{displayValue(value)}</option>
                ))}
              </select>
              <small><bdi>{attribute.key}</bdi> · {attribute.data_type}</small>
            </label>
          )) : <p>برای این دسته و دامنهٔ {state.target.type === "product" ? "کالا" : "گونه"} ویژگی قابل تخصیصی تعریف نشده است.</p>}
        </fieldset>
        <div className="catalog-editor-actions">
          <button type="submit" disabled={busy}>{busy ? "در حال ثبت…" : "جایگزینی مجموعه مشخصات"}</button>
          <span>ارسال، کل مجموعه را جایگزین می‌کند؛ If-Match ساختگی به این endpoint افزوده نمی‌شود.</span>
        </div>
      </Form>

      <p className="catalog-authority-footnote">
        سازگاری دسته، نوع Product/Variant، تعلق مقدار به ویژگی و یکتایی Attribute دوباره توسط Backend بررسی می‌شود. درخواست‌های PUT به‌صورت خودکار retry نمی‌شوند.
      </p>
    </section>
  );
}

function mutationResponse(result: StructureMutationResult) {
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, result.setCookies);
  if (result.kind === "confirmed") return data<ActionData>({ kind: "success", message: "مجموعه مشخصات در وضعیت canonical بازخوانی و تأیید شد.", requestId: result.requestId }, { headers });
  if (result.kind === "accepted") return data<ActionData>({ kind: "accepted", message: "درخواست پذیرفته شد اما نتیجه نهایی نیست؛ پیش از تکرار، وضعیت canonical را بررسی کنید.", requestId: result.requestId }, { status: 202, headers });
  if (result.kind === "invalid") return data<ActionData>({ kind: "invalid", issues: result.fieldErrors.map((item) => ({ field: item.field, message: "مقدار تخصیص توسط سرور پذیرفته نشد." })), requestId: result.requestId }, { status: 422, headers });
  const messages = {
    denied: "مجوز این عملیات توسط سرور تأیید نشد.",
    conflict: "وضعیت تغییر کرده است؛ صفحه را دوباره بخوانید.",
    not_found: "هدف تخصیص در زمینهٔ همین کالا پیدا نشد.",
    unknown_outcome: "نتیجه عملیات قطعی نیست. پیش از تکرار، مشخصات را دوباره بخوانید.",
    unavailable: "سرویس مشخصات فعلاً قابل بررسی نیست.",
  } as const;
  const status = result.kind === "denied" ? 403 : result.kind === "conflict" ? 409 : result.kind === "not_found" ? 404 : 503;
  return data<ActionData>({ kind: "failure", message: messages[result.kind], requestId: result.requestId }, { status, headers });
}

function boundedId(value: string | null): string | null {
  if (!value || value.length > 80 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
function displayValue(value: { value_text?: string | null; value_numeric?: number | null; value_boolean?: boolean | null; normalized_value?: string | null }) {
  if (value.value_text != null) return value.value_text;
  if (value.value_numeric != null) return String(value.value_numeric);
  if (value.value_boolean != null) return value.value_boolean ? "بله" : "خیر";
  return value.normalized_value ?? "—";
}
function Outcome({ value }: { value: ActionData }) {
  return <div className="catalog-action-outcome" role={value.kind === "success" ? "status" : "alert"} tabIndex={-1}>
    {value.kind === "invalid" ? <><p>فرم نیاز به اصلاح دارد.</p><ul>{value.issues.map((issue, i) => <li key={issue.field + i}>{issue.message}</li>)}</ul></> : <p>{value.message}</p>}
    {value.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{value.requestId}</bdi></p> : null}
  </div>;
}
