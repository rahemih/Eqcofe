import type { ProductMedia } from "./product-detail-contract.js";

export type ResolvedProductMedia = ProductMedia & {
  delivery_url: string | null;
  delivery_status: "ready" | "unconfigured" | "invalid-key";
};

export type ProductMediaCapabilities = {
  image: true;
  video: true;
  model3d: false;
  spin360: false;
  authority: "canonical-product-media-contract";
};

export const PRODUCT_MEDIA_CAPABILITIES: ProductMediaCapabilities = Object.freeze({
  image: true,
  video: true,
  model3d: false,
  spin360: false,
  authority: "canonical-product-media-contract",
});

export function resolveProductMedia(
  media: readonly ProductMedia[],
  publicBaseUrl: string | null,
): readonly ResolvedProductMedia[] {
  return media.map((item) => {
    if (!publicBaseUrl) {
      return { ...item, delivery_url: null, delivery_status: "unconfigured" as const };
    }
    const deliveryUrl = resolveMediaDeliveryUrl(item.storage_key, publicBaseUrl);
    if (!deliveryUrl) {
      return { ...item, delivery_url: null, delivery_status: "invalid-key" as const };
    }
    return { ...item, delivery_url: deliveryUrl, delivery_status: "ready" as const };
  });
}

export function resolveMediaDeliveryUrl(
  storageKey: string,
  publicBaseUrl: string,
): string | null {
  const raw = storageKey.trim();
  if (
    !raw
    || raw.includes("\\")
    || raw.includes("?")
    || raw.includes("#")
    || /^[a-z][a-z0-9+.-]*:/i.test(raw)
    || raw.startsWith("//")
  ) return null;

  const rawSegments = raw.replace(/^\/+/, "").split("/");
  if (rawSegments.length === 0 || rawSegments.some((segment) => segment === "")) return null;

  const encodedSegments: string[] = [];
  for (const segment of rawSegments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (
      decoded === "."
      || decoded === ".."
      || decoded.includes("/")
      || decoded.includes("\\")
      || hasControlCharacter(decoded)
    ) return null;
    encodedSegments.push(encodeURIComponent(decoded));
  }

  return `${publicBaseUrl.replace(/\/+$/, "")}/${encodedSegments.join("/")}`;
}


function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
