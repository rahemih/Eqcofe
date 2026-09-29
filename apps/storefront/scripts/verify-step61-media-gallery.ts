import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCT_MEDIA_CAPABILITIES,
  resolveMediaDeliveryUrl,
  resolveProductMedia,
  type ResolvedProductMedia,
} from "../app/features/product-detail/product-detail-media.server.js";
import { selectVisibleProductMedia } from "../app/features/product-detail/ProductMediaGallery.js";
import { normalizeMediaPublicBaseUrl } from "../app/platform/config/api.server.js";
import type { ProductMedia } from "../app/features/product-detail/product-detail-contract.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");

const routeSource = readFileSync(resolve(storefrontRoot, "app/routes/product.tsx"), "utf8");
const gallerySource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/ProductMediaGallery.tsx"), "utf8");
const mediaServerSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-media.server.ts"), "utf8");
const dataSource = readFileSync(resolve(storefrontRoot, "app/features/product-detail/product-detail-data.server.ts"), "utf8");
const configSource = readFileSync(resolve(storefrontRoot, "app/platform/config/api.server.ts"), "utf8");
const openApi = readFileSync(resolve(repoRoot, "src/generated/openapi.ts"), "utf8");

assert.match(routeSource, /ProductDetailExperience/);
assert.match(gallerySource, /<video controls preload="metadata" playsInline/);
assert.match(gallerySource, /قبلی/);
assert.match(gallerySource, /بعدی/);
assert.match(gallerySource, /سه‌بعدی\/۳۶۰/);
assert.match(mediaServerSource, /invalid-key/);
assert.match(mediaServerSource, /decodeURIComponent/);
assert.match(configSource, /EQCOFE_MEDIA_PUBLIC_BASE_URL/);
assert.equal(/process\.env/.test(gallerySource), false);
assert.equal(/storage_key[^\n]*src=/.test(gallerySource), false);
assert.equal(/model_3d|spin_360|media_type:\s*"3d"/i.test(openApi), false);
assert.equal(PRODUCT_MEDIA_CAPABILITIES.model3d, false);
assert.equal(PRODUCT_MEDIA_CAPABILITIES.spin360, false);

assert.equal(
  normalizeMediaPublicBaseUrl("https://cdn.example.test/assets/"),
  "https://cdn.example.test/assets",
);
assert.throws(() => normalizeMediaPublicBaseUrl("javascript:alert(1)"));
assert.throws(() => normalizeMediaPublicBaseUrl("https://user:pass@cdn.example.test/"));

assert.equal(
  resolveMediaDeliveryUrl("/media/a.webp", "https://cdn.example.test/assets"),
  "https://cdn.example.test/assets/media/a.webp",
);
assert.equal(resolveMediaDeliveryUrl("../secret", "https://cdn.example.test"), null);
assert.equal(resolveMediaDeliveryUrl("%2e%2e/secret", "https://cdn.example.test"), null);
assert.equal(resolveMediaDeliveryUrl("https://evil.test/x", "https://cdn.example.test"), null);
assert.equal(resolveMediaDeliveryUrl("media\\evil.webp", "https://cdn.example.test"), null);

const media: ProductMedia[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    variant_id: null,
    media_type: "image",
    storage_key: "/products/base.webp",
    mime_type: "image/webp",
    sort_order: 0,
    is_primary: true,
    alt_text_fa: "نمای اصلی",
    width: 1200,
    height: 1200,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    variant_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    media_type: "video",
    storage_key: "/products/variant-a.mp4",
    mime_type: "video/mp4",
    sort_order: 1,
    is_primary: false,
    alt_text_fa: "ویدیوی مدل الف",
    width: 1920,
    height: 1080,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    variant_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    media_type: "image",
    storage_key: "/products/variant-b.webp",
    mime_type: "image/webp",
    sort_order: 2,
    is_primary: false,
    alt_text_fa: "مدل ب",
    width: 1200,
    height: 1200,
  },
];

const resolved = resolveProductMedia(media, "https://cdn.example.test/assets");
assert.equal(resolved.every((item) => item.delivery_status === "ready"), true);
assert.equal(resolved[0]?.delivery_url, "https://cdn.example.test/assets/products/base.webp");

const visible = selectVisibleProductMedia(
  resolved as readonly ResolvedProductMedia[],
  "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
);
assert.deepEqual(visible.map((item) => item.id), [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
]);

const unconfigured = resolveProductMedia(media, null);
assert.equal(unconfigured.every((item) => item.delivery_url === null), true);
assert.equal(unconfigured.every((item) => item.delivery_status === "unconfigured"), true);

assert.match(dataSource, /resolveProductMedia/);
assert.match(dataSource, /safeReadMediaBaseUrl/);

console.log(JSON.stringify({
  status: "PASS",
  stage: "61-E",
  media: ["image", "video"],
  variantBinding: true,
  storageKeyAsPublicUrl: false,
  configuredPublicResolver: true,
  model3d: false,
  spin360: false,
}, null, 2));
