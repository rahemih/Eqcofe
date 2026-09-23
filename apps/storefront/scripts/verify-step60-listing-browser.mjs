import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const qaRoot = process.env.EQCOFE_BROWSER_QA_ROOT;
if (!qaRoot) throw new Error("EQCOFE_BROWSER_QA_ROOT_REQUIRED");
const qaRequire = createRequire(resolve(qaRoot, "package.json"));
const { chromium } = qaRequire("playwright");
const axe = qaRequire("axe-core");
const storefrontRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appPort = 41737;
const origin = `http://127.0.0.1:${appPort}`;
const product = {
  id: "00000000-0000-4000-8000-000000000001", slug: "grinder", name: "آسیاب دستی",
  brand: { id: "00000000-0000-4000-8000-000000000011", name_fa: "برند نمونه", slug: "brand-sample" },
  primary_category: { id: "00000000-0000-4000-8000-000000000031", name_fa: "آسیاب", slug: "grinders" },
  primary_image: null, price: { current_toman: 200000 },
  availability: { sales_enabled: true, in_stock: true },
};
const facets = {
  filtering_available: true, disabled_reason: null, brands: [product.brand],
  price_range: { min_toman: 200000, max_toman: 200000 },
  availability: { in_stock_count: 1, out_of_stock_count: 0 },
};
const api = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const body = path === "/search"
    ? { query: "آسیاب", items: [product], pagination: { has_more: false, next_cursor: null }, facets }
    : path === "/categories/grinders"
      ? { id: product.primary_category.id, parent_id: null, name_fa: "آسیاب", slug: "grinders", description: "ابزار آسیاب قهوه", status: "active", sales_enabled: true }
      : path === "/categories/grinders/filters"
        ? { category_id: product.primary_category.id, filters: [] }
        : path === "/categories/grinders/products"
          ? { items: [product], pagination: { has_more: false, next_cursor: null }, facets }
          : null;
  response.writeHead(body ? 200 : 404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body ?? { error: "not-found" }));
});
await new Promise((done) => api.listen(0, "127.0.0.1", done));
const apiPort = api.address().port;
const server = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "react-router-serve", "./build/server/index.js"], {
  cwd: storefrontRoot,
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(appPort), NODE_ENV: "production", EQCOFE_API_BASE_URL: `http://127.0.0.1:${apiPort}` },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ready) throw new Error(`STEP60_G_SERVER_START_FAILED:${output.slice(-1500)}`);
  browser = await chromium.launch({ headless: true });

  for (const width of [320, 360, 600, 840, 1200, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: "fa-IR", reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const path of ["/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8", "/category/grinders", "/category/grinders?brand=brand-sample"]) {
      await page.goto(origin + path, { waitUntil: "networkidle" });
      const metrics = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, dir: document.documentElement.dir }));
      if (metrics.scroll > metrics.viewport + 1 || metrics.dir !== "rtl") throw new Error(`STEP60_G_REFLOW_RTL:${width}:${path}:${JSON.stringify(metrics)}`);
      const moving = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0
          && [style.animationDuration, style.transitionDuration].some((duration) => duration.split(",").some((item) => Number.parseFloat(item) > 0));
      }).length);
      if (moving) throw new Error(`STEP60_G_REDUCED_MOTION:${width}:${path}:${moving}`);
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      if (robots !== (path === "/category/grinders" ? "index,follow" : "noindex,follow")) throw new Error(`STEP60_G_ROBOTS:${path}:${robots}`);
      if (path === "/category/grinders" && !((await page.title()).startsWith("آسیاب |"))) throw new Error(`STEP60_G_CATEGORY_TITLE:${await page.title()}`);
      if (path.startsWith("/search") && !((await page.title()).startsWith("جست‌وجوی «آسیاب» |"))) throw new Error(`STEP60_G_SEARCH_TITLE:${await page.title()}`);
      if (width === 320 || width === 1440) {
        await page.addScriptTag({ content: axe.source });
        const violations = await page.evaluate(async () => (await globalThis.axe.run(document)).violations.filter((v) => v.tags.some((tag) => tag.startsWith("wcag"))).map((v) => v.id));
        if (violations.length) throw new Error(`STEP60_G_AXE:${width}:${path}:${violations.join(",")}`);
      }
      if (width === 320) {
        const toggle = page.locator(".listing-controls__toggle");
        await toggle.focus();
        await page.keyboard.press("Enter");
        if (await toggle.getAttribute("aria-expanded") !== "true" || !(await page.locator("#listing-filter-panel").isVisible())) throw new Error("STEP60_G_DISCLOSURE_KEYBOARD");
        const expanded = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
        if (expanded.scroll > expanded.viewport + 1) throw new Error(`STEP60_G_EXPANDED_REFLOW:${path}:${JSON.stringify(expanded)}`);
        const expandedViolations = await page.evaluate(async () => (await globalThis.axe.run(document)).violations.filter((v) => v.tags.some((tag) => tag.startsWith("wcag"))).map((v) => v.id));
        if (expandedViolations.length) throw new Error(`STEP60_G_EXPANDED_AXE:${path}:${expandedViolations.join(",")}`);
        const targets = await page.locator(".listing-controls__toggle, .listing-controls__actions button, .listing-controls__actions a").evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
        if (targets.some((size) => size.width < 43.5 || size.height < 43.5)) throw new Error(`STEP60_G_TOUCH_TARGET:${JSON.stringify(targets)}`);
      }
    }
    await context.close();
  }
  console.log(JSON.stringify({ status: "PASS", stage: "60-G", routes: 3, widths: [320, 360, 600, 840, 1200, 1440], axe: "zero-wcag-violations", disclosure: "keyboard", rtl: true }));
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
  await new Promise((done) => api.close(done));
}
