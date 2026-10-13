export const DEFAULT_LOCALE = "fa-IR" as const;

export const adminMessages = Object.freeze({
  direction: "rtl" as const,
  documentTitle: "مدیریت EQCOFE",
  skipToMain: "پرش به محتوای اصلی",
  brand: "مدیریت EQCOFE",
  foundationStatus: "زیرساخت مدیریت",
  navigationLabel: "ناوبری مدیریت",
  navigationDeferred: "ناوبری مجوزمحور پس از احراز هویت فعال می‌شود.",
});

export function getAdminMessages() { return adminMessages; }
