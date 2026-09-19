import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const repoRoot = resolve(storefrontRoot, "../..");
const sourceTokens = readFileSync(resolve(repoRoot, "docs/13-product-design/generated/eqcofe-design-tokens.css"), "utf8");
const appTokens = readFileSync(resolve(storefrontRoot, "app/styles/tokens.css"), "utf8");
const shellCss = readFileSync(resolve(storefrontRoot, "app/styles/shell.css"), "utf8");
const routeConfig = readFileSync(resolve(storefrontRoot, "app/routes.ts"), "utf8");

assert(sourceTokens === appTokens, "DESIGN_TOKEN_BRIDGE_DRIFT");

for (const width of [360, 600, 840, 1200, 1440]) {
  assert(shellCss.includes(`@media (min-width: ${width}px)`), `RESPONSIVE_BREAKPOINT_MISSING:${width}`);
}
assert(shellCss.includes("@media (prefers-reduced-motion: reduce)"), "REDUCED_MOTION_MISSING");
assert(shellCss.includes("min-block-size: var(--eq-size-touch-min)"), "MIN_TARGET_CONTRACT_MISSING");
assert(shellCss.includes(":focus-visible"), "VISIBLE_FOCUS_MISSING");
assert(shellCss.includes("margin-inline"), "LOGICAL_INLINE_LAYOUT_MISSING");
assert(!/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(shellCss), "PHYSICAL_DIRECTION_PROPERTY_FOUND");

for (const routePath of [
  'category/:slug','search','product/:slug','compare','cart','checkout/identity','checkout/address',
  'checkout/delivery','checkout/review','payment/return','order/:orderNumber/outcome','account',
  'account/profile','account/addresses','account/orders','account/orders/:orderNumber','account/tools',
  'wholesale','account/wholesale/apply','account/wholesale','account/returns/:returnNumber?',
  'account/warranty/:claimNumber?','articles','articles/:slug','about','contact','faq',
  'policies/terms','policies/returns-warranty'
]) {
  assert(routeConfig.includes(`route("${routePath}"`), `ROUTE_PLACEHOLDER_MISSING:${routePath}`);
}

const port = 41731;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const server = spawn(command, ["exec", "react-router-serve", "./build/server/index.js"], {
  cwd: storefrontRoot,
  env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForServer();

  const routes = [
    "/", "/search?q=آسیاب", "/category/grinders", "/product/sample-product", "/compare", "/cart",
    "/checkout/identity", "/checkout/address", "/checkout/delivery", "/checkout/review",
    "/payment/return", "/order/EQ-100/outcome", "/account", "/account/profile",
    "/account/addresses", "/account/orders", "/account/orders/EQ-100", "/account/tools",
    "/wholesale", "/account/wholesale/apply", "/account/wholesale", "/account/returns",
    "/account/returns/RET-100", "/account/warranty", "/account/warranty/WAR-100", "/articles",
    "/articles/example", "/about", "/contact", "/faq", "/policies/terms",
    "/policies/returns-warranty"
  ];

  for (const pathname of routes) {
    const response = await request(pathname);
    assert(response.status === 200, `SSR_ROUTE_FAILED:${pathname}:${response.status}`);
    assert(response.body.includes('<html lang="fa-IR" dir="rtl"'), `RTL_ROOT_MISSING:${pathname}`);
    assert(response.body.includes('href="#main-content"'), `SKIP_LINK_MISSING:${pathname}`);
    assert(count(response.body, '<main id="main-content"') === 1, `MAIN_LANDMARK_INVALID:${pathname}`);
    assert(count(response.body, "<h1") === 1, `H1_COUNT_INVALID:${pathname}`);
    assert(response.body.includes("site-header"), `HEADER_MISSING:${pathname}`);
    assert(response.body.includes("site-footer"), `FOOTER_MISSING:${pathname}`);
    assert(response.body.includes('aria-label="ناوبری اصلی"'), `PRIMARY_NAV_MISSING:${pathname}`);
    assert(response.body.indexOf("skip-link") < response.body.indexOf("site-header"), `SKIP_LINK_NOT_FIRST:${pathname}`);
  }

  console.log(JSON.stringify({
    status: "PASS",
    locale: "fa-IR",
    direction: "rtl",
    routesVerified: routes.length,
    verificationWidths: [320,360,600,840,1200,1440],
    tokenBridge: "EXACT",
    keyboardBaseline: "SKIP_LINK_AND_VISIBLE_FOCUS",
    stage: "58-C"
  }, null, 2));
} finally {
  server.kill("SIGTERM");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await request("/");
      if (response.status === 200) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`STOREFRONT_SERVER_START_TIMEOUT\n${serverOutput}`);
}

function request(pathname) {
  return new Promise((resolvePromise, rejectPromise) => {
    const url = new URL(pathname, `http://127.0.0.1:${port}`);
    const req = http.get(url, {
      headers: { accept: "text/html" },
    }, (res) => {
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
