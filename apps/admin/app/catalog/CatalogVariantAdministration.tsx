import { Form } from "react-router";
import type { ApiComponents } from "../platform/api/contract.js";

type Variant = ApiComponents["schemas"]["AdminVariantResponse"];

export function CatalogVariantAdministration({
  variants,
  busy,
  productArchived,
}: {
  variants: readonly Variant[];
  busy: boolean;
  productArchived: boolean;
}) {
  return (
    <section className="catalog-detail-section" aria-labelledby="catalog-variant-admin-title">
      <div className="catalog-section-heading">
        <div>
          <h2 id="catalog-variant-admin-title">مدیریت گونه‌ها</h2>
          <p>
            ساخت گونه در runtime فعلی همیشه با وضعیت active آغاز می‌شود. قیمت، موجودی و
            ساختار مشخصات در این مرحله قابل ویرایش نیست.
          </p>
        </div>
        <span>{variants.length.toLocaleString("fa-IR")} گونه</span>
      </div>

      {!productArchived ? (
        <details className="catalog-editor-panel">
          <summary>افزودن گونهٔ جدید</summary>
          <Form method="post" className="catalog-editor-form" replace>
            <input type="hidden" name="intent" value="create-variant" />
            <fieldset disabled={busy}>
              <legend>گونهٔ جدید · وضعیت اولیه active</legend>
              <label>
                <span>SKU *</span>
                <input name="sku" maxLength={120} required dir="ltr" autoComplete="off" />
              </label>
              <label>
                <span>بارکد</span>
                <input name="barcode" maxLength={120} dir="ltr" autoComplete="off" />
              </label>
              <label>
                <span>پسوند نام</span>
                <input name="name_suffix" maxLength={180} autoComplete="off" />
              </label>
              <label>
                <span>وزن (گرم)</span>
                <input name="weight_grams" type="number" min={1} step={1} inputMode="numeric" />
              </label>
              <label className="catalog-editor-check">
                <input type="checkbox" name="sales_enabled" />
                <span>فروش گونه پس از ساخت فعال باشد</span>
              </label>
            </fieldset>
            <div className="catalog-editor-actions">
              <button className="catalog-primary-action" type="submit" disabled={busy}>ایجاد گونه</button>
            </div>
          </Form>
        </details>
      ) : (
        <p className="catalog-authority-footnote">برای محصول آرشیوشده گونهٔ جدید ساخته نمی‌شود.</p>
      )}

      <div className="catalog-variant-admin-list">
        {variants.map((variant) => (
          <article key={variant.id} className="catalog-variant-admin-card">
            <header>
              <div>
                <h3><bdi>{variant.sku}</bdi></h3>
                <p>
                  {variant.status === "active" ? "فعال" : "غیرفعال"} ·
                  {variant.sales_enabled ? " فروش فعال" : " فروش متوقف"} ·
                  نسخه {variant.version.toLocaleString("fa-IR")}
                </p>
              </div>
              <bdi>{variant.id}</bdi>
            </header>

            {!productArchived ? (
              <>
                <details className="catalog-editor-panel catalog-editor-panel-nested">
                  <summary>ویرایش گونه</summary>
                  <Form method="post" className="catalog-editor-form" replace>
                    <input type="hidden" name="intent" value="update-variant" />
                    <input type="hidden" name="variant_id" value={variant.id} />
                    <input type="hidden" name="version" value={String(variant.version)} />
                    <fieldset disabled={busy}>
                      <legend>ویرایش با کنترل نسخه</legend>
                      <label>
                        <span>SKU *</span>
                        <input name="sku" defaultValue={variant.sku} maxLength={120} required dir="ltr" />
                      </label>
                      <label>
                        <span>بارکد</span>
                        <input name="barcode" defaultValue={variant.barcode ?? ""} maxLength={120} dir="ltr" />
                      </label>
                      <label>
                        <span>پسوند نام</span>
                        <input name="name_suffix" defaultValue={variant.name_suffix ?? ""} maxLength={180} />
                      </label>
                      <label>
                        <span>وضعیت</span>
                        <select name="status" defaultValue={variant.status}>
                          <option value="active">فعال</option>
                          <option value="inactive">غیرفعال</option>
                        </select>
                      </label>
                      <label>
                        <span>وزن (گرم)</span>
                        <input
                          name="weight_grams"
                          type="number"
                          min={1}
                          step={1}
                          defaultValue={variant.weight_grams ?? ""}
                          inputMode="numeric"
                        />
                      </label>
                    </fieldset>
                    <div className="catalog-editor-actions">
                      <button type="submit" className="catalog-primary-action" disabled={busy}>ثبت گونه</button>
                      <span>فروش از عملیات مستقل پایین کنترل می‌شود.</span>
                    </div>
                  </Form>
                </details>

                {variant.sales_enabled ? (
                  <VariantSalesReview
                    variantId={variant.id}
                    intent="stop-variant-sales"
                    title="توقف فروش گونه"
                    description="فروش همین گونه متوقف می‌شود؛ وضعیت active/inactive جداگانه باقی می‌ماند."
                    submitLabel="توقف فروش گونه"
                    busy={busy}
                    destructive
                  />
                ) : variant.status === "active" ? (
                  <VariantSalesReview
                    variantId={variant.id}
                    intent="resume-variant-sales"
                    title="ازسرگیری فروش گونه"
                    description="Backend امکان فروش این گونه را دوباره بررسی می‌کند."
                    submitLabel="درخواست ازسرگیری"
                    busy={busy}
                  />
                ) : (
                  <p className="catalog-authority-footnote">
                    گونهٔ غیرفعال قابل ازسرگیری فروش نیست؛ ابتدا وضعیت آن را با ویرایش نسخه‌دار به active تغییر دهید.
                  </p>
                )}
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function VariantSalesReview({
  variantId,
  intent,
  title,
  description,
  submitLabel,
  busy,
  destructive = false,
}: {
  variantId: string;
  intent: string;
  title: string;
  description: string;
  submitLabel: string;
  busy: boolean;
  destructive?: boolean;
}) {
  return (
    <details className={"catalog-action-review catalog-action-review-compact" + (destructive ? " catalog-action-review-danger" : "")}>
      <summary>{title}</summary>
      <div>
        <p>{description}</p>
        <Form method="post" replace>
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="variant_id" value={variantId} />
          <label>
            <span>یادداشت اختیاری</span>
            <textarea name="reason" maxLength={1000} rows={2} />
          </label>
          <button type="submit" disabled={busy}>{submitLabel}</button>
        </Form>
      </div>
    </details>
  );
}
