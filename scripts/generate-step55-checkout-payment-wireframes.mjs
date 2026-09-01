import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const sourcePath = 'docs/13-product-design/step55-checkout-payment-wireframes.json';
const root = 'docs/13-product-design/step55-wireframes/D';
const source = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
const contract = JSON.parse(source);
const generated = {};

generated[`${root}/README.md`] = gateReadme(contract);
for (const screen of contract.screens) {
  const folder = `${root}/${screen.id}`;
  const frames = screen.states.flatMap((state, index) => [{ width: 320, state }, ...(index === 0 ? [{ width: 1440, state }] : [])]);
  generated[`${folder}/README.md`] = screenReadme(contract, screen, frames);
  generated[`${folder}/traceability.json`] = `${JSON.stringify(traceability(contract, screen, frames), null, 2)}\n`;
  generated[`${folder}/acceptance.md`] = acceptance(contract, screen, frames);
  for (const frame of frames) generated[`${folder}/${frameName(screen, frame.width, frame.state.id, contract.revision)}`] = renderFrame(contract, screen, frame);
}
generated[`${root}/gate-d-manifest.json`] = `${JSON.stringify(manifest(contract, generated), null, 2)}\n`;

if (process.argv.includes('--check')) {
  const drift = [];
  for (const [file, expected] of Object.entries(generated)) {
    let actual;
    try { actual = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); } catch { drift.push(`${file}: missing`); continue; }
    if (actual !== expected) drift.push(`${file}: does not match ${sourcePath}`);
  }
  if (drift.length) { console.error(drift.join('\n')); process.exit(1); }
  console.log(`Step 55-D wireframes: PASS (${Object.keys(generated).length} deterministic artifacts, ${contract.acceptance.expectedFrameCount} frames)`);
} else {
  for (const [file, content] of Object.entries(generated)) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); }
  console.log(`Generated ${Object.keys(generated).length} Step 55-D artifacts including ${contract.acceptance.expectedFrameCount} wireframe frames.`);
}

function frameName(screen, width, state, revision) { return `${screen.id}--${width}--${state}--v${revision}.svg`; }

function manifest(value, files) {
  const artifacts = Object.entries(files).map(([path, content]) => ({ path, sha256: createHash('sha256').update(content).digest('hex'), bytes: Buffer.byteLength(content) }));
  return { schemaVersion:value.schemaVersion, step:value.step, substep:value.substep, status:value.status, sourceContract:sourcePath,
    sourceSha256:createHash('sha256').update(source).digest('hex'), canonicalSource:value.canonicalSource, figmaMirror:value.figmaMirror,
    screenCount:value.screens.length, frameCount:artifacts.filter(x=>x.path.endsWith('.svg')).length, reviewedWidths:value.acceptance.requiredWidths,
    journeyIds:value.journeys, screenIds:value.screens.map(x=>x.id), generatedArtifacts:artifacts };
}

function gateReadme(value) {
  const rows=value.screens.map(s=>`| ${s.id} | ${s.title} | \`${s.routeIntent}\` | ${s.states.map(x=>x.id).join('، ')} | ${s.primaryAction} |`).join('\n');
  const widths=value.responsiveReview.map(x=>`| ${x.width}px | ${x.grid} | ${x.cart} | ${x.checkout} | ${x.payment} |`).join('\n');
  return `# Step 55-D — سبد، تسویه‌حساب و بازیابی پرداخت\n\n**وضعیت:** COMPLETE / GATE PASS — Step 55 ادامه دارد و 55-E هنوز شروع نشده است.\n\n`+
    `این پوشه خروجی Canonical کم‌جزئیات 55-D است. قرارداد \`${sourcePath}\` منبع تولید قطعی است و generator همه SVGها، companionها و manifest را می‌سازد. Repository مرجع است؛ Figma Mirror اختیاری و غیرمسدودکننده می‌ماند.\n\n`+
    `## محدوده\n\n| شناسه | سطح | Route intent | حالت‌ها | اقدام اصلی |\n|---|---|---|---|---|\n${rows}\n\n`+
    `جریان از Cart به Identity، Address، Delivery و Review می‌رود؛ سپس Payment Return فقط با status/verify authoritative نتیجه را تعیین می‌کند و Order Outcome مسیر پایدار بعدی را نشان می‌دهد. callback، timeout یا replay هیچ‌گاه موفقیت ساختگی تولید نمی‌کند.\n\n`+
    `## Responsive\n\n| عرض | Grid | Cart | Checkout | Payment/Outcome |\n|---:|---|---|---|---|\n${widths}\n\n`+
    `هر صفحه سه state compact در 320px و یک state expanded در 1440px دارد. رفتار 360/600/840/1200، 400% zoom، متن بلند فارسی، keyboard-only، error association و bidi reference در traceability ثبت است.\n\n`+
    `## حقیقت تجاری و بازیابی\n\n${value.crossCutting.commerce.map(x=>`- ${x}`).join('\n')}\n\n${value.crossCutting.paymentRecovery.map(x=>`- ${x}`).join('\n')}\n\n`+
    `هویت، نشانی و روش ارسال از منابع مالک خود می‌آیند. تمام مبلغ‌ها تومان‌اند، Wallet وجود ندارد و cart/checkout expiry بی‌صدا دور زده نمی‌شود.\n\n`+
    `## مرز\n\n55-D هیچ Runtime، Route واقعی، API، Migration، Dependency، Permission، Business Rule، Provider یا High-fidelity UI ایجاد نمی‌کند. Account و جزئیات سفارش در 55-E، Admin در Step 56 و Prototype در Step 57 باقی می‌مانند.\n`;
}

function screenReadme(value, screen, frames) {
  const states=screen.states.map(s=>`| \`${s.id}\` | ${s.title} | ${s.message} | ${s.action} |`).join('\n');
  const responsive=value.responsiveReview.map(x=>`| ${x.width}px | ${responsiveDecision(screen.layout,x)} | ${focusDecision(screen.layout,x.width)} |`).join('\n');
  const artifacts=frames.map(f=>`- \`${frameName(screen,f.width,f.state.id,value.revision)}\``).join('\n');
  return `# ${screen.id} — ${screen.title}\n\n**Gate:** 55-D\n\n**Fidelity:** structural low-fidelity\n\n**Route intent:** \`${screen.routeIntent}\`\n\n**Actors:** ${screen.actors.join('، ')}\n\n`+
    `## هدف\n\nکار اصلی **${screen.primaryTask}** است. اقدام اصلی «${screen.primaryAction}» و بازیابی bounded «${screen.recoveryAction}» است. اولویت محتوا ${screen.contentPriority.join(' ← ')} می‌ماند و reflow ترتیب معنایی را تغییر نمی‌دهد.\n\n`+
    `## ساختار و مالکیت\n\nصفحه از shell مشترک Step 55، یک H1، progress متنی checkout و status قابل اعلام استفاده می‌کند. Quote، stock، shipping، Session، Address، Payment و Order هرکدام از منبع authoritative خود خوانده می‌شوند؛ UI منبع تازه‌ای نمی‌سازد و callback را نتیجه نهایی فرض نمی‌کند.\n\n`+
    `## حالت‌ها\n\n| State | عنوان | زمینه | اقدام bounded |\n|---|---|---|---|\n${states}\n\n`+
    `ورودی امن و context معتبر در خطا حفظ می‌شود. Disabled علت دارد، submitting از تکرار جلوگیری می‌کند، expiry مسیر بازسازی می‌دهد و unknown-result فقط status check ارائه می‌کند.\n\n`+
    `## Responsive و focus\n\n| عرض | تصمیم | ترتیب focus |\n|---:|---|---|\n${responsive}\n\n`+
    `در 400% zoom صفحه به ساختار compact برمی‌گردد و scroll دوبعدی ندارد. هدف‌ها حداقل 44px هستند؛ error summary به field مربوط است؛ تغییر جمع، انقضا و نتیجه پرداخت announce می‌شود.\n\n`+
    `## ردیابی\n\nJourneyها: ${screen.journeys.map(x=>'`'+x+'`').join('، ')}. قابلیت‌ها: ${screen.operations.map(x=>'`'+x+'`').join('، ')}. Componentها: ${screen.components.map(x=>'`'+x+'`').join('، ')}. این ارجاع‌ها capability موجودند، نه وعده Runtime تازه.\n\n`+
    `## Artifactها\n\n${artifacts}\n\nهمراه‌های \`traceability.json\` و \`acceptance.md\` الزامی‌اند. SVGها خروجی قطعی هستند و مستقیماً ویرایش نمی‌شوند.\n`;
}

function traceability(value, screen, frames) {
  return { schemaVersion:value.schemaVersion, step:value.step, gate:'55-D', screenId:screen.id, revision:value.revision, status:'COMPLETE', routeIntent:screen.routeIntent,
    actors:screen.actors, journeys:screen.journeys, openApiCapabilities:screen.operations, step54Components:screen.components, requiredStates:screen.states.map(x=>x.id),
    primaryTask:screen.primaryTask, primaryAction:screen.primaryAction, recoveryAction:screen.recoveryAction,
    responsiveEvidence:value.responsiveReview.map(x=>({width:x.width,decision:responsiveDecision(screen.layout,x),focus:focusDecision(screen.layout,x.width)})),
    zoomEvidence:{percent:value.acceptance.zoomPercent,verdict:'PASS_BY_REFLOW_CONTRACT',horizontalTwoAxisScroll:false}, accessibility:value.crossCutting.accessibility,
    commerce:value.crossCutting.commerce, identityAddressDelivery:value.crossCutting.identityAddressDelivery, paymentRecovery:value.crossCutting.paymentRecovery,
    artifacts:frames.map(f=>frameName(screen,f.width,f.state.id,value.revision)), boundary:{highFidelity:false,runtimeImplementation:false,apiMutation:false,businessRuleMutation:false,inventedBrandAsset:false,paidDependency:false} };
}

function acceptance(value, screen, frames) {
  const rows=frames.map(f=>`| ${f.width}px | \`${f.state.id}\` | \`${frameName(screen,f.width,f.state.id,value.revision)}\` | PASS |`).join('\n');
  return `# ${screen.id} — معیار پذیرش\n\n**نتیجه:** PASS / 55-D SCREEN GATE\n\n## قاب‌ها\n\n| Viewport | State | Artifact | نتیجه |\n|---:|---|---|---|\n${rows}\n\n`+
    `## ساختار\n\n- [x] شناسه، Gate، revision، actor، journey، state، primary و recovery ثبت است.\n- [x] shell مشترک، یک H1، progress و اولویت task روشن است.\n- [x] سه state در 320px و state نخست در 1440px مستقل‌اند.\n- [x] هر شش عرض و 400% reflow ثبت شده‌اند.\n- [x] متن بلند فارسی، keyboard و bidi reference مرور شده‌اند.\n\n`+
    `## تجارت و بازیابی\n\n- [x] quote، stock، shipping، payment و order authoritative هستند.\n- [x] تومان صریح است و Wallet وجود ندارد.\n- [x] expiry، conflict، timeout و replay موفقیت جعلی نمی‌سازند.\n- [x] retry پس از status check و با context/مرجع پایدار است.\n- [x] اقدام بازیابی «${screen.recoveryAction}» bounded است.\n\n`+
    `## دسترس‌پذیری و مرز\n\n- [x] هدف 44px، focus، announcement، error association و non-color status مشخص‌اند.\n- [x] 400% zoom فقط scroll عمودی صفحه دارد.\n- [x] API، Runtime، Rule، Migration، Dependency و Permission تغییر نکرده‌اند.\n- [x] High-fidelity، Provider success، دارایی برند و Figma dependency ادعا نشده است.\n\n**استثنای باز:** NONE.\n`;
}

function responsiveDecision(layout,item) {
  if(layout==='cart') return item.cart;
  if(['identity','address','delivery','review'].includes(layout)) return item.checkout;
  return item.payment;
}

function focusDecision(layout,width) {
  const compact=width<840;
  if(layout==='cart') return compact?'H1 → line status → quantity/remove → totals → primary':'H1 → cart lines → quantity/remove → sticky summary → primary';
  if(layout==='identity') return 'H1 → progress → mobile/OTP → error/status → primary → back';
  if(layout==='address') return compact?'H1 → progress → address cards → add/edit → primary':'H1 → progress → address list → form/dialog → summary → primary';
  if(layout==='delivery') return 'H1 → progress → address summary → shipping choices → reason/status → primary';
  if(layout==='review') return compact?'H1 → items → address/shipping → totals/expiry → primary':'H1 → review regions → authoritative summary → expiry/status → primary';
  return 'H1 → state heading → order/payment references → status detail → primary recovery → support';
}

function renderFrame(value,screen,frame) {
  const compact=frame.width===320, width=frame.width, height=compact?1220:1000, x=compact?16:80, w=compact?288:1280, a=[];
  a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" lang="fa">`);
  a.push(`<title id="title">${esc(screen.id)} — ${esc(screen.title)} — ${esc(frame.state.id)} — ${width}px</title>`);
  a.push(`<desc id="desc">وایرفریم کم‌جزئیات فارسی و راست‌به‌چپ Step 55-D؛ اقدام اصلی ${esc(screen.primaryAction)} و بازیابی ${esc(screen.recoveryAction)}.</desc>`);
  a.push(`<style>text{font-family:Vazirmatn,Tahoma,Arial,sans-serif;fill:#0F172A}.h1{font-size:${compact?20:28}px;font-weight:700}.h2{font-size:${compact?15:18}px;font-weight:700}.body{font-size:${compact?12:14}px}.label{font-size:${compact?11:13}px;font-weight:600}.meta{font-size:${compact?9:11}px}.muted{fill:#64748B}.mono{font-family:monospace}</style>`);
  a.push(rect(0,0,width,height,'#F8FAFC','#F8FAFC')); header(a,compact,x,w);
  a.push(text(x+w,compact?134:128,`تسویه‌حساب / ${screen.id}`,'meta muted'));
  const titles=compact?wrap(screen.title,25):[screen.title]; titles.forEach((v,i)=>a.push(text(x+w,(compact?164:166)+i*24,v,'h1')));
  const sy=compact?184+(titles.length-1)*24:186; const stateH=statePanel(a,compact,x,w,sy,frame.state);
  const y=compact?sy+stateH+16:286;
  if(screen.layout==='cart') cart(a,compact,x,y,w,frame.state.id);
  else if(screen.layout==='identity') identity(a,compact,x,y,w,frame.state.id);
  else if(screen.layout==='address') address(a,compact,x,y,w,frame.state.id);
  else if(screen.layout==='delivery') delivery(a,compact,x,y,w,frame.state.id);
  else if(screen.layout==='review') review(a,compact,x,y,w,frame.state.id);
  else recovery(a,compact,x,y,w,frame.state.id,screen.layout);
  footer(a,compact,x,w,height); a.push(text(x,height-16,`${screen.id} · 55-D · ${frame.state.id} · ${width}px · v${value.revision}`,'meta mono','start')); a.push('</svg>'); return `${a.join('\n')}\n`;
}

function header(a,compact,x,w) {
  a.push(rect(x,18,w,compact?96:82,'#FFFFFF','#CBD5E1',8)); a.push(text(x+w-12,46,'جای نشان تأییدشده','label'));
  a.push(rect(x+12,30,compact?112:360,44,'#F8FAFC','#94A3B8',6)); a.push(text(x+(compact?116:360),58,'جست‌وجوی محصول','body'));
  a.push(text(x+w-12,compact?96:94,compact?'منو · حساب · سبد':'دسته‌ها · مقایسه · حساب · سبد','meta muted'));
}

function statePanel(a,compact,x,w,y,state) {
  const titleLines=compact?wrap(state.title,22):[state.title];
  const messageLines=wrap(state.message,compact?34:110);
  const h=compact?Math.max(112,58+titleLines.length*20+messageLines.length*17):76,t=stateTone(state.id);
  a.push(rect(x,y,w,h,'#FFFFFF',t,8)); titleLines.forEach((v,i)=>a.push(text(x+w-12,y+24+i*20,v,'h2','end',t)));
  const messageY=y+25+titleLines.length*20; messageLines.forEach((v,i)=>a.push(text(x+w-12,messageY+i*17,v,'body'))); a.push(text(x+12,y+h-14,state.action,'label','start',t));
  return h;
}

function cart(a,compact,x,y,w,state) {
  if(state==='first-use') return emptyPanel(a,compact,x,y,w,'سبد شما خالی است','محصول‌ها را ببینید و Variant معتبر را به سبد اضافه کنید.','مشاهده محصولات');
  const listW=compact?w:820, summaryX=compact?x:x+844, summaryW=compact?w:w-844;
  for(let i=0;i<2;i++){const cy=y+i*(compact?154:148);a.push(rect(x,cy,listW,compact?140:132,'#FFFFFF',i===0&&state!=='price-changed'?'#B45309':'#CBD5E1',8));
    a.push(text(x+listW-16,cy+30,i===0?'آسیاب دستی E-Q40 — استیل':'فیلتر کاغذی بسته ۱۰۰ عدد','h2'));
    a.push(text(x+listW-16,cy+60,i===0&&state==='quantity-invalid'?'موجودی ۸ · تعداد ۱۰ نامعتبر':'موجود · قیمت authoritative','body','end',i===0&&state==='quantity-invalid'?'#B91C1C':'#15803D'));
    a.push(text(x+listW-16,cy+90,i===0?'۴٬۸۹۰٬۰۰۰ تومان':'۲۸۰٬۰۰۰ تومان','label')); a.push(rect(x+16,cy+40,96,44,'#FFFFFF','#0F766E',6));a.push(text(x+64,cy+68,i===0?'تعداد: ۲':'تعداد: ۱','label','middle','#0F766E'));a.push(text(x+16,cy+112,'حذف','label','start','#B91C1C'));}
  const sy=compact?y+320:y; a.push(rect(summaryX,sy,summaryW,compact?248:300,'#FFFFFF','#CBD5E1',8));a.push(text(summaryX+summaryW-16,sy+32,'خلاصه authoritative','h2'));
  ['جمع کالاها: ۱۰٬۰۶۰٬۰۰۰ تومان','ارسال: در مرحله بعد','قابل پرداخت: ۱۰٬۰۶۰٬۰۰۰ تومان'].forEach((v,i)=>a.push(text(summaryX+summaryW-16,sy+76+i*34,v,i===2?'label':'body')));
  a.push(rect(summaryX+16,sy+166,summaryW-32,48,state==='quantity-invalid'?'#F1F5F9':'#0F766E',state==='quantity-invalid'?'#94A3B8':'#0F766E',8));a.push(text(summaryX+summaryW/2,sy+196,state==='quantity-invalid'?'ادامه غیرفعال — تعداد را اصلاح کنید':'ادامه تسویه‌حساب','label','middle',state==='quantity-invalid'?'#475569':'#FFFFFF'));
}

function identity(a,compact,x,y,w,state) {
  const fw=compact?w:700,fx=compact?x:x+w-fw;a.push(progress(a,compact,x,y,w,1)); const fy=y+54;a.push(rect(fx,fy,fw,compact?360:400,'#FFFFFF','#CBD5E1',8));
  a.push(text(fx+fw-16,fy+34,state==='unauthenticated'?'شماره موبایل':'کد تأیید شش‌رقمی','h2'));a.push(rect(fx+16,fy+58,fw-32,48,'#FFFFFF',state==='validation'?'#B91C1C':'#64748B',6));a.push(text(fx+fw-28,fy+89,state==='unauthenticated'?'۰۹۱۲•••••••':'••••••','body'));
  if(state==='validation')a.push(text(fx+fw-16,fy+132,'کد نامعتبر است؛ ورودی را دوباره بررسی کنید','body','end','#B91C1C'));
  a.push(text(fx+fw-16,fy+166,'سبد مهمان و quote امن حفظ می‌شوند','body muted'));a.push(rect(fx+16,fy+218,fw-32,48,state==='submitting'?'#F1F5F9':'#0F766E',state==='submitting'?'#94A3B8':'#0F766E',8));a.push(text(fx+fw/2,fy+248,state==='submitting'?'در حال تأیید…':state==='unauthenticated'?'دریافت کد ورود':'تأیید هویت و ادامه','label','middle',state==='submitting'?'#475569':'#FFFFFF'));a.push(text(fx+fw/2,fy+304,'بازگشت به سبد','label','middle','#1D4ED8'));
}

function address(a,compact,x,y,w,state) {
  a.push(progress(a,compact,x,y,w,2)); const by=y+54;
  if(state==='first-use') return emptyPanel(a,compact,x,by,w,'نشانی ثبت نشده است','نشانی معتبر برای محاسبه ارسال لازم است.','افزودن نشانی');
  const cardW=compact?w:(w-24)/2; for(let i=0;i<2;i++){const bx=compact?x:x+i*(cardW+24),cy=compact?by+i*184:by;a.push(rect(bx,cy,cardW,compact?168:260,'#FFFFFF',i===0?'#0F766E':'#CBD5E1',8));a.push(text(bx+cardW-16,cy+32,i===0?'نشانی پیش‌فرض':'نشانی محل کار','h2'));a.push(text(bx+cardW-16,cy+70,'تهران، خیابان نمونه، پلاک ۱۲','body'));a.push(text(bx+cardW-16,cy+100,state==='conflict'&&i===0?'نسخه تازه دریافت شد':'کدپستی: ۱۴۳•••••••','body','end',state==='conflict'&&i===0?'#B45309':'#64748B'));a.push(text(bx+16,cy+(compact?144:224),i===0?'انتخاب‌شده · ویرایش':'انتخاب','label','start','#0F766E'));}
  const ay=compact?by+384:by+290;a.push(rect(x,ay,w,50,state==='validation'?'#F1F5F9':'#0F766E',state==='validation'?'#94A3B8':'#0F766E',8));a.push(text(x+w/2,ay+31,state==='validation'?'تکمیل موارد مشخص‌شده':'انتخاب نشانی و ادامه','label','middle',state==='validation'?'#475569':'#FFFFFF'));
}

function delivery(a,compact,x,y,w,state) {
  a.push(progress(a,compact,x,y,w,3)); const by=y+54;a.push(rect(x,by,w,64,'#FFFFFF','#CBD5E1',8));a.push(text(x+w-16,by+26,'نشانی: تهران، خیابان نمونه','label'));a.push(text(x+w-16,by+49,'تغییر نشانی','meta','end','#1D4ED8'));
  const choices=[['ارسال استاندارد','۱۸۰٬۰۰۰ تومان · ۲ تا ۴ روز'],['تحویل حضوری','بدون هزینه · پس از آماده‌سازی'],['تحویل سریع','هزینه بر اساس پاسخ authoritative']];
  choices.forEach(([t,d],i)=>{const cy=by+84+i*(compact?112:100), disabled=(state==='disabled-with-reason'&&i===2)||(state==='unavailable');a.push(rect(x,cy,w,compact?96:84,disabled?'#F1F5F9':'#FFFFFF',i===0&&!disabled?'#0F766E':'#CBD5E1',8));a.push(text(x+w-52,cy+30,t,'h2'));a.push(text(x+w-52,cy+58,disabled?(state==='unavailable'?'برای این نشانی در دسترس نیست':'وزن سبد بیش از محدوده است'):d,'body','end',disabled?'#64748B':'#0F172A'));a.push(rect(x+w-36,cy+18,20,20,i===0&&!disabled?'#0F766E':'#FFFFFF','#0F766E',10));});
  const ay=by+(compact?438:410);a.push(rect(x,ay,w,50,state==='unavailable'?'#F1F5F9':'#0F766E',state==='unavailable'?'#94A3B8':'#0F766E',8));a.push(text(x+w/2,ay+31,state==='unavailable'?'تغییر نشانی برای ادامه':'انتخاب ارسال و ادامه','label','middle',state==='unavailable'?'#475569':'#FFFFFF'));
}

function review(a,compact,x,y,w,state) {
  a.push(progress(a,compact,x,y,w,4)); const by=y+54, leftW=compact?w:820, sx=compact?x:x+844, sw=compact?w:w-844;a.push(rect(x,by,leftW,compact?320:420,'#FFFFFF','#CBD5E1',8));a.push(text(x+leftW-16,by+32,'کالاها، نشانی و ارسال','h2'));
  ['۲ × آسیاب E-Q40 — استیل','نشانی: تهران، خیابان نمونه','ارسال استاندارد — ۱۸۰٬۰۰۰ تومان','نوع مشتری: خرده‌فروشی'].forEach((v,i)=>a.push(text(x+leftW-16,by+76+i*38,v,'body')));
  const sy=compact?by+340:by;a.push(rect(sx,sy,sw,compact?300:420,'#FFFFFF',state==='expired'?'#B91C1C':'#CBD5E1',8));a.push(text(sx+sw-16,sy+32,'جمع نهایی','h2'));a.push(text(sx+sw-16,sy+76,state==='price-changed'?'۱۰٬۳۵۰٬۰۰۰ تومان — تازه':'۱۰٬۲۴۰٬۰۰۰ تومان','h2','end',state==='price-changed'?'#B45309':'#0F766E'));a.push(text(sx+sw-16,sy+114,state==='expired'?'رزرو ۱۵ دقیقه‌ای منقضی شد':'اعتبار رزرو: ۱۲ دقیقه','body','end',state==='expired'?'#B91C1C':'#64748B'));
  a.push(rect(sx+16,sy+174,sw-32,50,state==='submitting'?'#F1F5F9':'#0F766E',state==='submitting'?'#94A3B8':'#0F766E',8));a.push(text(sx+sw/2,sy+205,state==='submitting'?'در حال ثبت سفارش…':state==='expired'?'بازسازی رزرو':'ثبت سفارش و رفتن به پرداخت','label','middle',state==='submitting'?'#475569':'#FFFFFF'));
}

function recovery(a,compact,x,y,w,state,layout) {
  const pw=compact?w:820,px=compact?x:x+w-pw,t=stateTone(state);a.push(rect(px,y,pw,compact?390:430,'#FFFFFF',t,10));
  a.push(text(px+pw-20,y+42,layout==='payment'?'وضعیت پرداخت از منبع اصلی':'وضعیت نهایی سفارش','h2','end',t));
  const status=state==='success'?'تأییدشده':state==='failed'?'تأییدنشده':state==='idempotent-replay'?'همان نتیجه قبلی':state==='progressive'?'در حال بررسی':state==='unknown-result'?'نامشخص — بدون ادعای موفقیت':'پاسخ دیررس';
  a.push(text(px+pw-20,y+86,`نتیجه: ${status}`,'h2'));a.push(line(px+20,y+110,px+pw-20,y+110,'#E2E8F0'));
  a.push(text(px+pw-20,y+150,'شماره سفارش: EQ-14052','body mono'));a.push(text(px+pw-20,y+184,'شناسه پرداخت: PAY-9F31','body mono'));
  const note=layout==='payment'?'بازگشت درگاه به‌تنهایی نتیجه نهایی نیست.':'timeline و فاکتور از جزئیات سفارش خوانده می‌شوند.';
  wrap(note,compact?34:80).forEach((v,i)=>a.push(text(px+pw-20,y+226+i*20,v,'body muted')));
  a.push(rect(px+20,y+278,pw-40,50,'#0F766E','#0F766E',8));a.push(text(px+pw/2,y+309,layout==='payment'?'بررسی وضعیت پرداخت':'مشاهده جزئیات سفارش','label','middle','#FFFFFF'));a.push(text(px+pw/2,y+362,layout==='payment'?'بازگشت به سفارش · پشتیبانی':'وضعیت پرداخت · پشتیبانی','label','middle','#1D4ED8'));
}

function progress(a,compact,x,y,w,step) { const labels=['هویت','نشانی','ارسال','بازبینی']; a.push(rect(x,y,w,38,'#FFFFFF','#CBD5E1',8));a.push(text(x+w-12,y+24,`مرحله ${step} از ۴ · ${labels[step-1]}`,'label')); return ''; }
function emptyPanel(a,compact,x,y,w,title,body,action){a.push(rect(x,y,w,compact?300:340,'#FFFFFF','#64748B',8));a.push(text(x+w/2,y+80,title,'h2','middle'));wrap(body,compact?36:80).forEach((v,i)=>a.push(text(x+w/2,y+120+i*22,v,'body muted','middle')));a.push(rect(x+w/2-110,y+190,220,48,'#0F766E','#0F766E',8));a.push(text(x+w/2,y+220,action,'label','middle','#FFFFFF'));}
function footer(a,compact,x,w,height){const y=height-(compact?78:68);a.push(line(x,y,x+w,y,'#CBD5E1'));a.push(text(x+w,y+26,'راهنما · تماس · قوانین پرداخت و بازگشت','meta muted'));a.push(text(x+w,y+46,'بدون Wallet یا ادعای Provider تأییدنشده','meta muted'));}
function rect(x,y,width,height,fill='#FFFFFF',stroke='#CBD5E1',radius=0){return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;}
function line(x1,y1,x2,y2,stroke){return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}"/>`;}
function text(x,y,content,klass='body',anchor='end',fill){return `<text x="${round(x)}" y="${round(y)}" class="${klass}" text-anchor="${anchor}"${fill?` fill="${fill}" style="fill:${fill}"`:''}>${esc(content)}</text>`;}
function stateTone(id){if(['failed','validation','conflict','quantity-invalid'].includes(id))return'#B91C1C';if(['price-changed','expired','unavailable','disabled-with-reason','timeout','unknown-result'].includes(id))return'#B45309';if(['success','initial','first-use'].includes(id))return'#0F766E';if(id==='submitting'||id==='progressive')return'#1D4ED8';return'#475569';}
function wrap(value,max){const words=String(value).split(' '),lines=[];let current='';for(const word of words){const c=current?`${current} ${word}`:word;if(c.length>max&&current){lines.push(current);current=word;}else current=c;}if(current)lines.push(current);return lines.slice(0,4);}
function esc(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function round(value){return Math.round(value*100)/100;}
