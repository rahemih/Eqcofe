import { useEffect, useRef } from "react";
import {
  Form, Link, data, useActionData, useLoaderData, useNavigation, useRevalidator,
} from "react-router";
import {
  createAdminAttribute,
  createAdminAttributeValue,
  createAdminBrand,
  createAdminCategory,
  readAdminAttributes,
  readAdminBrands,
  readAdminCategories,
  setAdminBrandSales,
  setAdminCategorySales,
  updateAdminAttribute,
  updateAdminAttributeValue,
  updateAdminBrand,
  updateAdminCategory,
  type AdminAttribute,
  type AdminAttributeValue,
  type AdminBrand,
  type AdminCategory,
  type StructureMutationResult,
} from "../catalog/catalog-structure.server.js";
import {
  formBoolean,
  formOptionalText,
  formText,
  formVersion,
  isTrustedCatalogFormOrigin,
  type CatalogFormIssue,
} from "../catalog/catalog-form.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";

type StructureKind = "attributes" | "brands" | "categories";
type ActionData =
  | { kind: "success"; message: string; requestId: string | null }
  | { kind: "accepted"; message: string; requestId: string | null }
  | { kind: "invalid"; issues: readonly CatalogFormIssue[]; requestId: string | null }
  | { kind: "failure"; message: string; requestId: string | null; needsRevalidation?: boolean };

export async function loader({ request, params }: { request: Request; params: { kind?: string } }) {
  const kind = parseKind(params.kind);
  if (!kind) throw data("Not Found", { status: 404 });
  const url = new URL(request.url);
  const selectedAttributeId = boundedId(url.searchParams.get("attribute"));

  if (kind === "brands") {
    const state = await readAdminBrands(request);
    const headers = cookieHeaders(state.setCookies);
    return data({ kind, state }, { status: state.kind === "denied" ? 403 : state.kind === "ready" ? 200 : 503, headers });
  }
  if (kind === "categories") {
    const state = await readAdminCategories(request);
    const headers = cookieHeaders(state.setCookies);
    return data({ kind, state }, { status: state.kind === "denied" ? 403 : state.kind === "ready" ? 200 : 503, headers });
  }

  const state = await readAdminAttributes(request, { selectedAttributeId });
  const headers = cookieHeaders(state.setCookies);
  return data({ kind, state }, { status: state.kind === "denied" ? 403 : state.kind === "not_found" ? 404 : state.kind === "ready" ? 200 : 503, headers });
}

export async function action({ request, params }: { request: Request; params: { kind?: string } }) {
  const kind = parseKind(params.kind);
  if (!kind || request.method !== "POST" || !isTrustedCatalogFormOrigin(request)) {
    return data<ActionData>({ kind: "failure", message: "درخواست مدیریت ساختار معتبر نیست.", requestId: null }, { status: 403 });
  }
  const form = await request.formData();
  const intent = formText(form, "intent", { required: true, max: 60 }, []);
  if (!intent) return invalid([{ field: "intent", message: "عملیات مشخص نشده است." }]);

  const result = kind === "brands"
    ? await brandAction(request, form, intent)
    : kind === "categories"
      ? await categoryAction(request, form, intent)
      : await attributeAction(request, form, intent);

  if ("localIssues" in result) return invalid(result.localIssues);
  return mutationResponse(result, kind);
}

export default function AdminCatalogStructureRoute() {
  const payload = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const busy = useNavigation().state !== "idle";

  return (
    <section className="catalog-read-page" aria-labelledby="catalog-structure-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <Link to="/catalog/products">کالا و قیمت</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{titleFor(payload.kind)}</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">{surfaceFor(payload.kind)} · 68-E</p>
          <h1 id="catalog-structure-title">{titleFor(payload.kind)}</h1>
          <p>{descriptionFor(payload.kind)}</p>
        </div>
        <span className="catalog-read-only-badge">ساختار canonical</span>
      </header>

      {actionData ? <Outcome value={actionData} /> : null}
      {payload.state.kind !== "ready"
        ? <ReadFailure kind={payload.state.kind} requestId={payload.state.requestId} />
        : payload.kind === "brands"
          ? <BrandWorkspace items={payload.state.items} busy={busy} />
          : payload.kind === "categories"
            ? <CategoryWorkspace items={payload.state.items} busy={busy} />
            : <AttributeWorkspace
                attributes={payload.state.attributes}
                values={payload.state.values}
                selectedAttributeId={payload.state.selectedAttributeId}
                busy={busy}
              />
      }

      <p className="catalog-authority-footnote">
        اعتبار نسخه، سازگاری دسته/والد/مقدار و مجوز عملیات در Backend تعیین می‌شود. این صفحه هیچ حذف یا آرشیو ساختگی ایجاد نمی‌کند.
      </p>
    </section>
  );
}

function BrandWorkspace({ items, busy }: { items: readonly AdminBrand[]; busy: boolean }) {
  return (
    <>
      <details className="catalog-editor-panel" open>
        <summary>افزودن برند</summary>
        <Form method="post" className="catalog-editor-form">
          <input type="hidden" name="intent" value="create-brand" />
          <fieldset disabled={busy}>
            <legend>برند جدید</legend>
            <label><span>نام فارسی *</span><input name="name_fa" maxLength={150} required /></label>
            <label><span>نام انگلیسی</span><input name="name_en" maxLength={150} dir="ltr" /></label>
            <label><span>نامک *</span><input name="slug" maxLength={220} dir="ltr" required /></label>
            <label className="catalog-editor-check"><input type="checkbox" name="sales_enabled" defaultChecked /><span>فروش فعال باشد</span></label>
            <label className="catalog-editor-wide"><span>توضیحات</span><textarea name="description" maxLength={2000} rows={3} /></label>
          </fieldset>
          <div className="catalog-editor-actions"><button type="submit" disabled={busy}>ثبت برند</button></div>
        </Form>
      </details>
      <div className="catalog-variant-admin-list">
        {items.map((brand) => <BrandCard key={brand.id} brand={brand} busy={busy} />)}
      </div>
    </>
  );
}

function BrandCard({ brand, busy }: { brand: AdminBrand; busy: boolean }) {
  return (
    <article className="catalog-variant-admin-card">
      <header><div><h3>{brand.name_fa}</h3><p>نسخه {brand.version} · فروش {brand.sales_enabled ? "فعال" : "متوقف"}</p></div><bdi>{brand.id}</bdi></header>
      <details className="catalog-editor-panel catalog-editor-panel-nested">
        <summary>ویرایش برند</summary>
        <Form method="post" className="catalog-editor-form">
          <input type="hidden" name="intent" value="update-brand" /><input type="hidden" name="id" value={brand.id} /><input type="hidden" name="version" value={String(brand.version)} />
          <fieldset disabled={busy}>
            <label><span>نام فارسی *</span><input name="name_fa" maxLength={150} defaultValue={brand.name_fa} required /></label>
            <label><span>نام انگلیسی</span><input name="name_en" maxLength={150} defaultValue={brand.name_en ?? ""} dir="ltr" /></label>
            <label><span>نامک *</span><input name="slug" maxLength={220} defaultValue={brand.slug} dir="ltr" required /></label>
            <label className="catalog-editor-check"><input type="checkbox" name="sales_enabled" defaultChecked={brand.sales_enabled} /><span>فروش در سطح برند فعال باشد</span></label>
            <label className="catalog-editor-wide"><span>توضیحات</span><textarea name="description" maxLength={2000} rows={3} defaultValue={brand.description ?? ""} /></label>
          </fieldset>
          <div className="catalog-editor-actions"><button type="submit" disabled={busy}>ذخیره با نسخه جاری</button></div>
        </Form>
      </details>
      <SalesToggle kind="brand" id={brand.id} enabled={brand.sales_enabled} busy={busy} />
    </article>
  );
}

function CategoryWorkspace({ items, busy }: { items: readonly AdminCategory[]; busy: boolean }) {
  return (
    <>
      <details className="catalog-editor-panel" open>
        <summary>افزودن دسته‌بندی</summary>
        <Form method="post" className="catalog-editor-form">
          <input type="hidden" name="intent" value="create-category" />
          <fieldset disabled={busy}>
            <legend>دستهٔ جدید</legend>
            <label><span>نام فارسی *</span><input name="name_fa" maxLength={150} required /></label>
            <label><span>نامک *</span><input name="slug" maxLength={220} dir="ltr" required /></label>
            <ParentSelect items={items} />
            <label><span>ترتیب نمایش</span><input name="sort_order" type="number" min={0} step={1} defaultValue={0} /></label>
            <label className="catalog-editor-check"><input type="checkbox" name="sales_enabled" defaultChecked /><span>فروش فعال باشد</span></label>
            <label className="catalog-editor-wide"><span>توضیحات</span><textarea name="description" maxLength={2000} rows={3} /></label>
          </fieldset>
          <div className="catalog-editor-actions"><button type="submit" disabled={busy}>ثبت دسته</button></div>
        </Form>
      </details>
      <div className="catalog-variant-admin-list">
        {items.map((category) => <CategoryCard key={category.id} category={category} items={items} busy={busy} />)}
      </div>
    </>
  );
}

function CategoryCard({ category, items, busy }: { category: AdminCategory; items: readonly AdminCategory[]; busy: boolean }) {
  const parent = items.find((item) => item.id === category.parent_id);
  return (
    <article className="catalog-variant-admin-card">
      <header><div><h3>{category.name_fa}</h3><p>والد: {parent?.name_fa ?? "ریشه"} · نسخه {category.version} · فروش {category.sales_enabled ? "فعال" : "متوقف"}</p></div><bdi>{category.id}</bdi></header>
      <details className="catalog-editor-panel catalog-editor-panel-nested">
        <summary>ویرایش دسته</summary>
        <Form method="post" className="catalog-editor-form">
          <input type="hidden" name="intent" value="update-category" /><input type="hidden" name="id" value={category.id} /><input type="hidden" name="version" value={String(category.version)} />
          <fieldset disabled={busy}>
            <label><span>نام فارسی *</span><input name="name_fa" maxLength={150} defaultValue={category.name_fa} required /></label>
            <label><span>نامک *</span><input name="slug" maxLength={220} defaultValue={category.slug} dir="ltr" required /></label>
            <ParentSelect items={items} currentId={category.id} defaultValue={category.parent_id ?? ""} />
            <label><span>ترتیب نمایش</span><input name="sort_order" type="number" min={0} step={1} defaultValue={category.sort_order} /></label>
            <label className="catalog-editor-check"><input type="checkbox" name="sales_enabled" defaultChecked={category.sales_enabled} /><span>فروش در سطح دسته فعال باشد</span></label>
            <label className="catalog-editor-wide"><span>توضیحات</span><textarea name="description" maxLength={2000} rows={3} defaultValue={category.description ?? ""} /></label>
          </fieldset>
          <div className="catalog-editor-actions"><button type="submit" disabled={busy}>ذخیره با نسخه جاری</button></div>
        </Form>
      </details>
      <SalesToggle kind="category" id={category.id} enabled={category.sales_enabled} busy={busy} />
    </article>
  );
}

function ParentSelect({ items, currentId, defaultValue = "" }: { items: readonly AdminCategory[]; currentId?: string; defaultValue?: string }) {
  return (
    <label><span>دستهٔ والد</span><select name="parent_id" defaultValue={defaultValue}>
      <option value="">بدون والد</option>
      {items.filter((item) => item.id !== currentId).map((item) => <option key={item.id} value={item.id}>{item.name_fa}</option>)}
    </select><small>چرخه و والد نامعتبر توسط Backend رد می‌شود.</small></label>
  );
}

function SalesToggle({ kind, id, enabled, busy }: { kind: "brand" | "category"; id: string; enabled: boolean; busy: boolean }) {
  const intent = enabled ? `stop-${kind}-sales` : `resume-${kind}-sales`;
  return (
    <details className="catalog-action-review catalog-action-review-compact">
      <summary>{enabled ? "توقف فروش" : "ازسرگیری فروش"}</summary>
      <div><p>این اقدام روی فروش مؤثر است و حذف/آرشیو رکورد نیست.</p>
        <Form method="post">
          <input type="hidden" name="intent" value={intent} /><input type="hidden" name="id" value={id} />
          <label><span>دلیل / توضیح</span><textarea name="note" maxLength={500} rows={2} /></label>
          <button type="submit" disabled={busy}>{enabled ? "تأیید توقف فروش" : "تأیید ازسرگیری فروش"}</button>
        </Form>
      </div>
    </details>
  );
}

function AttributeWorkspace({
  attributes, values, selectedAttributeId, busy,
}: {
  attributes: readonly AdminAttribute[];
  values: readonly AdminAttributeValue[];
  selectedAttributeId: string | null;
  busy: boolean;
}) {
  const selected = attributes.find((item) => item.id === selectedAttributeId) ?? null;
  return (
    <>
      <details className="catalog-editor-panel" open>
        <summary>افزودن ویژگی</summary>
        <AttributeForm intent="create-attribute" busy={busy} />
      </details>
      <div className="catalog-variant-admin-list">
        {attributes.map((attribute) => (
          <article className="catalog-variant-admin-card" key={attribute.id}>
            <header><div><h3>{attribute.name_fa}</h3><p>{attribute.key} · {attribute.data_type} · نسخه {attribute.version} · {attribute.is_variant_attribute ? "گونه" : "کالا"}</p></div><bdi>{attribute.id}</bdi></header>
            <details className="catalog-editor-panel catalog-editor-panel-nested">
              <summary>ویرایش تعریف</summary>
              <AttributeForm intent="update-attribute" busy={busy} attribute={attribute} />
            </details>
            <div className="catalog-editor-actions"><Link to={`?attribute=${encodeURIComponent(attribute.id)}`}>مدیریت مقادیر</Link></div>
          </article>
        ))}
      </div>
      {selected ? <AttributeValues attribute={selected} values={values} busy={busy} /> : null}
    </>
  );
}

function AttributeForm({ intent, busy, attribute }: { intent: "create-attribute" | "update-attribute"; busy: boolean; attribute?: AdminAttribute }) {
  return (
    <Form method="post" className="catalog-editor-form">
      <input type="hidden" name="intent" value={intent} />
      {attribute ? <><input type="hidden" name="id" value={attribute.id} /><input type="hidden" name="version" value={String(attribute.version)} /></> : null}
      <fieldset disabled={busy}>
        <label><span>نام فارسی *</span><input name="name_fa" maxLength={150} defaultValue={attribute?.name_fa ?? ""} required /></label>
        <label><span>کلید *</span><input name="key" maxLength={120} defaultValue={attribute?.key ?? ""} dir="ltr" required /></label>
        <label><span>نوع داده</span><select name="data_type" defaultValue={attribute?.data_type ?? "text"}><option value="text">متن</option><option value="number">عدد</option><option value="boolean">بله/خیر</option><option value="select">انتخابی</option></select></label>
        <label><span>واحد</span><input name="unit" maxLength={80} defaultValue={attribute?.unit ?? ""} /></label>
        <label><span>شناسه دسته</span><input name="category_id" maxLength={80} dir="ltr" defaultValue={attribute?.category_id ?? ""} /><small>خالی = ویژگی عمومی.</small></label>
        <label><span>ترتیب نمایش</span><input name="sort_order" type="number" min={0} step={1} defaultValue={attribute?.sort_order ?? 0} /></label>
        <label className="catalog-editor-check"><input type="checkbox" name="is_variant_attribute" defaultChecked={attribute?.is_variant_attribute ?? false} /><span>ویژگی گونه</span></label>
        <label className="catalog-editor-check"><input type="checkbox" name="is_filterable" defaultChecked={attribute?.is_filterable ?? false} /><span>قابل فیلتر</span></label>
        <label className="catalog-editor-check"><input type="checkbox" name="is_comparable" defaultChecked={attribute?.is_comparable ?? false} /><span>قابل مقایسه</span></label>
      </fieldset>
      <div className="catalog-editor-actions"><button type="submit" disabled={busy}>{attribute ? "ذخیره تعریف" : "ثبت ویژگی"}</button></div>
    </Form>
  );
}

function AttributeValues({ attribute, values, busy }: { attribute: AdminAttribute; values: readonly AdminAttributeValue[]; busy: boolean }) {
  return (
    <section className="catalog-read-section" aria-labelledby="attribute-values-title">
      <h2 id="attribute-values-title">مقادیر «{attribute.name_fa}»</h2>
      <ValueForm intent="create-attribute-value" attribute={attribute} busy={busy} />
      <div className="catalog-variant-admin-list">
        {values.map((value) => <article className="catalog-variant-admin-card" key={value.id}>
          <header><div><h3>{displayValue(value)}</h3><p>نسخه {value.version} · ترتیب {value.sort_order}</p></div><bdi>{value.id}</bdi></header>
          <ValueForm intent="update-attribute-value" attribute={attribute} value={value} busy={busy} />
        </article>)}
      </div>
    </section>
  );
}

function ValueForm({ intent, attribute, value, busy }: {
  intent: "create-attribute-value" | "update-attribute-value";
  attribute: AdminAttribute;
  value?: AdminAttributeValue;
  busy: boolean;
}) {
  const inputType = attribute.data_type === "select" ? "text" : attribute.data_type;
  return (
    <Form method="post" className="catalog-editor-form">
      <input type="hidden" name="intent" value={intent} /><input type="hidden" name="attribute_id" value={attribute.id} /><input type="hidden" name="value_kind" value={inputType} />
      {value ? <><input type="hidden" name="value_id" value={value.id} /><input type="hidden" name="version" value={String(value.version)} /></> : null}
      <fieldset disabled={busy}>
        {inputType === "boolean"
          ? <label><span>مقدار</span><select name="value_input" defaultValue={value?.value_boolean === false ? "false" : "true"}><option value="true">بله</option><option value="false">خیر</option></select></label>
          : <label><span>مقدار *</span><input name="value_input" type={inputType === "number" ? "number" : "text"} maxLength={inputType === "number" ? undefined : 500} defaultValue={value?.value_numeric ?? value?.value_text ?? ""} required /></label>}
        <label><span>مقدار نرمال‌شده</span><input name="normalized_value" maxLength={500} defaultValue={value?.normalized_value ?? ""} /></label>
        <label><span>ترتیب نمایش</span><input name="sort_order" type="number" min={0} step={1} defaultValue={value?.sort_order ?? 0} /></label>
      </fieldset>
      <div className="catalog-editor-actions"><button type="submit" disabled={busy}>{value ? "ذخیره مقدار" : "افزودن مقدار"}</button></div>
    </Form>
  );
}

async function brandAction(request: Request, form: FormData, intent: string) {
  const issues: CatalogFormIssue[] = [];
  const id = formOptionalText(form, "id", 80, issues);
  if (intent === "create-brand" || intent === "update-brand") {
    const nameFa = formText(form, "name_fa", { required: true, max: 150 }, issues);
    const nameEn = formOptionalText(form, "name_en", 150, issues);
    const slug = formText(form, "slug", { required: true, max: 220 }, issues);
    const description = formOptionalText(form, "description", 2000, issues);
    const version = intent === "update-brand" ? formVersion(form, "version", issues) : null;
    if (issues.length || !nameFa || !slug || (intent === "update-brand" && (!id || !version))) return { localIssues: issues };
    const body = { name_fa: nameFa, name_en: nameEn, slug, description, sales_enabled: formBoolean(form, "sales_enabled") };
    return intent === "create-brand" ? createAdminBrand(request, body) : updateAdminBrand(request, id!, version!, body);
  }
  if (intent === "stop-brand-sales" || intent === "resume-brand-sales") {
    const note = formOptionalText(form, "note", 500, issues);
    if (!id) issues.push({ field: "id", message: "شناسه برند معتبر نیست." });
    if (issues.length) return { localIssues: issues };
    return setAdminBrandSales(request, id!, intent === "resume-brand-sales", note);
  }
  return { localIssues: [{ field: "intent", message: "عملیات برند معتبر نیست." }] };
}

async function categoryAction(request: Request, form: FormData, intent: string) {
  const issues: CatalogFormIssue[] = [];
  const id = formOptionalText(form, "id", 80, issues);
  if (intent === "create-category" || intent === "update-category") {
    const nameFa = formText(form, "name_fa", { required: true, max: 150 }, issues);
    const slug = formText(form, "slug", { required: true, max: 220 }, issues);
    const parentId = formOptionalText(form, "parent_id", 80, issues);
    const description = formOptionalText(form, "description", 2000, issues);
    const sortOrder = formNonNegativeInteger(form, "sort_order", issues);
    const version = intent === "update-category" ? formVersion(form, "version", issues) : null;
    if (issues.length || !nameFa || !slug || sortOrder === null || (intent === "update-category" && (!id || !version))) return { localIssues: issues };
    const body = { parent_id: parentId, name_fa: nameFa, slug, description, sales_enabled: formBoolean(form, "sales_enabled"), sort_order: sortOrder };
    return intent === "create-category" ? createAdminCategory(request, body) : updateAdminCategory(request, id!, version!, body);
  }
  if (intent === "stop-category-sales" || intent === "resume-category-sales") {
    const note = formOptionalText(form, "note", 500, issues);
    if (!id) issues.push({ field: "id", message: "شناسه دسته معتبر نیست." });
    if (issues.length) return { localIssues: issues };
    return setAdminCategorySales(request, id!, intent === "resume-category-sales", note);
  }
  return { localIssues: [{ field: "intent", message: "عملیات دسته معتبر نیست." }] };
}

async function attributeAction(request: Request, form: FormData, intent: string) {
  const issues: CatalogFormIssue[] = [];
  if (intent === "create-attribute" || intent === "update-attribute") {
    const id = formOptionalText(form, "id", 80, issues);
    const nameFa = formText(form, "name_fa", { required: true, max: 150 }, issues);
    const key = formText(form, "key", { required: true, max: 120 }, issues);
    const dataType = formText(form, "data_type", { required: true, max: 20 }, issues);
    const categoryId = formOptionalText(form, "category_id", 80, issues);
    const unit = formOptionalText(form, "unit", 80, issues);
    const sortOrder = formNonNegativeInteger(form, "sort_order", issues);
    const version = intent === "update-attribute" ? formVersion(form, "version", issues) : null;
    if (!["text", "number", "boolean", "select"].includes(dataType ?? "")) issues.push({ field: "data_type", message: "نوع ویژگی معتبر نیست." });
    if (issues.length || !nameFa || !key || !dataType || sortOrder === null || (intent === "update-attribute" && (!id || !version))) return { localIssues: issues };
    const body = {
      category_id: categoryId, name_fa: nameFa, key, data_type: dataType as "text" | "number" | "boolean" | "select", unit,
      is_variant_attribute: formBoolean(form, "is_variant_attribute"),
      is_filterable: formBoolean(form, "is_filterable"),
      is_comparable: formBoolean(form, "is_comparable"),
      sort_order: sortOrder,
    };
    return intent === "create-attribute" ? createAdminAttribute(request, body) : updateAdminAttribute(request, id!, version!, body);
  }
  if (intent === "create-attribute-value" || intent === "update-attribute-value") {
    const attributeId = formText(form, "attribute_id", { required: true, max: 80 }, issues);
    const valueId = formOptionalText(form, "value_id", 80, issues);
    const kind = formText(form, "value_kind", { required: true, max: 20 }, issues);
    const input = formText(form, "value_input", { required: true, max: 500 }, issues);
    const normalized = formOptionalText(form, "normalized_value", 500, issues);
    const sortOrder = formNonNegativeInteger(form, "sort_order", issues);
    const version = intent === "update-attribute-value" ? formVersion(form, "version", issues) : null;
    const typed = typedValue(kind, input, issues);
    if (issues.length || !attributeId || !typed || sortOrder === null || (intent === "update-attribute-value" && (!valueId || !version))) return { localIssues: issues };
    const body = { ...typed, normalized_value: normalized, sort_order: sortOrder };
    return intent === "create-attribute-value"
      ? createAdminAttributeValue(request, attributeId, body)
      : updateAdminAttributeValue(request, attributeId, valueId!, version!, body);
  }
  return { localIssues: [{ field: "intent", message: "عملیات ویژگی معتبر نیست." }] };
}

function typedValue(kind: string | null, input: string | null, issues: CatalogFormIssue[]) {
  if (!input) return null;
  if (kind === "text") return { value_text: input };
  if (kind === "number") {
    const value = Number(input);
    if (!Number.isFinite(value)) { issues.push({ field: "value_input", message: "مقدار عددی معتبر نیست." }); return null; }
    return { value_numeric: value };
  }
  if (kind === "boolean" && (input === "true" || input === "false")) return { value_boolean: input === "true" };
  issues.push({ field: "value_input", message: "نوع مقدار معتبر نیست." });
  return null;
}

function formNonNegativeInteger(form: FormData, field: string, issues: CatalogFormIssue[]): number | null {
  const raw = form.get(field);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < 0) { issues.push({ field, message: "ترتیب باید عدد صحیح صفر یا بزرگ‌تر باشد." }); return null; }
  return value;
}

function mutationResponse(result: StructureMutationResult, kind: StructureKind) {
  const headers = cookieHeaders(result.setCookies);
  if (result.kind === "confirmed") return data<ActionData>({ kind: "success", message: "تغییر در وضعیت canonical بازخوانی و تأیید شد.", requestId: result.requestId }, { headers });
  if (result.kind === "accepted") return data<ActionData>({ kind: "accepted", message: "درخواست پذیرفته شد اما نتیجه نهایی نیست؛ وضعیت canonical دوباره خوانده شد.", requestId: result.requestId }, { status: 202, headers });
  if (result.kind === "invalid") {
    return data<ActionData>({ kind: "invalid", issues: result.fieldErrors.map((item) => ({ field: item.field, message: "این مقدار توسط سرور پذیرفته نشد." })), requestId: result.requestId }, { status: 422, headers });
  }
  const messages = {
    denied: "مجوز این عملیات توسط سرور تأیید نشد.",
    conflict: "نسخه رکورد تغییر کرده است؛ صفحه را دوباره بخوانید و سپس تصمیم بگیرید.",
    not_found: "رکورد موردنظر دیگر در دسترس نیست.",
    unknown_outcome: "نتیجه عملیات قطعی نیست. پیش از تکرار، وضعیت canonical را دوباره بررسی کنید.",
    unavailable: "سرویس ساختار کاتالوگ فعلاً قابل بررسی نیست.",
  } as const;
  const status = result.kind === "denied" ? 403 : result.kind === "conflict" ? 409 : result.kind === "not_found" ? 404 : 503;
  return data<ActionData>({ kind: "failure", message: messages[result.kind], requestId: result.requestId, needsRevalidation: result.kind === "conflict" || result.kind === "unknown_outcome" }, { status, headers });
}

function invalid(issues: readonly CatalogFormIssue[]) {
  return data<ActionData>({ kind: "invalid", issues, requestId: null }, { status: 400 });
}
function cookieHeaders(setCookies: readonly string[]) {
  const headers = new Headers(); appendAdminAuthSetCookies(headers, setCookies); return headers;
}
function parseKind(value?: string): StructureKind | null {
  return value === "attributes" || value === "brands" || value === "categories" ? value : null;
}
function boundedId(value: string | null): string | null {
  if (!value || value.length > 80 || /[\u0000-\u001f\u007f]/.test(value)) return null; return value;
}
function surfaceFor(kind: StructureKind) { return kind === "attributes" ? "AD-C-03" : kind === "brands" ? "AD-C-05" : "AD-C-06"; }
function titleFor(kind: StructureKind) { return kind === "attributes" ? "مشخصات کالا و گونه" : kind === "brands" ? "برندها" : "دسته‌بندی‌ها"; }
function descriptionFor(kind: StructureKind) {
  return kind === "attributes"
    ? "تعریف ویژگی، مقدارهای typed و آماده‌سازی تخصیص کامل به کالا یا گونه."
    : kind === "brands"
      ? "ایجاد، ویرایش نسخه‌محور و کنترل فروش برند؛ بدون حذف یا آرشیو ساختگی."
      : "مدیریت سلسله‌مراتب، ویرایش نسخه‌محور و کنترل فروش دسته؛ چرخه‌ها در Backend رد می‌شوند.";
}
function displayValue(value: AdminAttributeValue) {
  if (value.value_text != null) return value.value_text;
  if (value.value_numeric != null) return String(value.value_numeric);
  if (value.value_boolean != null) return value.value_boolean ? "بله" : "خیر";
  return "—";
}
function Outcome({ value }: { value: ActionData }) {
  const noticeRef = useRef<HTMLDivElement>(null);
  const revalidator = useRevalidator();
  useEffect(() => { noticeRef.current?.focus(); }, [value]);
  return <div ref={noticeRef} className="catalog-action-outcome" role={value.kind === "success" ? "status" : "alert"} tabIndex={-1}>
    {value.kind === "invalid" ? <><p>فرم نیاز به اصلاح دارد.</p><ul>{value.issues.map((issue, i) => <li key={issue.field + i}>{issue.message}</li>)}</ul></> : <p>{value.message}</p>}
    {value.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{value.requestId}</bdi></p> : null}
    {value.kind === "failure" && value.needsRevalidation ? (
      <button type="button" className="catalog-primary-action" onClick={() => void revalidator.revalidate()} disabled={revalidator.state !== "idle"}>
        {revalidator.state === "idle" ? "بازخوانی وضعیت canonical" : "در حال بازخوانی…"}
      </button>
    ) : null}
  </div>;
}
function ReadFailure({ kind, requestId }: { kind: string; requestId: string | null }) {
  const message = kind === "denied" ? "مجوز مشاهده این بخش توسط سرور تأیید نشد." : kind === "not_found" ? "رکورد انتخاب‌شده پیدا نشد." : "خواندن ساختار کاتالوگ فعلاً ممکن نیست.";
  return <div className="auth-alert" role="alert"><p>{message}</p>{requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{requestId}</bdi></p> : null}</div>;
}
