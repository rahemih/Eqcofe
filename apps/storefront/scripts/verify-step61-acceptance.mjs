import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const productId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const availableId = '22222222-2222-4222-8222-222222222222';
const soldOutId = '11111111-1111-4111-8111-111111111111';
const cartId = '33333333-3333-4333-8333-333333333333';
const cartToken = 'step61-h-cart-token';
const observed = [];

const variants = [
  {
    id: soldOutId, product_id: productId, sku: 'EQ-SOLDOUT', name_suffix: 'مدل ناموجود',
    status: 'active', sales_enabled: true, attributes: [],
    price: { current_toman: 900000 },
    availability: { sales_enabled: true, in_stock: false, available_quantity: 0 }, version: 1,
  },
  {
    id: availableId, product_id: productId, sku: 'EQ-READY', name_suffix: 'مدل موجود',
    status: 'active', sales_enabled: true, attributes: [],
    price: { current_toman: 1250000, old_toman: 1400000, discount_percent: 11 },
    availability: { sales_enabled: true, in_stock: true, available_quantity: 4 }, version: 1,
  },
];

const product = {
  id: productId,
  name_fa: 'آسیاب نمونه',
  slug: 'sample-grinder',
  short_description: 'آسیاب نمونه برای پذیرش یکپارچه صفحه محصول',
  primary_category: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', slug: 'grinders', name_fa: 'آسیاب' },
  additional_categories: [],
  sales_enabled: true,
  price: { current_toman: 1250000 },
  primary_image: null,
  media: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      product_id: productId, variant_id: null, media_type: 'image',
      storage_key: 'products/sample-grinder/main.webp', mime_type: 'image/webp',
      alt_text_fa: 'تصویر آسیاب نمونه', width: 1200, height: 1200, sort_order: 0,
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      product_id: productId, variant_id: availableId, media_type: 'video',
      storage_key: 'products/sample-grinder/demo.mp4', mime_type: 'video/mp4',
      alt_text_fa: 'ویدیوی آسیاب نمونه', width: 1280, height: 720, sort_order: 1,
    },
  ],
  specifications: [
    {
      attribute_value_id: '88888888-8888-4888-8888-888888888888',
      name_fa: 'جنس',
      value_text: 'استیل',
      value_numeric: null,
      value_boolean: null,
      normalized_value: 'steel',
      unit: null,
    },
    {
      attribute_value_id: '99999999-9999-4999-8999-999999999999',
      name_fa: 'وزن',
      value_text: '۵۰۰',
      value_numeric: null,
      value_boolean: null,
      normalized_value: '500',
      unit: 'گرم',
    },
  ],
  variants,
  version: 1,
  published_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-29T00:00:00.000Z',
};

const related = {
  id: '66666666-6666-4666-8666-666666666666',
  slug: 'related-grinder',
  name: 'آسیاب مرتبط',
  brand: { id: '77777777-7777-4777-8777-777777777777', name_fa: 'برند نمونه', slug: 'brand-sample' },
  primary_category: product.primary_category,
  primary_image: null,
  price: { current_toman: 800000 },
  availability: { sales_enabled: true, in_stock: true },
};

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const api = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  observed.push(`${request.method} ${url.pathname}`);

  if (request.method === 'GET' && url.pathname === '/products/sample-grinder') return json(response, 200, product);
  if (request.method === 'GET' && url.pathname === '/products/sample-grinder/variants') return json(response, 200, variants);
  if (request.method === 'GET' && url.pathname === '/categories/grinders/products') {
    return json(response, 200, {
      items: [related],
      pagination: { next_cursor: null, has_more: false },
      facets: { brands: [], price: null, availability: null, attributes: [] },
    });
  }
  if (request.method === 'GET' && url.pathname === '/products/missing-product') {
    return json(response, 404, { code: 'NOT_FOUND', message: 'not found' });
  }
  if (request.method === 'POST' && url.pathname === '/cart') {
    return json(response, 201, { data: { cart_id: cartId, cart_token: cartToken } });
  }
  if (request.method === 'POST' && url.pathname === `/cart/${cartId}/items`) {
    return json(response, 200, { data: { items: [{ id: 'line-1', variant_id: availableId, quantity: 1 }] } });
  }
  return json(response, 404, { code: 'NOT_FOUND', message: 'not found' });
});

await new Promise((done) => api.listen(0, '127.0.0.1', done));
const appPort = 41761;
const origin = `http://127.0.0.1:${appPort}`;
const apiOrigin = `http://127.0.0.1:${api.address().port}`;

const server = spawn('pnpm', ['exec', 'react-router-serve', './build/server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(appPort),
    NODE_ENV: 'production',
    EQCOFE_API_BASE_URL: apiOrigin,
    EQCOFE_MEDIA_PUBLIC_BASE_URL: 'https://media.eqcofe.test',
  },
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
  assert(ready, `STEP61_H_SERVER_START_FAILED:${logs.slice(-1000)}`);

  const response = await fetch(origin + '/product/sample-grinder');
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const fragment of [
    'آسیاب نمونه',
    'مدل موجود',
    '۴ عدد باقی مانده',
    '۱٬۲۵۰٬۰۰۰',
    'جنس',
    'استیل',
    'آسیاب مرتبط',
    'افزودن به سبد خرید',
    'تصویر آسیاب نمونه',
    'نمایش سه‌بعدی/۳۶۰ فقط زمانی فعال می‌شود',
  ]) assert(html.includes(fragment), `STEP61_H_CONTENT_MISSING:${fragment}`);

  assert(html.includes('rel="canonical"'));
  assert(html.includes('href="https://eqcofe.com/product/sample-grinder"'));
  assert(html.includes('<meta name="robots" content="index,follow"'));

  const missing = await fetch(origin + '/product/missing-product');
  assert.equal(missing.status, 200);
  const missingHtml = await missing.text();
  assert(missingHtml.includes('data-product-state="empty"'));
  assert(missingHtml.includes('<meta name="robots" content="noindex,follow"'));
  assert.equal(missingHtml.includes('rel="canonical"'), false);

  const getCalls = observed.filter((call) => call.startsWith('GET '));
  assert(getCalls.includes('GET /products/sample-grinder'));
  assert(getCalls.includes('GET /products/sample-grinder/variants'));
  assert(getCalls.includes('GET /categories/grinders/products'));

  const cartResponse = await fetch(origin + '/product/sample-grinder', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ intent: 'add-to-cart', variant_id: availableId }),
    redirect: 'manual',
  });
  assert.equal(cartResponse.status, 200, 'STEP61_H_CART_ACTION_STATUS');
  const cartHtml = await cartResponse.text();
  assert(
    cartHtml.includes('data-status="success"')
      && cartHtml.includes('این مدل به سبد خرید اضافه شد.'),
    'STEP61_H_CART_ACTION_FEEDBACK',
  );

  if (process.env.EQCOFE_BROWSER_QA_ROOT) {
    const qaRequire = createRequire(resolve(process.env.EQCOFE_BROWSER_QA_ROOT, 'package.json'));
    const { chromium } = qaRequire('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 360, height: 800 }, locale: 'fa-IR' });
      await page.goto(origin + '/product/sample-grinder');
      const radios = page.getByRole('radio');
      await radios.nth(1).click();
      await page.locator('.product-variant-state__availability').filter({ hasText: '۴ عدد باقی مانده' }).waitFor();
      await page.getByRole('button', { name: 'بعدی' }).click();
      await page.getByRole('button', { name: 'افزودن به سبد خرید' }).click();
      await page.getByText('این مدل به سبد خرید اضافه شد.').waitFor();
      assert.equal(await page.locator('.product-detail-page').getAttribute('data-product-state'), 'ready');
    } finally {
      await browser.close();
    }
  }

  assert(observed.some((call) => call === 'POST /cart'));
  assert(observed.some((call) => call === `POST /cart/${cartId}/items`));

  console.log(JSON.stringify({
    status: 'PASS',
    stage: '61-H',
    route: '/product/:slug',
    integrated: ['product','variants','price-stock','media','specifications','related','cart','seo','states'],
    browser: Boolean(process.env.EQCOFE_BROWSER_QA_ROOT),
    unsupportedCapabilityInvented: false,
  }));
} finally {
  server.kill('SIGTERM');
  await new Promise((done) => api.close(done));
}
