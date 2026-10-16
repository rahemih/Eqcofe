import { Form } from "react-router";
import type { ApiComponents } from "../platform/api/contract.js";

type Product = ApiComponents["schemas"]["AdminProductResponse"];

export function CatalogProductLifecycle({
  product,
  busy,
}: {
  product: Product;
  busy: boolean;
}) {
  const archived = product.status === "archived";

  return (
    <section className="catalog-detail-section" aria-labelledby="catalog-lifecycle-title">
      <div className="catalog-section-heading">
        <div>
          <h2 id="catalog-lifecycle-title">چرخهٔ انتشار و فروش</h2>
          <p>هر عملیات دوباره توسط Backend مجوزسنجی و اعتبارسنجی می‌شود.</p>
        </div>
        <span>نسخه {product.version.toLocaleString("fa-IR")}</span>
      </div>

      <div className="catalog-lifecycle-grid">
        {!archived && product.status !== "published" ? (
          <ActionReview
            title="انتشار کالا"
            description="شرایط انتشار، وجود گونهٔ فعال و قیمت قابل فروش فقط توسط Backend بررسی می‌شود."
            intent="publish-product"
            submitLabel="ارسال برای انتشار"
            busy={busy}
          />
        ) : null}

        {!archived ? (
          <ActionReview
            title="آرشیو کالا"
            description="آرشیو، فروش محصول را خاموش می‌کند و تا خروج از آرشیو ویرایش/انتشار متوقف می‌شود."
            intent="archive-product"
            submitLabel="تأیید آرشیو"
            busy={busy}
            destructive
            reasonRequired
          />
        ) : (
          <ActionReview
            title="خروج از آرشیو"
            description="محصول به حالت پیش‌نویس برمی‌گردد و فروش به‌صورت خودکار فعال نمی‌شود."
            intent="unarchive-product"
            submitLabel="خروج از آرشیو"
            busy={busy}
            reasonOptional
          />
        )}

        {!archived && product.sales_enabled ? (
          <ActionReview
            title="توقف فروش محصول"
            description="این عملیات فقط فروش را متوقف می‌کند و محصول را آرشیو نمی‌کند."
            intent="stop-product-sales"
            submitLabel="توقف فروش"
            busy={busy}
            destructive
            reasonOptional
          />
        ) : null}

        {!archived && !product.sales_enabled ? (
          <ActionReview
            title="ازسرگیری فروش محصول"
            description="Backend وضعیت محصول را بررسی می‌کند؛ هیچ فعال‌سازی محلی قبل از پاسخ سرور انجام نمی‌شود."
            intent="resume-product-sales"
            submitLabel="درخواست ازسرگیری فروش"
            busy={busy}
            reasonOptional
          />
        ) : null}
      </div>
    </section>
  );
}

function ActionReview({
  title,
  description,
  intent,
  submitLabel,
  busy,
  destructive = false,
  reasonRequired = false,
  reasonOptional = false,
}: {
  title: string;
  description: string;
  intent: string;
  submitLabel: string;
  busy: boolean;
  destructive?: boolean;
  reasonRequired?: boolean;
  reasonOptional?: boolean;
}) {
  return (
    <details className={"catalog-action-review" + (destructive ? " catalog-action-review-danger" : "")}>
      <summary>{title}</summary>
      <div>
        <p>{description}</p>
        <Form method="post" replace>
          <input type="hidden" name="intent" value={intent} />
          {reasonRequired || reasonOptional ? (
            <label>
              <span>{reasonRequired ? "دلیل *" : "یادداشت اختیاری"}</span>
              <textarea name="reason" maxLength={1000} rows={3} required={reasonRequired} />
            </label>
          ) : null}
          <button type="submit" disabled={busy}>{submitLabel}</button>
        </Form>
      </div>
    </details>
  );
}
