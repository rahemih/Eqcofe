export type PricingFormIssue = { field: string; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_OFFSET_RE = /(Z|[+-]\d{2}:\d{2})$/;

export function isTrustedPricingFormOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(request.url).origin;
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

export function pricingText(
  form: FormData,
  field: string,
  options: { required?: boolean; max: number },
  issues: PricingFormIssue[],
): string | null {
  const raw = form.get(field);
  if (typeof raw !== "string") {
    if (options.required) issues.push({ field, message: "این فیلد الزامی است." });
    return null;
  }
  const value = raw.trim();
  if (!value) {
    if (options.required) issues.push({ field, message: "این فیلد الزامی است." });
    return null;
  }
  if (value.length > options.max || hasControlCharacters(value)) {
    issues.push({ field, message: "مقدار واردشده معتبر نیست." });
    return null;
  }
  return value;
}

export function pricingOptionalText(
  form: FormData,
  field: string,
  max: number,
  issues: PricingFormIssue[],
): string | null {
  const raw = form.get(field);
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    issues.push({ field, message: "مقدار واردشده معتبر نیست." });
    return null;
  }
  const value = raw.trim();
  if (!value) return null;
  if (value.length > max || hasControlCharacters(value)) {
    issues.push({ field, message: "مقدار واردشده معتبر نیست." });
    return null;
  }
  return value;
}

export function pricingUuid(
  form: FormData,
  field: string,
  issues: PricingFormIssue[],
): string | null {
  const value = pricingText(form, field, { required: true, max: 80 }, issues);
  if (!value) return null;
  if (!UUID_RE.test(value)) {
    issues.push({ field, message: "شناسه باید UUID معتبر باشد." });
    return null;
  }
  return value;
}

export function pricingVersion(
  form: FormData,
  field: string,
  issues: PricingFormIssue[],
): number | null {
  const raw = form.get(field);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(value) || value < 1) {
    issues.push({ field, message: "نسخهٔ رکورد معتبر نیست؛ وضعیت را دوباره بخوانید." });
    return null;
  }
  return value;
}

export function pricingInteger(
  form: FormData,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {},
  issues: PricingFormIssue[],
): number | null {
  const raw = form.get(field);
  if (raw === null || raw === "") {
    if (options.required) issues.push({ field, message: "این فیلد الزامی است." });
    return null;
  }
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (
    !Number.isSafeInteger(value) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    issues.push({ field, message: "عدد واردشده خارج از محدودهٔ معتبر است." });
    return null;
  }
  return value;
}

export function pricingNumber(
  form: FormData,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {},
  issues: PricingFormIssue[],
): number | null {
  const raw = form.get(field);
  if (raw === null || raw === "") {
    if (options.required) issues.push({ field, message: "این فیلد الزامی است." });
    return null;
  }
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (
    !Number.isFinite(value) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    issues.push({ field, message: "عدد واردشده خارج از محدودهٔ معتبر است." });
    return null;
  }
  return value;
}

export function pricingEnum<const T extends readonly string[]>(
  form: FormData,
  field: string,
  allowed: T,
  issues: PricingFormIssue[],
): T[number] | null {
  const raw = form.get(field);
  if (typeof raw !== "string" || !(allowed as readonly string[]).includes(raw)) {
    issues.push({ field, message: "گزینهٔ انتخاب‌شده معتبر نیست." });
    return null;
  }
  return raw as T[number];
}

export function pricingOptionalEnum<const T extends readonly string[]>(
  form: FormData,
  field: string,
  allowed: T,
  issues: PricingFormIssue[],
): T[number] | null {
  const raw = form.get(field);
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || !(allowed as readonly string[]).includes(raw)) {
    issues.push({ field, message: "گزینهٔ انتخاب‌شده معتبر نیست." });
    return null;
  }
  return raw as T[number];
}

export function pricingTimestamp(
  form: FormData,
  field: string,
  options: { required?: boolean } = {},
  issues: PricingFormIssue[],
): string | null {
  const value = pricingOptionalText(form, field, 80, issues);
  if (!value) {
    if (options.required) issues.push({ field, message: "زمان معتبر با منطقهٔ زمانی الزامی است." });
    return null;
  }
  if (!ISO_OFFSET_RE.test(value) || Number.isNaN(Date.parse(value))) {
    issues.push({ field, message: "زمان باید ISO 8601 و شامل Z یا offset منطقهٔ زمانی باشد." });
    return null;
  }
  return new Date(value).toISOString();
}

export function validatePricingInterval(
  startsAt: string | null,
  endsAt: string | null,
  issues: PricingFormIssue[],
): void {
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    issues.push({ field: "ends_at", message: "زمان پایان باید بعد از زمان شروع باشد." });
  }
}

export function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
