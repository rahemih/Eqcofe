import { createHash } from "node:crypto";
import type { ApiComponents } from "../platform/api/contract.js";
import { ApiClientError } from "../platform/api/errors.js";
import { createAdminAuthBridge } from "../platform/auth/admin-cookie.server.js";

export type AdminMediaAsset = ApiComponents["schemas"]["AdminMediaAssetResponse"];
export type AdminProductMedia = ApiComponents["schemas"]["AdminProductMediaResponse"];
export type AdminProduct = ApiComponents["schemas"]["AdminProductResponse"];
export type AdminVariant = ApiComponents["schemas"]["AdminVariantResponse"];
type UploadRequestBody = ApiComponents["schemas"]["PostAdminMediaUploadRequestRequest"];
type CompleteRequestBody = ApiComponents["schemas"]["PostAdminMediaIdCompleteRequest"];
type AttachRequestBody = ApiComponents["schemas"]["AttachProductMediaRequest"];
type ReorderRequestBody = ApiComponents["schemas"]["ReorderProductMediaRequest"];
type FieldError = ApiComponents["schemas"]["FieldError"];

export const ADMIN_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const ADMIN_MEDIA_MAX_FILENAME = 255;
export const ADMIN_MEDIA_ALT_MAX_LENGTH = 300;

export type ProductMediaPurpose = "product_image" | "product_video" | "product_model_3d";

export type MediaReadFailure =
  | { kind: "denied"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "not_found"; requestId: string | null; setCookies: readonly string[] }
  | { kind: "unavailable"; requestId: string | null; setCookies: readonly string[] };

export type MediaLookupRead =
  | { kind: "ready"; asset: AdminMediaAsset; requestId: string | null; setCookies: readonly string[] }
  | MediaReadFailure;

export type ProductMediaWorkspaceRead =
  | {
      kind: "ready";
      product: AdminProduct;
      variants: readonly AdminVariant[];
      media: readonly AdminProductMedia[];
      requestId: string | null;
      setCookies: readonly string[];
    }
  | MediaReadFailure;

export type MediaMutationFailure =
  | { kind: "denied" | "conflict" | "not_found" | "unknown_outcome" | "unavailable"; requestId: string | null; setCookies: readonly string[]; mediaId?: string }
  | { kind: "invalid"; requestId: string | null; fieldErrors: readonly FieldError[]; setCookies: readonly string[]; mediaId?: string };

export type MediaAssetMutationResult =
  | { kind: "confirmed"; asset: AdminMediaAsset; requestId: string | null; setCookies: readonly string[] }
  | { kind: "accepted"; asset: AdminMediaAsset; requestId: string | null; setCookies: readonly string[] }
  | MediaMutationFailure;

export type MediaDeleteResult =
  | { kind: "confirmed"; mediaId: string; requestId: string | null; setCookies: readonly string[] }
  | MediaMutationFailure;

export type ProductMediaMutationResult =
  | { kind: "confirmed"; media: readonly AdminProductMedia[]; requestId: string | null; setCookies: readonly string[] }
  | { kind: "accepted"; media: readonly AdminProductMedia[]; requestId: string | null; setCookies: readonly string[] }
  | MediaMutationFailure;

export type MediaUploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

const purposeMime: Record<ProductMediaPurpose, UploadRequestBody["mime_type"]> = {
  product_image: "image/webp",
  product_video: "video/mp4",
  product_model_3d: "model/gltf-binary",
};

const imageMime = new Set<UploadRequestBody["mime_type"]>(["image/jpeg", "image/png", "image/webp"]);

export async function readAdminMedia(
  request: Pick<Request, "headers">,
  mediaId: string,
): Promise<MediaLookupRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("get", "/admin/media/{id}", { pathParams: { id: mediaId } });
    return {
      kind: "ready",
      asset: result.data,
      requestId: result.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function readAdminProductMediaWorkspace(
  request: Pick<Request, "headers">,
  productId: string,
): Promise<ProductMediaWorkspaceRead> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const productResult = await bridge.client.request("get", "/admin/products/{id}", {
      pathParams: { id: productId },
    });
    const variantResult = await bridge.client.request("get", "/admin/products/{product_id}/variants", {
      pathParams: { product_id: productId },
    });
    const mediaResult = await bridge.client.request("get", "/admin/products/{product_id}/media", {
      pathParams: { product_id: productId },
    });
    return {
      kind: "ready",
      product: productResult.data,
      variants: Object.freeze([...variantResult.data]),
      media: Object.freeze([...mediaResult.data]),
      requestId: productResult.requestId ?? variantResult.requestId ?? mediaResult.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyReadFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function uploadAndCompleteAdminMedia(
  request: Pick<Request, "headers">,
  file: MediaUploadFile,
  purpose: ProductMediaPurpose,
): Promise<MediaAssetMutationResult> {
  const validation = validateUpload(file, purpose);
  if (validation) {
    return { kind: "invalid", requestId: null, fieldErrors: Object.freeze([validation]), setCookies: [] };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { kind: "invalid", requestId: null, fieldErrors: Object.freeze([fieldError("file", "MEDIA_FILE_READ_FAILED", "خواندن فایل رسانه ممکن نشد.")]), setCookies: [] };
  }
  if (bytes.byteLength !== file.size || bytes.byteLength > ADMIN_MEDIA_MAX_BYTES) {
    return { kind: "invalid", requestId: null, fieldErrors: Object.freeze([fieldError("file", "MEDIA_SIZE_CHANGED", "اندازه فایل رسانه معتبر نیست.")]), setCookies: [] };
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const mimeType = file.type as UploadRequestBody["mime_type"];
  const body: UploadRequestBody = {
    filename: file.name,
    mime_type: mimeType,
    size_bytes: file.size,
    checksum_sha256: checksum,
    purpose,
  };

  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let createdId: string | null = null;
  let mutationRequestId: string | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const created = await bridge.client.request("post", "/admin/media/upload-request", { body });
    mutationRequestId = created.requestId;

    if (created.status === 202 || !created.data) {
      return {
        kind: "unknown_outcome",
        requestId: created.requestId,
        setCookies: bridge.takeSetCookies(),
      };
    }

    createdId = created.data.id;
    const target = normalizeSignedUploadTarget(created.data.upload);
    if (!target) {
      return {
        kind: "unknown_outcome",
        requestId: created.requestId,
        mediaId: createdId,
        setCookies: bridge.takeSetCookies(),
      };
    }

    const transfer = await putSignedUpload(target.url, mimeType, bytes);
    if (!transfer.ok) {
      return {
        kind: "unknown_outcome",
        requestId: created.requestId,
        mediaId: createdId,
        setCookies: bridge.takeSetCookies(),
      };
    }

    const completeBody: CompleteRequestBody = transfer.etag ? { storage_etag: transfer.etag } : {};
    let completedStatus = 200;
    try {
      const completed = await bridge.client.request("post", "/admin/media/{id}/complete", {
        pathParams: { id: createdId },
        body: completeBody,
      });
      completedStatus = completed.status;
      mutationRequestId = completed.requestId ?? mutationRequestId;
    } catch (error) {
      const reconciled = await tryReadMediaWithBridge(bridge, createdId);
      if (reconciled && reconciled.asset.status !== "uploading") {
        return {
          kind: "confirmed",
          asset: reconciled.asset,
          requestId: requestIdFrom(error) ?? reconciled.requestId ?? mutationRequestId,
          setCookies: bridge.takeSetCookies(),
        };
      }
      return {
        kind: "unknown_outcome",
        requestId: requestIdFrom(error) ?? mutationRequestId,
        mediaId: createdId,
        setCookies: bridge.takeSetCookies(),
      };
    }

    const confirmed = await bridge.client.request("get", "/admin/media/{id}", { pathParams: { id: createdId } });
    return {
      kind: completedStatus === 202 ? "accepted" : "confirmed",
      asset: confirmed.data,
      requestId: mutationRequestId ?? confirmed.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    const classified = classifyMutationFailure(error, setCookies);
    if (createdId && (classified.kind === "unknown_outcome" || classified.kind === "unavailable")) {
      return { ...classified, kind: "unknown_outcome", mediaId: createdId, requestId: classified.requestId ?? mutationRequestId };
    }
    return classified;
  }
}

export async function approveAdminMedia(
  request: Pick<Request, "headers">,
  mediaId: string,
): Promise<MediaAssetMutationResult> {
  return mutateMediaAndRead(request, mediaId, (bridge) =>
    bridge.client.request("post", "/admin/media/{id}/approve", { pathParams: { id: mediaId } }),
  );
}

export async function rejectAdminMedia(
  request: Pick<Request, "headers">,
  mediaId: string,
): Promise<MediaAssetMutationResult> {
  return mutateMediaAndRead(request, mediaId, (bridge) =>
    bridge.client.request("post", "/admin/media/{id}/reject", { pathParams: { id: mediaId } }),
  );
}

export async function deleteAdminMedia(
  request: Pick<Request, "headers">,
  mediaId: string,
): Promise<MediaDeleteResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const result = await bridge.client.request("delete", "/admin/media/{id}", { pathParams: { id: mediaId } });
    return {
      kind: "confirmed",
      mediaId,
      requestId: result.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    return classifyMutationFailure(error, bridge?.takeSetCookies() ?? []);
  }
}

export async function attachAdminProductMedia(
  request: Pick<Request, "headers">,
  productId: string,
  input: { mediaId: string; variantId: string | null; altTextFa: string | null; primary: boolean },
): Promise<ProductMediaMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const preflight = await readProductMediaWithBridge(bridge, productId);
    if (input.variantId && !preflight.variants.some((variant) => variant.id === input.variantId)) {
      return { kind: "not_found", requestId: preflight.requestId, setCookies: bridge.takeSetCookies() };
    }

    const assetResult = await bridge.client.request("get", "/admin/media/{id}", { pathParams: { id: input.mediaId } });
    if (assetResult.data.status !== "active") {
      return {
        kind: "invalid",
        requestId: assetResult.requestId,
        fieldErrors: Object.freeze([fieldError("media_id", "MEDIA_NOT_ACTIVE", "فقط رسانه فعال را می‌توان به کالا متصل کرد.")]),
        setCookies: bridge.takeSetCookies(),
      };
    }

    const mediaType = mediaTypeForMime(assetResult.data.mime_type);
    const existing = preflight.media.find((item) => item.media_id === input.mediaId);
    const sortOrder = existing?.sort_order ?? nextSortOrder(preflight.media);
    const body: AttachRequestBody = {
      media_id: input.mediaId,
      variant_id: input.variantId,
      media_type: mediaType,
      sort_order: sortOrder,
      is_primary: input.primary,
      alt_text_fa: input.altTextFa,
    };

    const result = await bridge.client.request("post", "/admin/products/{product_id}/media", {
      pathParams: { product_id: productId },
      body,
    });
    outcome = { status: result.status, requestId: result.requestId };
    const reread = await bridge.client.request("get", "/admin/products/{product_id}/media", {
      pathParams: { product_id: productId },
    });
    return {
      kind: result.status === 202 ? "accepted" : "confirmed",
      media: Object.freeze([...reread.data]),
      requestId: result.requestId ?? reread.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) return { kind: "unknown_outcome", requestId: outcome.requestId ?? requestIdFrom(error), setCookies };
    return classifyMutationFailure(error, setCookies);
  }
}

export async function detachAdminProductMedia(
  request: Pick<Request, "headers">,
  productId: string,
  mediaId: string,
): Promise<ProductMediaMutationResult> {
  return mutateProductMediaAndRead(request, productId, (bridge) =>
    bridge.client.request("delete", "/admin/products/{product_id}/media/{media_id}", {
      pathParams: { product_id: productId, media_id: mediaId },
    }),
  );
}

export async function moveAdminProductMedia(
  request: Pick<Request, "headers">,
  productId: string,
  mediaId: string,
  command: "up" | "down" | "make-primary" | "clear-primary",
): Promise<ProductMediaMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    const current = await readProductMediaWithBridge(bridge, productId);
    const ordered = [...current.media].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    const index = ordered.findIndex((item) => item.media_id === mediaId);
    if (index < 0) return { kind: "not_found", requestId: current.requestId, setCookies: bridge.takeSetCookies() };

    if (command === "up" && index > 0) {
      const moving = ordered[index];
      const neighbor = ordered[index - 1];
      if (!moving || !neighbor) return { kind: "unavailable", requestId: current.requestId, setCookies: bridge.takeSetCookies() };
      ordered[index - 1] = moving;
      ordered[index] = neighbor;
    }
    if (command === "down" && index < ordered.length - 1) {
      const moving = ordered[index];
      const neighbor = ordered[index + 1];
      if (!moving || !neighbor) return { kind: "unavailable", requestId: current.requestId, setCookies: bridge.takeSetCookies() };
      ordered[index + 1] = moving;
      ordered[index] = neighbor;
    }

    const body: ReorderRequestBody = {
      items: ordered.map((item, position) => ({
        media_id: item.media_id,
        sort_order: position,
        is_primary:
          command === "make-primary" ? item.media_id === mediaId :
          command === "clear-primary" && item.media_id === mediaId ? false :
          item.is_primary,
      })),
    };
    if (command === "make-primary") {
      for (const item of body.items) item.is_primary = item.media_id === mediaId;
    }

    const result = await bridge.client.request("post", "/admin/products/{product_id}/media/reorder", {
      pathParams: { product_id: productId },
      body,
    });
    outcome = { status: result.status, requestId: result.requestId };
    const reread = await bridge.client.request("get", "/admin/products/{product_id}/media", {
      pathParams: { product_id: productId },
    });
    return {
      kind: result.status === 202 ? "accepted" : "confirmed",
      media: Object.freeze([...reread.data]),
      requestId: result.requestId ?? reread.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) return { kind: "unknown_outcome", requestId: outcome.requestId ?? requestIdFrom(error), setCookies };
    return classifyMutationFailure(error, setCookies);
  }
}

async function mutateMediaAndRead(
  request: Pick<Request, "headers">,
  mediaId: string,
  mutation: (bridge: ReturnType<typeof createAdminAuthBridge>) => Promise<{ status: number; requestId: string | null }>,
): Promise<MediaAssetMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    outcome = await mutation(bridge);
    const confirmed = await bridge.client.request("get", "/admin/media/{id}", { pathParams: { id: mediaId } });
    return {
      kind: outcome.status === 202 ? "accepted" : "confirmed",
      asset: confirmed.data,
      requestId: outcome.requestId ?? confirmed.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) return { kind: "unknown_outcome", requestId: outcome.requestId ?? requestIdFrom(error), mediaId, setCookies };
    return classifyMutationFailure(error, setCookies);
  }
}

async function mutateProductMediaAndRead(
  request: Pick<Request, "headers">,
  productId: string,
  mutation: (bridge: ReturnType<typeof createAdminAuthBridge>) => Promise<{ status: number; requestId: string | null }>,
): Promise<ProductMediaMutationResult> {
  let bridge: ReturnType<typeof createAdminAuthBridge> | null = null;
  let outcome: { status: number; requestId: string | null } | null = null;
  try {
    bridge = createAdminAuthBridge(request);
    outcome = await mutation(bridge);
    const reread = await bridge.client.request("get", "/admin/products/{product_id}/media", {
      pathParams: { product_id: productId },
    });
    return {
      kind: outcome.status === 202 ? "accepted" : "confirmed",
      media: Object.freeze([...reread.data]),
      requestId: outcome.requestId ?? reread.requestId,
      setCookies: bridge.takeSetCookies(),
    };
  } catch (error) {
    const setCookies = bridge?.takeSetCookies() ?? [];
    if (outcome) return { kind: "unknown_outcome", requestId: outcome.requestId ?? requestIdFrom(error), setCookies };
    return classifyMutationFailure(error, setCookies);
  }
}

async function readProductMediaWithBridge(
  bridge: ReturnType<typeof createAdminAuthBridge>,
  productId: string,
): Promise<{ product: AdminProduct; variants: readonly AdminVariant[]; media: readonly AdminProductMedia[]; requestId: string | null }> {
  const product = await bridge.client.request("get", "/admin/products/{id}", { pathParams: { id: productId } });
  const variants = await bridge.client.request("get", "/admin/products/{product_id}/variants", { pathParams: { product_id: productId } });
  const media = await bridge.client.request("get", "/admin/products/{product_id}/media", { pathParams: { product_id: productId } });
  return {
    product: product.data,
    variants: Object.freeze([...variants.data]),
    media: Object.freeze([...media.data]),
    requestId: product.requestId ?? variants.requestId ?? media.requestId,
  };
}

async function tryReadMediaWithBridge(
  bridge: ReturnType<typeof createAdminAuthBridge>,
  mediaId: string,
): Promise<{ asset: AdminMediaAsset; requestId: string | null } | null> {
  try {
    const result = await bridge.client.request("get", "/admin/media/{id}", { pathParams: { id: mediaId } });
    return { asset: result.data, requestId: result.requestId };
  } catch {
    return null;
  }
}

function validateUpload(file: MediaUploadFile, purpose: ProductMediaPurpose): FieldError | null {
  if (!file.name || file.name.length > ADMIN_MEDIA_MAX_FILENAME || hasControlCharacters(file.name)) {
    return fieldError("file", "MEDIA_FILENAME_INVALID", "نام فایل رسانه معتبر نیست.");
  }
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > ADMIN_MEDIA_MAX_BYTES) {
    return fieldError("file", "MEDIA_SIZE_INVALID", "حجم فایل باید بیشتر از صفر و حداکثر ۵۰ مگابایت باشد.");
  }
  const expected = purposeMime[purpose];
  if (purpose === "product_image") {
    if (!imageMime.has(file.type as UploadRequestBody["mime_type"])) {
      return fieldError("file", "MEDIA_MIME_INVALID", "برای تصویر کالا فقط JPEG، PNG یا WebP مجاز است.");
    }
  } else if (file.type !== expected) {
    return fieldError("file", "MEDIA_MIME_INVALID", purpose === "product_video" ? "برای ویدئوی کالا فقط MP4 مجاز است." : "برای مدل سه‌بعدی فقط GLB مجاز است.");
  }
  if (purpose === "product_model_3d" && !file.name.toLowerCase().endsWith(".glb")) {
    return fieldError("file", "MEDIA_GLB_EXTENSION_REQUIRED", "فایل مدل سه‌بعدی باید پسوند GLB داشته باشد.");
  }
  return null;
}

function normalizeSignedUploadTarget(target: ApiComponents["schemas"]["AdminMediaUploadTarget"]): { url: string } | null {
  if (target.method !== "PUT") return null;
  let url: URL;
  try {
    url = new URL(target.url);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
  const expires = Date.parse(target.expires_at);
  if (!Number.isFinite(expires) || expires <= Date.now()) return null;
  return { url: url.toString() };
}

async function putSignedUpload(
  url: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<{ ok: true; etag: string | null } | { ok: false }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: payload,
      signal: controller.signal,
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) {
      try { await response.arrayBuffer(); } catch { /* ignore drain failures */ }
      return { ok: false };
    }
    return { ok: true, etag: response.headers.get("etag") };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

function mediaTypeForMime(mimeType: string): AttachRequestBody["media_type"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "model/gltf-binary") return "model_3d";
  return "document";
}

function nextSortOrder(media: readonly AdminProductMedia[]): number {
  if (!media.length) return 0;
  return Math.max(...media.map((item) => Number(item.sort_order) || 0)) + 1;
}

function classifyReadFailure(error: unknown, setCookies: readonly string[]): MediaReadFailure {
  if (error instanceof ApiClientError && error.kind === "http") {
    if (error.status === 401 || error.status === 403) return { kind: "denied", requestId: error.requestId, setCookies };
    if (error.status === 404) return { kind: "not_found", requestId: error.requestId, setCookies };
  }
  return { kind: "unavailable", requestId: requestIdFrom(error), setCookies };
}

function classifyMutationFailure(error: unknown, setCookies: readonly string[]): MediaMutationFailure {
  if (!(error instanceof ApiClientError)) return { kind: "unknown_outcome", requestId: null, setCookies };
  if (error.kind === "network" || error.kind === "timeout" || error.kind === "aborted") {
    return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
  }
  if (error.kind === "http") {
    if (error.status === 401 || error.status === 403) return { kind: "denied", requestId: error.requestId, setCookies };
    if (error.status === 404) return { kind: "not_found", requestId: error.requestId, setCookies };
    if (error.status === 409) return { kind: "conflict", requestId: error.requestId, setCookies };
    if (error.status === 400 || error.status === 422) {
      return { kind: "invalid", requestId: error.requestId, fieldErrors: Object.freeze([...error.fieldErrors]), setCookies };
    }
    if (error.status === 408 || (typeof error.status === "number" && error.status >= 500)) {
      return { kind: "unknown_outcome", requestId: error.requestId, setCookies };
    }
  }
  return { kind: "unavailable", requestId: error.requestId, setCookies };
}

function requestIdFrom(error: unknown): string | null {
  return error instanceof ApiClientError ? error.requestId : null;
}

function fieldError(field: string, code: string, message: string): FieldError {
  return { field, code, message };
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
