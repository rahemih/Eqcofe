import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTrustedCatalogFormOrigin } from "../app/catalog/catalog-form.server.js";

const adminRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(adminRoot, "../..");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

const task = JSON.parse(read("docs/14-multi-agent/tasks/EQCOFE-STEP68-F-MEDIA-ADMINISTRATION-001.json")) as {
  risk: string;
  human_gate_required: boolean;
  canonical: { base_sha: string };
  scope: { write: string[]; forbidden: string[] };
  evidence: {
    design_surfaces: string[];
    media_operations: string[];
    max_upload_bytes: number;
    model_3d: { admin_media_type: string; mime: string; extension: string; public_storefront_exposure: boolean };
  };
};

assert.equal(task.risk, "HIGH", "STEP68_F_RISK");
assert.equal(task.human_gate_required, true, "STEP68_F_HUMAN_GATE");
assert.equal(task.canonical.base_sha, "4fe36171f1a7902bd449efbeef239e1b05cf0e05", "STEP68_F_BASE");
assert.deepEqual(task.evidence.design_surfaces, ["AD-C-04", "AD-C-07"], "STEP68_F_SURFACES");
assert.equal(task.evidence.max_upload_bytes, 50 * 1024 * 1024, "STEP68_F_UPLOAD_BOUND");
assert.equal(task.evidence.model_3d.admin_media_type, "model_3d", "STEP68_F_MODEL_TYPE");
assert.equal(task.evidence.model_3d.mime, "model/gltf-binary", "STEP68_F_MODEL_MIME");
assert.equal(task.evidence.model_3d.extension, ".glb", "STEP68_F_MODEL_EXT");
assert.equal(task.evidence.model_3d.public_storefront_exposure, false, "STEP68_F_STOREFRONT_BOUNDARY");
assert.ok(task.scope.write.includes("apps/admin/**"), "STEP68_F_ADMIN_WRITE");
for (const forbidden of ["apps/storefront/**", "contracts/**", "src/**", "database/**", "docs/12-current-state/**"]) {
  assert.ok(task.scope.forbidden.includes(forbidden), "STEP68_F_FORBIDDEN:" + forbidden);
}

const server = read("apps/admin/app/catalog/catalog-media.server.ts");
const uploadRoute = read("apps/admin/app/routes/catalog-media.tsx");
const productMediaRoute = read("apps/admin/app/routes/catalog-product-media.tsx");
const productRoute = read("apps/admin/app/routes/catalog-product.tsx");
const routes = read("apps/admin/app/routes.ts");
const shell = read("apps/admin/app/shell/AdminShell.tsx");
const css = read("apps/admin/app/styles/shell.css");
const packageJson = JSON.parse(read("apps/admin/package.json")) as { scripts: Record<string, string> };
const acceptance = read("apps/admin/scripts/verify-step67-acceptance.mjs");
const generated = read("src/generated/openapi.ts");
const publicProduct = section(generated, "PublicProductMediaView:", "PublicVariantResponse:");
const adminProductMedia = section(generated, "AdminProductMediaResponse:", "AdminProductMediaListResponse:");
const uploadRequest = section(generated, "PostAdminMediaUploadRequestRequest:", "PostAdminMediaIdCompleteRequest:");

assert.ok(server.includes("createAdminAuthBridge(request)"), "STEP68_F_AUTH_BRIDGE");
for (const endpoint of [
  '"/admin/media/upload-request"',
  '"/admin/media/{id}"',
  '"/admin/media/{id}/complete"',
  '"/admin/media/{id}/approve"',
  '"/admin/media/{id}/reject"',
  '"/admin/products/{product_id}/media"',
  '"/admin/products/{product_id}/media/{media_id}"',
  '"/admin/products/{product_id}/media/reorder"',
]) assert.ok(server.includes(endpoint), "STEP68_F_ENDPOINT:" + endpoint);

assert.ok(server.includes('createHash("sha256")'), "STEP68_F_SHA256");
assert.ok(server.includes("ADMIN_MEDIA_MAX_BYTES = 50 * 1024 * 1024"), "STEP68_F_SERVER_SIZE_BOUND");
assert.ok(server.includes('"model/gltf-binary"'), "STEP68_F_GLB_MIME");
assert.ok(server.includes('endsWith(".glb")'), "STEP68_F_GLB_EXTENSION");
assert.ok(server.includes('purpose === "product_model_3d"'), "STEP68_F_GLB_PURPOSE");
assert.ok(server.includes('redirect: "error"'), "STEP68_F_SIGNED_REDIRECT_GUARD");
assert.ok(server.includes('credentials: "omit"'), "STEP68_F_SIGNED_CREDENTIAL_OMISSION");
assert.ok(server.includes('cache: "no-store"'), "STEP68_F_SIGNED_NO_STORE");
assert.ok(!server.includes("localStorage"), "STEP68_F_NO_LOCAL_STORAGE");
assert.ok(!server.includes("sessionStorage"), "STEP68_F_NO_SESSION_STORAGE");
assert.ok(!uploadRoute.includes("upload.url"), "STEP68_F_SIGNED_URL_NOT_RENDERED");
assert.ok(!uploadRoute.includes("storage_key"), "STEP68_F_STORAGE_KEY_NOT_RENDERED");
assert.ok(uploadRoute.includes('encType="multipart/form-data"'), "STEP68_F_MULTIPART_SERVER_UPLOAD");
assert.ok(uploadRoute.includes('name="file"'), "STEP68_F_FILE_INPUT");
assert.ok(uploadRoute.includes("signed URL"), "STEP68_F_CAPABILITY_DISCLOSURE");

assert.ok(server.includes("assetResult.data.status !== \"active\""), "STEP68_F_ACTIVE_MEDIA_PREFLIGHT");
assert.ok(server.includes('"/admin/products/{product_id}/variants"'), "STEP68_F_VARIANT_PREFLIGHT");
assert.ok(server.includes("preflight.variants.some((variant) => variant.id === input.variantId)"), "STEP68_F_VARIANT_PRODUCT_BINDING");
assert.ok(server.includes('kind: "unknown_outcome"'), "STEP68_F_UNKNOWN_OUTCOME");
assert.ok(server.includes("nextSortOrder(preflight.media)"), "STEP68_F_SERVER_STATE_SORT_ORDER");
assert.ok(server.includes('command === "make-primary"'), "STEP68_F_PRIMARY_COMMAND");
assert.ok(productMediaRoute.includes('name="confirm_detach"'), "STEP68_F_DETACH_CONFIRM");
assert.ok(productMediaRoute.includes("asset رسانه حذف نشود"), "STEP68_F_DETACH_DELETE_SEPARATION");
assert.ok(productMediaRoute.includes("بالاتر"), "STEP68_F_KEYBOARD_MOVE_UP");
assert.ok(productMediaRoute.includes("پایین‌تر"), "STEP68_F_KEYBOARD_MOVE_DOWN");
assert.ok(productMediaRoute.includes("document.getElementById"), "STEP68_F_FOCUS_RESTORE");
assert.ok(productMediaRoute.includes("useRevalidator"), "STEP68_F_REVALIDATOR");

assert.ok(routes.includes('route("catalog/media", "./routes/catalog-media.tsx")'), "STEP68_F_MEDIA_ROUTE");
assert.ok(routes.includes('route("catalog/products/:productId/media", "./routes/catalog-product-media.tsx")'), "STEP68_F_PRODUCT_MEDIA_ROUTE");
assert.ok(shell.includes('if(surface==="AD-C-07")return "/catalog/media"'), "STEP68_F_SHELL_AD_C_07");
assert.ok(shell.includes('return "AD-C-04"'), "STEP68_F_SHELL_AD_C_04_ACTIVE");
assert.ok(shell.includes('return "AD-C-07"'), "STEP68_F_SHELL_AD_C_07_ACTIVE");
assert.ok(productRoute.includes('"/media"'), "STEP68_F_PRODUCT_MEDIA_LINK");
assert.ok(productRoute.includes('to="/catalog/media"'), "STEP68_F_UPLOAD_LINK");

assert.ok(css.includes("Step 68-F — Admin Media"), "STEP68_F_CSS");
assert.ok(css.includes(".catalog-media-list"), "STEP68_F_MEDIA_LIST_STYLE");
assert.ok(css.includes("@media (max-width: 599px)"), "STEP68_F_RESPONSIVE_CSS");
assert.ok(css.includes("min-block-size: var(--eq-size-touch-min)"), "STEP68_F_TOUCH_TARGETS");

assert.ok(uploadRequest.includes('"image/jpeg"'), "STEP68_F_OPENAPI_JPEG");
assert.ok(uploadRequest.includes('"image/png"'), "STEP68_F_OPENAPI_PNG");
assert.ok(uploadRequest.includes('"image/webp"'), "STEP68_F_OPENAPI_WEBP");
assert.ok(uploadRequest.includes('"video/mp4"'), "STEP68_F_OPENAPI_MP4");
assert.ok(uploadRequest.includes('"model/gltf-binary"'), "STEP68_F_OPENAPI_GLB");
assert.ok(adminProductMedia.includes('"model_3d"'), "STEP68_F_ADMIN_MODEL_3D");
assert.ok(publicProduct.includes('media_type: "image" | "video"'), "STEP68_F_PUBLIC_IMAGE_VIDEO_ONLY");
assert.ok(!publicProduct.includes("model_3d"), "STEP68_F_PUBLIC_NO_MODEL_3D");

assert.equal(isTrustedCatalogFormOrigin(new Request("https://admin.eqcofe.test/catalog/media", { headers: { origin: "https://admin.eqcofe.test" } })), true, "STEP68_F_SAME_ORIGIN");
assert.equal(isTrustedCatalogFormOrigin(new Request("https://admin.eqcofe.test/catalog/media", { headers: { origin: "https://evil.example" } })), false, "STEP68_F_CROSS_ORIGIN");
assert.ok(uploadRoute.includes("isTrustedCatalogFormOrigin(request)"), "STEP68_F_MEDIA_ORIGIN");
assert.ok(productMediaRoute.includes("isTrustedCatalogFormOrigin(request)"), "STEP68_F_PRODUCT_MEDIA_ORIGIN");

assert.ok(acceptance.includes("const adminPort=31771;"), "STEP68_F_ADMIN_NON_EPHEMERAL_PORT");
assert.ok(acceptance.includes('api.listen(0,"127.0.0.1",ok)'), "STEP68_F_DYNAMIC_API_PORT");
assert.ok(!acceptance.includes("const apiPort=41772"), "STEP68_F_OLD_COLLISION_PORT_REMOVED");

assert.equal(packageJson.scripts["catalog-media:verify"], "pnpm --dir ../.. exec tsx apps/admin/scripts/verify-step68-f-media.ts", "STEP68_F_VERIFY_SCRIPT");
assert.ok((packageJson.scripts.verify ?? "").includes("catalog-media:verify"), "STEP68_F_VERIFY_CHAIN");

for (const forbidden of [
  '"/admin/sales-control/',
  '"/admin/pricing/',
  '"/admin/inventory/',
]) assert.ok(!server.includes(forbidden), "STEP68_F_NO_LATER_SCOPE:" + forbidden);

console.log("Step 68-F Media administration verification: PASS");

function section(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, "STEP68_F_SECTION_MISSING:" + startMarker);
  return source.slice(start, end);
}
