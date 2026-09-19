import type { ApiClient, ApiClientConfig } from "../api/request.js";
import { createApiClient } from "../api/request.js";
import { ApiClientError } from "../api/errors.js";
import { readServerApiConfig } from "../config/api.server.js";

export const CUSTOMER_SESSION_COOKIE_NAMES = [
  "__Host-eqcofe_session",
  "eqcofe_session",
] as const;

type CustomerSessionCookieName = (typeof CUSTOMER_SESSION_COOKIE_NAMES)[number];

export type CustomerSessionBridge = {
  client: ApiClient;
  takeSetCookies(): readonly string[];
};

export type CustomerSessionBridgeOptions = {
  config?: ApiClientConfig;
  fetchImpl?: typeof fetch;
};

export function extractCustomerSessionCookieHeader(
  request: Pick<Request, "headers">,
): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;

  const found = new Map<CustomerSessionCookieName, string>();
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    const name = trimmed.slice(0, separator) as CustomerSessionCookieName;
    if (!CUSTOMER_SESSION_COOKIE_NAMES.includes(name)) continue;

    if (found.has(name)) {
      throw securityError("SESSION_COOKIE_DUPLICATE", "Duplicate customer session cookie was rejected.");
    }

    const value = trimmed.slice(separator + 1);
    if (!isSafeCookieValue(value)) {
      throw securityError("SESSION_COOKIE_INVALID", "Customer session cookie contains invalid bytes.");
    }
    found.set(name, value);
  }

  for (const name of CUSTOMER_SESSION_COOKIE_NAMES) {
    const value = found.get(name);
    if (value !== undefined) return `${name}=${value}`;
  }

  return null;
}

export function sanitizeCustomerSessionSetCookie(raw: string): string {
  if (raw.includes("\r") || raw.includes("\n")) {
    throw securityError("SESSION_SET_COOKIE_INVALID", "Session Set-Cookie contains control characters.");
  }

  const parts = raw.split(";").map((part) => part.trim()).filter(Boolean);
  const first = parts.shift();
  if (!first) {
    throw securityError("SESSION_SET_COOKIE_INVALID", "Session Set-Cookie is empty.");
  }

  const separator = first.indexOf("=");
  if (separator <= 0) {
    throw securityError("SESSION_SET_COOKIE_INVALID", "Session Set-Cookie has no valid name.");
  }

  const name = first.slice(0, separator) as CustomerSessionCookieName;
  if (!CUSTOMER_SESSION_COOKIE_NAMES.includes(name)) {
    throw securityError("SESSION_SET_COOKIE_UNEXPECTED", "Unexpected cookie from customer session transport.");
  }

  const value = first.slice(separator + 1);
  if (!isSafeCookieValue(value)) {
    throw securityError("SESSION_SET_COOKIE_INVALID", "Session Set-Cookie value contains invalid bytes.");
  }

  const attributes = new Map<string, string | true>();
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) {
      attributes.set(part.toLowerCase(), true);
      continue;
    }
    attributes.set(part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim());
  }

  if (!attributes.has("httponly")) {
    throw securityError("SESSION_COOKIE_HTTPONLY_REQUIRED", "Customer session cookie must be HttpOnly.");
  }
  if (String(attributes.get("path") ?? "") !== "/") {
    throw securityError("SESSION_COOKIE_PATH_INVALID", "Customer session cookie must use Path=/.");
  }
  if (String(attributes.get("samesite") ?? "").toLowerCase() !== "lax") {
    throw securityError("SESSION_COOKIE_SAMESITE_INVALID", "Customer session cookie must use SameSite=Lax.");
  }
  if (attributes.has("domain")) {
    throw securityError("SESSION_COOKIE_DOMAIN_FORBIDDEN", "Customer session cookie must remain host-only.");
  }
  if (name.startsWith("__Host-") && !attributes.has("secure")) {
    throw securityError("SESSION_COOKIE_SECURE_REQUIRED", "__Host- customer session cookie must be Secure.");
  }

  return raw.trim();
}

export function appendCustomerSessionSetCookies(
  headers: Headers,
  values: readonly string[],
): void {
  for (const value of values) {
    headers.append("Set-Cookie", sanitizeCustomerSessionSetCookie(value));
  }
}

export function createCustomerSessionBridge(
  request: Pick<Request, "headers">,
  options: CustomerSessionBridgeOptions = {},
): CustomerSessionBridge {
  const inboundCookie = extractCustomerSessionCookieHeader(request);
  const config = options.config ?? readServerApiConfig();
  const transportFetch = options.fetchImpl ?? config.fetchImpl ?? fetch;
  const captured: string[] = [];

  const sessionFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.delete("cookie");
    headers.delete("authorization");
    headers.delete("proxy-authorization");
    if (inboundCookie) headers.set("cookie", inboundCookie);

    const response = await transportFetch(input, {
      ...init,
      headers,
      credentials: "omit",
    });

    for (const raw of getSetCookieHeaders(response.headers)) {
      captured.push(sanitizeCustomerSessionSetCookie(raw));
    }

    return response;
  };

  return {
    client: createApiClient({
      ...config,
      fetchImpl: sessionFetch,
    }),
    takeSetCookies() {
      const output = Object.freeze([...captured]);
      captured.length = 0;
      return output;
    },
  };
}

function getSetCookieHeaders(headers: Headers): readonly string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extended.getSetCookie === "function") return extended.getSetCookie();
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function isSafeCookieValue(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || character === ";" || character === ",") {
      return false;
    }
  }
  return true;
}

function securityError(code: string, message: string): ApiClientError {
  return new ApiClientError({
    kind: "security",
    code,
    message,
    retryable: false,
  });
}
