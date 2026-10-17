import { useEffect, useRef } from "react";
import { Form, Link, data, useActionData, useLoaderData, useNavigation, useRevalidator } from "react-router";
import {
  ADMIN_MEDIA_ALT_MAX_LENGTH,
  attachAdminProductMedia,
  detachAdminProductMedia,
  moveAdminProductMedia,
  readAdminProductMediaWorkspace,
  type AdminProductMedia,
  type ProductMediaMutationResult,
} from "../catalog/catalog-media.server.js";
import {
  formBoolean,
  formOptionalText,
  formText,
  isTrustedCatalogFormOrigin,
  type CatalogFormIssue,
} from "../catalog/catalog-form.server.js";
import { hasCatalogControlCharacters } from "../catalog/catalog-read.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";

type ActionData =
  | { kind: "success" | "accepted"; message: string; requestId: string | null; focusMediaId?: string }
  | { kind: "invalid"; issues: readonly CatalogFormIssue[]; requestId: string | null }
  | { kind: "failure"; message: string; requestId: string | null; needsRevalidation?: boolean; focusMediaId?: string };

export async function loader({ request, params }: { request: Request; params: { productId?: string } }) {
  const productId = boundedId(params.productId ?? null);
  if (!productId) return data({ kind: "not_found" as const, requestId: null }, { status: 404 });

  const result = await readAdminProductMediaWorkspace(request, productId);
  const headers = cookieHeaders(result.setCookies);
  if (result.kind !== "ready") {
    return data(
      { kind: result.kind, requestId: result.requestId },
      { status: result.kind === "denied" ? 403 : result.kind === "not_found" ? 404 : 503, headers },
    );
  }
  return data({
    kind: "ready" as const,
    product: result.product,
    variants: result.variants,
    media: result.media,
    requestId: result.requestId,
  }, { headers });
}

export async function action({ request, params }: { request: Request; params: { productId?: string } }) {
  if (request.method !== "POST" || !isTrustedCatalogFormOrigin(request)) {
    return data<ActionData>({ kind: "failure", message: "درخواست مدیریت رسانهٔ کالا معتبر نیست.", requestId: null }, { status: 403 });
  }
  const productId = boundedId(params.productId ?? null);
  if (!productId) return data<ActionData>({ kind: "failure", message: "شناسه کالا معتبر نیست.", requestId: null }, { status: 404 });

  const form = await request.formData();
  const issues: CatalogFormIssue[] = [];
  const intent = formText(form, "intent", { required: true, max: 40 }, issues);
  const mediaId = formText(form, "media_id", { required: true, max: 80 }, issues);
  if (!mediaId || !boundedId(mediaId)) issues.push({ field: "media_id", message: "شناسه رسانه معتبر نیست." });
  if (issues.length || !intent || !mediaId) return invalid(issues);

  let result: ProductMediaMutationResult;
  let successMessage: string;

  if (intent === "attach") {
    const variantId = formOptionalText(form, "variant_id", 80, issues);
    if (variantId && !boundedId(variantId)) issues.push({ field: "variant_id", message: "شناسه گونه معتبر نیست." });
    const altTextFa = formOptionalText(form, "alt_text_fa", ADMIN_MEDIA_ALT_MAX_LENGTH, issues);
    const primary = formBoolean(form, "is_primary");
    if (issues.length) return invalid(issues);
    result = await attachAdminProductMedia(request, productId, {
      mediaId,
      variantId,
      altTextFa,
      primary,
    });
    successMessage = "اتصال رسانه به کالا ثبت شد و فهرست canonical دوباره خوانده شد.";
  } else if (intent === "detach") {
    if (form.get("confirm_detach") !== "yes") {
      return invalid([{ field: "confirm_detach", message: "برای برداشتن اتصال، تأیید صریح لازم است." }]);
    }
    result = await detachAdminProductMedia(request, productId, mediaId);
    successMessage = "فقط اتصال رسانه از کالا برداشته شد؛ asset رسانه حذف نشده است.";
  } else if (intent === "move-up" || intent === "move-down" || intent === "make-primary" || intent === "clear-primary") {
    const command =
      intent === "move-up" ? "up" :
      intent === "move-down" ? "down" :
      intent === "make-primary" ? "make-primary" : "clear-primary";
    result = await moveAdminProductMedia(request, productId, mediaId, command);
    successMessage =
      command === "up" || command === "down"
        ? "ترتیب رسانه با وضعیت تازهٔ سرور ثبت و دوباره خوانده شد."
        : "وضعیت رسانهٔ اصلی در canonical state بازخوانی و تأیید شد.";
  } else {
    return data<ActionData>({ kind: "failure", message: "عملیات رسانهٔ کالا شناخته‌شده نیست.", requestId: null }, { status: 400 });
  }

  return mutationResponse(result, successMessage, mediaId);
}

export default function AdminProductMediaRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const busy = useNavigation().state !== "idle";
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionData) return;
    if ("focusMediaId" in actionData && actionData.focusMediaId) {
      document.getElementById("product-media-" + actionData.focusMediaId)?.focus();
      return;
    }
    outcomeRef.current?.focus();
  }, [actionData]);

  if (state.kind !== "ready") {
    const message =
      state.kind === "denied"
        ? "مجوز مشاهده رسانه‌های این کالا توسط سرور تأیید نشد."
        : state.kind === "not_found"
          ? "کالای موردنظر پیدا نشد."
          : "خواندن رسانه‌های کالا فعلاً ممکن نیست.";
    return <section className="catalog-read-page"><div className="auth-alert" role="alert"><p>{message}</p>{state.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{state.requestId}</bdi></p> : null}</div></section>;
  }

  const ordered = [...state.media].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  return (
    <section className="catalog-read-page" aria-labelledby="product-media-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <Link to="/catalog/products">کالاها</Link><span aria-hidden="true">/</span>
        <Link to={"/catalog/products/" + encodeURIComponent(state.product.id)}>{state.product.name_fa}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">رسانه</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">AD-C-04 · 68-F</p>
          <h1 id="product-media-title">رسانه‌های «{state.product.name_fa}»</h1>
          <p>
            اتصال، متن جایگزین، گونهٔ مرتبط، ترتیب و رسانهٔ اصلی از endpointهای canonical مدیریت می‌شوند.
            برداشتن اتصال asset را حذف نمی‌کند.
          </p>
        </div>
        <span className="catalog-read-only-badge">{ordered.length.toLocaleString("fa-IR")} رسانه</span>
      </header>

      {busy ? <div className="catalog-navigation-status" role="status" aria-live="polite">در حال ثبت یا بازخوانی رسانه…</div> : null}
      {actionData ? <Outcome value={actionData} outcomeRef={outcomeRef} /> : null}

      <section className="catalog-read-section" aria-labelledby="attach-media-title">
        <div className="catalog-read-section-heading">
          <div>
            <h2 id="attach-media-title">اتصال رسانه با شناسه</h2>
            <p>رسانه باید قبلاً بارگذاری و فعال شده باشد. نوع رسانه از MIME canonical مشتق می‌شود و از فرم حدس زده نمی‌شود.</p>
          </div>
          <Link to="/catalog/media">بارگذاری یا بررسی رسانه</Link>
        </div>
        <AttachForm
          mediaId=""
          variants={state.variants}
          busy={busy}
          primary={false}
          altTextFa=""
          variantId={null}
          submitLabel="اتصال رسانه"
        />
      </section>

      <section className="catalog-read-section" aria-labelledby="attached-media-title">
        <h2 id="attached-media-title">ترتیب نمایش و اتصال‌های فعلی</h2>
        {ordered.length ? (
          <div className="catalog-media-list">
            {ordered.map((item, index) => (
              <article
                key={item.media_id}
                id={"product-media-" + item.media_id}
                className="catalog-media-card"
                tabIndex={-1}
                aria-labelledby={"media-card-title-" + item.media_id}
              >
                <header>
                  <div>
                    <h3 id={"media-card-title-" + item.media_id}>{mediaTypeLabel(item.media_type)} · جایگاه {(index + 1).toLocaleString("fa-IR")}</h3>
                    <p>{item.is_primary ? "رسانهٔ اصلی" : "رسانهٔ تکمیلی"} · {mediaStatusLabel(item.status)}</p>
                  </div>
                  <bdi>{item.media_id}</bdi>
                </header>

                <dl className="catalog-detail-grid catalog-media-detail-grid">
                  <div><dt>MIME</dt><dd><bdi>{item.mime_type}</bdi></dd></div>
                  <div><dt>گونه</dt><dd>{variantLabel(state.variants, item.variant_id)}</dd></div>
                  <div><dt>متن جایگزین</dt><dd>{item.alt_text_fa || "ثبت نشده"}</dd></div>
                  <div><dt>ترتیب</dt><dd>{item.sort_order.toLocaleString("fa-IR")}</dd></div>
                </dl>

                <div className="catalog-media-order-actions" aria-label={"تغییر ترتیب " + (item.alt_text_fa || item.media_id)}>
                  <MediaOrderButton intent="move-up" mediaId={item.media_id} label="بالاتر" busy={busy} disabled={index === 0} />
                  <MediaOrderButton intent="move-down" mediaId={item.media_id} label="پایین‌تر" busy={busy} disabled={index === ordered.length - 1} />
                  {item.is_primary
                    ? <MediaOrderButton intent="clear-primary" mediaId={item.media_id} label="برداشتن حالت اصلی" busy={busy} />
                    : <MediaOrderButton intent="make-primary" mediaId={item.media_id} label="انتخاب به‌عنوان اصلی" busy={busy} />}
                </div>

                <details className="catalog-media-edit">
                  <summary>ویرایش اتصال و متن جایگزین</summary>
                  <AttachForm
                    mediaId={item.media_id}
                    variants={state.variants}
                    busy={busy}
                    primary={item.is_primary}
                    altTextFa={item.alt_text_fa ?? ""}
                    variantId={item.variant_id ?? null}
                    submitLabel="ذخیره اتصال"
                  />
                </details>

                <Form method="post" className="catalog-editor-form catalog-danger-zone">
                  <input type="hidden" name="intent" value="detach" />
                  <input type="hidden" name="media_id" value={item.media_id} />
                  <fieldset disabled={busy}>
                    <legend>برداشتن اتصال</legend>
                    <label className="catalog-editor-check">
                      <input type="checkbox" name="confirm_detach" value="yes" />
                      <span>فقط اتصال این رسانه از کالا برداشته شود؛ asset رسانه حذف نشود.</span>
                    </label>
                  </fieldset>
                  <div className="catalog-editor-actions"><button type="submit" disabled={busy}>برداشتن اتصال</button></div>
                </Form>
              </article>
            ))}
          </div>
        ) : <p className="catalog-empty-copy">هنوز رسانه‌ای به این کالا متصل نشده است.</p>}
      </section>

      <section className="catalog-authority-note" aria-labelledby="product-media-boundary-title">
        <h2 id="product-media-boundary-title">مرز این مرحله</h2>
        <p>
          مدل GLB در Admin قابل اتصال است اما قرارداد عمومی Product Detail همچنان فقط image/video است.
          ترتیب با دکمه‌های قابل‌صفحه‌کلید انجام می‌شود؛ هیچ drag-only interaction یا endpoint جدید ساخته نشده است.
        </p>
      </section>
    </section>
  );
}

function AttachForm({
  mediaId,
  variants,
  busy,
  primary,
  altTextFa,
  variantId,
  submitLabel,
}: {
  mediaId: string;
  variants: readonly { id: string; sku: string }[];
  busy: boolean;
  primary: boolean;
  altTextFa: string;
  variantId: string | null;
  submitLabel: string;
}) {
  return (
    <Form method="post" className="catalog-editor-form">
      <input type="hidden" name="intent" value="attach" />
      <fieldset disabled={busy}>
        <label>
          <span>شناسه رسانه *</span>
          <input name="media_id" dir="ltr" maxLength={80} defaultValue={mediaId} readOnly={Boolean(mediaId)} required />
        </label>
        <label>
          <span>گونه مرتبط</span>
          <select name="variant_id" defaultValue={variantId ?? ""}>
            <option value="">کل کالا</option>
            {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku}</option>)}
          </select>
          <small>Backend دوباره بررسی می‌کند که گونه متعلق به همین کالا باشد.</small>
        </label>
        <label>
          <span>متن جایگزین فارسی</span>
          <input name="alt_text_fa" maxLength={ADMIN_MEDIA_ALT_MAX_LENGTH} defaultValue={altTextFa} />
        </label>
        <label className="catalog-editor-check">
          <input type="checkbox" name="is_primary" defaultChecked={primary} />
          <span>رسانهٔ اصلی کالا</span>
        </label>
      </fieldset>
      <div className="catalog-editor-actions"><button type="submit" disabled={busy}>{submitLabel}</button></div>
    </Form>
  );
}

function MediaOrderButton({
  intent,
  mediaId,
  label,
  busy,
  disabled = false,
}: {
  intent: "move-up" | "move-down" | "make-primary" | "clear-primary";
  mediaId: string;
  label: string;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="media_id" value={mediaId} />
      <button type="submit" disabled={busy || disabled}>{label}</button>
    </Form>
  );
}

function mutationResponse(result: ProductMediaMutationResult, successMessage: string, focusMediaId: string) {
  const headers = cookieHeaders(result.setCookies);
  if (result.kind === "confirmed" || result.kind === "accepted") {
    return data<ActionData>({
      kind: result.kind === "confirmed" ? "success" : "accepted",
      message: result.kind === "confirmed" ? successMessage : "درخواست پذیرفته شد اما نتیجه نهایی نیست؛ وضعیت canonical پیش از تکرار باید دوباره بررسی شود.",
      requestId: result.requestId,
      focusMediaId,
    }, { status: result.kind === "accepted" ? 202 : 200, headers });
  }
  if (result.kind === "invalid") {
    return data<ActionData>({
      kind: "invalid",
      issues: result.fieldErrors.map((item) => ({ field: item.field, message: item.message || "این مقدار توسط سرور پذیرفته نشد." })),
      requestId: result.requestId,
    }, { status: 422, headers });
  }
  const messages = {
    denied: "مجوز این عملیات توسط سرور تأیید نشد.",
    conflict: "وضعیت رسانه همزمان تغییر کرده است؛ ابتدا صفحه را دوباره بخوانید.",
    not_found: "رسانه، کالا یا گونهٔ انتخاب‌شده در زمینهٔ canonical پیدا نشد.",
    unknown_outcome: "نتیجه mutation قطعی نیست. عملیات را تکرار نکنید؛ ابتدا فهرست رسانه‌های کالا را دوباره بخوانید.",
    unavailable: "سرویس رسانهٔ کالا فعلاً نتیجهٔ معتبر برنگرداند.",
  } as const;
  const status = result.kind === "denied" ? 403 : result.kind === "conflict" ? 409 : result.kind === "not_found" ? 404 : 503;
  return data<ActionData>({
    kind: "failure",
    message: messages[result.kind],
    requestId: result.requestId,
    needsRevalidation: result.kind === "unknown_outcome" || result.kind === "conflict",
    focusMediaId,
  }, { status, headers });
}

function Outcome({ value, outcomeRef }: { value: ActionData; outcomeRef: React.RefObject<HTMLDivElement | null> }) {
  const revalidator = useRevalidator();
  return (
    <div
      ref={outcomeRef}
      className="catalog-action-outcome"
      tabIndex={-1}
      role={value.kind === "success" ? "status" : "alert"}
      aria-live="polite"
    >
      {value.kind === "invalid"
        ? <><p>فرم نیاز به اصلاح دارد.</p><ul>{value.issues.map((issue, index) => <li key={issue.field + index}>{issue.message}</li>)}</ul></>
        : <p>{value.message}</p>}
      {value.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{value.requestId}</bdi></p> : null}
      {value.kind === "failure" && value.needsRevalidation ? (
        <button type="button" className="catalog-primary-action" onClick={() => void revalidator.revalidate()} disabled={revalidator.state !== "idle"}>
          {revalidator.state === "idle" ? "بازخوانی وضعیت canonical" : "در حال بازخوانی…"}
        </button>
      ) : null}
    </div>
  );
}

function boundedId(value: string | null): string | null {
  if (!value || value.length > 80 || hasCatalogControlCharacters(value)) return null;
  return value;
}

function invalid(issues: readonly CatalogFormIssue[]) {
  return data<ActionData>({ kind: "invalid", issues, requestId: null }, { status: 400 });
}

function cookieHeaders(setCookies: readonly string[]) {
  const headers = new Headers();
  appendAdminAuthSetCookies(headers, setCookies);
  return headers;
}

function mediaTypeLabel(type: AdminProductMedia["media_type"]) {
  return type === "image" ? "تصویر" : type === "video" ? "ویدئو" : type === "model_3d" ? "مدل سه‌بعدی" : "سند";
}

function mediaStatusLabel(status: AdminProductMedia["status"]) {
  const labels: Record<AdminProductMedia["status"], string> = {
    uploading: "در حال بارگذاری",
    quarantine: "قرنطینه",
    processing: "در حال پردازش",
    active: "فعال",
    rejected: "ردشده",
    deleted: "حذف‌شده",
  };
  return labels[status];
}

function variantLabel(variants: readonly { id: string; sku: string }[], variantId: string | null | undefined) {
  if (!variantId) return "کل کالا";
  return variants.find((variant) => variant.id === variantId)?.sku ?? "گونهٔ ناشناخته";
}
