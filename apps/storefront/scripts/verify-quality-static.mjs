import { spawn } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import http from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const appRoot = resolve(storefrontRoot, "app");
const repoRoot = resolve(storefrontRoot, "../..");

const rootSource = readFileSync(resolve(appRoot, "root.tsx"), "utf8");
const appShellSource = readFileSync(resolve(appRoot, "shell/AppShell.tsx"), "utf8");
const navSource = readFileSync(resolve(appRoot, "shell/PrimaryNavigation.tsx"), "utf8");
const statePanelSource = readFileSync(resolve(appRoot, "components/StatePanel.tsx"), "utf8");
const shellCss = readFileSync(resolve(appRoot, "styles/shell.css"), "utf8");
const stateCss = readFileSync(resolve(appRoot, "styles/state.css"), "utf8");
const tokenCss = readFileSync(resolve(appRoot, "styles/tokens.css"), "utf8");
const accessibilityContract = readFileSync(
  resolve(repoRoot, "docs/13-product-design/STEP-54-ACCESSIBILITY.md"),
  "utf8",
);
const responsiveContract = readFileSync(
  resolve(repoRoot, "docs/13-product-design/STEP-54-RTL-RESPONSIVE.md"),
  "utf8",
);

const appFiles = collectFiles(appRoot).filter((path) => [".ts", ".tsx", ".css"].includes(extname(path)));
const sourceFiles = appFiles.filter((path) => [".ts", ".tsx"].includes(extname(path)));
const styleFiles = appFiles.filter((path) => extname(path) === ".css");

assert(rootSource.includes('<meta name="viewport" content="width=device-width, initial-scale=1" />'), "VIEWPORT_META_MISSING");
assert(appShellSource.includes('<nav className="header-actions" aria-label="دسترسی سریع">'), "QUICK_ACCESS_NAV_SEMANTICS_MISSING");
assert(appShellSource.includes('<main id="main-content" className="main-content eq-container" tabIndex={-1}>'), "PROGRAMMATIC_MAIN_FOCUS_TARGET_MISSING");
assert(navSource.includes("aria-expanded={open}"), "DISCLOSURE_ARIA_EXPANDED_MISSING");
assert(navSource.includes('aria-controls="primary-navigation-list"'), "DISCLOSURE_ARIA_CONTROLS_MISSING");
assert(statePanelSource.includes("role={role}"), "ASYNC_STATUS_ROLE_MISSING");
assert(statePanelSource.includes('aria-live={urgent ? "assertive" : "polite"}'), "ASYNC_LIVE_REGION_MISSING");
assert(statePanelSource.includes('<bdi dir="ltr">{requestId}</bdi>'), "REQUEST_ID_BIDI_ISOLATION_MISSING");

for (const path of sourceFiles) {
  const source = readFileSync(path, "utf8");
  const label = relative(path);
  assert(!/\bautoFocus\b/.test(source), "AUTOFOCUS_FORBIDDEN:" + label);
  assert(!/tabIndex\s*=\s*\{\s*[1-9]\d*\s*\}/.test(source), "POSITIVE_TABINDEX_FORBIDDEN:" + label);
  assert(!/dangerouslySetInnerHTML/.test(source), "UNSAFE_HTML_RENDERING_FORBIDDEN:" + label);
  assert(
    !/<(?:div|span|p|li|section|article)\b[^>]*\bonClick\s*=/s.test(source),
    "NON_SEMANTIC_CLICK_TARGET:" + label,
  );
}

const combinedCss = styleFiles.map((path) => readFileSync(path, "utf8")).join("\n");
const runtimeCss = shellCss + "\n" + stateCss;

assert(!/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(runtimeCss), "PHYSICAL_RTL_PROPERTY_FOUND");
assert(!/flex-direction\s*:\s*row-reverse/i.test(runtimeCss), "ROW_REVERSE_FORBIDDEN");
assert(!/direction\s*:\s*ltr/i.test(runtimeCss), "CSS_DIRECTION_OVERRIDE_FORBIDDEN");
assert(!/outline\s*:\s*(?:none|0(?:\D|$))/i.test(runtimeCss), "FOCUS_OUTLINE_REMOVAL_FORBIDDEN");
assert(!/overflow\s*:\s*hidden/i.test(runtimeCss), "TEXT_REFLOW_CLIPPING_RISK");
assert(!/white-space\s*:\s*nowrap/i.test(runtimeCss), "TEXT_NOWRAP_REFLOW_RISK");
assert(!/text-overflow\s*:/i.test(runtimeCss), "TEXT_TRUNCATION_REQUIRES_EXPLICIT_ACCESSIBLE_PATTERN");
assert(!/(?:-webkit-)?line-clamp\s*:/i.test(runtimeCss), "LINE_CLAMP_FORBIDDEN");
assert(!/(?:^|[;{\s])(?:height|block-size)\s*:\s*\d+px/i.test(runtimeCss), "FIXED_BLOCK_SIZE_REFLOW_RISK");
assert(!/\bbrown\b/i.test(combinedCss), "BROWN_COLOR_TOKEN_FORBIDDEN");

for (const width of [360, 600, 840, 1200, 1440]) {
  assert(shellCss.includes("@media (min-width: " + width + "px)"), "RESPONSIVE_BREAKPOINT_MISSING:" + width);
}
assert(shellCss.includes("@media (prefers-reduced-motion: reduce)"), "REDUCED_MOTION_GATE_MISSING");
assert(shellCss.includes("transition-duration: 0ms !important"), "REDUCED_MOTION_TRANSITION_RESET_MISSING");
assert(shellCss.includes("animation-duration: 0ms !important"), "REDUCED_MOTION_ANIMATION_RESET_MISSING");
assert(shellCss.includes("min-inline-size: var(--eq-size-touch-min)"), "MIN_INLINE_TARGET_GATE_MISSING");
assert(shellCss.includes("min-block-size: var(--eq-size-touch-min)"), "MIN_BLOCK_TARGET_GATE_MISSING");
assert(shellCss.includes(":focus-visible"), "FOCUS_VISIBLE_GATE_MISSING");
assert(shellCss.includes("max-inline-size: calc(1280px"), "CONTENT_MAX_GATE_MISSING");
assert(shellCss.includes("overflow-wrap: anywhere"), "LONG_TECHNICAL_TEXT_WRAP_GATE_MISSING");
assert(tokenCss.includes("--eq-size-touch-min: 44px;"), "TOUCH_TOKEN_DRIFT");
assert(tokenCss.includes("--eq-border-focus: 3px;"), "FOCUS_RING_TOKEN_DRIFT");

for (const phrase of ["Text contrast","Focus","Keyboard","Target","Reflow","Text spacing","RTL reading","Status","Async","Motion"]) {
  assert(accessibilityContract.includes(phrase), "ACCESSIBILITY_MATRIX_TERM_MISSING:" + phrase);
}
for (const width of ["320", "360", "600", "840", "1200", "1440"]) {
  assert(responsiveContract.includes(width), "RESPONSIVE_CONTRACT_WIDTH_MISSING:" + width);
}
assert(responsiveContract.includes("400%"), "REFLOW_400_CONTRACT_MISSING");

const port = 41735;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const server = spawn(command, ["exec", "react-router-serve", "./build/server/index.js"], {
  cwd: storefrontRoot,
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

const routes = [
  "/", "/search?q=آسیاب", "/category/grinders", "/product/sample-product", "/compare", "/cart",
  "/checkout/identity", "/checkout/address", "/checkout/delivery", "/checkout/review",
  "/payment/return", "/order/EQ-100/outcome", "/account", "/account/profile",
  "/account/addresses", "/account/orders", "/account/orders/EQ-100", "/account/tools",
  "/wholesale", "/account/wholesale/apply", "/account/wholesale", "/account/returns",
  "/account/returns/RET-100", "/account/warranty", "/account/warranty/WAR-100", "/articles",
  "/articles/example", "/about", "/contact", "/faq", "/policies/terms",
  "/policies/returns-warranty",
];

try {
  await waitForServer();
  for (const pathname of routes) {
    const response = await request(pathname);
    assert(response.status === 200, "QUALITY_SSR_ROUTE_FAILED:" + pathname + ":" + response.status);
    const html = stripScripts(response.body);
    assert(html.includes('<html lang="fa-IR" dir="rtl"'), "QUALITY_RTL_ROOT_MISSING:" + pathname);
    assert(html.includes('name="viewport" content="width=device-width, initial-scale=1"'), "QUALITY_VIEWPORT_META_MISSING:" + pathname);
    assert(count(html, '<main id="main-content"') === 1, "QUALITY_MAIN_COUNT_INVALID:" + pathname);
    assert(count(html, "<h1") === 1, "QUALITY_H1_COUNT_INVALID:" + pathname);
    assert(html.indexOf("skip-link") < html.indexOf("site-header"), "QUALITY_SKIP_LINK_ORDER_INVALID:" + pathname);
    assert(html.includes('class="header-actions" aria-label="دسترسی سریع"'), "QUALITY_QUICK_NAV_MISSING:" + pathname);
    assert(html.includes('aria-label="ناوبری اصلی"'), "QUALITY_PRIMARY_NAV_MISSING:" + pathname);
    assert(!/\stabindex="[1-9]\d*"/i.test(html), "QUALITY_POSITIVE_TABINDEX_RENDERED:" + pathname);
    assert(!/\sautofocus(?:=|\s|>)/i.test(html), "QUALITY_AUTOFOCUS_RENDERED:" + pathname);
    assertUniqueIds(html, pathname);
    assertAriaControls(html, pathname);
    assertInteractiveNames(html, pathname);
    assertImagesHaveAlt(html, pathname);
  }

  console.log(JSON.stringify({
    status: "PASS",
    stage: "58-G",
    gate: "static-and-ssr-quality",
    routesVerified: routes.length,
    widthsContract: [320, 360, 600, 840, 1200, 1440],
    reflow400Contract: true,
    focusRingPx: 3,
    minTargetPx: 44,
    wcagTarget: "2.2-AA-foundation-no-conformance-claim",
    verified: {
      semanticQuickNavigation: true,
      keyboardSourceOrderGuards: true,
      positiveTabindexRejected: true,
      autofocusRejected: true,
      nonSemanticClickRejected: true,
      logicalRtlCss: true,
      reflowClippingGuards: true,
      reducedMotion: true,
      uniqueRenderedIds: true,
      ariaControlsTargets: true,
      interactiveAccessibleNames: true,
      imageAltContract: true,
      allPlaceholderRoutesSsr: true,
    },
  }, null, 2));
} finally {
  server.kill("SIGTERM");
}

function collectFiles(root) {
  const entries = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) entries.push(...collectFiles(path));
    else entries.push(path);
  }
  return entries;
}

function relative(path) {
  return path.slice(storefrontRoot.length + 1).replaceAll("\\", "/");
}

function stripScripts(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

function assertUniqueIds(html, pathname) {
  const ids = [...html.matchAll(/\sid="([^"]+)"/gi)].map((match) => match[1]);
  assert(new Set(ids).size === ids.length, "QUALITY_DUPLICATE_ID:" + pathname);
}

function assertAriaControls(html, pathname) {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/gi)].map((match) => match[1]));
  const refs = [...html.matchAll(/\saria-controls="([^"]+)"/gi)]
    .flatMap((match) => match[1].split(/\s+/).filter(Boolean));
  for (const ref of refs) assert(ids.has(ref), "QUALITY_ARIA_CONTROLS_TARGET_MISSING:" + pathname + ":" + ref);
}

function assertInteractiveNames(html, pathname) {
  for (const match of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const attrs = match[2];
    const inner = match[3];
    const ariaLabel = attrs.match(/\saria-label="([^"]+)"/i)?.[1]?.trim() ?? "";
    const text = stripTags(inner).replace(/&[^;]+;/g, " ").trim();
    assert(Boolean(ariaLabel || text), "QUALITY_INTERACTIVE_NAME_MISSING:" + pathname + ":" + match[1]);
    if (match[1].toLowerCase() === "a") {
      const href = attrs.match(/\shref="([^"]*)"/i)?.[1] ?? "";
      assert(href.trim() !== "", "QUALITY_EMPTY_HREF:" + pathname);
    }
  }
}

function assertImagesHaveAlt(html, pathname) {
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    assert(/\salt="[^"]*"/i.test(match[1]), "QUALITY_IMAGE_ALT_MISSING:" + pathname);
  }
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request("/");
      if (response.status === 200) return;
    } catch {}
    await delay(250);
  }
  throw new Error("QUALITY_SERVER_START_TIMEOUT\n" + serverOutput);
}

function request(pathname) {
  return new Promise((resolvePromise, rejectPromise) => {
    const url = new URL(pathname, "http://127.0.0.1:" + port);
    const req = http.get(url, { headers: { accept: "text/html" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolvePromise({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", rejectPromise);
  });
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}
