export const ADMIN_SURFACE_STATE_KINDS = [
  "loading",
  "empty",
  "error",
  "denied",
  "conflict",
  "unavailable",
] as const;

export type AdminSurfaceStateKind = (typeof ADMIN_SURFACE_STATE_KINDS)[number];

export type AdminSurfaceStateCopy = {
  kicker: string;
  title: string;
  description: string;
};

export const ADMIN_SURFACE_STATE_COPY: Record<AdminSurfaceStateKind, AdminSurfaceStateCopy> = {
  loading: {
    kicker: "وضعیت صفحه",
    title: "در حال دریافت وضعیت معتبر",
    description: "ساختار صفحه حفظ می‌شود تا اطلاعات تازه از مرجع سرور آماده شود.",
  },
  empty: {
    kicker: "وضعیت صفحه",
    title: "موردی برای نمایش وجود ندارد",
    description: "در زمینهٔ فعلی داده یا مقصد قابل نمایش وجود ندارد.",
  },
  error: {
    kicker: "وضعیت صفحه",
    title: "دریافت وضعیت معتبر ممکن نشد",
    description: "اطلاعات قدیمی جایگزین پاسخ معتبر نمی‌شود. می‌توانید خواندن وضعیت را دوباره آغاز کنید.",
  },
  denied: {
    kicker: "وضعیت صفحه",
    title: "این مقصد در زمینهٔ فعلی در دسترس نیست",
    description: "برای حفظ حریم اطلاعات مدیریتی، جزئیات بیشتری دربارهٔ وجود یا محتوای مقصد نمایش داده نمی‌شود.",
  },
  conflict: {
    kicker: "وضعیت صفحه",
    title: "اطلاعات از آخرین مشاهده تغییر کرده است",
    description: "پیش از هر اقدام، نسخهٔ معتبر دوباره خوانده می‌شود؛ بازنویسی خاموش یا تکرار خودکار عملیات انجام نمی‌شود.",
  },
  unavailable: {
    kicker: "نمای کلی",
    title: "داده‌های داشبورد هنوز در دسترس نیست",
    description: "تا زمانی که runtime و مجوز معتبر داشبورد اثبات نشود، هیچ KPI، شمارنده، سلامت سرویس یا اعلان ساختگی نمایش داده نمی‌شود.",
  },
};

export function isAdminSurfaceStateKind(value: string): value is AdminSurfaceStateKind {
  return (ADMIN_SURFACE_STATE_KINDS as readonly string[]).includes(value);
}
