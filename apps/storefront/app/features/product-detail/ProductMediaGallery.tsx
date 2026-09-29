import { useMemo, useState } from "react";
import type { ResolvedProductMedia } from "./product-detail-media.server.js";

export function ProductMediaGallery({
  media,
  selectedVariantId,
}: {
  media: readonly ResolvedProductMedia[];
  selectedVariantId: string | null;
}) {
  const visible = useMemo(
    () => selectVisibleProductMedia(media, selectedVariantId),
    [media, selectedVariantId],
  );
  const [activeId, setActiveId] = useState<string | null>(visible[0]?.id ?? null);

  const requestedIndex = visible.findIndex((item) => item.id === activeId);
  const activeIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const active = visible[activeIndex] ?? null;

  if (!active) {
    return (
      <section className="product-media" aria-labelledby="product-media-title">
        <h2 id="product-media-title">رسانه محصول</h2>
        <p className="product-media__empty">تصویر یا ویدیوی فعالی برای این انتخاب ثبت نشده است.</p>
        <CapabilityNotice />
      </section>
    );
  }

  const move = (delta: number) => {
    const next = (activeIndex + delta + visible.length) % visible.length;
    setActiveId(visible[next]?.id ?? null);
  };

  return (
    <section className="product-media" aria-labelledby="product-media-title">
      <div className="product-media__heading">
        <h2 id="product-media-title">رسانه محصول</h2>
        <p aria-live="polite">
          {new Intl.NumberFormat("fa-IR").format(activeIndex + 1)}
          {" از "}
          {new Intl.NumberFormat("fa-IR").format(visible.length)}
        </p>
      </div>

      <div className="product-media__viewer">
        {active.delivery_status === "ready" && active.delivery_url ? (
          active.media_type === "image" ? (
            <img
              src={active.delivery_url}
              alt={active.alt_text_fa?.trim() || "تصویر محصول"}
              width={active.width ?? undefined}
              height={active.height ?? undefined}
              loading="eager"
            />
          ) : (
            <video controls preload="metadata" playsInline aria-label={active.alt_text_fa?.trim() || "ویدیوی محصول"}>
              <source src={active.delivery_url} type={active.mime_type} />
              مرورگر شما امکان پخش این ویدیو را ندارد.
            </video>
          )
        ) : (
          <div className="product-media__unavailable" role="status">
            <strong>{active.media_type === "video" ? "ویدیو" : "تصویر"} ثبت شده است</strong>
            <span>مسیر عمومی امن این رسانه در محیط فعلی پیکربندی نشده است.</span>
          </div>
        )}
      </div>

      {visible.length > 1 ? (
        <div className="product-media__navigation" aria-label="کنترل رسانه">
          <button type="button" onClick={() => move(-1)}>قبلی</button>
          <button type="button" onClick={() => move(1)}>بعدی</button>
        </div>
      ) : null}

      <div className="product-media__thumbnails" role="list" aria-label="فهرست رسانه‌ها">
        {visible.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            aria-current={item.id === active.id ? "true" : undefined}
            onClick={() => setActiveId(item.id)}
          >
            {item.media_type === "video" ? "ویدیو" : "تصویر"}{" "}
            {new Intl.NumberFormat("fa-IR").format(index + 1)}
          </button>
        ))}
      </div>

      <CapabilityNotice />
    </section>
  );
}

export function selectVisibleProductMedia(
  media: readonly ResolvedProductMedia[],
  selectedVariantId: string | null,
): readonly ResolvedProductMedia[] {
  return [...media]
    .filter((item) => item.variant_id == null || item.variant_id === selectedVariantId)
    .sort((left, right) => left.sort_order - right.sort_order || left.id.localeCompare(right.id));
}

function CapabilityNotice() {
  return (
    <p className="product-media__capability-note">
      نمایش سه‌بعدی/۳۶۰ فقط زمانی فعال می‌شود که قرارداد canonical برای آن رسانه و metadata معتبر ارائه کند؛
      قرارداد فعلی فقط تصویر و ویدیو را پشتیبانی می‌کند.
    </p>
  );
}
