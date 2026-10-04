import { ApiClientError } from "../../platform/api/errors.js";
import {
  IRAN_CITIES_1404,
  IRAN_PROVINCES_1404,
  isIranProvinceCityPair1404,
} from "../../../../../shared/reference/iran-geography-1404.js";
import type {
  CustomerAddressCreateBody,
  CustomerAddressUpdateBody,
  CustomerAddressesResponse,
} from "./cart-checkout-contract.js";
import {
  createCustomerAddress,
  loadCustomerAddresses,
  updateCustomerAddress,
} from "./cart-checkout-data.server.js";
import {
  readSelectedAddressId,
  serializeSelectedAddressId,
  stableCustomerIdempotencyKey,
} from "./checkout-flow-state.server.js";

export type CheckoutAddress = CustomerAddressesResponse["data"][number];
export type CheckoutProvinceOption = Readonly<{ id: string; name: string }>;
export type CheckoutCityOption = Readonly<{ id: string; provinceId: string; name: string }>;

export type CheckoutAddressLoaderData = {
  addresses: CheckoutAddress[];
  selectedAddressId: string | null;
  provinces: CheckoutProvinceOption[];
  cities: CheckoutCityOption[];
  createAddressAvailable: true;
  referenceYear: 1404;
};

export type CheckoutAddressActionResult =
  | { kind: "redirect"; location: "/checkout/delivery"; setCookies: readonly string[] }
  | { kind: "data"; statusCode: number; message: string; requestId: string | null };

export async function loadCheckoutAddress(request: Request): Promise<{
  data: CheckoutAddressLoaderData;
  setCookies: readonly string[];
}> {
  const result = await loadCustomerAddresses(request);
  return {
    data: {
      addresses: result.data.data,
      selectedAddressId: readSelectedAddressId(request),
      provinces: IRAN_PROVINCES_1404.map(({ id, name }) => ({ id, name })),
      cities: IRAN_CITIES_1404.map(({ id, provinceId, name }) => ({ id, provinceId, name })),
      createAddressAvailable: true,
      referenceYear: 1404,
    },
    setCookies: result.setCookies,
  };
}

export async function handleCheckoutAddressAction(request: Request): Promise<CheckoutAddressActionResult> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "create-address") {
      const body = parseAddressCreate(form);
      if (!body) return invalid("اطلاعات نشانی جدید معتبر نیست.");
      if (!isIranProvinceCityPair1404(body.province_id, body.city_id)) {
        return invalid("استان و شهر انتخاب‌شده با مرجع معتبر فروشگاه تطابق ندارند.");
      }
      const created = await createCustomerAddress(
        request,
        body,
        stableCustomerIdempotencyKey(request, "checkout-address-create", JSON.stringify(body)),
      );
      const addressId = created.data.data.id;
      return {
        kind: "redirect",
        location: "/checkout/delivery",
        setCookies: [...created.setCookies, serializeSelectedAddressId(request, addressId)],
      };
    }

    const addressId = String(form.get("address_id") ?? "");
    if (!UUID_RE.test(addressId)) return invalid("نشانی انتخاب‌شده معتبر نیست.");

    const listed = await loadCustomerAddresses(request);
    const current = listed.data.data.find((item) => item.id === addressId);
    if (!current) return invalid("نشانی انتخاب‌شده متعلق به حساب فعلی نیست یا دیگر وجود ندارد.", 404);

    if (intent === "select-address") {
      return {
        kind: "redirect",
        location: "/checkout/delivery",
        setCookies: [...listed.setCookies, serializeSelectedAddressId(request, addressId)],
      };
    }

    if (intent === "update-address") {
      const body = parseAddressPatch(form);
      if (!body) return invalid("اطلاعات ویرایش نشانی معتبر نیست.");
      const updated = await updateCustomerAddress(
        request,
        addressId,
        body,
        stableCustomerIdempotencyKey(
          request,
          "checkout-address-update",
          JSON.stringify({ addressId, body }),
        ),
      );
      return {
        kind: "redirect",
        location: "/checkout/delivery",
        setCookies: [
          ...listed.setCookies,
          ...updated.setCookies,
          serializeSelectedAddressId(request, addressId),
        ],
      };
    }

    return invalid("عملیات نشانی شناخته‌شده نیست.");
  } catch (error) {
    return apiFailure(error);
  }
}

function parseAddressCreate(form: FormData): CustomerAddressCreateBody | null {
  const recipient_name = clean(form.get("recipient_name"), 150);
  const recipient_mobile = String(form.get("recipient_mobile") ?? "").trim();
  const province_id = String(form.get("province_id") ?? "").trim();
  const city_id = String(form.get("city_id") ?? "").trim();
  const postal_code = String(form.get("postal_code") ?? "").trim();
  const address_line = clean(form.get("address_line"), 1000);
  const building_no = clean(form.get("building_no"), 30, true);
  const unit_no = clean(form.get("unit_no"), 30, true);
  const is_default = form.get("is_default") === "on";

  if (
    !recipient_name ||
    !/^09\d{9}$/.test(recipient_mobile) ||
    !UUID_RE.test(province_id) ||
    !UUID_RE.test(city_id) ||
    !/^\d{10}$/.test(postal_code) ||
    !address_line
  ) return null;

  return {
    recipient_name,
    recipient_mobile,
    province_id,
    city_id,
    postal_code,
    address_line,
    building_no,
    unit_no,
    is_default,
  };
}

function parseAddressPatch(form: FormData): CustomerAddressUpdateBody | null {
  const recipient_name = clean(form.get("recipient_name"), 150);
  const recipient_mobile = String(form.get("recipient_mobile") ?? "").trim();
  const postal_code = String(form.get("postal_code") ?? "").trim();
  const address_line = clean(form.get("address_line"), 1000);
  const building_no = clean(form.get("building_no"), 30, true);
  const unit_no = clean(form.get("unit_no"), 30, true);
  if (!recipient_name || !/^09\d{9}$/.test(recipient_mobile) || !/^\d{10}$/.test(postal_code) || !address_line) return null;
  return { recipient_name, recipient_mobile, postal_code, address_line, building_no, unit_no };
}

function clean(value: unknown, max: number, nullable = false): string | null {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return nullable ? null : null;
  return normalized.length <= max ? normalized : null;
}

function apiFailure(error: unknown): CheckoutAddressActionResult {
  if (error instanceof ApiClientError) {
    const statusCode =
      error.status === 401 ? 401 :
      error.status === 403 ? 403 :
      error.status === 404 ? 404 :
      error.status === 409 ? 409 :
      error.status === 422 ? 422 : 503;
    let message = "امکان ادامه عملیات نشانی وجود ندارد.";
    if (error.code === "ADDRESS_REFERENCE_INVALID") {
      message = "استان و شهر انتخاب‌شده دیگر معتبر نیستند؛ دوباره انتخاب کنید.";
    } else if (statusCode === 409) {
      message = "نشانی هم‌زمان تغییر کرده است؛ نسخه تازه را دوباره بررسی کنید.";
    } else if (statusCode === 503) {
      message = "نتیجه عملیات نشانی قطعی نشد؛ بدون ساختن موفقیت دوباره وضعیت را بررسی کنید.";
    }
    return { kind: "data", statusCode, message, requestId: error.requestId };
  }
  return { kind: "data", statusCode: 503, message: "امکان ادامه عملیات نشانی وجود ندارد.", requestId: null };
}

function invalid(message: string, statusCode = 422): CheckoutAddressActionResult {
  return { kind: "data", statusCode, message, requestId: null };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
