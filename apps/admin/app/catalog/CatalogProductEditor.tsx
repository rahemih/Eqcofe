import { Form } from "react-router";
import type { ApiComponents } from "../platform/api/contract.js";

type Product = ApiComponents["schemas"]["AdminProductResponse"];
type Brand = ApiComponents["schemas"]["AdminBrandResponse"];
type Category = ApiComponents["schemas"]["AdminCategoryResponse"];

export function CatalogProductEditor({
  product,
  brands,
  categories,
  busy,
}: {
  product: Product;
  brands: readonly Brand[] | null;
  categories: readonly Category[] | null;
  busy: boolean;
}) {
  if (product.status === "archived") {
    return (
      <p className="catalog-authority-footnote">
        محصول آرشیوشده قابل ویرایش نیست. ابتدا باید با عملیات مستقل از آرشیو خارج شود.
      </p>
    );
  }

  return (
    <details className="catalog-editor-panel">
      <summary>ویرایش مشخصات کالا</summary>
      <Form method="post" className="catalog-editor-form" replace>
        <input type="hidden" name="intent" value="update-product" />
        <input type="hidden" name="version" value={String(product.version)} />
        <fieldset disabled={busy}>
          <legend>نسخهٔ فعلی: {product.version.toLocaleString("fa-IR")}</legend>

          <label>
            <span>نام فارسی *</span>
            <input name="name_fa" defaultValue={product.name_fa} maxLength={250} required />
          </label>

          <label>
            <span>نام انگلیسی</span>
            <input name="name_en" defaultValue={product.name_en ?? ""} maxLength={250} dir="ltr" />
          </label>

          <label>
            <span>نامک *</span>
            <input name="slug" defaultValue={product.slug} maxLength={220} required dir="ltr" />
          </label>

          <ReferenceField
            name="primary_category_id"
            label="دستهٔ اصلی *"
            required
            currentId={product.primary_category.id}
            currentLabel={product.primary_category.name_fa}
            options={categories}
          />

          <ReferenceField
            name="brand_id"
            label="برند"
            currentId={product.brand?.id ?? ""}
            currentLabel={product.brand?.name_fa ?? "بدون برند"}
            options={brands}
          />

          <label className="catalog-editor-wide">
            <span>شناسه‌های دستهٔ تکمیلی</span>
            <input
              name="additional_category_ids"
              defaultValue={product.additional_categories.map((item) => item.id).join(", ")}
              dir="ltr"
              autoComplete="off"
            />
            <small>شناسه‌ها با ویرگول جدا شوند. ساخت یا ویرایش خود دسته‌ها به 68-E تعلق دارد.</small>
          </label>

          <label className="catalog-editor-wide">
            <span>توضیح کوتاه</span>
            <textarea name="short_description" defaultValue={product.short_description ?? ""} maxLength={1000} rows={3} />
          </label>

          <label className="catalog-editor-wide">
            <span>توضیحات</span>
            <textarea name="description" defaultValue={product.description ?? ""} maxLength={20000} rows={8} />
          </label>
        </fieldset>

        <div className="catalog-editor-actions">
          <button className="catalog-primary-action" type="submit" disabled={busy}>ثبت با کنترل نسخه</button>
          <span>اگر نسخه تغییر کرده باشد، سرور با 409 عملیات را متوقف می‌کند.</span>
        </div>
      </Form>
    </details>
  );
}

function ReferenceField({
  name,
  label,
  required = false,
  currentId,
  currentLabel,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  currentId: string;
  currentLabel: string;
  options: readonly Brand[] | readonly Category[] | null;
}) {
  if (options) {
    const hasCurrent = currentId === "" || options.some((item) => item.id === currentId);
    return (
      <label>
        <span>{label}</span>
        <select name={name} required={required} defaultValue={currentId}>
          {!required ? <option value="">بدون انتخاب</option> : null}
          {!hasCurrent && currentId ? <option value={currentId}>{currentLabel}</option> : null}
          {options.map((item) => (
            <option key={item.id} value={item.id}>{item.name_fa}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      <span>{label}</span>
      <input name={name} defaultValue={currentId} maxLength={80} required={required} dir="ltr" />
      <small>فهرست مرجع برای این نشست قابل خواندن نبود؛ شناسهٔ canonical حفظ می‌شود.</small>
    </label>
  );
}
