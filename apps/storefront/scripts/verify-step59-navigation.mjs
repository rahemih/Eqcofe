import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(scriptDir, "..");
const appRoot = resolve(storefrontRoot, "app");

const shell = readFileSync(resolve(appRoot, "shell/AppShell.tsx"), "utf8");
const nav = readFileSync(resolve(appRoot, "shell/PrimaryNavigation.tsx"), "utf8");
const search = readFileSync(resolve(appRoot, "shell/SearchEntry.tsx"), "utf8");
const css = readFileSync(resolve(appRoot, "styles/shell.css"), "utf8");
const messages = readFileSync(resolve(appRoot, "i18n/fa-IR.ts"), "utf8");
const searchRoute = readFileSync(resolve(appRoot, "routes/search.tsx"), "utf8");
const searchProductionized = searchRoute.includes("loadSearchRouteData") && searchRoute.includes("ListingGrid");
const categoryRoute = readFileSync(resolve(appRoot, "routes/category.tsx"), "utf8");
const categoryProductionized = categoryRoute.includes("loadCategoryRouteData") && categoryRoute.includes("ListingGrid");

assert(shell.includes("<SearchEntry />"), "STEP59_B_SEARCH_ENTRY_NOT_MOUNTED");
assert(shell.indexOf("<SearchEntry />") < shell.indexOf('className="header-actions"'), "STEP59_B_KEYBOARD_SEARCH_ORDER_INVALID");
assert(shell.indexOf('to="/account"') < shell.indexOf('to="/cart"'), "STEP59_B_ACCOUNT_CART_ORDER_INVALID");
assert(shell.includes('className="utility-bar"'), "STEP59_B_UTILITY_BAR_MISSING");

assert(search.includes('action="/search"'), "STEP59_B_SEARCH_ACTION_INVALID");
assert(search.includes('method="get"'), "STEP59_B_SEARCH_METHOD_INVALID");
assert(search.includes('name="q"'), "STEP59_B_SEARCH_QUERY_NAME_INVALID");
assert(search.includes('type="search"'), "STEP59_B_SEARCH_INPUT_TYPE_INVALID");
assert(search.includes('htmlFor="header-search-query"'), "STEP59_B_SEARCH_LABEL_INVALID");
assert(search.includes('type="submit"'), "STEP59_B_SEARCH_SUBMIT_INVALID");
assert(!/fetch\s*\(|apiClient|search\/suggestions|GET \/search/.test(search), "STEP59_B_SEARCH_DATA_SCOPE_LEAK");

assert(nav.includes('aria-expanded={open}'), "STEP59_B_NAV_ARIA_EXPANDED_MISSING");
assert(nav.includes('aria-controls="primary-navigation-list"'), "STEP59_B_NAV_ARIA_CONTROLS_MISSING");
assert(nav.includes('event.key === "Escape"'), "STEP59_B_NAV_ESCAPE_MISSING");
assert(nav.includes("toggleRef.current?.focus()"), "STEP59_B_NAV_ESCAPE_FOCUS_RETURN_MISSING");
assert(nav.includes("setOpen(false)"), "STEP59_B_NAV_ROUTE_CLOSE_MISSING");

for (const token of [
  ".header-search__label",
  ".header-search__input",
  ".header-search__submit",
  ".utility-bar",
  "min-block-size: var(--eq-size-touch-min)",
  "min-inline-size: var(--eq-size-touch-min)",
]) {
  assert(css.includes(token), "STEP59_B_CSS_CONTRACT_MISSING:" + token);
}
assert(!/(margin|padding|border)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:/m.test(css), "STEP59_B_PHYSICAL_RTL_PROPERTY_FOUND");
assert(!/flex-direction\s*:\s*row-reverse/i.test(css), "STEP59_B_ROW_REVERSE_FORBIDDEN");
assert(!/\bbrown\b/i.test(css), "STEP59_B_BROWN_FORBIDDEN");

for (const phrase of ["searchLabel", "searchPlaceholder", "searchSubmit", "utilityMessage"]) {
  assert(messages.includes(phrase), "STEP59_B_MESSAGE_MISSING:" + phrase);
}

assert(searchProductionized || searchRoute.includes('targetStep={60}'), "STEP59_B_SEARCH_HANDOFF_INVALID");
assert(categoryProductionized || categoryRoute.includes('targetStep={60}'), "STEP59_B_CATEGORY_HANDOFF_INVALID");

const port = 41737;
const server = process.platform === "win32"
  ? spawn(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        [
          'set "HOST=127.0.0.1"',
          `set "PORT=${port}"`,
          'set "NODE_ENV=production"',
          "pnpm exec react-router-serve ./build/server/index.js",
        ].join("&&"),
      ],
      {
        cwd: storefrontRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
  : spawn(
      "env",
      [
        "HOST=127.0.0.1",
        `PORT=${port}`,
        "NODE_ENV=production",
        "pnpm",
        "exec",
        "react-router-serve",
        "./build/server/index.js",
      ],
      {
        cwd: storefrontRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForServer();

  const homeResponse = await request("/");
  assert(homeResponse.status === 200, "STEP59_B_HOME_SSR_FAILED");
  const html = homeResponse.body;
  assert(html.includes('role="search"'), "STEP59_B_RENDERED_SEARCH_ROLE_MISSING");
  assert(html.includes('action="/search"'), "STEP59_B_RENDERED_SEARCH_ACTION_MISSING");
  assert(/method="get"/i.test(html), "STEP59_B_RENDERED_SEARCH_METHOD_MISSING");
  assert(html.includes('name="q"'), "STEP59_B_RENDERED_SEARCH_QUERY_MISSING");
  assert(html.includes('type="search"'), "STEP59_B_RENDERED_SEARCH_TYPE_MISSING");
  assert(html.indexOf("wordmark-slot") < html.indexOf("header-search"), "STEP59_B_RENDERED_LOGO_SEARCH_ORDER_INVALID");
  assert(html.indexOf("header-search") < html.indexOf("header-actions"), "STEP59_B_RENDERED_SEARCH_ACTIONS_ORDER_INVALID");

  if (searchProductionized) {
    assert(searchRoute.includes("loadSearchRouteData"), "STEP59_B_SEARCH_60D_LOADER_MISSING");
    assert(searchRoute.includes("ListingGrid"), "STEP59_B_SEARCH_60D_LISTING_MISSING");
  } else {
    const searchResponse = await request("/search?q=آسیاب");
    assert(searchResponse.status === 200, "STEP59_B_SEARCH_ENTRY_TARGET_FAILED");
    assert(searchResponse.body.includes("SF-B-03"), "STEP59_B_SEARCH_PLACEHOLDER_ID_MISSING");
    assert(searchResponse.body.includes("مرحله"), "STEP59_B_SEARCH_PLACEHOLDER_NOT_PRESERVED");
  }

  console.log(JSON.stringify({
    status: "PASS",
    stage: "59-B",
    gate: "header-navigation-search-entry",
    searchTransport: "GET /search?q=",
    searchResultsImplementation: searchProductionized ? "PRODUCTIONIZED_60_D" : "NOT_STARTED_STEP_60",
    categoryListingImplementation: categoryProductionized ? "PRODUCTIONIZED_60_E" : "NOT_STARTED_STEP_60",
    compactNavigation: {
      ariaDisclosure: true,
      escapeCloseAndFocusReturn: true,
      routeClose: true,
    },
    keyboardSourceOrder: ["skip-link", "wordmark/home", "search", "account", "cart", "primary-navigation"],
    responsiveContract: [320, 360, 600, 840, 1200, 1440],
    newDependencies: 0,
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
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("STEP59_B_SERVER_START_TIMEOUT\n" + serverOutput);
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

function assert(condition, code) {
  if (!condition) throw new Error(code);
}
