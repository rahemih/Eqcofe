import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiClientError } from "../app/platform/api/errors.js";
import {
  appendCustomerSessionSetCookies,
  createCustomerSessionBridge,
  sanitizeCustomerSessionSetCookie,
} from "../app/platform/auth/session-cookie.server.js";
import { probeCustomerSession } from "../app/platform/auth/session-state.server.js";
import {
  classifyProtectedCustomerApiError,
  toProtectedCustomerRouteState,
} from "../app/platform/auth/protected-route.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const authSources = [
  "app/platform/auth/session-cookie.server.ts",
  "app/platform/auth/session-state.server.ts",
  "app/platform/auth/protected-route.ts",
].map((path) => readFileSync(resolve(storefrontRoot, path), "utf8")).join("\n");
const apiRequestSource = readFileSync(resolve(storefrontRoot, "app/platform/api/request.ts"), "utf8");

for (const forbidden of ["localStorage", "sessionStorage", "document.cookie", "Bearer "]) {
  assert.equal(authSources.includes(forbidden), false, `CLIENT_AUTHORITY_FORBIDDEN:${forbidden}`);
}
assert.equal(apiRequestSource.includes('"set-cookie"'), true, "SENSITIVE_RESPONSE_FILTER_MISSING");

let sessionHits = 0;
let otpVerifyHits = 0;
let logoutHits = 0;
let lastCookieHeader: string | undefined;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  lastCookieHeader = request.headers.cookie;

  if (request.method === "GET" && url.pathname === "/auth/session") {
    sessionHits += 1;
    if (request.headers.cookie === "eqcofe_session=valid-token") {
      sendJson(response, 200, { actor: { type: "customer" } });
      return;
    }
    if (request.headers.cookie === "eqcofe_session=forbidden-token") {
      sendError(response, 403, "FORBIDDEN", "forbidden", "req-forbidden");
      return;
    }
    sendError(response, 401, "UNAUTHORIZED", "expired", "req-expired");
    return;
  }

  if (request.method === "POST" && url.pathname === "/auth/otp/verify") {
    otpVerifyHits += 1;
    await readBody(request);
    response.setHeader(
      "Set-Cookie",
      "eqcofe_session=new-token; Path=/; HttpOnly; SameSite=Lax; Expires=Sat, 26 Sep 2026 00:00:00 GMT",
    );
    sendJson(response, 200, { session_id: "session-1" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/auth/logout") {
    logoutHits += 1;
    response.setHeader(
      "Set-Cookie",
      "eqcofe_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
    sendJson(response, 200, { logged_out: true });
    return;
  }

  sendError(response, 404, "UNEXPECTED_ROUTE", "unexpected", "req-unexpected");
});

await new Promise<void>((resolvePromise, rejectPromise) => {
  server.once("error", rejectPromise);
  server.listen(0, "127.0.0.1", resolvePromise);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const config = {
    baseUrl: `http://127.0.0.1:${address.port}`,
    timeoutMs: 2500,
  };

  const noCookieRequest = new Request("http://storefront.test/account");
  const beforeNoCookieHits = sessionHits;
  assert.deepEqual(
    await probeCustomerSession(noCookieRequest, { config, fetchImpl: fetch }),
    { status: "unauthenticated" },
  );
  assert.equal(sessionHits, beforeNoCookieHits, "NO_COOKIE_MUST_NOT_HIT_BACKEND");

  const validRequest = new Request("http://storefront.test/account", {
    headers: {
      cookie: "analytics=abc; eqcofe_admin_session=admin-token; eqcofe_session=valid-token",
    },
  });
  assert.deepEqual(
    await probeCustomerSession(validRequest, { config, fetchImpl: fetch }),
    { status: "authenticated" },
  );
  assert.equal(lastCookieHeader, "eqcofe_session=valid-token");

  const expiredRequest = new Request("http://storefront.test/account", {
    headers: { cookie: "eqcofe_session=expired-token" },
  });
  assert.deepEqual(
    await probeCustomerSession(expiredRequest, { config, fetchImpl: fetch }),
    { status: "expired" },
  );

  const forbiddenRequest = new Request("http://storefront.test/account", {
    headers: { cookie: "eqcofe_session=forbidden-token" },
  });
  assert.deepEqual(
    await probeCustomerSession(forbiddenRequest, { config, fetchImpl: fetch }),
    { status: "forbidden", requestId: "req-forbidden" },
  );

  const recoveryRequest = new Request("http://storefront.test/account", {
    headers: { cookie: "eqcofe_session=valid-token" },
  });
  const recovery = await probeCustomerSession(recoveryRequest, {
    config,
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(recovery.status, "recovery");

  assert.deepEqual(
    toProtectedCustomerRouteState({ status: "authenticated" }),
    { status: "allowed" },
  );
  assert.deepEqual(
    toProtectedCustomerRouteState({ status: "unauthenticated" }),
    { status: "login_required" },
  );
  assert.deepEqual(
    toProtectedCustomerRouteState({ status: "expired" }),
    { status: "session_expired" },
  );
  assert.deepEqual(
    classifyProtectedCustomerApiError(
      new ApiClientError({
        kind: "http",
        code: "FORBIDDEN",
        message: "forbidden",
        status: 403,
        requestId: "req-forbidden",
      }),
      true,
    ),
    { status: "forbidden", requestId: "req-forbidden" },
  );

  const publicRequest = new Request("http://storefront.test/checkout/identity");
  const otpBridge = createCustomerSessionBridge(publicRequest, { config, fetchImpl: fetch });
  const otpResult = await otpBridge.client.request("post", "/auth/otp/verify", {
    body: {
      challenge_id: "11111111-1111-1111-1111-111111111111",
      code: "123456",
    },
  });
  assert.equal(otpVerifyHits, 1);
  assert.equal("set-cookie" in otpResult.headers, false, "SESSION_COOKIE_LEAKED_IN_RESULT_HEADERS");
  const otpCookies = otpBridge.takeSetCookies();
  assert.equal(otpCookies.length, 1);
  assert.match(otpCookies[0] ?? "", /^eqcofe_session=/);
  assert.equal(otpBridge.takeSetCookies().length, 0);

  const relayHeaders = new Headers();
  appendCustomerSessionSetCookies(relayHeaders, otpCookies);
  assert.equal(readSetCookies(relayHeaders).length, 1);

  const logoutBridge = createCustomerSessionBridge(validRequest, { config, fetchImpl: fetch });
  await logoutBridge.client.request("post", "/auth/logout", {});
  assert.equal(logoutHits, 1);
  assert.equal(lastCookieHeader, "eqcofe_session=valid-token");
  const logoutCookies = logoutBridge.takeSetCookies();
  assert.equal(logoutCookies.length, 1);
  assert.match(logoutCookies[0] ?? "", /Max-Age=0/i);

  assert.throws(
    () => sanitizeCustomerSessionSetCookie("eqcofe_session=x; Path=/; SameSite=Lax"),
    (error: unknown) => error instanceof ApiClientError && error.kind === "security",
  );
  assert.throws(
    () => sanitizeCustomerSessionSetCookie("eqcofe_session=x; Path=/; HttpOnly; SameSite=None; Secure"),
    (error: unknown) => error instanceof ApiClientError && error.code === "SESSION_COOKIE_SAMESITE_INVALID",
  );
  assert.throws(
    () => sanitizeCustomerSessionSetCookie("eqcofe_session=x; Path=/; HttpOnly; SameSite=Lax; Domain=example.test"),
    (error: unknown) => error instanceof ApiClientError && error.code === "SESSION_COOKIE_DOMAIN_FORBIDDEN",
  );
  assert.throws(
    () => sanitizeCustomerSessionSetCookie("__Host-eqcofe_session=x; Path=/; HttpOnly; SameSite=Lax"),
    (error: unknown) => error instanceof ApiClientError && error.code === "SESSION_COOKIE_SECURE_REQUIRED",
  );
  assert.doesNotThrow(
    () => sanitizeCustomerSessionSetCookie("__Host-eqcofe_session=x; Path=/; HttpOnly; SameSite=Lax; Secure"),
  );

  console.log(JSON.stringify({
    status: "PASS",
    stage: "58-E",
    sessionAuthority: "backend_customerSession_cookie",
    cookieNames: ["eqcofe_session", "__Host-eqcofe_session"],
    browserTokenStorage: "ABSENT",
    directBrowserApiCredentialAuthority: "ABSENT",
    protectedStates: ["allowed", "login_required", "session_expired", "forbidden", "recovery"],
    verified: {
      serverOnlyCookieForwarding: true,
      unrelatedCookiesStripped: true,
      adminCookieNotForwarded: true,
      setCookiePolicyValidated: true,
      sensitiveResponseHeadersFiltered: true,
      backendSessionProbeAuthoritative: true,
      expiredSessionFailClosed: true,
      forbiddenStateRepresented: true,
      recoveryStateRepresented: true,
    },
  }, null, 2));
} finally {
  await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
}

function readSetCookies(headers: Headers): readonly string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof extended.getSetCookie === "function") return extended.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendError(
  response: http.ServerResponse,
  status: number,
  code: string,
  message: string,
  requestId: string,
): void {
  sendJson(response, status, {
    success: false,
    error: { code, message },
    meta: { request_id: requestId },
  });
}

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolvePromise(body));
    request.on("error", rejectPromise);
  });
}
