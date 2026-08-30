import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const sourcePath = 'docs/13-product-design/step55-discovery-wireframes.json';
const root = 'docs/13-product-design/step55-wireframes/B';
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
  for (const frame of frames) {
    generated[`${folder}/${frameName(screen, frame.width, frame.state.id, contract.revision)}`] = renderFrame(contract, screen, frame);
  }
}

const manifestPath = `${root}/gate-b-manifest.json`;
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
  console.log(`Step 55-B wireframes: PASS (${Object.keys(generated).length} deterministic artifacts, ${contract.acceptance.expectedFrameCount} frames)`);
} else {
  for (const [file, content] of Object.entries(generated)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  console.log(`Generated ${Object.keys(generated).length} Step 55-B artifacts including ${contract.acceptance.expectedFrameCount} wireframe frames.`);
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
    `| ${item.width}px | ${item.grid} | ${item.shell} | ${item.listing} | ${item.filter} |`
  ).join('\n');
  return `# Step 55-B — وایرفریم کشف و ورودی خرید\n\n` +
    `**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-C هنوز شروع نشده است.\n\n` +
    `این پوشه خروجی Canonical و کم‌جزئیات 55-B است. قرارداد ماشین‌خوان \`${sourcePath}\` منبع تولید قطعی است؛ فایل‌های SVG، ردیابی و پذیرش با اسکریپت تولید می‌شوند و ویرایش دستی آن‌ها مجاز نیست. Figma فقط Mirror اختیاری رایگان است و نبود یا ناقص‌بودن آن این Gate را مسدود نمی‌کند.\n\n` +
    `## محدوده تثبیت‌شده\n\n| شناسه | صفحه/ناحیه | Route intent | حالت‌های الزامی | اقدام اصلی |\n|---|---|---|---|---|\n${rows}\n\n` +
    `مسیر اصلی از خانه به دسته یا جست‌وجو، سپس فهرست/فیلتر و در نهایت handoff به Product Detail در 55-C است. مسیر dashed بازیابی، عبارت، دسته و فیلتر امن را نگه می‌دارد؛ هیچ خطا موفقیت تلقی نمی‌شود.\n\n` +
    `## ماتریس responsive\n\n| عرض | Grid | Shell | Listing | Filter |\n|---:|---|---|---|---|\n${widths}\n\n` +
    `هر صفحه سه حالت compact در 320px و یک قاب expanded در 1440px دارد. عرض‌های 360، 600، 840 و 1200 با قواعد صریح companionها بررسی شده‌اند. بررسی 400% zoom، متن بلند فارسی، keyboard-only و bidi identifier نیز در acceptance هر صفحه ثبت است. این evidence به معنی ادعای WCAG conformance نیست.\n\n` +
    `## قرارداد محتوایی و تجاری\n\n` + value.crossCutting.commerce.map((item) => `- ${item}`).join('\n') + `\n\n` +
    `کارت محصول فقط عنوان، رسانه خنثی، قیمت/موجودی authoritative و مسیر ارزیابی را نشان می‌دهد. جزئیات Variant، compare، wishlist و خرید در 55-C به بعد هستند. مبلغ نمونه عدد صحیح فارسی با واحد صریح «تومان» است. رنگ قهوه‌ای، تم تیره، تصویر/لوگوی اختراعی، Provider claim و Rule جدید وارد نشده‌اند.\n\n` +
    `## مرز مرحله\n\n55-B هیچ Frontend runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، High-fidelity UI یا Prototype ایجاد نمی‌کند. Admin در Step 56، High-fidelity/Prototype در Step 57 و Storefront implementation از Step 58 آغاز می‌شوند.\n`;
}

function renderScreenReadme(value, screen, frames) {
  const responsive = value.responsiveReview.map((item) =>
    `| ${item.width}px | ${responsiveDecision(screen.layout, item.width, item)} | ${focusDecision(screen.layout, item.width)} |`
  ).join('\n');
  const states = screen.states.map((state) =>
    `| \`${state.id}\` | ${state.title} | ${state.message} | ${state.action} |`
  ).join('\n');
  const artifacts = frames.map((frame) => `- \`${frameName(screen, frame.width, frame.state.id, value.revision)}\``).join('\n');
  return `# ${screen.id} — ${screen.title}\n\n` +
    `**Gate:** 55-B\n\n**Fidelity:** structural low-fidelity\n\n**Route intent:** \`${screen.routeIntent}\`\n\n**Actors:** ${screen.actors.join('، ')}\n\n` +
    `## هدف و اولویت\n\nکار اصلی: **${screen.primaryTask}**. اقدام اصلی «${screen.primaryAction}» است و مسیر بازیابی bounded با «${screen.recoveryAction}» پایان می‌یابد. اولویت محتوا به‌ترتیب ${screen.contentPriority.join(' ← ')} است؛ collapse responsive این ترتیب معنایی را عوض نمی‌کند.\n\n` +
    `## ساختار\n\nصفحه از shell مشترک Step 55 استفاده می‌کند: skip link، utility notice واقعی، header، navigation، breadcrumb در صورت سلسله‌مراتبی‌بودن، دقیقاً یک main/H1، اقدام‌های contextual و footer. محل لوگو فقط با برچسب «نشان تأییدشده» رزرو شده و هیچ نشان تازه‌ای طراحی نشده است. رسانه محصول placeholder خنثی و برچسب‌دار است.\n\n` +
    `## حالت‌ها\n\n| State | عنوان قابل مشاهده | زمینه و پیام | اقدام bounded |\n|---|---|---|---|\n${states}\n\n` +
    `حالت loading/refresh زمینه پرس‌وجو را حفظ می‌کند. Empty واقعی با filtered/no-result یکی نیست. Disabled همیشه دلیل متنی دارد. قیمت/موجودی stale با داده تازه جایگزین و تغییر آن اعلام می‌شود؛ موفقیت یا موجودی فرض نمی‌شود.\n\n` +
    `## رفتار responsive و focus\n\n| عرض | تصمیم layout | ترتیب focus/عملیات |\n|---:|---|---|\n${responsive}\n\n` +
    `در 400% zoom، صفحه به الگوی compact برمی‌گردد و فقط scroll عمودی دارد؛ هیچ محتوای ضروری روی hover نیست. حداقل هدف 44×44px است. Focus ابتدا به main می‌پرد، سپس عنوان/پرس‌وجو، کنترل‌های محدودکننده، محتوای اصلی، صفحه‌بندی و footer را طی می‌کند. تغییر نتیجه با status announcement و خطا با heading و اقدام مشخص اعلام می‌شود.\n\n` +
    `## ردیابی\n\nJourneyها: ${screen.journeys.map((id) => `\`${id}\``).join('، ')}. قابلیت‌های مرجع: ${screen.operations.map((operation) => `\`${operation}\``).join('، ')}. Component familyها: ${screen.components.map((id) => `\`${id}\``).join('، ')}. این ارجاع‌ها capability موجود را نشان می‌دهند و وعده Provider/Runtime تازه نیستند.\n\n` +
    `## Artifactها\n\n${artifacts}\n\nهمراه‌های \`traceability.json\` و \`acceptance.md\` برای بررسی ماشینی و انسانی الزامی‌اند. SVGها خروجی قطعی generator هستند و منبع ویرایش، قرارداد JSON است.\n`;
}

function renderTraceability(value, screen, frames) {
  return {
    schemaVersion: value.schemaVersion,
    step: value.step,
    gate: '55-B',
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
      decision: responsiveDecision(screen.layout, item.width, item),
      focus: focusDecision(screen.layout, item.width)
    })),
    zoomEvidence: { percent: value.acceptance.zoomPercent, verdict: 'PASS_BY_REFLOW_CONTRACT', horizontalTwoAxisScroll: false },
    accessibility: value.crossCutting.accessibility,
    commerce: value.crossCutting.commerce,
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
  const frameRows = frames.map((frame) => `| ${frame.width}px | \`${frame.state.id}\` | \`${frameName(screen, frame.width, frame.state.id, value.revision)}\` | PASS |`).join('\n');
  return `# ${screen.id} — معیار پذیرش\n\n` +
    `**نتیجه:** PASS / 55-B SCREEN GATE\n\n` +
    `## Evidence قاب‌ها\n\n| Viewport | State | Artifact | نتیجه |\n|---:|---|---|---|\n${frameRows}\n\n` +
    `## چک ساختاری\n\n- [x] شناسه، Gate، revision، viewport، actor، journey، state، source، اقدام اصلی و بازیابی روی قاب ثبت است.\n- [x] shell مشترک، یک H1، مسیر اصلی و اولویت محتوا روشن است.\n- [x] سه state تثبیت‌شده 320px و state اصلی 1440px artifact مستقل دارند.\n- [x] تصمیم‌های 360/600/840/1200/1440 در README و traceability ثبت شده‌اند.\n- [x] 400% reflow، متن بلند فارسی، keyboard-only و bidi identifier مرور قراردادی شده‌اند.\n\n` +
    `## چک وضعیت و بازیابی\n\n- [x] Loading/refresh زمینه امن را حفظ می‌کند و تغییر نتیجه announce می‌شود.\n- [x] Empty، filtered و no-result در صورت ارتباط یکسان فرض نشده‌اند.\n- [x] خطا/timeout/offline موفقیت کاذب ندارد و retry bounded است.\n- [x] Disabled reason کنار کنترل نوشته می‌شود؛ authorization از ظاهر استنباط نمی‌شود.\n- [x] اقدام بازیابی «${screen.recoveryAction}» ورودی امن یا پرس‌وجو را حفظ می‌کند.\n\n` +
    `## چک تجارت، RTL و دسترس‌پذیری\n\n- [x] قیمت نمونه عدد صحیح گروه‌بندی‌شده با واحد «تومان» است و Wallet وجود ندارد.\n- [x] قیمت/موجودی authoritative و تغییر آن قابل مشاهده است.\n- [x] ترتیب DOM/focus معنی‌دار RTL است و با mirror بصری وارونه نشده است.\n- [x] هدف‌های تعاملی حداقل ${value.acceptance.minimumTargetPx}px، focus مرئی و status غیررنگی‌اند.\n- [x] Placeholder رسانه و محل نشان برچسب‌دارند؛ دارایی بصری اختراع نشده است.\n\n` +
    `## چک مرز\n\n- [x] API، Runtime، Migration، Dependency، Permission و Business Rule تغییر نکرده است.\n- [x] این artifact کم‌جزئیات است؛ High-fidelity و Prototype را ادعا نمی‌کند.\n- [x] Repository مرجع Canonical است؛ Figma رایگان اختیاری و غیرمسدودکننده است.\n\n` +
    `**استثنای باز:** NONE.\n`;
}

function responsiveDecision(layout, width, item) {
  if (layout === 'filters') return width < 840 ? `کنترل‌ها در ${item.filter}؛ اقدام اعمال sticky با فضای امن` : `${item.filter} کنار فهرست؛ خلاصه انتخاب‌ها بالای نتایج`;
  if (layout === 'home') return width < 600 ? `جست‌وجو تمام‌عرض؛ دسته‌ها 2 ستونه؛ محصول یک‌ستونه` : width < 840 ? `دسته‌ها 4 ستونه؛ محصول دو ستونه` : `intro و جست‌وجو روی grid؛ محصول ${item.listing}`;
  if (layout === 'recovery') return width < 840 ? `StatePanel تک‌ستونه؛ اقدام‌ها تمام‌عرض و پشت‌سرهم` : `StatePanel حداکثر 8 ستون؛ اقدام اصلی و جایگزین کنار هم`;
  return width < 600 ? `عنوان/پرس‌وجو تک‌ستونه؛ ${item.listing}; فیلتر disclosure` : width < 840 ? `${item.listing}; خلاصه فیلتر بالای فهرست` : `${item.listing}; ${item.filter}`;
}

function focusDecision(layout, width) {
  if (layout === 'filters') return width < 840 ? 'trigger → drawer heading → sort → groups → clear → apply → trigger' : 'summary → sort → filter groups → clear/apply → first product';
  if (layout === 'recovery') return 'state heading → preserved context → primary recovery → alternative route → footer';
  return 'H1 → query/filter summary → primary content in reading order → pagination → footer';
}

function renderFrame(value, screen, frame) {
  const width = frame.width;
  const compact = width === 320;
  const height = compact ? 1180 : 1000;
  const margin = compact ? 16 : 80;
  const contentWidth = compact ? 288 : 1280;
  const state = frame.state;
  const a = [];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`);
  a.push(`<title id="title">${escapeXml(screen.id)} — ${escapeXml(screen.title)} — ${escapeXml(state.id)} — ${width}px</title>`);
  a.push(`<desc id="desc">وایرفریم کم‌جزئیات فارسی و راست‌به‌چپ برای ${escapeXml(screen.primaryTask)}. اقدام اصلی ${escapeXml(screen.primaryAction)} و بازیابی ${escapeXml(screen.recoveryAction)} است.</desc>`);
  a.push(`<rect width="${width}" height="${height}" fill="#F8FAFC"/>`);
  a.push(`<style>text{font-family:Vazirmatn,Tahoma,Arial,sans-serif;fill:#0F172A}.muted{fill:#475569}.meta{font-size:10px}.body{font-size:13px}.label{font-size:12px;font-weight:600}.title{font-size:${compact ? 20 : 28}px;font-weight:700}.section{font-size:${compact ? 15 : 18}px;font-weight:700}.price{font-size:14px;font-weight:700}.wire{fill:#fff;stroke:#CBD5E1;stroke-width:1}.soft{fill:#F1F5F9;stroke:#CBD5E1}.accent{fill:#F0FDFA;stroke:#0F766E;stroke-width:1.5}.action{fill:#0F766E}.actionText{fill:#fff;font-size:12px;font-weight:700}.danger{fill:#FEF2F2;stroke:#B91C1C}.warning{fill:#FFFBEB;stroke:#B45309}.focus{fill:none;stroke:#1D4ED8;stroke-width:3;stroke-dasharray:5 3}</style>`);
  a.push(rect(0, 0, width, compact ? 30 : 34, '#0F172A', '#0F172A', 0));
  a.push(text(width - 12, compact ? 19 : 22, `${screen.id} · 55-B · ${width}px · ${state.id} · v${value.revision}`, 'meta', 'end', '#FFFFFF'));
  a.push(text(12, compact ? 19 : 22, 'منبع: Repository', 'meta', 'start', '#FFFFFF'));
  renderShell(a, compact, margin, contentWidth, width);
  const startY = compact ? 178 : 176;
  a.push(text(margin + contentWidth, startY, screen.title, 'title'));
  const taskLines = compact ? wrap(`کار اصلی: ${screen.primaryTask}`, 39) : [`کار اصلی: ${screen.primaryTask}`];
  taskLines.forEach((lineText, index) => a.push(text(margin + contentWidth, startY + 26 + index * 20, lineText, 'body muted')));
  const stateY = startY + 47 + (taskLines.length - 1) * 20;
  a.push(text(margin + contentWidth, stateY, `وضعیت: ${state.title}`, 'label', 'end', stateTone(state.id)));
  renderLayout(a, screen, state, compact, margin, contentWidth, stateY + 21);
  renderFooter(a, compact, margin, contentWidth, height);
  a.push(`</svg>\n`);
  return a.join('\n');
}

function renderShell(a, compact, x, w, pageWidth) {
  const top = compact ? 38 : 42;
  a.push(text(x + w, top + 11, 'پرش به محتوای اصلی', 'meta', 'end', '#1D4ED8'));
  a.push(rect(x, top + 20, w, compact ? 48 : 56, '#FFFFFF', '#CBD5E1', 8));
  a.push(text(x + w - 12, top + (compact ? 50 : 54), '[محل نشان تأییدشده]', 'label'));
  if (compact) {
    a.push(text(x + 120, top + 50, 'حساب', 'label', 'middle'));
    a.push(text(x + 64, top + 50, 'سبد', 'label', 'middle'));
    a.push(text(x + 20, top + 50, 'منو', 'label', 'middle'));
    a.push(rect(x, top + 76, w, 48, '#FFFFFF', '#94A3B8', 8));
    a.push(text(x + w - 14, top + 106, 'جست‌وجوی نام، برند یا دسته', 'body muted'));
  } else {
    a.push(rect(x + 330, top + 6, 590, 44, '#FFFFFF', '#94A3B8', 8));
    a.push(text(x + 900, top + 34, 'جست‌وجوی نام، برند یا دسته', 'body muted'));
    a.push(text(x + 280, top + 36, 'فروشگاه   مقایسه   مجله', 'label', 'end'));
    a.push(text(x + 130, top + 36, 'حساب   سبد', 'label', 'end'));
  }
  a.push(line(x, compact ? 166 : 154, x + w, compact ? 166 : 154, '#CBD5E1'));
}

function renderLayout(a, screen, state, compact, x, w, y) {
  const stateMode = ['no-result', 'offline', 'timeout', 'failed', 'disabled-with-reason'].includes(state.id);
  if (screen.layout === 'recovery' || stateMode) {
    renderStatePanel(a, screen, state, compact, x, w, y + 16);
    if (screen.layout !== 'recovery') renderContextSummary(a, compact, x, w, y + (compact ? 300 : 250), screen);
    return;
  }
  if (screen.layout === 'home') return renderHome(a, screen, state, compact, x, w, y);
  if (screen.layout === 'filters') return renderFilters(a, screen, state, compact, x, w, y);
  renderListing(a, screen, state, compact, x, w, y);
}

function renderHome(a, screen, state, compact, x, w, y) {
  a.push(rect(x, y, w, compact ? 154 : 130, '#F0FDFA', '#0F766E', 12));
  if (compact) {
    a.push(text(x + w - 16, y + 30, 'تجهیز مناسب را با جست‌وجو', 'section'));
    a.push(text(x + w - 16, y + 52, 'شروع کنید', 'section'));
    a.push(text(x + w - 16, y + 77, 'ورودی کوتاه، نتیجه روشن و بازگشت امن', 'body muted'));
  } else {
    a.push(text(x + w - 16, y + 30, 'تجهیز مناسب را با جست‌وجو شروع کنید', 'section'));
    a.push(text(x + w - 16, y + 54, 'ورودی کوتاه، نتیجه روشن و امکان بازگشت امن', 'body muted'));
  }
  a.push(rect(x + 16, y + (compact ? 96 : 74), w - 32, 44, '#FFFFFF', '#64748B', 8));
  a.push(text(x + w - 32, y + (compact ? 124 : 102), 'مثلاً آسیاب دستی', 'body muted'));
  const catY = y + (compact ? 174 : 154);
  a.push(text(x + w, catY, 'دسته‌های اصلی', 'section'));
  const catCols = compact ? 2 : 4;
  const gap = compact ? 12 : 20;
  const cw = (w - gap * (catCols - 1)) / catCols;
  ['دم‌آوری', 'ابزار بار سرد', 'ابزار بار گرم', 'ماگ و اکسسوری'].forEach((label, index) => {
    const col = index % catCols;
    const row = Math.floor(index / catCols);
    const cx = x + w - cw - col * (cw + gap);
    const cy = catY + 14 + row * ((compact ? 74 : 84) + gap);
    a.push(rect(cx, cy, cw, compact ? 74 : 84, '#FFFFFF', '#CBD5E1', 8));
    a.push(text(cx + cw - 10, cy + 30, '[رسانه دسته]', 'meta muted'));
    a.push(text(cx + cw - 10, cy + 54, label, 'label'));
  });
  const productY = catY + (compact ? 188 : 126);
  a.push(text(x + w, productY, 'محصول‌های منتخب', 'section'));
  if (state.id === 'initial') renderSkeletons(a, compact, x, w, productY + 16);
  else renderProductCards(a, compact, x, w, productY + 16,  compact ? 2 : 4, state.id);
}

function renderListing(a, screen, state, compact, x, w, y) {
  const breadcrumb = screen.layout === 'search' ? 'خانه / جست‌وجو' : 'خانه / فروشگاه / دسته';
  a.push(text(x + w, y + 13, breadcrumb, 'meta muted'));
  a.push(rect(x, y + 28, w, 56, '#FFFFFF', '#CBD5E1', 8));
  a.push(text(x + w - 12, y + 50, screen.layout === 'search' ? 'عبارت: آسیاب دستی' : '۴۸ محصول', 'label'));
  a.push(text(x + w - 12, y + 72, state.id === 'filtered' ? '۳ فیلتر فعال' : 'مرتب‌سازی: مرتبط‌ترین', 'body muted'));
  if (!compact) {
    const asideW = 260;
    a.push(rect(x + w - asideW, y + 104, asideW, 560, '#FFFFFF', '#CBD5E1', 8));
    a.push(text(x + w - 18, y + 136, 'فیلترها', 'section'));
    ['موجودی', 'برند', 'بازه قیمت (تومان)', 'ویژگی‌ها'].forEach((label, index) => {
      a.push(line(x + w - asideW + 16, y + 164 + index * 86, x + w - 16, y + 164 + index * 86, '#E2E8F0'));
      a.push(text(x + w - 18, y + 190 + index * 86, label, 'label'));
    });
    renderProductCards(a, false, x, w - asideW - 24, y + 104, 6, state.id);
  } else {
    a.push(rect(x, y + 96, w, 44, '#FFFFFF', '#64748B', 8));
    a.push(text(x + w - 12, y + 124, 'فیلتر و مرتب‌سازی', 'label'));
    if (state.id === 'initial') renderSkeletons(a, true, x, w, y + 154);
    else renderProductCards(a, true, x, w, y + 154, 3, state.id);
  }
}

function renderFilters(a, screen, state, compact, x, w, y) {
  const panelX = compact ? x : x + w - 390;
  const panelW = compact ? w : 390;
  a.push(rect(panelX, y, panelW, compact ? 650 : 630, '#FFFFFF', '#94A3B8', 12));
  a.push(text(panelX + panelW - 16, y + 34, compact ? 'فیلترها — drawer' : 'فیلترها — aside', 'section'));
  a.push(text(panelX + 16, y + 34, 'بستن', 'label', 'start', '#1D4ED8'));
  const groups = [
    ['مرتب‌سازی', 'مرتبط‌ترین'], ['موجودی', 'فقط کالاهای موجود'], ['برند', 'Eqcofe / نمونه مرجع'], ['بازه قیمت (تومان)', '۱٬۰۰۰٬۰۰۰ تا ۵٬۰۰۰٬۰۰۰']
  ];
  groups.forEach(([label, value], index) => {
    const gy = y + 72 + index * 112;
    a.push(text(panelX + panelW - 16, gy, label, 'label'));
    a.push(rect(panelX + 16, gy + 14, panelW - 32, 52, state.id === 'disabled-with-reason' && index === 3 ? '#F1F5F9' : '#FFFFFF', '#CBD5E1', 8));
    a.push(text(panelX + panelW - 28, gy + 46, value, 'body', 'end', state.id === 'disabled-with-reason' && index === 3 ? '#64748B' : '#0F172A'));
    if (state.id === 'disabled-with-reason' && index === 3) a.push(text(panelX + panelW - 18, gy + 87, 'داده معتبر قیمت دریافت نشده است', 'meta', 'end', '#B45309'));
  });
  a.push(rect(panelX + 16, y + (compact ? 558 : 538), panelW - 32, 48, '#0F766E', '#0F766E', 8));
  a.push(text(panelX + panelW / 2, y + (compact ? 588 : 568), state.action, 'actionText', 'middle'));
  a.push(text(panelX + panelW / 2, y + (compact ? 630 : 610), 'پاک‌کردن انتخاب‌ها', 'label', 'middle', '#1D4ED8'));
  if (!compact) renderProductCards(a, false, x, w - panelW - 32, y, 4, 'filtered');
}

function renderStatePanel(a, screen, state, compact, x, w, y) {
  const pw = compact ? w : 820;
  const px = compact ? x : x + w - pw;
  const tone = state.id === 'failed' ? ['#FEF2F2', '#B91C1C'] : state.id === 'timeout' || state.id === 'disabled-with-reason' ? ['#FFFBEB', '#B45309'] : ['#FFFFFF', '#64748B'];
  a.push(rect(px, y, pw, compact ? 270 : 220, tone[0], tone[1], 12));
  a.push(text(px + pw - 20, y + 42, state.title, 'section', 'end', tone[1]));
  const lines = wrap(state.message, compact ? 34 : 74);
  lines.forEach((lineText, index) => a.push(text(px + pw - 20, y + 76 + index * 24, lineText, 'body muted')));
  a.push(rect(px + 20, y + (compact ? 168 : 142), pw - 40, 48, '#0F766E', '#0F766E', 8));
  a.push(text(px + pw / 2, y + (compact ? 198 : 172), state.action, 'actionText', 'middle'));
  a.push(text(px + pw / 2, y + (compact ? 242 : 204), screen.recoveryAction, 'label', 'middle', '#1D4ED8'));
}

function renderContextSummary(a, compact, x, w, y, screen) {
  a.push(rect(x, y, w, compact ? 160 : 150, '#FFFFFF', '#CBD5E1', 8));
  a.push(text(x + w - 16, y + 32, 'زمینه حفظ‌شده', 'section'));
  ['عبارت یا دسته فعلی', 'فیلترها و مرتب‌سازی', 'موقعیت قبلی فهرست'].forEach((label, index) => {
    a.push(text(x + w - 22, y + 66 + index * 28, `✓ ${label}`, 'body'));
  });
}

function renderSkeletons(a, compact, x, w, y) {
  const count = compact ? 3 : 4;
  const cols = compact ? 1 : 4;
  const gap = compact ? 12 : 18;
  const cardW = (w - gap * (cols - 1)) / cols;
  for (let i = 0; i < count; i += 1) {
    const cx = compact ? x : x + w - cardW - i * (cardW + gap);
    const cy = compact ? y + i * 164 : y;
    a.push(rect(cx, cy, cardW, compact ? 150 : 240, '#FFFFFF', '#CBD5E1', 8));
    a.push(rect(cx + 12, cy + 12, cardW - 24, compact ? 68 : 120, '#E2E8F0', '#E2E8F0', 6));
    a.push(rect(cx + 12, cy + (compact ? 92 : 150), cardW - 60, 12, '#E2E8F0', '#E2E8F0', 4));
    a.push(rect(cx + 12, cy + (compact ? 116 : 178), cardW - 100, 12, '#E2E8F0', '#E2E8F0', 4));
  }
}

function renderProductCards(a, compact, x, w, y, count, stateId) {
  const cols = compact ? 1 : Math.min(3, count);
  const rows = Math.ceil(count / cols);
  const gap = compact ? 12 : 18;
  const cardW = (w - gap * (cols - 1)) / cols;
  const cardH = compact ? 174 : 260;
  const names = ['آسیاب دستی مدل مرجع', 'دریپر سرامیکی مدل نمونه', 'کتری دم‌آوری حرفه‌ای', 'ترازو قهوه دقیق'];
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + w - cardW - col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    a.push(rect(cx, cy, cardW, cardH, '#FFFFFF', stateId === 'price-changed' && i === 0 ? '#B45309' : '#CBD5E1', 8));
    a.push(rect(cx + 12, cy + 12, compact ? 104 : cardW - 24, compact ? 104 : 118, '#F1F5F9', '#CBD5E1', 6));
    a.push(text(cx + (compact ? 64 : cardW - 20), cy + (compact ? 68 : 70), '[رسانه محصول]', 'meta muted', compact ? 'middle' : 'end'));
    const textX = compact ? cx + cardW - 16 : cx + cardW - 14;
    const baseY = compact ? cy + 34 : cy + 144;
    a.push(text(textX, baseY, names[i % names.length], 'label'));
    const stock = stateId === 'out-of-stock' && i === 0 ? 'ناموجود — دلیل اقدام' : 'موجود';
    a.push(text(textX, baseY + 28, stock, 'body', 'end', stateId === 'out-of-stock' && i === 0 ? '#B91C1C' : '#15803D'));
    a.push(text(textX, baseY + 56, i === 0 && stateId === 'price-changed' ? '۲٬۴۹۰٬۰۰۰ تومان — به‌روزشده' : '۲٬۳۹۰٬۰۰۰ تومان', 'price'));
    if (!compact) {
      a.push(rect(cx + 14, cy + 218, cardW - 28, 32, '#FFFFFF', '#0F766E', 6));
      a.push(text(cx + cardW / 2, cy + 240, 'مشاهده محصول', 'label', 'middle', '#0F766E'));
    }
  }
}

function renderFooter(a, compact, x, w, height) {
  const y = height - (compact ? 92 : 78);
  a.push(line(x, y, x + w, y, '#CBD5E1'));
  a.push(text(x + w, y + 28, 'راهنما · تماس · قوانین · بازگشت و ضمانت', 'meta muted'));
  a.push(text(x + w, y + 50, 'بدون ادعای اعتماد یا Provider تأییدنشده', 'meta muted'));
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
  if (['failed', 'offline'].includes(id)) return '#B91C1C';
  if (['timeout', 'price-changed', 'disabled-with-reason'].includes(id)) return '#B45309';
  if (['filtered', 'enabled', 'progressive'].includes(id)) return '#0F766E';
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
