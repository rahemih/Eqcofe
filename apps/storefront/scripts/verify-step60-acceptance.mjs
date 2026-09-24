import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const product = {
  id: '00000000-0000-4000-8000-000000000001', slug: 'grinder', name: 'آسیاب دستی',
  brand: { id: '00000000-0000-4000-8000-000000000011', name_fa: 'برند نمونه', slug: 'brand-sample' },
  primary_category: { id: '00000000-0000-4000-8000-000000000031', name_fa: 'آسیاب', slug: 'grinders' },
  primary_image: null, price: { current_toman: 200000 },
  availability: { sales_enabled: true, in_stock: true },
};
const facets = {
  filtering_available: true, disabled_reason: null, brands: [product.brand],
  price_range: { min_toman: 200000, max_toman: 200000 },
  availability: { in_stock_count: 1, out_of_stock_count: 0 },
};
const observed = [];
const api = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  observed.push(`${request.method} ${url.pathname}${url.search}`);
  let body;
  if (url.pathname === '/search') body = {
    query: url.searchParams.get('q'), items: url.searchParams.has('brand') ? [] : [product],
    pagination: { has_more: !url.searchParams.has('cursor'), next_cursor: url.searchParams.has('cursor') ? null : 'opaque-next' }, facets,
  };
  if (url.pathname === '/categories/grinders') body = {
    id: product.primary_category.id, parent_id: null, name_fa: 'آسیاب', slug: 'grinders',
    description: 'ابزار آسیاب قهوه', status: 'active', sales_enabled: true,
  };
  if (url.pathname === '/categories/grinders/filters') body = { category_id: product.primary_category.id, filters: [] };
  if (url.pathname === '/categories/grinders/products') body = {
    items: url.searchParams.has('brand') ? [] : [product],
    pagination: { has_more: !url.searchParams.has('cursor'), next_cursor: url.searchParams.has('cursor') ? null : 'opaque-next' }, facets,
  };
  response.writeHead(body ? 200 : 404, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body ?? { error: 'not-found' }));
});
await new Promise((done) => api.listen(0, '127.0.0.1', done));
const appPort = 41747;
const origin = `http://127.0.0.1:${appPort}`;
const server = spawn('pnpm', ['exec', 'react-router-serve', './build/server/index.js'], {
  cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: String(appPort), NODE_ENV: 'production', EQCOFE_API_BASE_URL: `http://127.0.0.1:${api.address().port}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (chunk) => { logs += chunk; });
server.stderr.on('data', (chunk) => { logs += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  assert(ready, `STEP60_H_SERVER_START_FAILED:${logs.slice(-1000)}`);
  async function check(path, { robots, content, canonical = false, apiPaths = [] }) {
    const start = observed.length;
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `STEP60_H_HTTP:${path}`);
    const html = await response.text();
    assert.match(html, new RegExp(`<meta name="robots" content="${robots}"`), `STEP60_H_ROBOTS:${path}`);
    for (const fragment of content) assert(html.includes(fragment), `STEP60_H_CONTENT:${path}:${fragment}`);
    assert.equal(html.includes('rel="canonical"'), canonical, `STEP60_H_CANONICAL:${path}`);
    const calls = observed.slice(start);
    assert.deepEqual(calls.map((call) => call.split('?')[0]), apiPaths, `STEP60_H_API_SCOPE:${path}`);
    return { html, calls };
  }
  const search = await check('/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8', {
    robots: 'noindex,follow', content: ['آسیاب دستی', 'تومان', 'opaque-next', 'name="brand"'], apiPaths: ['GET /search'],
  });
  assert(search.calls[0].includes('q='));
  await check('/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&brand=brand-sample', {
    robots: 'noindex,follow', content: ['data-search-state="empty"'], apiPaths: ['GET /search'],
  });
  await check('/search', { robots: 'noindex,follow', content: ['data-search-state="empty"'], apiPaths: [] });
  await check('/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8&min_price=-1', {
    robots: 'noindex,follow', content: ['data-search-state="empty"'], apiPaths: [],
  });
  const category = await check('/category/grinders', {
    robots: 'index,follow', canonical: true, content: ['آسیاب دستی', 'opaque-next', 'name="sort"'],
    apiPaths: ['GET /categories/grinders', 'GET /categories/grinders/filters', 'GET /categories/grinders/products'],
  });
  assert(category.html.includes('href="https://eqcofe.com/category/grinders"'));
  const sorted = await check('/category/grinders?sort=price_asc&cursor=opaque-next', {
    robots: 'noindex,follow', canonical: true, content: ['آسیاب دستی'],
    apiPaths: ['GET /categories/grinders', 'GET /categories/grinders/filters', 'GET /categories/grinders/products'],
  });
  assert(sorted.calls[2].includes('sort=price_asc') && sorted.calls[2].includes('cursor=opaque-next'));
  await check('/category/grinders?brand=brand-sample', {
    robots: 'noindex,follow', canonical: true, content: ['data-category-state="empty"'],
    apiPaths: ['GET /categories/grinders', 'GET /categories/grinders/filters', 'GET /categories/grinders/products'],
  });
  await check('/category/grinders?sort=relevance', {
    robots: 'noindex,follow', content: ['data-category-state="empty"'], apiPaths: [],
  });
  await check('/category/unknown', { robots: 'noindex,follow', content: ['data-category-state="empty"'], apiPaths: ['GET /categories/unknown'] });
  assert(observed.every((call) => call.startsWith('GET ')), 'STEP60_H_NON_GET_REQUEST');
  if (process.env.EQCOFE_BROWSER_QA_ROOT) {
    const qaRequire = createRequire(resolve(process.env.EQCOFE_BROWSER_QA_ROOT, 'package.json'));
    const { chromium } = qaRequire('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 360, height: 780 }, locale: 'fa-IR' });
      await page.goto(origin + '/search?q=%D8%A2%D8%B3%DB%8C%D8%A7%D8%A8');
      await page.locator('.listing-controls__toggle').click();
      await page.locator('select[name="brand"]').selectOption('brand-sample');
      await page.locator('.listing-controls__actions button').click();
      await page.waitForURL(/brand=brand-sample/);
      await page.locator('.search-page[data-search-state="empty"]').waitFor();
      await page.goto(origin + '/category/grinders');
      await page.locator('.listing-pagination a').click();
      await page.waitForURL(/cursor=opaque-next/);
      await page.locator('.listing-pagination a').waitFor({ state: 'detached' });
      assert.equal(await page.locator('.category-page').getAttribute('data-category-state'), 'ready');
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify({ status: 'PASS', stage: '60-H', ssrScenarios: 9, authoritativeApi: true }));
} finally {
  server.kill('SIGTERM');
  await new Promise((done) => api.close(done));
}
