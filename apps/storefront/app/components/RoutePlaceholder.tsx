type RoutePlaceholderProps = {
  screenId: string;
  title: string;
  targetStep: number;
  routeIntent: string;
};

export function RoutePlaceholder({
  screenId,
  title,
  targetStep,
  routeIntent,
}: RoutePlaceholderProps) {
  return (
    <section className="route-placeholder" aria-labelledby="route-placeholder-title">
      <p className="route-placeholder__eyebrow">زیرساخت مسیر آماده است</p>
      <h1 id="route-placeholder-title">{title}</h1>
      <p>
        این صفحه در Step {targetStep.toLocaleString("fa-IR")} تکمیل می‌شود و در Stage 58-C
        فقط پوسته، مسیر و قراردادهای RTL/i18n را نگه می‌دارد.
      </p>
      <p className="route-placeholder__status" role="status">
        داده، عملیات تجاری و تصمیم‌های سرور در این مرحله فعال نشده‌اند.
      </p>
      <dl className="route-placeholder__meta">
        <div>
          <dt>شناسهٔ طراحی</dt>
          <dd dir="ltr">{screenId}</dd>
        </div>
        <div>
          <dt>Route intent</dt>
          <dd dir="ltr">{routeIntent}</dd>
        </div>
      </dl>
    </section>
  );
}
