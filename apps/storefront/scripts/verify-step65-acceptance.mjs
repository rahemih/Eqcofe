import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, unlink } from "node:fs/promises";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const scriptsRoot = resolve(root, "scripts");
const applicationPort = 41765;
const applicationOrigin = `http://127.0.0.1:${applicationPort}`;

const customerId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const applicationId = "33333333-3333-4333-8333-333333333333";
const provinceId = "14040000-0000-5001-8000-000000000002";
const cityId = "14040000-0000-5005-8000-000000004501";
const session = "step65-h-session-" + "s".repeat(32);
const createdAt = "2026-10-10T11:40:00.000Z";

const applicationJourney = await verifyWholesaleApplicationJourney();
const purchaseJourney = await verifyWholesalePurchaseJourney();

console.log(JSON.stringify({
  status: "PASS",
  stage: "65-H",
  journeys: ["SJ-10-wholesale-application-status", "SJ-11-approved-wholesale-purchase"],
  productionBuild: true,
  applicationJourney,
  purchaseJourney,
  backendAuthorityPreserved: true,
  frontendApprovalForbidden: true,
  frontendPricingAuthority: false,
  graphWork: "RETIRED_AND_OUT_OF_SCOPE",
}, null, 2));

async function verifyWholesaleApplicationJourney() {
  let customerType = "retail";
  let application = null;
  let submitCount = 0;
  const observed = [];

  const profile = () => ({
    id: customerId,
    customer_type: customerType,
    first_name: "حسین",
    last_name: "رحیمی",
    mobile: "09123456789",
    email: "hossein@example.test",
    status: "active",
    created_at: createdAt,
  });

  const api = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const authenticated = String(request.headers.cookie ?? "").includes(`eqcofe_session=${session}`);
    const record = {
      method: request.method,
      path: url.pathname,
      idempotencyKey: String(request.headers["idempotency-key"] ?? ""),
      cookie: String(request.headers.cookie ?? ""),
    };
    observed.push(record);

    if (
      ["/auth/session", "/customer/profile", "/customer/wholesale/application", "/customer/wholesale/applications"].includes(url.pathname)
      && !authenticated
    ) {
      return json(response, 401, errorEnvelope("UNAUTHORIZED", "unauthorized"));
    }

    if (request.method === "GET" && url.pathname === "/auth/session") {
      return json(response, 200, envelope({ actor: { type: "customer", id: customerId, accountId } }));
    }

    if (request.method === "GET" && url.pathname === "/customer/profile") {
      return json(response, 200, envelope(profile()));
    }

    if (request.method === "GET" && url.pathname === "/customer/wholesale/application") {
      return json(response, 200, envelope(application));
    }

    if (request.method === "POST" && url.pathname === "/customer/wholesale/applications") {
      const body = await bodyJson(request);
      assert.match(record.idempotencyKey, /^[0-9a-f]{64}$/i, "STEP65_H_APPLICATION_IDEMPOTENCY");
      assert.equal(body.business_name, "کافه تست پذیرش", "STEP65_H_APPLICATION_BUSINESS_NAME");
      assert.equal(body.manager_name, "مدیر تست", "STEP65_H_APPLICATION_MANAGER_NAME");
      assert.equal(body.business_type, "کافه", "STEP65_H_APPLICATION_BUSINESS_TYPE");
      assert.equal(body.province_id, provinceId, "STEP65_H_APPLICATION_PROVINCE");
      assert.equal(body.city_id, cityId, "STEP65_H_APPLICATION_CITY");
      submitCount += 1;
      application = {
        id: applicationId,
        customer_id: customerId,
        business_name: body.business_name,
        manager_name: body.manager_name,
        business_type: body.business_type,
        province_id: body.province_id,
        city_id: body.city_id,
        business_identifier: body.business_identifier ?? null,
        note: body.note ?? null,
        status: "submitted",
        submitted_at: createdAt,
        review_started_at: null,
        reviewed_at: null,
        decision_note: null,
        rejection_reason: null,
      };
      return json(response, 201, envelope(application));
    }

    return json(response, 404, errorEnvelope("NOT_FOUND", "not found"));
  });

  await new Promise((done) => api.listen(0, "127.0.0.1", done));
  const apiOrigin = `http://127.0.0.1:${api.address().port}`;
  const server = spawn("pnpm", ["exec", "react-router-serve", "./build/server/index.js"], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(applicationPort),
      NODE_ENV: "production",
      EQCOFE_API_BASE_URL: apiOrigin,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  server.stderr.on("data", (chunk) => { logs += chunk.toString(); });

  try {
    await waitForServer(applicationOrigin, logs);
    const cookie = `eqcofe_session=${session}`;

    const intro = await fetch(applicationOrigin + "/wholesale", { headers: { cookie } });
    assert.equal(intro.status, 200, "STEP65_H_WHOLESALE_INTRO_STATUS");
    assert((await intro.text()).includes("شروع درخواست عمده"), "STEP65_H_WHOLESALE_INTRO_RETAIL_CTA");

    const apply = await fetch(applicationOrigin + "/account/wholesale/apply", { headers: { cookie } });
    assert.equal(apply.status, 200, "STEP65_H_APPLICATION_PAGE_STATUS");
    assert((await apply.text()).includes("ثبت درخواست فروش عمده"), "STEP65_H_APPLICATION_FORM_CONTENT");

    const submitted = await fetch(applicationOrigin + "/account/wholesale/apply", {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: applicationForm(),
      redirect: "manual",
    });
    assert.equal(submitted.status, 302, "STEP65_H_APPLICATION_SUBMIT_STATUS");
    assert.equal(submitted.headers.get("location"), "/account/wholesale", "STEP65_H_APPLICATION_SUBMIT_REDIRECT");
    assert.equal(submitCount, 1, "STEP65_H_APPLICATION_SUBMIT_COUNT");

    const status = await fetch(applicationOrigin + "/account/wholesale", { headers: { cookie } });
    assert.equal(status.status, 200, "STEP65_H_APPLICATION_STATUS_PAGE");
    const statusHtml = await status.text();
    assert(statusHtml.includes("ثبت‌شده"), "STEP65_H_APPLICATION_SUBMITTED_LABEL");
    assert(statusHtml.includes("خرده‌فروشی"), "STEP65_H_RETAIL_UNTIL_APPROVAL");

    const duplicate = await fetch(applicationOrigin + "/account/wholesale/apply", {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: applicationForm(),
      redirect: "manual",
    });
    assert.equal(duplicate.status, 302, "STEP65_H_APPLICATION_DUPLICATE_RECOVERY_STATUS");
    assert.equal(duplicate.headers.get("location"), "/account/wholesale", "STEP65_H_APPLICATION_DUPLICATE_RECOVERY_REDIRECT");
    assert.equal(submitCount, 1, "STEP65_H_APPLICATION_DUPLICATE_BACKEND_POST_FORBIDDEN");

    customerType = "wholesale";
    application = {
      ...application,
      status: "approved",
      review_started_at: createdAt,
      reviewed_at: createdAt,
      decision_note: "تأیید تست پذیرش",
    };

    const approved = await fetch(applicationOrigin + "/account/wholesale", { headers: { cookie } });
    assert.equal(approved.status, 200, "STEP65_H_APPROVED_STATUS_PAGE");
    const approvedHtml = await approved.text();
    assert(approvedHtml.includes("تأییدشده"), "STEP65_H_APPROVED_APPLICATION_LABEL");
    assert(approvedHtml.includes("پروفایل معتبر سرور نوع مشتری این حساب را «عمده» اعلام می‌کند"), "STEP65_H_PROFILE_WHOLESALE_AUTHORITY");

    const approvedIntro = await fetch(applicationOrigin + "/wholesale", { headers: { cookie } });
    assert((await approvedIntro.text()).includes("مشاهده محصولات"), "STEP65_H_APPROVED_PRODUCT_HANDOFF");

    let browser = false;
    let axeRuns = 0;
    if (process.env.EQCOFE_BROWSER_QA_ROOT) {
      customerType = "retail";
      application = null;
      submitCount = 0;

      const qaRequire = createRequire(resolve(process.env.EQCOFE_BROWSER_QA_ROOT, "package.json"));
      const { chromium } = qaRequire("playwright");
      const axe = qaRequire("axe-core");
      const browserInstance = await chromium.launch({ headless: true });
      try {
        const mobile = await browserInstance.newContext({ viewport: { width: 320, height: 950 }, locale: "fa-IR" });
        await mobile.addCookies([{ name: "eqcofe_session", value: session, url: applicationOrigin, httpOnly: true, sameSite: "Lax" }]);
        const page = await mobile.newPage();

        await page.goto(applicationOrigin + "/wholesale", { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: "خرید عمده تجهیزات قهوه از ایکوفی" }).waitFor();
        await assertPageBasics(page, "wholesale-intro-320");
        await runAxe(page, axe, "wholesale-intro-320");
        axeRuns += 1;

        await page.goto(applicationOrigin + "/account/wholesale/apply", { waitUntil: "networkidle" });
        await page.getByLabel("نام کسب‌وکار").fill("کافه تست پذیرش");
        await page.getByLabel("نام مدیر یا مسئول").fill("مدیر تست");
        await page.getByLabel("نوع کسب‌وکار").fill("کافه");
        const submit = page.getByRole("button", { name: "ارسال درخواست برای بررسی" });
        await assertTarget(submit, "wholesale-submit-320");
        await submit.click();
        await page.waitForURL((url) => url.pathname === "/account/wholesale");
        await page.getByText("ثبت‌شده", { exact: true }).first().waitFor();
        await assertPageBasics(page, "wholesale-submitted-320");
        await runAxe(page, axe, "wholesale-submitted-320");
        axeRuns += 1;

        customerType = "wholesale";
        application = {
          ...application,
          status: "approved",
          review_started_at: createdAt,
          reviewed_at: createdAt,
          decision_note: "تأیید تست پذیرش",
        };
        await page.reload({ waitUntil: "networkidle" });
        await page.getByText("تأییدشده", { exact: true }).first().waitFor();
        await page.getByRole("link", { name: "مشاهده محصولات" }).waitFor();
        await assertPageBasics(page, "wholesale-approved-320");
        await runAxe(page, axe, "wholesale-approved-320");
        axeRuns += 1;
        await mobile.close();

        const desktop = await browserInstance.newContext({ viewport: { width: 1200, height: 950 }, locale: "fa-IR" });
        await desktop.addCookies([{ name: "eqcofe_session", value: session, url: applicationOrigin, httpOnly: true, sameSite: "Lax" }]);
        const wide = await desktop.newPage();
        await wide.goto(applicationOrigin + "/account/wholesale", { waitUntil: "networkidle" });
        await wide.getByText("تأییدشده", { exact: true }).first().waitFor();
        await assertPageBasics(wide, "wholesale-approved-1200");
        await runAxe(wide, axe, "wholesale-approved-1200");
        axeRuns += 1;
        await desktop.close();

        browser = true;
      } finally {
        await browserInstance.close();
      }
    }

    const paths = observed.map((entry) => `${entry.method} ${entry.path}`);
    for (const required of [
      "GET /auth/session",
      "GET /customer/profile",
      "GET /customer/wholesale/application",
      "POST /customer/wholesale/applications",
    ]) {
      assert(paths.includes(required), "STEP65_H_WHOLESALE_AUTHORITY_MISSING:" + required);
    }

    return {
      submitted: true,
      duplicateRecovered: true,
      authoritativeApprovalFixture: true,
      wholesaleProductHandoff: true,
      browser,
      browserWidths: browser ? [320, 1200] : [],
      axeRuns,
      submitCount,
    };
  } finally {
    server.kill("SIGTERM");
    await new Promise((done) => api.close(done));
  }
}

async function verifyWholesalePurchaseJourney() {
  const sourcePath = resolve(scriptsRoot, "verify-step63-acceptance.mjs");
  const derivedPath = resolve(scriptsRoot, ".verify-step65-h-wholesale-purchase.mjs");
  const source = await readFile(sourcePath, "utf8");

  let derived = source
    .replaceAll("STEP63_H_", "STEP65_H_PURCHASE_")
    .replaceAll('customer_type: "retail"', 'customer_type: "wholesale"')
    .replaceAll('customerType: "retail"', 'customerType: "wholesale"')
    .replace('stage: "63-H"', 'stage: "65-H-wholesale-purchase"')
    .replace(
      'assert(reviewHtml.includes("ثبت سفارش و رفتن به پرداخت"), "STEP65_H_PURCHASE_REVIEW_PAYMENT_CTA");',
      'assert(reviewHtml.includes("ثبت سفارش و رفتن به پرداخت"), "STEP65_H_PURCHASE_REVIEW_PAYMENT_CTA");\n  assert(reviewHtml.includes("بازبینی سفارش عمده"), "STEP65_H_PURCHASE_REVIEW_WHOLESALE_CONTEXT");',
    )
    .replace(
      'assert((await outcomeResponse.text()).includes("نتیجه سفارش هنوز قطعی نیست"), "STEP65_H_PURCHASE_OUTCOME_PENDING_CONTENT");',
      'const outcomeHtml = await outcomeResponse.text();\n  assert(outcomeHtml.includes("نتیجه سفارش هنوز قطعی نیست"), "STEP65_H_PURCHASE_OUTCOME_PENDING_CONTENT");\n  assert(outcomeHtml.includes("سفارش عمده"), "STEP65_H_PURCHASE_OUTCOME_WHOLESALE_CONTEXT");',
    )
    .replace(
      'await page.goto(origin + "/checkout/review", { waitUntil: "networkidle" });',
      'await page.goto(origin + "/checkout/review", { waitUntil: "networkidle" });\n      await page.getByText("بازبینی سفارش عمده", { exact: true }).waitFor();',
    )
    .replace(
      'await page.getByRole("heading", { name: "سفارش ثبت و پرداخت تأیید شد" }).waitFor();',
      'await page.getByRole("heading", { name: "سفارش ثبت و پرداخت تأیید شد" }).waitFor();\n      await page.getByText("سفارش عمده", { exact: true }).waitFor();',
    );

  for (const token of [
    'customer_type: "wholesale"',
    'customerType: "wholesale"',
    "STEP65_H_PURCHASE_REVIEW_WHOLESALE_CONTEXT",
    "STEP65_H_PURCHASE_OUTCOME_WHOLESALE_CONTEXT",
  ]) {
    assert(derived.includes(token), "STEP65_H_DERIVED_PURCHASE_MISSING:" + token);
  }

  await writeFile(derivedPath, derived, "utf8");
  try {
    const result = spawnSync(process.execPath, [derivedPath], {
      cwd: root,
      env: process.env,
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (result.status !== 0) {
      throw new Error("STEP65_H_WHOLESALE_PURCHASE_FAILED\n" + result.stdout + "\n" + result.stderr);
    }
    assert(result.stdout.includes('"status": "PASS"'), "STEP65_H_WHOLESALE_PURCHASE_PASS_MISSING");
    assert(result.stdout.includes('"stage": "65-H-wholesale-purchase"'), "STEP65_H_WHOLESALE_PURCHASE_STAGE_MISSING");
    return {
      checkoutOrderPayment: true,
      wholesaleReviewContext: true,
      wholesaleOrderContext: true,
      browser: Boolean(process.env.EQCOFE_BROWSER_QA_ROOT),
    };
  } finally {
    await unlink(derivedPath).catch(() => {});
  }
}

function applicationForm() {
  return new URLSearchParams({
    intent: "submit-wholesale-application",
    business_name: "کافه تست پذیرش",
    manager_name: "مدیر تست",
    business_type: "کافه",
    province_id: provinceId,
    city_id: cityId,
    business_identifier: "EQ-STEP65-H",
    note: "درخواست تست پذیرش یکپارچه",
  });
}

function envelope(data) {
  return { success: true, data, meta: { request_id: "step65-h", timestamp: new Date().toISOString() } };
}

function errorEnvelope(code, message) {
  return { success: false, error: { code, message, field_errors: [] }, meta: { request_id: "step65-h" } };
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-request-id": "step65-h" });
  response.end(JSON.stringify(body));
}

async function bodyJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function waitForServer(origin, logs) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error("STEP65_H_STOREFRONT_START_TIMEOUT\n" + logs);
}

async function assertPageBasics(page, label) {
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "STEP65_H_RTL:" + label);
  const overflow = await page.evaluate(() => ({ root: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert(overflow.root <= overflow.viewport + 1, "STEP65_H_ROOT_OVERFLOW:" + label + ":" + JSON.stringify(overflow));
}

async function assertTarget(locator, label) {
  const box = await locator.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, "STEP65_H_TARGET_44:" + label + ":" + JSON.stringify(box));
}

async function runAxe(page, axe, label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter((violation) => violation.tags.some((tag) => tag.startsWith("wcag")))
      .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => node.target) }));
  });
  assert.equal(violations.length, 0, "STEP65_H_AXE:" + label + ":" + JSON.stringify(violations));
}
