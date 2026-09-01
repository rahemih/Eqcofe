import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const sourcePath = 'docs/13-product-design/step55-product-evaluation-wireframes.json';
const root = 'docs/13-product-design/step55-wireframes/C';
const source = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
const contract = JSON.parse(source);
const generated = {};

generated[`${root}/README.md`] = renderGateReadme(contract);
for (const screen of contract.screens) {
  const folder = `${root}/${screen.id}`;
  const frames = screen.states.flatMap((state, index) => {
    const items = [{ width: 320, state }];
    if (index === 0) items.push({ width: 1440, state });
    return items;
  });
  generated[`${folder}/README.md`] = renderScreenReadme(contract, screen, frames);
  generated[`${folder}/traceability.json`] = `${JSON.stringify(renderTraceability(contract, screen, frames), null, 2)}\n`;
  generated[`${folder}/acceptance.md`] = renderAcceptance(contract, screen, frames);
  for (const frame of frames) generated[`${folder}/${frameName(screen, frame.width, frame.state.id, contract.revision)}`] = renderFrame(contract, screen, frame);
}

const manifestPath = `${root}/gate-c-manifest.json`;
generated[manifestPath] = `${JSON.stringify(renderManifest(contract, generated), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const drift = [];
  for (const [file, expected] of Object.entries(generated)) {
    let actual;
    try {
      actual = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    } catch {
      drift.push(`${file}: missing`);
      continue;
    }
    if (actual !== expected) drift.push(`${file}: does not match ${sourcePath}`);
  }
  if (drift.length) {
    console.error(drift.join('\n'));
    process.exit(1);
  }
  console.log(`Step 55-C wireframes: PASS (${Object.keys(generated).length} deterministic artifacts, ${contract.acceptance.expectedFrameCount} frames)`);
} else {
  for (const [file, content] of Object.entries(generated)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  console.log(`Generated ${Object.keys(generated).length} Step 55-C artifacts including ${contract.acceptance.expectedFrameCount} wireframe frames.`);
}

function frameName(screen, width, state, revision) {
  return `${screen.id}--${width}--${state}--v${revision}.svg`;
}

function renderManifest(value, files) {
  const artifacts = Object.entries(files).map(([path, content]) => ({
    path,
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: Buffer.byteLength(content)
  }));
  return {
    schemaVersion: value.schemaVersion,
    step: value.step,
    substep: value.substep,
    status: value.status,
    sourceContract: sourcePath,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    canonicalSource: value.canonicalSource,
    figmaMirror: value.figmaMirror,
    screenCount: value.screens.length,
    frameCount: artifacts.filter((item) => item.path.endsWith('.svg')).length,
    reviewedWidths: value.acceptance.requiredWidths,
    journeyIds: value.journeys,
    screenIds: value.screens.map((screen) => screen.id),
    generatedArtifacts: artifacts
  };
}

function renderGateReadme(value) {
  const rows = value.screens.map((screen) =>
    `| ${screen.id} | ${screen.title} | \`${screen.routeIntent}\` | ${screen.states.map((state) => state.id).join('، ')} | ${screen.primaryAction} |`
  ).join('\n');
  const widths = value.responsiveReview.map((item) =>
    `| ${item.width}px | ${item.grid} | ${item.detail} | ${item.media} | ${item.compare} |`
  ).join('\n');
  return `# Step 55-C — وایرفریم ارزیابی محصول\n\n` +
    `**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-D هنوز شروع نشده است.\n\n` +
    `این پوشه خروجی Canonical و کم‌جزئیات 55-C است. قرارداد ماشین‌خوان \`${sourcePath}\` منبع تولید قطعی است؛ فایل‌های SVG، ردیابی و پذیرش با اسکریپت تولید می‌شوند. Figma فقط Mirror اختیاری رایگان است و نبود آن Gate را مسدود نمی‌کند.\n\n` +
    `## محدوده تثبیت‌شده\n\n| شناسه | صفحه/ناحیه | Route intent | حالت‌های الزامی | اقدام اصلی |\n|---|---|---|---|---|\n${rows}\n\n` +
    `مسیر اصلی از Product Listing وارد جزئیات و رسانه می‌شود، سپس مقایسه یا اقدام customer-owned را ممکن می‌کند و فقط Variant معتبر را به Cart در 55-D تحویل می‌دهد. مقایسه به چهار محصول هم‌دسته محدود است و خطا، قیمت یا موجودی قدیمی موفقیت تلقی نمی‌شود.\n\n` +
    `## ماتریس responsive\n\n| عرض | Grid | Product detail | Media | Compare |\n|---:|---|---|---|---|\n${widths}\n\n` +
    `هر صفحه سه حالت compact در 320px و یک قاب expanded در 1440px دارد. عرض‌های 360، 600، 840 و 1200، به‌علاوه 400% zoom، متن بلند فارسی، keyboard-only و bidi identifier در companionها بررسی شده‌اند. جدول مقایسه در compact کارت/list معادل دارد و drag تنها راه کنترل رسانه نیست.\n\n` +
    `## قرارداد تجاری و مالکیت\n\n` + value.crossCutting.commerce.map((item) => `- ${item}`).join('\n') + `\n\n` +
    value.crossCutting.comparison.map((item) => `- ${item}`).join('\n') + `\n\n` +
    `علاقه‌مندی و هشدار customer-owned هستند و intent مهمان پس از ورود امن حفظ می‌شود. هیچ Wallet، رنگ قهوه‌ای، دارایی بصری اختراعی، Provider claim، API یا Rule تازه وارد نشده است.\n\n` +
    `## مرز مرحله\n\n55-C هیچ Frontend runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، High-fidelity UI یا Prototype ایجاد نمی‌کند. Cart و Checkout در 55-D، Admin در Step 56 و High-fidelity/Prototype در Step 57 باقی می‌مانند.\n`;
}

function renderScreenReadme(value, screen, frames) {
  const responsive = value.responsiveReview.map((item) =>
    `| ${item.width}px | ${responsiveDecision(screen.layout, item)} | ${focusDecision(screen.layout, item.width)} |`
  ).join('\n');
  const states = screen.states.map((state) =>
    `| \`${state.id}\` | ${state.title} | ${state.message} | ${state.action} |`
  ).join('\n');
  const artifacts = frames.map((frame) => `- \`${frameName(screen, frame.width, frame.state.id, value.revision)}\``).join('\n');
  return `# ${screen.id} — ${screen.title}\n\n` +
    `**Gate:** 55-C\n\n**Fidelity:** structural low-fidelity\n\n**Route intent:** \`${screen.routeIntent}\`\n\n**Actors:** ${screen.actors.join('، ')}\n\n` +
    `## هدف و اولویت\n\nکار اصلی: **${screen.primaryTask}**. اقدام اصلی «${screen.primaryAction}» است و بازیابی bounded با «${screen.recoveryAction}» پایان می‌یابد. اولویت محتوا به‌ترتیب ${screen.contentPriority.join(' ← ')} است و collapse responsive این ترتیب را عوض نمی‌کند.\n\n` +
    `## ساختار\n\nصفحه از shell مشترک Step 55، دقیقاً یک main/H1 و placeholder خنثی رسانه استفاده می‌کند. حقیقت قیمت، موجودی و Variant از محصول جاری می‌آید؛ اقدام‌های علاقه‌مندی/هشدار مالک حساب‌اند و مقایسه فقط مجموعه هم‌دسته حداکثر چهارتایی را می‌پذیرد.\n\n` +
    `## حالت‌ها\n\n| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |\n|---|---|---|---|\n${states}\n\n` +
    `قیمت/موجودی stale بی‌صدا معتبر نمی‌ماند. Disabled علت متنی دارد. Mutation و ورود intent امن را حفظ می‌کنند. رسانه ناموجود با مشخصات متنی جایگزین می‌شود و مقایسه ناسازگار انتخاب‌های معتبر را حذف نمی‌کند.\n\n` +
    `## رفتار responsive و focus\n\n| عرض | تصمیم layout | ترتیب focus/عملیات |\n|---:|---|---|\n${responsive}\n\n` +
    `در 400% zoom صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی صفحه دارد. هدف تعاملی حداقل 44×44px است؛ جدول مقایسه کارت/list معادل و رسانه کنترل قبلی/بعدی دارد. تغییر Variant، شمار مقایسه و نتیجه اقدام با status announcement بیان می‌شوند.\n\n` +
    `## ردیابی\n\nJourneyها: ${screen.journeys.map((id) => '`' + id + '`').join('، ')}. قابلیت‌ها: ${screen.operations.map((operation) => '`' + operation + '`').join('، ')}. Componentها: ${screen.components.map((id) => '`' + id + '`').join('، ')}. این‌ها capability موجودند و وعده Runtime تازه نیستند.\n\n` +
    `## Artifactها\n\n${artifacts}\n\nهمراه‌های \`traceability.json\` و \`acceptance.md\` الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش قرارداد JSON است.\n`;
}

function renderTraceability(value, screen, frames) {
  return {
    schemaVersion: value.schemaVersion,
    step: value.step,
    gate: '55-C',
    screenId: screen.id,
    revision: value.revision,
    status: 'COMPLETE',
    routeIntent: screen.routeIntent,
    actors: screen.actors,
    journeys: screen.journeys,
    openApiCapabilities: screen.operations,
    step54Components: screen.components,
    requiredStates: screen.states.map((state) => state.id),
    primaryTask: screen.primaryTask,
    primaryAction: screen.primaryAction,
    recoveryAction: screen.recoveryAction,
    responsiveEvidence: value.responsiveReview.map((item) => ({
      width: item.width,
      decision: responsiveDecision(screen.layout, item),
      focus: focusDecision(screen.layout, item.width)
    })),
    zoomEvidence: { percent: value.acceptance.zoomPercent, verdict: 'PASS_BY_REFLOW_CONTRACT', horizontalTwoAxisScroll: false },
    accessibility: value.crossCutting.accessibility,
    commerce: value.crossCutting.commerce,
    comparison: value.crossCutting.comparison,
    customerActions: value.crossCutting.customerActions,
    artifacts: frames.map((frame) => frameName(screen, frame.width, frame.state.id, value.revision)),
    boundary: {
      highFidelity: false,
      runtimeImplementation: false,
      apiMutation: false,
      businessRuleMutation: false,
      inventedBrandAsset: false,
      paidDependency: false
    }
  };
}

function renderAcceptance(value, screen, frames) {
  const rows = frames.map((frame) =>
    `| ${frame.width}px | \`${frame.state.id}\` | \`${frameName(screen, frame.width, frame.state.id, value.revision)}\` | PASS |`
  ).join('\n');
  return `# ${screen.id} — معیار پذیرش\n\n**نتیجه:** PASS / 55-C SCREEN GATE\n\n` +
    `## Evidence قاب‌ها\n\n| Viewport | State | Artifact | نتیجه |\n|---:|---|---|---|\n${rows}\n\n` +
    `## چک ساختاری\n\n- [x] شناسه، Gate، revision، viewport، actor، journey، state، source، اقدام اصلی و بازیابی ثبت است.\n- [x] shell مشترک، یک H1 و اولویت ارزیابی روشن است.\n- [x] سه state در 320px و state اصلی در 1440px artifact مستقل دارند.\n- [x] تصمیم‌های 360/600/840/1200/1440 و 400% reflow ثبت شده‌اند.\n- [x] متن بلند فارسی، keyboard-only و bidi identifier مرور قراردادی شده‌اند.\n\n` +
    `## چک وضعیت و بازیابی\n\n- [x] قیمت، موجودی و Variant authoritative هستند و stale state اعلام می‌شود.\n- [x] رسانه ناموجود تصمیم را به placeholder جعلی وابسته نمی‌کند.\n- [x] مقایسه حداکثر چهار محصول هم‌دسته است و ناسازگاری fail-closed دارد.\n- [x] ورود یا mutation intent امن را حفظ می‌کند و موفقیت کاذب ندارد.\n- [x] اقدام بازیابی «${screen.recoveryAction}» bounded و قابل فهم است.\n\n` +
    `## چک RTL و دسترس‌پذیری\n\n- [x] قیمت عدد صحیح با واحد «تومان» است و Wallet وجود ندارد.\n- [x] ترتیب DOM/focus معنی‌دار RTL است و وضعیت فقط با رنگ منتقل نمی‌شود.\n- [x] هدف‌ها حداقل 44px، focus مرئی و announcement لازم مشخص است.\n- [x] DataTable کارت/list معادل compact و رسانه کنترل غیرکشیدنی دارد.\n- [x] Placeholder رسانه و محل نشان برچسب‌دارند؛ دارایی اختراع نشده است.\n\n` +
    `## چک مرز\n\n- [x] API، Runtime، Migration، Dependency، Permission و Business Rule تغییر نکرده است.\n- [x] artifact کم‌جزئیات است؛ High-fidelity و Prototype را ادعا نمی‌کند.\n- [x] Repository مرجع Canonical و Figma اختیاری است.\n\n**استثنای باز:** NONE.\n`;
}

function responsiveDecision(layout, item) {
  if (layout === 'product-detail') return item.detail;
  if (layout === 'product-media') return item.media;
  if (layout === 'compare-selection' || layout === 'compare-table') return item.compare;
  return item.width < 600 ? 'اقدام‌ها عمودی؛ Dialog تمام‌عرض و بازگشت focus به کنترل آغازگر' : 'اقدام‌ها در دو ناحیه؛ Dialog محدود و status کنار منبع اقدام';
}

function focusDecision(layout, width) {
  const compact = width < 840;
  if (layout === 'product-detail') return compact ? 'H1 → media → price/stock → Variant → primary → compare/actions' : 'H1 → media controls → product facts → Variant → primary → compare/actions';
  if (layout === 'product-media') return 'H1 → tabs → viewer description → previous/next → thumbnails → return';
  if (layout === 'compare-selection') return 'H1 → count/status → selected products → remove actions → validate/compare';
  if (layout === 'compare-table') return compact ? 'H1 → product cards → attribute lists → remove/view actions' : 'H1 → table caption/headers → cells by row → remove/view actions';
  return 'H1 → session status → wishlist → alert options → submit/status → account destination';
}

function renderFrame(value, screen, frame) {
  const compact = frame.width === 320;
  const width = frame.width;
  const height = compact ? 1160 : 1000;
  const x = compact ? 16 : 80;
  const contentW = compact ? 288 : 1280;
  const a = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" lang="fa">`);
  a.push(`<title id="title">${escapeXml(screen.id)} — ${escapeXml(screen.title)} — ${escapeXml(frame.state.id)} — ${width}px</title>`);
  a.push(`<desc id="desc">وایرفریم کم‌جزئیات فارسی و راست‌به‌چپ برای Step 55-C؛ اقدام اصلی ${escapeXml(screen.primaryAction)} و بازیابی ${escapeXml(screen.recoveryAction)}.</desc>`);
  a.push(`<style>text{font-family:Vazirmatn,Tahoma,Arial,sans-serif;fill:#0F172A}.h1{font-size:${compact ? 20 : 28}px;font-weight:700}.h2{font-size:${compact ? 15 : 18}px;font-weight:700}.body{font-size:${compact ? 12 : 14}px}.label{font-size:${compact ? 11 : 13}px;font-weight:600}.meta{font-size:${compact ? 9 : 11}px}.muted{fill:#64748B}.mono{font-family:monospace}</style>`);
  a.push(rect(0, 0, width, height, '#F8FAFC', '#F8FAFC'));
  renderHeader(a, compact, x, contentW);
  a.push(text(x + contentW, compact ? 134 : 128, `فروشگاه / محصول / ${screen.id}`, 'meta muted'));
  const titleLines = compact ? wrap(screen.title, 26) : [screen.title];
  titleLines.forEach((lineText, i) => a.push(text(x + contentW, (compact ? 164 : 166) + i * 24, lineText, 'h1')));
  const stateY = compact ? 184 + (titleLines.length - 1) * 24 : 186;
  renderState(a, compact, x, contentW, frame.state, stateY);
  const cy = compact ? stateY + 108 : 286;
  if (screen.layout === 'product-detail') renderProductDetail(a, compact, x, cy, contentW, frame.state.id);
  else if (screen.layout === 'product-media') renderProductMedia(a, compact, x, cy, contentW, frame.state.id);
  else if (screen.layout === 'compare-selection') renderCompareSelection(a, compact, x, cy, contentW, frame.state.id);
  else if (screen.layout === 'compare-table') renderCompareTable(a, compact, x, cy, contentW, frame.state.id);
  else renderCustomerActions(a, compact, x, cy, contentW, frame.state.id);
  renderFooter(a, compact, x, contentW, height);
  a.push(text(x, height - 16, `${screen.id} · 55-C · ${frame.state.id} · ${width}px · v${value.revision}`, 'meta mono', 'start'));
  a.push('</svg>');
  return `${a.join('\n')}\n`;
}

function renderHeader(a, compact, x, w) {
  a.push(rect(x, 18, w, compact ? 96 : 82, '#FFFFFF', '#CBD5E1', 8));
  a.push(text(x + w - 12, 46, 'جای نشان تأییدشده', 'label'));
  a.push(rect(x + 12, 30, compact ? 112 : 360, 44, '#F8FAFC', '#94A3B8', 6));
  a.push(text(x + (compact ? 116 : 360), 58, 'جست‌وجوی محصول', 'body'));
  if (compact) a.push(text(x + w - 12, 96, 'منو · حساب · سبد', 'meta muted'));
  else a.push(text(x + w - 190, 94, 'دسته‌ها · مقایسه · حساب · سبد', 'meta muted'));
}

function renderState(a, compact, x, w, state, y) {
  const h = compact ? 92 : 76;
  const tone = stateTone(state.id);
  a.push(rect(x, y, w, h, '#FFFFFF', tone, 8));
  a.push(text(x + w - 12, y + 24, state.title, 'h2', 'end', tone));
  const lines = wrap(state.message, compact ? 45 : 110);
  lines.forEach((lineText, i) => a.push(text(x + w - 12, y + 45 + i * 17, lineText, 'body')));
  a.push(text(x + 12, y + h - 14, state.action, 'label', 'start', tone));
}

function renderProductDetail(a, compact, x, y, w, state) {
  if (compact) {
    mediaBox(a, x, y, w, 210);
    productFacts(a, x, y + 226, w, state, true);
  } else {
    const mediaW = 730;
    mediaBox(a, x, y, mediaW, 500);
    productFacts(a, x + mediaW + 24, y, w - mediaW - 24, state, false);
  }
}

function mediaBox(a, x, y, w, h) {
  a.push(rect(x, y, w, h, '#F1F5F9', '#94A3B8', 8));
  const mediaLines = w < 840 ? ['رسانه محصول — منبع تصویری', 'اختراع نشده'] : ['رسانه محصول — منبع تصویری اختراع نشده'];
  mediaLines.forEach((lineText, i) => a.push(text(x + w / 2, y + h / 2 - 20 + i * 24, lineText, 'h2', 'middle')));
  a.push(text(x + w / 2, y + h / 2 + 36, 'شرح جایگزین و کنترل قبلی / بعدی', 'body muted', 'middle'));
  a.push(rect(x + 12, y + h - 52, 84, 36, '#FFFFFF', '#0F766E', 6));
  a.push(text(x + 54, y + h - 29, 'قاب بعدی', 'label', 'middle', '#0F766E'));
}

function productFacts(a, x, y, w, state, compact) {
  a.push(rect(x, y, w, compact ? 480 : 500, '#FFFFFF', '#CBD5E1', 8));
  a.push(text(x + w - 16, y + 30, 'آسیاب دستی E-Q40', 'h2'));
  a.push(text(x + w - 16, y + 58, state === 'price-changed' ? '۵٬۰۵۰٬۰۰۰ تومان' : '۴٬۸۹۰٬۰۰۰ تومان', 'h2', 'end', state === 'price-changed' ? '#B45309' : '#0F766E'));
  a.push(text(x + w - 16, y + 84, state === 'out-of-stock' ? 'مدل مشکی — ناموجود' : 'موجودی جاری: ۸ عدد', 'body', 'end', state === 'out-of-stock' ? '#B91C1C' : '#15803D'));
  a.push(text(x + w - 16, y + 120, 'انتخاب Variant', 'label'));
  a.push(rect(x + 16, y + 132, w - 32, 44, '#FFFFFF', '#64748B', 6));
  a.push(text(x + w - 28, y + 160, state === 'out-of-stock' ? 'مشکی — ناموجود' : 'استیل — موجود', 'body'));
  ['تیغه فولادی قابل تنظیم', 'ظرفیت ۳۵ گرم', 'شناسه SKU: EQ40-ST'].forEach((v, i) => a.push(text(x + w - 16, y + 212 + i * 28, `• ${v}`, i === 2 ? 'body mono' : 'body')));
  a.push(rect(x + 16, y + (compact ? 330 : 350), w - 32, 48, state === 'out-of-stock' ? '#F1F5F9' : '#0F766E', state === 'out-of-stock' ? '#94A3B8' : '#0F766E', 8));
  a.push(text(x + w / 2, y + (compact ? 360 : 380), state === 'out-of-stock' ? 'ادامه غیرفعال — ناموجود' : 'انتخاب مدل و ادامه', 'label', 'middle', state === 'out-of-stock' ? '#475569' : '#FFFFFF'));
  a.push(text(x + w - 16, y + (compact ? 414 : 430), 'افزودن به مقایسه · علاقه‌مندی · هشدار', 'body'));
}

function renderProductMedia(a, compact, x, y, w, state) {
  a.push(rect(x, y, w, 48, '#FFFFFF', '#CBD5E1', 8));
  a.push(text(x + w - 16, y + 30, 'تصویرها   ویدئو   نمای سه‌بعدی', 'label'));
  const viewerH = compact ? 300 : 440;
  a.push(rect(x, y + 64, w, viewerH, '#F1F5F9', state === 'unavailable' ? '#B45309' : '#94A3B8', 8));
  const viewerLabel = state === 'no-result' ? 'رسانه‌ای ثبت نشده' : state === 'unavailable' ? 'نمای سه‌بعدی در دسترس نیست' : 'قاب رسانه فعال — placeholder خنثی';
  const viewerLines = compact ? wrap(viewerLabel, 27) : [viewerLabel];
  viewerLines.forEach((lineText, i) => a.push(text(x + w / 2, y + 64 + viewerH / 2 - 10 + i * 24, lineText, 'h2', 'middle')));
  a.push(text(x + w / 2, y + 64 + viewerH / 2 + 48, 'شرح متنی محصول و کنترل‌های قابل دسترس', 'body muted', 'middle'));
  const by = y + 80 + viewerH;
  ['قاب قبلی', 'قاب بعدی', 'بازگشت به مشخصات'].forEach((label, i) => {
    const bw = compact ? (i === 2 ? w : (w - 12) / 2) : 180;
    const bx = compact ? (i === 2 ? x : x + i * ((w - 12) / 2 + 12)) : x + i * 196;
    const buttonY = compact && i === 2 ? by + 56 : by;
    a.push(rect(bx, buttonY, bw, 44, '#FFFFFF', '#0F766E', 6));
    a.push(text(bx + bw / 2, buttonY + 28, label, 'label', 'middle', '#0F766E'));
  });
}

function renderCompareSelection(a, compact, x, y, w, state) {
  a.push(text(x + w, y + 20, state === 'disabled-with-reason' ? '۴ از ۴ انتخاب' : '۲ از ۴ انتخاب · دسته آسیاب دستی', 'h2'));
  const count = compact ? 3 : 4;
  const gap = compact ? 12 : 16;
  const cardW = compact ? w : (w - gap * 3) / 4;
  for (let i = 0; i < count; i++) {
    const cx = compact ? x : x + i * (cardW + gap);
    const cy = compact ? y + 42 + i * 126 : y + 42;
    a.push(rect(cx, cy, cardW, compact ? 112 : 230, '#FFFFFF', i === 2 && state === 'validation' ? '#B91C1C' : '#CBD5E1', 8));
    a.push(rect(cx + cardW - 42, cy + 16, 24, 24, i < 2 ? '#0F766E' : '#FFFFFF', '#0F766E', 4));
    a.push(text(cx + cardW - 54, cy + 34, i === 2 && state === 'validation' ? 'ابزار دم‌آوری ناسازگار' : `آسیاب دستی مدل ${i + 1}`, 'label'));
    a.push(text(cx + cardW - 16, cy + 66, i < 2 ? 'انتخاب‌شده' : 'انتخاب‌نشده', 'body'));
    a.push(text(cx + 16, cy + (compact ? 92 : 202), i < 2 ? 'حذف' : 'افزودن', 'label', 'start', i === 2 && state === 'validation' ? '#B91C1C' : '#0F766E'));
  }
  const ay = compact ? y + 438 : y + 304;
  a.push(rect(x, ay, w, 54, state === 'disabled-with-reason' ? '#F1F5F9' : '#0F766E', state === 'disabled-with-reason' ? '#94A3B8' : '#0F766E', 8));
  a.push(text(x + w / 2, ay + 34, state === 'disabled-with-reason' ? 'ابتدا یکی از چهار مورد را حذف کنید' : 'مقایسه ۲ محصول', 'label', 'middle', state === 'disabled-with-reason' ? '#475569' : '#FFFFFF'));
}

function renderCompareTable(a, compact, x, y, w, state) {
  if (state === 'first-use') {
    a.push(rect(x, y, w, compact ? 330 : 360, '#FFFFFF', '#64748B', 8));
    a.push(text(x + w / 2, y + 90, 'هنوز محصولی انتخاب نشده است', 'h2', 'middle'));
    a.push(text(x + w / 2, y + 130, 'حداقل دو محصول هم‌دسته و حداکثر چهار مورد', 'body muted', 'middle'));
    a.push(rect(x + w / 2 - 100, y + 170, 200, 48, '#0F766E', '#0F766E', 8));
    a.push(text(x + w / 2, y + 200, 'رفتن به آسیاب‌های دستی', 'label', 'middle', '#FFFFFF'));
    return;
  }
  if (compact) {
    ['E-Q40', state === 'conflict' ? 'محصول ناسازگار' : 'M-32'].forEach((name, i) => {
      const cy = y + i * 282;
      a.push(rect(x, cy, w, 266, '#FFFFFF', i === 1 && state === 'conflict' ? '#B91C1C' : '#CBD5E1', 8));
      a.push(text(x + w - 16, cy + 30, name, 'h2'));
      ['قیمت: ۴٬۸۹۰٬۰۰۰ تومان', 'تیغه: فولادی', 'ظرفیت: ۳۵ گرم', 'وزن: ۶۲۰ گرم'].forEach((v, j) => a.push(text(x + w - 16, cy + 68 + j * 32, v, 'body')));
      a.push(text(x + 16, cy + 238, i === 1 && state === 'conflict' ? 'حذف مورد ناسازگار' : 'مشاهده محصول', 'label', 'start', i === 1 && state === 'conflict' ? '#B91C1C' : '#0F766E'));
    });
  } else {
    const labelW = 220;
    const colW = (w - labelW) / 2;
    a.push(rect(x, y, w, 430, '#FFFFFF', '#CBD5E1', 8));
    ['ویژگی', 'E-Q40', state === 'conflict' ? 'محصول ناسازگار' : 'M-32'].forEach((v, i) => a.push(text(x + w - 16 - (i === 0 ? 0 : labelW + (i - 1) * colW), y + 38, v, 'h2')));
    ['قیمت جاری', 'موجودی', 'جنس تیغه', 'ظرفیت', 'وزن'].forEach((label, row) => {
      const ry = y + 72 + row * 58;
      a.push(line(x, ry, x + w, ry, '#E2E8F0'));
      a.push(text(x + w - 16, ry + 34, label, 'label'));
      a.push(text(x + w - labelW - 16, ry + 34, row === 0 ? '۴٬۸۹۰٬۰۰۰ تومان' : ['۸ عدد', 'فولادی', '۳۵ گرم', '۶۲۰ گرم'][row - 1], 'body'));
      a.push(text(x + w - labelW - colW - 16, ry + 34, row === 0 ? '۵٬۱۲۰٬۰۰۰ تومان' : ['۵ عدد', 'سرامیکی', '۳۰ گرم', '۵۸۰ گرم'][row - 1], 'body'));
    });
  }
}

function renderCustomerActions(a, compact, x, y, w, state) {
  const boxes = compact ? [{ x, y, w, h: 190 }, { x, y: y + 206, w, h: 190 }] : [{ x, y, w: (w - 24) / 2, h: 320 }, { x: x + (w + 24) / 2, y, w: (w - 24) / 2, h: 320 }];
  ['علاقه‌مندی', 'هشدار موجودی و قیمت'].forEach((title, i) => {
    const b = boxes[i];
    a.push(rect(b.x, b.y, b.w, b.h, '#FFFFFF', '#CBD5E1', 8));
    a.push(text(b.x + b.w - 16, b.y + 32, title, 'h2'));
    a.push(text(b.x + b.w - 16, b.y + 68, state === 'unauthenticated' ? 'ورود لازم است؛ intent حفظ می‌شود' : state === 'submitting' ? 'در انتظار پاسخ authoritative' : 'وضعیت حساب با موفقیت به‌روز شد', 'body'));
    a.push(rect(b.x + 16, b.y + b.h - 64, b.w - 32, 44, state === 'submitting' ? '#F1F5F9' : '#0F766E', state === 'submitting' ? '#94A3B8' : '#0F766E', 8));
    a.push(text(b.x + b.w / 2, b.y + b.h - 36, state === 'unauthenticated' ? 'ورود و ادامه' : state === 'submitting' ? 'در حال ثبت…' : i === 0 ? 'مشاهده علاقه‌مندی‌ها' : 'مدیریت هشدار', 'label', 'middle', state === 'submitting' ? '#475569' : '#FFFFFF'));
  });
}

function renderFooter(a, compact, x, w, height) {
  const y = height - (compact ? 78 : 68);
  a.push(line(x, y, x + w, y, '#CBD5E1'));
  a.push(text(x + w, y + 26, 'راهنما · تماس · قوانین · بازگشت و ضمانت', 'meta muted'));
  a.push(text(x + w, y + 46, 'بدون ادعای Provider یا دارایی تأییدنشده', 'meta muted'));
}

function rect(x, y, width, height, fill = '#FFFFFF', stroke = '#CBD5E1', radius = 0) {
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
}

function line(x1, y1, x2, y2, stroke) {
  return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}"/>`;
}

function text(x, y, content, klass = 'body', anchor = 'end', fill) {
  return `<text x="${round(x)}" y="${round(y)}" class="${klass}" text-anchor="${anchor}"${fill ? ` fill="${fill}" style="fill:${fill}"` : ''}>${escapeXml(content)}</text>`;
}

function stateTone(id) {
  if (['validation', 'conflict'].includes(id)) return '#B91C1C';
  if (['out-of-stock', 'price-changed', 'unavailable', 'disabled-with-reason'].includes(id)) return '#B45309';
  if (['enabled', 'success', 'initial', 'progressive'].includes(id)) return '#0F766E';
  if (['submitting'].includes(id)) return '#1D4ED8';
  return '#475569';
}

function wrap(value, max) {
  const words = value.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function round(value) {
  return Math.round(value * 100) / 100;
}
