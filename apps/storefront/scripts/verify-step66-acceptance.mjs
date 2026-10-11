import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const appPort = 41766;
const origin = `http://127.0.0.1:${appPort}`;
const publishedAt = "2026-10-11T06:00:00.000Z";
const articleId = "11111111-1111-4111-8111-111111111111";
const relatedId = "22222222-2222-4222-8222-222222222222";
const archiveId = "33333333-3333-4333-8333-333333333333";
const stoppedId = "44444444-4444-4444-8444-444444444444";
const brandId = "55555555-5555-4555-8555-555555555555";
const categoryId = "66666666-6666-4666-8666-666666666666";
const observed = [];

const seo = {
  title: "راهنمای انتخاب آسیاب قهوه | EQCOFE",
  description: "راهنمای مصوب انتخاب آسیاب برای استفاده خانگی و کافه.",
  canonical_url: "https://eqcofe.com/articles/espresso-guide",
  indexable: true,
  robots: "index,follow",
};

const articleSummary = {
  id: articleId,
  slug: "espresso-guide",
  title_fa: "راهنمای انتخاب آسیاب قهوه",
  seo_title: seo.title,
  meta_description: seo.description,
  published_at: publishedAt,
  seo,
};

const relatedSummary = {
  id: relatedId,
  slug: "brew-tools",
  title_fa: "راهنمای ابزار دم‌آوری",
  seo_title: null,
  meta_description: "انتخاب ابزار دم‌آوری قهوه.",
  published_at: publishedAt,
  seo: {
    title: "راهنمای ابزار دم‌آوری | EQCOFE",
    description: "انتخاب ابزار دم‌آوری قهوه.",
    canonical_url: "https://eqcofe.com/articles/brew-tools",
    indexable: true,
    robots: "index,follow",
  },
};

const api = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  observed.push({ method: request.method ?? "", path: url.pathname, cursor: url.searchParams.get("cursor") });

  if (request.method !== "GET") return json(response, 405, { error: "method not allowed" });

  if (url.pathname === "/articles") {
    const cursor = url.searchParams.get("cursor");
    if (cursor === "fail") return json(response, 503, errorEnvelope("UPSTREAM_UNAVAILABLE", "unavailable"));
    if (cursor === "empty") return json(response, 200, { items: [], next_cursor: null });
    if (cursor === "article-page-2") return json(response, 200, { items: [relatedSummary], next_cursor: null });
    return json(response, 200, { items: [articleSummary], next_cursor: "article-page-2" });
  }

  if (url.pathname === "/articles/espresso-guide") {
    return json(response, 200, {
      ...articleSummary,
      body: 'متن امن مقاله.\n\n<img id="unsafe-article-body" src=x onerror="globalThis.__eqcofe_xss=1"> باید فقط به‌صورت متن نمایش داده شود.',
      content_version: 7,
    });
  }

  if (url.pathname === "/articles/espresso-guide/related") {
    return json(response, 200, { items: [relatedSummary] });
  }

  if (url.pathname === "/articles/related-fail") {
    return json(response, 200, {
      ...articleSummary,
      slug: "related-fail",
      seo: { ...seo, canonical_url: "https://eqcofe.com/articles/related-fail" },
      body: "مقاله معتبر با خطای جداگانه در محتوای مرتبط.",
      content_version: 8,
    });
  }

  if (url.pathname === "/articles/related-fail/related") {
    return json(response, 503, errorEnvelope("RELATED_UNAVAILABLE", "related unavailable"));
  }

  if (url.pathname === "/content/sitemap/articles") {
    const cursor = url.searchParams.get("cursor");
    if (cursor === "sitemap-page-2") {
      return json(response, 200, {
        items: [{ loc: "https://eqcofe.com/articles/brew-tools", lastmod: publishedAt }],
        next_cursor: null,
      });
    }
    return json(response, 200, {
      items: [{ loc: "https://eqcofe.com/articles/espresso-guide", lastmod: publishedAt }],
      next_cursor: "sitemap-page-2",
    });
  }

  if (url.pathname === "/catalog/archive") {
    const cursor = url.searchParams.get("cursor");
    if (cursor === "fail") return json(response, 503, errorEnvelope("ARCHIVE_UNAVAILABLE", "unavailable"));
    if (cursor === "empty") return json(response, 200, { items: [], pagination: { next_cursor: null, has_more: false } });
    return json(response, 200, {
      items: [{
        id: archiveId,
        slug: "legacy-grinder",
        name: "آسیاب آرشیوشده",
        brand: { id: brandId, name_fa: "برند تست", slug: "test-brand" },
        primary_category: { id: categoryId, name_fa: "آسیاب", slug: "grinders" },
        archived_at: "2026-10-01T06:00:00.000Z",
      }],
      pagination: { next_cursor: null, has_more: false },
    });
  }

  if (url.pathname === "/catalog/stop-sale") {
    const cursor = url.searchParams.get("cursor");
    if (cursor === "fail") return json(response, 503, errorEnvelope("STOP_SALE_UNAVAILABLE", "unavailable"));
    if (cursor === "empty") return json(response, 200, { items: [], pagination: { next_cursor: null, has_more: false } });
    return json(response, 200, {
      items: [{
        id: stoppedId,
        slug: "paused-kettle",
        name: "کتری با فروش متوقف",
        brand: { id: brandId, name_fa: "برند تست", slug: "test-brand" },
        primary_category: { id: categoryId, name_fa: "کتری", slug: "kettles" },
        primary_image: null,
        price: { current_toman: 2450000, old_toman: null, discount_percent: null },
        availability: { sales_enabled: false, in_stock: true, available_quantity: 14 },
      }],
      pagination: { next_cursor: null, has_more: false },
    });
  }

  return json(response, 404, errorEnvelope("NOT_FOUND", "not found"));
});

await new Promise((done) => api.listen(0, "127.0.0.1", done));
const apiOrigin = `http://127.0.0.1:${api.address().port}`;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const server = spawn(command, ["exec", "react-router-serve", "./build/server/index.js"], {
  cwd: root,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(appPort),
    NODE_ENV: "production",
    EQCOFE_API_BASE_URL: apiOrigin,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk.toString(); });
server.stderr.on("data", (chunk) => { logs += chunk.toString(); });

let browserVerified = false;
let axeRuns = 0;

try {
  await waitForServer();

  const articles = await html("/articles");
  assert(articles.includes("راهنمای انتخاب آسیاب قهوه"), "STEP66_H_ARTICLE_LIST_READY");
  assert(articles.includes("مقاله‌های بعدی"), "STEP66_H_ARTICLE_LIST_PAGINATION");

  const invalidArticleRequests = countObserved("/articles");
  const invalidArticles = await html("/articles?cursor=" + "x".repeat(1025));
  assert(invalidArticles.includes("نشانی صفحه معتبر نیست"), "STEP66_H_ARTICLE_INVALID_CURSOR_STATE");
  assert.equal(countObserved("/articles"), invalidArticleRequests, "STEP66_H_INVALID_CURSOR_HIT_BACKEND");

  const emptyArticles = await html("/articles?cursor=empty");
  assert(emptyArticles.includes("فعلاً مقاله‌ای برای نمایش نیست"), "STEP66_H_ARTICLE_EMPTY_STATE");

  const failedArticles = await html("/articles?cursor=fail");
  assert(failedArticles.includes("دریافت مقاله‌ها انجام نشد"), "STEP66_H_ARTICLE_ERROR_STATE");

  const detail = await html("/articles/espresso-guide");
  for (const expected of [
    "راهنمای انتخاب آسیاب قهوه",
    "مقاله‌های مرتبط",
    "راهنمای ابزار دم‌آوری",
    "راهنمای انتخاب آسیاب قهوه | EQCOFE",
    "https://eqcofe.com/articles/espresso-guide",
  ]) assert(detail.includes(expected), "STEP66_H_ARTICLE_DETAIL_MISSING:" + expected);
  assert(!detail.includes('<img id="unsafe-article-body"'), "STEP66_H_ARTICLE_RAW_HTML_EXECUTABLE");
  assert(detail.includes("unsafe-article-body"), "STEP66_H_ARTICLE_ESCAPED_TEXT_MISSING");

  const relatedFail = await html("/articles/related-fail");
  assert(relatedFail.includes("مقاله معتبر با خطای جداگانه در محتوای مرتبط"), "STEP66_H_RELATED_FAILURE_HID_DETAIL");

  const sitemapResponse = await fetch(origin + "/sitemap.xml");
  assert.equal(sitemapResponse.status, 200, "STEP66_H_SITEMAP_STATUS");
  assert((sitemapResponse.headers.get("content-type") ?? "").includes("application/xml"), "STEP66_H_SITEMAP_CONTENT_TYPE");
  const sitemap = await sitemapResponse.text();
  for (const expected of [
    "https://eqcofe.com/",
    "https://eqcofe.com/articles",
    "https://eqcofe.com/articles/espresso-guide",
    "https://eqcofe.com/articles/brew-tools",
    "https://eqcofe.com/policies/terms",
    "https://eqcofe.com/policies/returns-warranty",
  ]) assert(sitemap.includes(expected), "STEP66_H_SITEMAP_ENTRY_MISSING:" + expected);
  assert(!sitemap.includes("https://eqcofe.com/archive"), "STEP66_H_ARCHIVE_MUST_NOT_BE_IN_SITEMAP");
  assert(!sitemap.includes("https://eqcofe.com/stop-sale"), "STEP66_H_STOP_SALE_MUST_NOT_BE_IN_SITEMAP");
  assert(countObserved("/content/sitemap/articles") === 2, "STEP66_H_SITEMAP_PAGINATION_NOT_BOUNDED_TWO_PAGE_FIXTURE");

  const robotsResponse = await fetch(origin + "/robots.txt");
  assert.equal(robotsResponse.status, 200, "STEP66_H_ROBOTS_STATUS");
  assert((robotsResponse.headers.get("content-type") ?? "").includes("text/plain"), "STEP66_H_ROBOTS_CONTENT_TYPE");
  const robots = await robotsResponse.text();
  assert(robots.includes("User-agent: *"), "STEP66_H_ROBOTS_AGENT");
  assert(robots.includes("Sitemap: https://eqcofe.com/sitemap.xml"), "STEP66_H_ROBOTS_SITEMAP");

  const staticExpectations = [
    ["/about", "درباره ایکوفی"],
    ["/faq", "پرسش‌های پرتکرار"],
    ["/policies/terms", "شرایط استفاده و قوانین خرید"],
    ["/policies/returns-warranty", "سیاست مرجوعی و گارانتی"],
    ["/contact", "ارسال مستقیم پیام عمومی هنوز فعال نیست"],
  ];
  for (const [pathname, expected] of staticExpectations) {
    const page = await html(pathname);
    assert(page.includes(expected), "STEP66_H_STATIC_CONTENT_MISSING:" + pathname);
  }
  const contact = await html("/contact");
  const contactMain = mainContent(contact);
  assert(!/<form\b/i.test(contactMain), "STEP66_H_CONTACT_FORM_INVENTED");
  assert(!/mailto:|tel:/i.test(contactMain), "STEP66_H_CONTACT_EXTERNAL_CHANNEL_INVENTED");
  assert(contactMain.includes("رمز یک‌بارمصرف"), "STEP66_H_CONTACT_PRIVACY_WARNING");

  const archive = await html("/archive");
  assert(archive.includes("آسیاب آرشیوشده"), "STEP66_H_ARCHIVE_READY");
  assert(archive.includes("آرشیوشده"), "STEP66_H_ARCHIVE_LABEL");
  for (const forbidden of ["2450000", "۲٬۴۵۰٬۰۰۰", "archive_reason", "available_quantity"]) {
    assert(!archive.includes(forbidden), "STEP66_H_ARCHIVE_PRIVATE_FIELD:" + forbidden);
  }
  assert(metaRobots(archive) === "noindex,follow", "STEP66_H_ARCHIVE_NOINDEX");

  const stopped = await html("/stop-sale");
  assert(stopped.includes("کتری با فروش متوقف"), "STEP66_H_STOP_SALE_READY");
  assert(stopped.includes("فروش متوقف است"), "STEP66_H_STOP_SALE_LABEL");
  assert(stopped.includes("تومان"), "STEP66_H_STOP_SALE_TOMAN");
  assert(metaRobots(stopped) === "noindex,follow", "STEP66_H_STOP_SALE_NOINDEX");
  assert(stopped.includes("ناموجود بودن به‌تنهایی به معنی توقف فروش نیست"), "STEP66_H_STOP_SALE_INVENTORY_BOUNDARY");

  const beforeArchiveInvalid = countObserved("/catalog/archive");
  assert((await html("/archive?cursor=" + "x".repeat(1025))).includes("نشانی صفحه معتبر نیست"), "STEP66_H_ARCHIVE_INVALID_CURSOR");
  assert.equal(countObserved("/catalog/archive"), beforeArchiveInvalid, "STEP66_H_ARCHIVE_INVALID_CURSOR_HIT_BACKEND");
  assert((await html("/archive?cursor=empty")).includes("محصول آرشیوشده عمومی وجود ندارد"), "STEP66_H_ARCHIVE_EMPTY");
  assert((await html("/archive?cursor=fail")).includes("دریافت فهرست انجام نشد"), "STEP66_H_ARCHIVE_ERROR");

  const beforeStopInvalid = countObserved("/catalog/stop-sale");
  assert((await html("/stop-sale?cursor=" + "x".repeat(1025))).includes("نشانی صفحه معتبر نیست"), "STEP66_H_STOP_INVALID_CURSOR");
  assert.equal(countObserved("/catalog/stop-sale"), beforeStopInvalid, "STEP66_H_STOP_INVALID_CURSOR_HIT_BACKEND");
  assert((await html("/stop-sale?cursor=empty")).includes("محصولی با فروش متوقف برای نمایش وجود ندارد"), "STEP66_H_STOP_EMPTY");
  assert((await html("/stop-sale?cursor=fail")).includes("دریافت فهرست انجام نشد"), "STEP66_H_STOP_ERROR");

  for (const entry of observed) {
    assert.equal(entry.method, "GET", "STEP66_H_PUBLIC_MUTATION_OBSERVED:" + JSON.stringify(entry));
  }

  const qaRoot = process.env.EQCOFE_BROWSER_QA_ROOT;
  if (qaRoot) {
    const qaRequire = createRequire(resolve(qaRoot, "package.json"));
    const { chromium } = qaRequire("playwright");
    const axe = qaRequire("axe-core");
    const browser = await chromium.launch({ headless: true });
    try {
      const routes = [
        "/articles",
        "/articles/espresso-guide",
        "/about",
        "/contact",
        "/faq",
        "/policies/terms",
        "/policies/returns-warranty",
        "/archive",
        "/stop-sale",
      ];

      for (const width of [320, 1200]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: "fa-IR" });
        const page = await context.newPage();
        for (const pathname of routes) {
          await page.goto(origin + pathname, { waitUntil: "networkidle" });
          await assertPageBasics(page, width + ":" + pathname);
          await runAxe(page, axe, width + ":" + pathname);
          axeRuns += 1;
        }

        await page.goto(origin + "/articles/espresso-guide", { waitUntil: "networkidle" });
        const structured = await page.locator('script[type="application/ld+json"]').textContent();
        const parsed = JSON.parse(structured ?? "{}");
        assert.equal(parsed["@type"], "Article", "STEP66_H_JSONLD_TYPE");
        assert.equal(parsed.mainEntityOfPage?.["@id"], seo.canonical_url, "STEP66_H_JSONLD_CANONICAL");
        assert.equal(await page.locator("#unsafe-article-body").count(), 0, "STEP66_H_BROWSER_RAW_HTML_EXECUTED");
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), seo.canonical_url, "STEP66_H_BROWSER_CANONICAL");
        assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "index,follow", "STEP66_H_BROWSER_ARTICLE_ROBOTS");

        await page.goto(origin + "/archive", { waitUntil: "networkidle" });
        assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,follow", "STEP66_H_BROWSER_ARCHIVE_ROBOTS");
        await page.goto(origin + "/stop-sale", { waitUntil: "networkidle" });
        assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex,follow", "STEP66_H_BROWSER_STOP_ROBOTS");

        if (width === 320) {
          await page.goto(origin + "/articles", { waitUntil: "networkidle" });
          await page.keyboard.press("Tab");
          const focus = await page.evaluate(() => ({
            className: String(document.activeElement?.className ?? ""),
            outlineWidth: Number.parseFloat(getComputedStyle(document.activeElement).outlineWidth || "0"),
            outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
          }));
          assert(focus.className.includes("skip-link"), "STEP66_H_FIRST_FOCUS_NOT_SKIP_LINK");
          assert(focus.outlineStyle !== "none" && focus.outlineWidth >= 3, "STEP66_H_VISIBLE_FOCUS");
        }

        await context.close();
      }
      browserVerified = true;
    } finally {
      await browser.close();
    }
  }

  console.log(JSON.stringify({
    status: "PASS",
    stage: "66-H",
    gate: "integrated-content-seo-policy-acceptance",
    productionBuild: true,
    readySurfaces: [
      "/articles","/articles/espresso-guide","/about","/contact","/faq",
      "/policies/terms","/policies/returns-warranty","/archive","/stop-sale",
    ],
    resources: ["/sitemap.xml","/robots.txt"],
    stateCoverage: ["ready","empty","error","invalid-cursor","partial-related-failure"],
    seo: {
      articleCanonical: true,
      articleRobots: "index,follow",
      articleJsonLd: true,
      sitemapPagination: true,
      robotsResource: true,
      archiveRobots: "noindex,follow",
      stopSaleRobots: "noindex,follow",
    },
    safety: {
      rawArticleHtmlExecuted: false,
      archivePrivateFieldsExposed: false,
      stopSaleInventoryInference: false,
      contactMutationInvented: false,
      observedPublicMethods: [...new Set(observed.map((entry) => entry.method))],
    },
    browser: browserVerified,
    browserWidths: browserVerified ? [320,1200] : [],
    axeRuns,
    rtl: true,
    reflow400EquivalentCssWidth: 320,
    runtimeMutation: false,
    graphWork: "RETIRED_AND_OUT_OF_SCOPE",
    finalClosureDeferredTo66I: true,
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  await new Promise((done) => api.close(done));
}

async function html(pathname) {
  const response = await fetch(origin + pathname, { headers: { accept: "text/html" } });
  assert.equal(response.status, 200, "STEP66_H_HTML_STATUS:" + pathname + ":" + response.status);
  return response.text();
}

function countObserved(pathname) {
  return observed.filter((entry) => entry.path === pathname).length;
}

function mainContent(source) {
  return source.match(/<main id="main-content"[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
}

function metaRobots(source) {
  return source.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i)?.[1]
    ?? source.match(/<meta[^>]+content="([^"]+)"[^>]+name="robots"/i)?.[1]
    ?? null;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error("STEP66_H_STOREFRONT_START_TIMEOUT\n" + logs);
}

async function assertPageBasics(page, label) {
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "STEP66_H_RTL:" + label);
  assert.equal(await page.locator("main h1").count(), 1, "STEP66_H_H1_COUNT:" + label);
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert(metrics.root <= metrics.viewport + 1, "STEP66_H_ROOT_OVERFLOW:" + label + ":" + JSON.stringify(metrics));
  assert(metrics.body <= metrics.viewport + 1, "STEP66_H_BODY_OVERFLOW:" + label + ":" + JSON.stringify(metrics));

  const smallTargets = await page.evaluate(() => {
    const selector = 'main a[href],main button,main input,main select,main textarea,main summary,[role="button"]';
    return [...document.querySelectorAll(selector)].flatMap((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible = style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      if (!visible || (rect.width + 0.5 >= 44 && rect.height + 0.5 >= 44)) return [];
      return [{ tag: element.tagName, text: element.textContent?.trim().slice(0, 60) ?? "", width: rect.width, height: rect.height }];
    });
  });
  assert.equal(smallTargets.length, 0, "STEP66_H_TARGET_44:" + label + ":" + JSON.stringify(smallTargets));
}

async function runAxe(page, axe, label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter((violation) => violation.tags.some((tag) => tag.startsWith("wcag")))
      .map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => node.target) }));
  });
  assert.equal(violations.length, 0, "STEP66_H_AXE:" + label + ":" + JSON.stringify(violations));
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-request-id": "step66-h" });
  response.end(JSON.stringify(body));
}

function errorEnvelope(code, message) {
  return { success: false, error: { code, message, field_errors: [] }, meta: { request_id: "step66-h" } };
}
