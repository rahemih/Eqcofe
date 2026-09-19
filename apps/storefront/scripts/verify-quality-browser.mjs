import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import { chromium } from "playwright";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const port = 41736;
const baseUrl = "http://127.0.0.1:" + port;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const server = spawn(command, ["exec", "react-router-serve", "./build/server/index.js"], {
  cwd: storefrontRoot,
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const representativeRoutes = [
    "/",
    "/search?q=آسیاب",
    "/product/sample-product",
    "/checkout/review",
    "/account",
    "/policies/returns-warranty",
  ];
  const widths = [320, 360, 600, 840, 1200, 1440];
  let axeRuns = 0;
  let targetMeasurements = 0;

  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      locale: "fa-IR",
    });
    const page = await context.newPage();
    await page.goto(baseUrl + "/product/sample-product", { waitUntil: "networkidle" });

    await assertNoHorizontalOverflow(page, "WIDTH_" + width);
    await assertVisibleTargetSizes(page, width);
    targetMeasurements += 1;

    const direction = await page.evaluate(() => getComputedStyle(document.body).direction);
    assert(direction === "rtl", "BROWSER_DIRECTION_NOT_RTL:" + width);

    if (width === 320) {
      await assertKeyboardAndDisclosure(page);
      await assertTextSpacingAndLongPersian(page);
    }

    if (width === 320 || width === 1440) {
      for (const pathname of representativeRoutes) {
        await page.goto(baseUrl + pathname, { waitUntil: "networkidle" });
        await runAxe(page, String(width) + ":" + pathname);
        axeRuns += 1;
      }
    }

    await context.close();
  }

  const motionContext = await browser.newContext({
    viewport: { width: 840, height: 1000 },
    locale: "fa-IR",
    reducedMotion: "reduce",
  });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(baseUrl + "/", { waitUntil: "networkidle" });
  const motion = await motionPage.evaluate(() => {
    const visible = [...document.querySelectorAll("*")].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    const violations = visible.flatMap((element) => {
      const style = getComputedStyle(element);
      const transition = maxDuration(style.transitionDuration);
      const animation = maxDuration(style.animationDuration);
      return transition > 0 || animation > 0
        ? [{ tag: element.tagName, transition, animation }]
        : [];
    });
    return violations;

    function maxDuration(value) {
      return Math.max(...value.split(",").map((part) => {
        const item = part.trim();
        if (item.endsWith("ms")) return Number.parseFloat(item);
        if (item.endsWith("s")) return Number.parseFloat(item) * 1000;
        return 0;
      }));
    }
  });
  assert(motion.length === 0, "REDUCED_MOTION_RUNTIME_VIOLATION:" + JSON.stringify(motion.slice(0, 5)));
  await motionContext.close();

  const reflowContext = await browser.newContext({
    viewport: { width: 320, height: 1000 },
    locale: "fa-IR",
  });
  const reflowPage = await reflowContext.newPage();
  await reflowPage.goto(baseUrl + "/product/sample-product", { waitUntil: "networkidle" });
  await assertNoHorizontalOverflow(reflowPage, "REFLOW_1280_AT_400_PERCENT_EQUIVALENT_320_CSS_PX");
  await reflowContext.close();

  console.log(JSON.stringify({
    status: "PASS",
    stage: "58-G",
    gate: "browser-quality",
    browser: "chromium",
    axe: {
      engine: "axe-core",
      wcagViolationCount: 0,
      runs: axeRuns,
    },
    responsiveWidths: widths,
    reflow400EquivalentCssWidth: 320,
    targetMeasurements,
    verified: {
      keyboardSkipLink: true,
      visibleFocusRingAtLeast3px: true,
      compactDisclosureKeyboard: true,
      touchTargets44x44: true,
      noHorizontalOverflow: true,
      textSpacingOverride: true,
      longPersianCopy: true,
      reducedMotionRuntime: true,
      rtlRuntime: true,
      representativeWcagAutomatedAudit: true,
    },
    conformanceClaim: "NONE_AUTOMATED_FOUNDATION_GATE_ONLY",
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

async function assertKeyboardAndDisclosure(page) {
  await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");

  const first = await page.evaluate(() => ({
    className: document.activeElement?.className ?? "",
    outlineWidth: Number.parseFloat(getComputedStyle(document.activeElement).outlineWidth || "0"),
    outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
  }));
  assert(String(first.className).includes("skip-link"), "KEYBOARD_FIRST_FOCUS_NOT_SKIP_LINK");
  assert(first.outlineStyle !== "none" && first.outlineWidth >= 3, "VISIBLE_FOCUS_RING_BELOW_3PX");

  await page.keyboard.press("Enter");
  await page.waitForTimeout(50);
  const skipResult = await page.evaluate(() => ({
    hash: location.hash,
    activeId: document.activeElement?.id ?? "",
  }));
  assert(skipResult.hash === "#main-content", "SKIP_LINK_HASH_NOT_MAIN");
  assert(skipResult.activeId === "main-content", "SKIP_LINK_DID_NOT_MOVE_PROGRAMMATIC_FOCUS");

  const toggle = page.locator(".nav-toggle");
  await toggle.focus();
  assert(await toggle.getAttribute("aria-expanded") === "false", "COMPACT_NAV_INITIAL_EXPANDED_INVALID");
  await page.keyboard.press("Enter");
  assert(await toggle.getAttribute("aria-expanded") === "true", "COMPACT_NAV_KEYBOARD_OPEN_FAILED");
  await page.keyboard.press("Enter");
  assert(await toggle.getAttribute("aria-expanded") === "false", "COMPACT_NAV_KEYBOARD_CLOSE_FAILED");
}

async function assertVisibleTargetSizes(page, width) {
  const failures = await page.evaluate(() => {
    const selector = 'a[href],button,input,select,textarea,summary,[role="button"],[tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll(selector)].flatMap((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const intersects = rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
      const visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && intersects;
      if (!visible) return [];
      if (rect.width + 0.5 >= 44 && rect.height + 0.5 >= 44) return [];
      return [{
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 60) ?? "",
        width: rect.width,
        height: rect.height,
      }];
    });
  });
  assert(failures.length === 0, "TARGET_SIZE_BELOW_44:" + width + ":" + JSON.stringify(failures.slice(0, 8)));
}

async function assertTextSpacingAndLongPersian(page) {
  await page.goto(baseUrl + "/product/sample-product", { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: [
      "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }",
      "p { margin-block-end: 2em !important; }",
    ].join("\n"),
  });
  await page.locator(".route-placeholder p").first().evaluate((element) => {
    element.textContent = "این یک متن آزمایشی بسیار طولانی فارسی برای بررسی بازچینی، فاصلهٔ متن، خوانایی و جلوگیری از برش یا هم‌پوشانی محتوا در عرض فشرده است. ".repeat(12);
  });
  await assertNoHorizontalOverflow(page, "TEXT_SPACING_LONG_PERSIAN");

  const clipped = await page.evaluate(() => [...document.querySelectorAll("main *")].flatMap((element) => {
    const style = getComputedStyle(element);
    if (style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden") {
      if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
        return [{ tag: element.tagName, className: String(element.className) }];
      }
    }
    return [];
  }));
  assert(clipped.length === 0, "TEXT_SPACING_CLIPPED:" + JSON.stringify(clipped.slice(0, 5)));
}

async function runAxe(page, label) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const result = await globalThis.axe.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter((violation) => violation.tags.some((tag) => tag.startsWith("wcag")))
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        tags: violation.tags,
        nodes: violation.nodes.map((node) => node.target),
      }));
  });
  assert(violations.length === 0, "AXE_WCAG_VIOLATION:" + label + ":" + JSON.stringify(violations));
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    rootScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  assert(metrics.rootScroll <= metrics.viewport + 1, "ROOT_HORIZONTAL_OVERFLOW:" + label + ":" + JSON.stringify(metrics));
  assert(metrics.bodyScroll <= metrics.viewport + 1, "BODY_HORIZONTAL_OVERFLOW:" + label + ":" + JSON.stringify(metrics));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { headers: { accept: "text/html" } });
      if (response.ok) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("BROWSER_QUALITY_SERVER_TIMEOUT\n" + serverOutput);
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}
