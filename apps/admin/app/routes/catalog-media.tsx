import { useEffect, useRef } from "react";
import { Form, Link, data, useActionData, useLoaderData, useNavigation, useRevalidator } from "react-router";
import {
  ADMIN_MEDIA_MAX_BYTES,
  approveAdminMedia,
  deleteAdminMedia,
  readAdminMedia,
  rejectAdminMedia,
  uploadAndCompleteAdminMedia,
  type MediaAssetMutationResult,
  type MediaDeleteResult,
  type ProductMediaPurpose,
} from "../catalog/catalog-media.server.js";
import {
  formText,
  isTrustedCatalogFormOrigin,
  type CatalogFormIssue,
} from "../catalog/catalog-form.server.js";
import { hasCatalogControlCharacters } from "../catalog/catalog-read.server.js";
import { appendAdminAuthSetCookies } from "../platform/auth/admin-cookie.server.js";

type ActionData =
  | { kind: "success" | "accepted"; message: string; requestId: string | null; mediaId?: string; mediaStatus?: string }
  | { kind: "invalid"; issues: readonly CatalogFormIssue[]; requestId: string | null }
  | { kind: "failure"; message: string; requestId: string | null; mediaId?: string; needsLookup?: boolean };

export async function loader({ request }: { request: Request }) {
  const mediaId = boundedId(new URL(request.url).searchParams.get("media"));
  if (!mediaId) return data({ kind: "empty" as const, requestId: null, asset: null });

  const result = await readAdminMedia(request, mediaId);
  const headers = cookieHeaders(result.setCookies);
  if (result.kind !== "ready") {
    return data(
      { kind: result.kind, requestId: result.requestId, asset: null },
      { status: result.kind === "denied" ? 403 : result.kind === "not_found" ? 404 : 503, headers },
    );
  }
  return data({ kind: "ready" as const, requestId: result.requestId, asset: result.asset }, { headers });
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST" || !isTrustedCatalogFormOrigin(request)) {
    return data<ActionData>({ kind: "failure", message: "درخواست مدیریت رسانه معتبر نیست.", requestId: null }, { status: 403 });
  }

  const form = await request.formData();
  const issues: CatalogFormIssue[] = [];
  const intent = formText(form, "intent", { required: true, max: 40 }, issues);
  if (issues.length || !intent) return invalid(issues);

  if (intent === "upload") {
    const purposeRaw = formText(form, "purpose", { required: true, max: 40 }, issues);
    const purpose = parseProductPurpose(purposeRaw);
    if (!purpose) issues.push({ field: "purpose", message: "کاربرد رسانه معتبر نیست." });

    const rawFile = form.get("file");
    if (!(rawFile instanceof File) || !rawFile.name || rawFile.size <= 0) {
      issues.push({ field: "file", message: "فایل رسانه انتخاب نشده است." });
    }
    if (rawFile instanceof File && rawFile.size > ADMIN_MEDIA_MAX_BYTES) {
      issues.push({ field: "file", message: "حجم فایل بیشتر از ۵۰ مگابایت است." });
    }
    if (issues.length || !(rawFile instanceof File) || !purpose) return invalid(issues);

    const result = await uploadAndCompleteAdminMedia(request, rawFile, purpose);
    return mediaMutationResponse(result, "انتقال فایل و ثبت پایان بارگذاری انجام شد؛ وضعیت رسانه از سرور دوباره خوانده شد.");
  }

  const mediaId = formText(form, "media_id", { required: true, max: 80 }, issues);
  if (!mediaId || !boundedId(mediaId)) issues.push({ field: "media_id", message: "شناسه رسانه معتبر نیست." });
  if (issues.length || !mediaId) return invalid(issues);

  if (intent === "approve") {
    return mediaMutationResponse(await approveAdminMedia(request, mediaId), "رسانه توسط Backend فعال شد.");
  }
  if (intent === "reject") {
    return mediaMutationResponse(await rejectAdminMedia(request, mediaId), "رسانه رد شد و وضعیت canonical دوباره خوانده شد.");
  }
  if (intent === "delete") {
    if (form.get("confirm_delete") !== "yes") {
      return invalid([{ field: "confirm_delete", message: "برای حذف asset باید تأیید صریح انجام شود." }]);
    }
    return deleteMutationResponse(await deleteAdminMedia(request, mediaId));
  }

  return data<ActionData>({ kind: "failure", message: "عملیات رسانه شناخته‌شده نیست.", requestId: null }, { status: 400 });
}

export default function AdminMediaRoute() {
  const state = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const busy = useNavigation().state !== "idle";

  return (
    <section className="catalog-read-page" aria-labelledby="admin-media-title">
      <nav className="admin-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">مدیریت</Link><span aria-hidden="true">/</span>
        <Link to="/catalog/products">کالاها</Link><span aria-hidden="true">/</span>
        <span aria-current="page">رسانه</span>
      </nav>

      <header className="catalog-read-heading">
        <div>
          <p className="destination-kicker">AD-C-07 · 68-F</p>
          <h1 id="admin-media-title">درخواست، انتقال و بررسی رسانه</h1>
          <p>
            این صفحه media library نمی‌سازد. رسانه فقط با شناسهٔ دقیق خوانده می‌شود و signed URL انتقال
            در سرور Admin مصرف می‌شود؛ URL امضاشده در صفحه یا storage مرورگر نمایش و نگهداری نمی‌شود.
          </p>
        </div>
        <span className="catalog-read-only-badge">چرخهٔ کنترل‌شده</span>
      </header>

      {busy ? <div className="catalog-navigation-status" role="status" aria-live="polite">در حال انجام عملیات رسانه…</div> : null}
      {actionData ? <Outcome value={actionData} /> : null}

      <section className="catalog-read-section" aria-labelledby="media-upload-title">
        <h2 id="media-upload-title">بارگذاری رسانهٔ جدید</h2>
        <p className="catalog-authority-footnote">
          JPEG/PNG/WebP برای تصویر، MP4 برای ویدئو و GLB برای مدل سه‌بعدی مجاز است؛ سقف هر فایل ۵۰ مگابایت است.
          Complete پس از انتقال واقعی فایل انجام می‌شود و تأیید نهایی رسانه مرحله‌ای جداگانه است.
        </p>
        <Form method="post" encType="multipart/form-data" className="catalog-editor-form">
          <input type="hidden" name="intent" value="upload" />
          <fieldset disabled={busy}>
            <label>
              <span>کاربرد رسانه *</span>
              <select name="purpose" defaultValue="product_image" required>
                <option value="product_image">تصویر کالا</option>
                <option value="product_video">ویدئوی کالا (MP4)</option>
                <option value="product_model_3d">مدل سه‌بعدی کالا (GLB)</option>
              </select>
            </label>
            <label>
              <span>فایل *</span>
              <input
                name="file"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,video/mp4,model/gltf-binary,.glb"
              />
              <small>SHA-256 در سرور Admin محاسبه می‌شود و signed upload target به UI برگردانده نمی‌شود.</small>
            </label>
          </fieldset>
          <div className="catalog-editor-actions">
            <button type="submit" disabled={busy}>{busy ? "در حال انتقال…" : "درخواست و انتقال فایل"}</button>
          </div>
        </Form>
      </section>

      <section className="catalog-read-section" aria-labelledby="media-lookup-title">
        <h2 id="media-lookup-title">خواندن رسانه با شناسه</h2>
        <Form method="get" className="catalog-editor-form">
          <fieldset>
            <label>
              <span>شناسه رسانه</span>
              <input name="media" dir="ltr" maxLength={80} defaultValue={state.asset?.id ?? ""} required />
            </label>
          </fieldset>
          <div className="catalog-editor-actions"><button type="submit">خواندن وضعیت canonical</button></div>
        </Form>
      </section>

      {state.kind === "ready" && state.asset ? <MediaDetail asset={state.asset} busy={busy} /> : null}
      {state.kind === "denied" || state.kind === "not_found" || state.kind === "unavailable"
        ? <ReadFailure kind={state.kind} requestId={state.requestId} />
        : null}

      <section className="catalog-authority-note" aria-labelledby="media-boundary-title">
        <h2 id="media-boundary-title">مرز اختیار</h2>
        <p>
          هیچ فهرست سراسری رسانه، گواهی اسکن بدافزار، replay خودکار mutation یا نمایش URL امضاشده ساخته نمی‌شود.
          حذف asset با detach از کالا متفاوت است و Backend حذف رسانهٔ در حال استفاده را رد می‌کند.
        </p>
      </section>
    </section>
  );
}

function MediaDetail({ asset, busy }: { asset: NonNullable<Extract<Awaited<ReturnType<typeof loader>>, Response> extends never ? never : any>; busy: boolean }) {
  const canReview = asset.status === "processing" || asset.status === "quarantine";
  const canReject = asset.status === "uploading" || asset.status === "processing" || asset.status === "quarantine";
  const deleted = asset.status === "deleted";

  return (
    <section className="catalog-read-section" aria-labelledby="media-detail-title">
      <h2 id="media-detail-title">وضعیت رسانه</h2>
      <dl className="catalog-detail-grid">
        <div><dt>شناسه</dt><dd><bdi>{asset.id}</bdi></dd></div>
        <div><dt>وضعیت</dt><dd>{mediaStatusLabel(asset.status)}</dd></div>
        <div><dt>نام فایل</dt><dd>{asset.original_filename}</dd></div>
        <div><dt>MIME</dt><dd><bdi>{asset.mime_type}</bdi></dd></div>
        <div><dt>حجم</dt><dd>{formatBytes(asset.size_bytes)}</dd></div>
        <div><dt>نسخه</dt><dd><bdi>{String(asset.version)}</bdi></dd></div>
        {asset.width ? <div><dt>عرض</dt><dd>{asset.width}</dd></div> : null}
        {asset.height ? <div><dt>ارتفاع</dt><dd>{asset.height}</dd></div> : null}
      </dl>

      <div className="catalog-editor-actions">
        {canReview ? <MediaCommand intent="approve" mediaId={asset.id} label="تأیید و فعال‌سازی" busy={busy} /> : null}
        {canReject ? <MediaCommand intent="reject" mediaId={asset.id} label="رد رسانه" busy={busy} /> : null}
      </div>

      {!deleted ? (
        <Form method="post" className="catalog-editor-form catalog-danger-zone">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="media_id" value={asset.id} />
          <fieldset disabled={busy}>
            <legend>حذف asset</legend>
            <p>این عملیات با برداشتن اتصال از کالا فرق دارد. اگر رسانه به کالایی متصل باشد Backend حذف را رد می‌کند.</p>
            <label className="catalog-editor-check">
              <input type="checkbox" name="confirm_delete" value="yes" />
              <span>شناسه و اثر حذف را بررسی کردم و حذف خود asset را می‌خواهم.</span>
            </label>
          </fieldset>
          <div className="catalog-editor-actions"><button type="submit" disabled={busy}>حذف asset</button></div>
        </Form>
      ) : null}
    </section>
  );
}

function MediaCommand({ intent, mediaId, label, busy }: { intent: "approve" | "reject"; mediaId: string; label: string; busy: boolean }) {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="media_id" value={mediaId} />
      <button type="submit" disabled={busy}>{label}</button>
    </Form>
  );
}

function mediaMutationResponse(result: MediaAssetMutationResult, successMessage: string) {
  const headers = cookieHeaders(result.setCookies);
  if (result.kind === "confirmed" || result.kind === "accepted") {
    return data<ActionData>({
      kind: result.kind === "confirmed" ? "success" : "accepted",
      message: result.kind === "confirmed" ? successMessage : "درخواست پذیرفته شد اما نتیجه نهایی محسوب نمی‌شود؛ وضعیت canonical را پیش از تکرار بررسی کنید.",
      requestId: result.requestId,
      mediaId: result.asset.id,
      mediaStatus: result.asset.status,
    }, { status: result.kind === "accepted" ? 202 : 200, headers });
  }
  return mutationFailure(result, headers);
}

function deleteMutationResponse(result: MediaDeleteResult) {
  const headers = cookieHeaders(result.setCookies);
  if (result.kind === "confirmed") {
    return data<ActionData>({
      kind: "success",
      message: "Backend حذف asset را تأیید کرد. این عملیات اتصال‌های محصول را به‌صورت پنهانی حذف نمی‌کند.",
      requestId: result.requestId,
      mediaId: result.mediaId,
    }, { headers });
  }
  return mutationFailure(result, headers);
}

function mutationFailure(result: Exclude<MediaAssetMutationResult | MediaDeleteResult, { kind: "confirmed" | "accepted" }>, headers: Headers) {
  if (result.kind === "invalid") {
    return data<ActionData>({
      kind: "invalid",
      issues: result.fieldErrors.map((item) => ({ field: item.field, message: item.message || "این مقدار توسط سرور پذیرفته نشد." })),
      requestId: result.requestId,
    }, { status: 422, headers });
  }
  const messages = {
    denied: "مجوز این عملیات توسط سرور تأیید نشد.",
    conflict: "وضعیت رسانه همزمان تغییر کرده است؛ ابتدا وضعیت canonical را دوباره بخوانید.",
    not_found: "رسانه موردنظر پیدا نشد.",
    unknown_outcome: "نتیجه عملیات قطعی نیست. عملیات را تکرار نکنید؛ ابتدا رسانه را با شناسه دوباره بخوانید.",
    unavailable: "سرویس رسانه فعلاً نتیجهٔ معتبر برنگرداند.",
  } as const;
  const status = result.kind === "denied" ? 403 : result.kind === "conflict" ? 409 : result.kind === "not_found" ? 404 : 503;
  return data<ActionData>({
    kind: "failure",
    message: messages[result.kind],
    requestId: result.requestId,
    mediaId: result.mediaId,
    needsLookup: result.kind === "unknown_outcome",
  }, { status, headers });
}

function Outcome({ value }: { value: ActionData }) {
  const ref = useRef<HTMLDivElement>(null);
  const revalidator = useRevalidator();
  useEffect(() => { ref.current?.focus(); }, [value]);
  return (
    <div ref={ref} tabIndex={-1} className="catalog-action-outcome" role={value.kind === "success" ? "status" : "alert"}>
      {value.kind === "invalid"
        ? <><p>فرم نیاز به اصلاح دارد.</p><ul>{value.issues.map((issue, index) => <li key={issue.field + index}>{issue.message}</li>)}</ul></>
        : <p>{value.message}</p>}
      {"requestId" in value && value.requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{value.requestId}</bdi></p> : null}
      {"mediaId" in value && value.mediaId ? (
        <p><Link to={"/catalog/media?media=" + encodeURIComponent(value.mediaId)}>خواندن رسانه <bdi>{value.mediaId}</bdi></Link></p>
      ) : null}
      {value.kind === "failure" && value.needsLookup ? (
        <button type="button" className="catalog-primary-action" onClick={() => void revalidator.revalidate()} disabled={revalidator.state !== "idle"}>
          {revalidator.state === "idle" ? "بازخوانی صفحه" : "در حال بازخوانی…"}
        </button>
      ) : null}
    </div>
  );
}

function ReadFailure({ kind, requestId }: { kind: "denied" | "not_found" | "unavailable"; requestId: string | null }) {
  const message = kind === "denied"
    ? "مجوز مشاهده این رسانه توسط سرور تأیید نشد."
    : kind === "not_found"
      ? "رسانه‌ای با این شناسه پیدا نشد."
      : "خواندن وضعیت رسانه فعلاً ممکن نیست.";
  return <div className="auth-alert" role="alert"><p>{message}</p>{requestId ? <p className="auth-request-id">شناسه پیگیری: <bdi>{requestId}</bdi></p> : null}</div>;
}

function parseProductPurpose(value: string | null): ProductMediaPurpose | null {
  return value === "product_image" || value === "product_video" || value === "product_model_3d" ? value : null;
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

function mediaStatusLabel(status: string) {
  const labels: Record<string, string> = {
    uploading: "در حال بارگذاری",
    quarantine: "قرنطینه",
    processing: "در حال پردازش",
    active: "فعال",
    rejected: "ردشده",
    deleted: "حذف‌شده",
  };
  return labels[status] ?? status;
}

function formatBytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
  return (value / (1024 * 1024)).toFixed(1) + " MB";
}
