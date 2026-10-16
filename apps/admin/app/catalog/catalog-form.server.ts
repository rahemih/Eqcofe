export type CatalogFormIssue = { field: string; message: string };

export function isTrustedCatalogFormOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(request.url).origin;
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

export function formText(
  form: FormData,
  field: string,
  options: { required?: boolean; max: number },
  issues: CatalogFormIssue[],
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

export function formOptionalText(
  form: FormData,
  field: string,
  max: number,
  issues: CatalogFormIssue[],
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

export function formVersion(
  form: FormData,
  field: string,
  issues: CatalogFormIssue[],
): number | null {
  const raw = form.get(field);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < 1) {
    issues.push({ field, message: "نسخهٔ رکورد معتبر نیست؛ صفحه را دوباره بخوانید." });
    return null;
  }
  return value;
}

export function formPositiveInteger(
  form: FormData,
  field: string,
  issues: CatalogFormIssue[],
): number | null {
  const raw = form.get(field);
  if (raw === null || raw === "") return null;
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value <= 0) {
    issues.push({ field, message: "مقدار باید عدد صحیح مثبت باشد." });
    return null;
  }
  return value;
}

export function formBoolean(form: FormData, field: string): boolean {
  const raw = form.get(field);
  return raw === "on" || raw === "true" || raw === "1";
}

export function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
