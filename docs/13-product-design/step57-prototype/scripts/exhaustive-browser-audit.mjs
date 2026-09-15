import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const require=createRequire(import.meta.url);
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const coverage=JSON.parse(readFileSync(new URL('../src/coverage.json',import.meta.url),'utf8'));
const base=process.env.STEP57_BASE_URL||'http://127.0.0.1:4173';
const widths=[320,360,600,840,1200,1440];
const screens=coverage.screens||[];
const storefront=screens.filter(s=>s.area==='storefront');
const admin=screens.filter(s=>s.area==='admin');
const adminViews=admin.flatMap(screen=>(screen.views||[]).map(view=>({screen,view})));
const adminStates=admin.flatMap(screen=>(screen.states||[]).map((state,index)=>({screen,state,index})));
const storefrontStates=storefront.flatMap(screen=>(screen.states||[]).map((state,index)=>({screen,state,index})));
const journeyIds=[...new Set(screens.flatMap(s=>s.journeys||[]))].sort();
const failures=[];
const warnings=[];
const internalLinks=new Set();
const evidenceDir=new URL('../qa-evidence/',import.meta.url);
mkdirSync(evidenceDir,{recursive:true});
let failureShots=0;

const metrics={
  screens:screens.length,storefront:storefront.length,admin:admin.length,
  adminViews:adminViews.length,adminStates:adminStates.length,storefrontStates:storefrontStates.length,
  journeys:journeyIds.length,defaultViewportChecks:0,viewViewportChecks:0,stateViewportChecks:0,
  axeScans:0,controlExercises:0,adminNavigationChecks:0,internalLinkChecks:0,criticalJourneyChecks:0,
};

function fail(scope,message,detail=''){failures.push({scope,message,detail});}
function warn(scope,message,detail=''){warnings.push({scope,message,detail});}
function routeFor(screen){return screen.area==='admin'?`/admin?id=${encodeURIComponent(screen.id)}`:`/store?id=${encodeURIComponent(screen.id)}`;}
function adminViewRoute(screen,view){return `/admin?id=${encodeURIComponent(screen.id)}&view=${encodeURIComponent(view.id)}`;}
function qaStateRoute(screen,index){return `/qa?screen=${encodeURIComponent(screen.id)}&stateIndex=${index}`;}
function groupOf(s){const [,g,n]=s.id.split('-'),v=Number(n);return g==='B'?'overview':g==='C'||(g==='D'&&v<=5)?'catalog':g==='D'?'inventory':g==='E'?'orders':g==='F'?'customers':v<=11?'finance':v<=18?'settings':'security';}

function assertInventory(){
  if(screens.length!==134)fail('inventory',`Expected 134 screens, found ${screens.length}`);
  if(storefront.length!==37)fail('inventory',`Expected 37 storefront screens, found ${storefront.length}`);
  if(admin.length!==97)fail('inventory',`Expected 97 admin screens, found ${admin.length}`);
  if(adminViews.length!==1142)fail('inventory',`Expected 1142 admin views, found ${adminViews.length}`);
  if(adminStates.length!==4472)fail('inventory',`Expected 4472 admin states, found ${adminStates.length}`);
  if(journeyIds.length!==24)fail('inventory',`Expected 24 journeys, found ${journeyIds.length}`);
  for(const screen of screens){
    const stateIds=(screen.states||[]).map((s,i)=>s.id??String(i));
    if(new Set(stateIds).size!==stateIds.length)warn(screen.id,'Duplicate state identifiers exist; QA uses stable stateIndex to remain deterministic.');
    for(const [i,state] of (screen.states||[]).entries()){
      if(!state||typeof state!=='object')fail(`${screen.id}/state/${i}`,'State is not an object');
      if(!String(state?.id??'').trim())fail(`${screen.id}/state/${i}`,'State is missing id');
      if(!String(state?.title??'').trim())fail(`${screen.id}/state/${i}`,'State is missing title');
    }
  }
}

async function basicDomAudit(page,task,{axe=false,touch=false,collectLinks=false}={}){
  const scope=task.scope;
  const errors=[];
  const requests=[];
  const onConsole=msg=>{if(msg.type()==='error')errors.push(`console: ${msg.text()}`);};
  const onPageError=err=>errors.push(`pageerror: ${err.message}`);
  const onRequest=req=>{try{const u=new URL(req.url());const b=new URL(base);if(u.origin!==b.origin&&!['data:','blob:'].includes(u.protocol))requests.push(req.url());}catch{}};
  page.on('console',onConsole);page.on('pageerror',onPageError);page.on('request',onRequest);
  try{
    await page.setViewportSize({width:task.width,height:1000});
    await page.goto(base+task.path,{waitUntil:'domcontentloaded',timeout:12000});
    await page.locator('h1').first().waitFor({state:'visible',timeout:5000});
    const dom=await page.evaluate(({touch})=>{
      const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0;};
      const name=el=>{
        const aria=el.getAttribute('aria-label'); if(aria?.trim())return aria.trim();
        const by=el.getAttribute('aria-labelledby'); if(by){const t=by.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();if(t)return t;}
        if(el.id){const label=document.querySelector(`label[for="${CSS.escape(el.id)}"]`);if(label?.textContent.trim())return label.textContent.trim();}
        const parent=el.closest('label');if(parent?.textContent.trim())return parent.textContent.trim();
        return (el.textContent||el.getAttribute('title')||el.getAttribute('alt')||'').trim();
      };
      const controls=[...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea')].filter(visible);
      const unlabeled=controls.filter(el=>!name(el)).map(el=>el.outerHTML.slice(0,180));
      const duplicateIds=[...document.querySelectorAll('[id]')].map(el=>el.id).filter((id,i,a)=>id&&a.indexOf(id)!==i).filter((v,i,a)=>a.indexOf(v)===i);
      const images=[...document.images].filter(visible).filter(img=>!img.hasAttribute('alt')).map(img=>img.src);
      const main=document.querySelector('main,[role="main"]');
      const dir=main?getComputedStyle(main).direction:getComputedStyle(document.documentElement).direction;
      const overflow=document.documentElement.scrollWidth-window.innerWidth;
      const tiny=[];
      if(touch){
        const candidates=[...document.querySelectorAll('button,input,select,textarea,a')].filter(visible).filter(el=>{
          if(el.matches('input[type="checkbox"],input[type="radio"]'))return true;
          if(el.tagName==='A'&&getComputedStyle(el).display==='inline')return false;
          return !el.hasAttribute('disabled');
        });
        for(const el of candidates){
          let r=el.getBoundingClientRect();
          if(el.matches('input[type="checkbox"],input[type="radio"]')&&el.closest('label'))r=el.closest('label').getBoundingClientRect();
          if(r.width<44||r.height<44)tiny.push({name:name(el),w:Math.round(r.width),h:Math.round(r.height)});
        }
      }
      return {h1:document.querySelectorAll('h1').length,main:!!main,dir,overflow,unlabeled,duplicateIds,images,tiny};
    },{touch});
    if(dom.h1!==1)fail(scope,`Expected exactly one h1, found ${dom.h1}`);
    if(!dom.main)fail(scope,'Missing semantic main region');
    if(dom.dir!=='rtl')fail(scope,`Main direction is ${dom.dir}, expected rtl`);
    if(dom.overflow>2)fail(scope,`Document horizontal overflow ${dom.overflow}px`);
    if(dom.unlabeled.length)fail(scope,`Visible unlabeled controls: ${dom.unlabeled.length}`,dom.unlabeled.slice(0,5).join('\n'));
    if(dom.duplicateIds.length)fail(scope,`Duplicate DOM ids: ${dom.duplicateIds.join(', ')}`);
    if(dom.images.length)fail(scope,`Visible images without alt: ${dom.images.length}`,dom.images.slice(0,5).join('\n'));
    if(dom.tiny.length)fail(scope,`Touch targets below 44×44: ${dom.tiny.length}`,JSON.stringify(dom.tiny.slice(0,8)));
    if(errors.length)fail(scope,`Browser errors: ${errors.length}`,errors.slice(0,6).join('\n'));
    if(requests.length)fail(scope,`Unexpected external requests: ${requests.length}`,requests.slice(0,6).join('\n'));
    if(collectLinks){
      const hrefs=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')).filter(Boolean));
      for(const href of hrefs)if(href.startsWith('/')&&!href.startsWith('//'))internalLinks.add(href);
    }
    if(axe){
      await page.addScriptTag({content:axeSource});
      const result=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
      metrics.axeScans++;
      if(result.violations.length){
        fail(scope,`axe WCAG violations: ${result.violations.length}`,result.violations.slice(0,8).map(v=>`${v.id}: ${v.help} (${v.nodes.length})`).join('\n'));
      }
    }
    if((task.width===360||task.width===1440)&&task.kind==='default'){
      await page.keyboard.press('Tab');
      const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,name:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.trim().slice(0,80)||'',body:document.activeElement===document.body}));
      if(focus.body)fail(scope,'Keyboard Tab did not move focus away from body');
    }
  }catch(error){
    fail(scope,'Navigation/render audit failed',error.stack||error.message);
    if(failureShots<20){
      try{mkdirSync(new URL('./failures/',evidenceDir),{recursive:true});await page.screenshot({path:new URL(`./failures/failure-${String(failureShots).padStart(2,'0')}.png`,evidenceDir),fullPage:true});failureShots++;}catch{}
    }
  }finally{
    page.off('console',onConsole);page.off('pageerror',onPageError);page.off('request',onRequest);
  }
}

async function runPool(browser,tasks,concurrency,fn){
  let cursor=0;
  await Promise.all(Array.from({length:concurrency},async()=>{
    const context=await browser.newContext({locale:'fa-IR'});
    const page=await context.newPage();
    while(true){const i=cursor++;if(i>=tasks.length)break;await fn(page,tasks[i]);}
    await context.close();
  }));
}

async function exerciseDefaultControls(page,screen,width){
  const scope=`controls/${screen.id}/${width}`;
  try{
    await page.setViewportSize({width,height:1000});
    await page.goto(base+routeFor(screen),{waitUntil:'domcontentloaded'});
    await page.locator('h1').first().waitFor({state:'visible'});
    const selectCount=await page.locator('main select:visible').count();
    for(let i=0;i<selectCount;i++){
      const select=page.locator('main select:visible').nth(i),options=await select.locator('option').count();
      if(options>1){const before=await select.inputValue();await select.selectOption({index:options-1});const after=await select.inputValue();if(before===after)fail(scope,`Select ${i} did not change value`);metrics.controlExercises++;}
    }
    const checks=page.locator('main input[type="checkbox"]:visible:not([disabled]), main input[type="radio"]:visible:not([disabled])');
    for(let i=0;i<await checks.count();i++){
      const item=checks.nth(i),before=await item.isChecked();await item.click();const after=await item.isChecked();if(before===after)fail(scope,`Check/radio ${i} did not change state`);metrics.controlExercises++;
    }
    const details=page.locator('main details:visible');
    for(let i=0;i<await details.count();i++){
      const d=details.nth(i),before=await d.evaluate(el=>el.open);await d.locator('summary').click();const after=await d.evaluate(el=>el.open);if(before===after)fail(scope,`Details ${i} did not toggle`);metrics.controlExercises++;
    }
    const buttons=page.locator('main button:visible:not([disabled])');
    const limit=Math.min(await buttons.count(),24);
    for(let i=0;i<limit;i++){
      await page.goto(base+routeFor(screen),{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
      const current=page.locator('main button:visible:not([disabled])').nth(i);if(!await current.count())continue;
      const before=page.url();
      try{await current.click({timeout:2000});await page.waitForTimeout(30);metrics.controlExercises++;}catch(error){fail(scope,`Button ${i} could not be activated`,error.message);continue;}
      const openDialog=page.locator('dialog[open]');
      if(await openDialog.count()){
        const focusedInside=await page.evaluate(()=>document.querySelector('dialog[open]')?.contains(document.activeElement));
        if(!focusedInside)fail(scope,`Dialog opened by button ${i} without focus inside dialog`);
        await page.keyboard.press('Escape').catch(()=>{});
      }
      if(page.url()!==before){try{await page.locator('h1').first().waitFor({state:'visible',timeout:3000});}catch{fail(scope,`Button ${i} navigated to a destination without visible h1`,page.url());}}
    }
  }catch(error){fail(scope,'Control exercise failed',error.stack||error.message);}
}

async function exerciseAdminView(page,screen,view){
  const scope=`admin-view-action/${screen.id}/${view.id}`;
  try{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+adminViewRoute(screen,view),{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
    const section=page.locator('.surface-body');
    const isBlocked=(screen.blockedOperations||[]).some(op=>(screen.operationViews||[]).some(m=>m.operation===op&&(m.view===view.id||m.view===`${screen.id}/${view.id}`)&&String(m.executionAuthority||'').startsWith('NO_ACTION')))||view.kind==='unavailable';
    if(isBlocked){
      if(!await section.locator('button:disabled').count())fail(scope,'NO_ACTION/unavailable view has no disabled action control');
      if(!await section.getByText('امکان ثبت یا دور زدن محدودیت وجود ندارد',{exact:false}).count())fail(scope,'NO_ACTION restriction explanation is missing');
      return;
    }
    const inputs=section.locator('input:visible:not([type="checkbox"]):not([type="radio"]),textarea:visible');
    if(await inputs.count()){
      for(let i=0;i<await inputs.count();i++){
        const input=inputs.nth(i);const label=await input.evaluate(el=>el.closest('label')?.textContent||'');
        await input.fill(label.includes('تومان')?'123000':'نمونهٔ معتبر');
      }
      const submit=section.locator('button.primary:visible').first();
      if(await submit.count()){
        await submit.click();metrics.controlExercises++;
        const dialog=page.locator('dialog[open]');
        if(!await dialog.count())fail(scope,'Completed admin form did not open review dialog');
        else{
          const focusedInside=await page.evaluate(()=>document.querySelector('dialog[open]')?.contains(document.activeElement));
          if(!focusedInside)fail(scope,'Admin review dialog did not receive focus');
          await page.keyboard.press('Escape').catch(()=>{});
        }
      }
      return;
    }
    if(view.kind==='table'||view.kind==='list'){
      const search=section.locator('input:visible').first();if(await search.count()){await search.fill('عبارت ناموجود');metrics.controlExercises++;}
      const reload=section.locator('button:visible:not([disabled])').last();if(await reload.count()){await reload.click();metrics.controlExercises++;}
      return;
    }
    const action=section.locator('button:visible:not([disabled])').first();
    if(await action.count()){
      await action.click();await page.waitForTimeout(20);metrics.controlExercises++;
      if(view.kind==='dialog'||view.kind==='review'){
        if(!await page.locator('dialog[open]').count())fail(scope,`${view.kind} action did not open dialog`);
        else await page.keyboard.press('Escape').catch(()=>{});
      }
    }
  }catch(error){fail(scope,'Admin view interaction failed',error.stack||error.message);}
}

async function testAdminNavigation(page,target){
  const group=groupOf(target),groupScreens=admin.filter(s=>groupOf(s)===group),origin=groupScreens.find(s=>s.id!=='AD-C-01')||groupScreens[0];
  const scope=`admin-nav/${target.id}`;
  try{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+routeFor(origin),{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
    const dest=page.locator('.surface-destinations button').filter({hasText:target.title}).first();
    if(!await dest.count()){fail(scope,'Destination button not found in active admin group');return;}
    await dest.click();metrics.adminNavigationChecks++;
    if(target.id==='AD-C-01'){
      await page.locator('h1').first().waitFor({state:'visible'});
    }else{
      await page.locator('h1').first().waitFor({state:'visible'});
      const url=new URL(page.url());if(url.searchParams.get('id')!==target.id)fail(scope,'Destination click did not select expected screen',page.url());
      const h1=(await page.locator('h1').first().textContent())?.trim();if(h1!==target.title)fail(scope,`Destination h1 mismatch: ${h1}`);
    }
  }catch(error){fail(scope,'Admin navigation test failed',error.stack||error.message);}
}

async function testInternalLinks(page){
  for(const href of [...internalLinks].sort()){
    if(href.startsWith('/#')||href==='#')continue;
    const scope=`link/${href}`;
    try{
      await page.setViewportSize({width:1440,height:1000});
      await page.goto(base+href,{waitUntil:'domcontentloaded',timeout:10000});
      await page.locator('h1').first().waitFor({state:'visible',timeout:4000});
      metrics.internalLinkChecks++;
    }catch(error){fail(scope,'Internal link destination failed',error.message);}
  }
}

async function testBackForward(page){
  const scope='history/store-product';
  try{
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(base+'/store?id=SF-B-04',{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
    const before=(await page.locator('h1').first().textContent())?.trim();
    await page.locator('a[href="/store?id=SF-C-01"]').first().click();await page.locator('h1').first().waitFor({state:'visible'});
    await page.goBack({waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
    const back=(await page.locator('h1').first().textContent())?.trim();if(back!==before)fail(scope,`Back navigation returned ${back}, expected ${before}`);
    await page.goForward({waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
    const forward=(await page.locator('h1').first().textContent())?.trim();if(!forward?.includes('آسیاب'))fail(scope,`Forward navigation unexpected h1: ${forward}`);
  }catch(error){fail(scope,'Back/forward navigation failed',error.stack||error.message);}
}

async function testCriticalJourneys(page){
  const checkout='journey/checkout-payment-recovery';
  try{
    await page.setViewportSize({width:360,height:900});
    await page.goto(base+'/flows?flow=checkout',{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
    await page.getByRole('button',{name:'ادامهٔ خرید'}).click();
    await page.locator('input[inputmode="tel"]').fill('09123456789');await page.locator('form button.primary').click();
    await page.locator('input[inputmode="numeric"]').fill('123456');await page.locator('form button.primary').click();
    await page.getByRole('button',{name:'حفظ تعداد سبد مهمان'}).click();
    await page.locator('textarea').fill('نشانی ساختگی کامل برای آزمون طراحی ایکوفی');await page.locator('form button.primary').click();
    await page.locator('input[name="shipping"]').first().click();await page.locator('form button.primary').click();
    await page.getByRole('button',{name:'ادامه به پرداخت آزمایشی'}).click();
    if(!await page.getByText('نتیجه هنوز مشخص نیست',{exact:false}).count())fail(checkout,'Unknown payment state was not shown before status resolution');
    await page.getByRole('button',{name:'بررسی وضعیت — پاسخ موفق نمونه'}).click();
    await page.getByRole('button',{name:'مشاهده نتیجه'}).click();
    if(!await page.getByText('مسیر خرید نمونه پایان یافت',{exact:false}).count())fail(checkout,'Checkout journey did not reach bounded outcome');
    metrics.criticalJourneyChecks++;
  }catch(error){fail(checkout,'Critical checkout journey failed',error.stack||error.message);}

  for(const flow of ['return','warranty','wholesale']){
    const scope=`journey/${flow}`;
    try{
      await page.goto(base+`/flows?flow=${flow}`,{waitUntil:'domcontentloaded'});await page.locator('h1').first().waitFor({state:'visible'});
      const inputs=page.locator('main input:visible,main textarea:visible');
      for(let i=0;i<await inputs.count();i++){const el=inputs.nth(i);await el.fill(i===0&&flow==='wholesale'?'فروشگاه نمونه':'شرح کامل آزمایشی درخواست برای مرور طراحی');}
      const submit=page.locator('main form button.primary:visible,main form button[type="submit"]:visible').first();
      if(await submit.count())await submit.click();
      if(!await page.getByText('بازبینی',{exact:false}).count()&&!await page.getByText('درخواست',{exact:false}).count())fail(scope,'Journey did not expose review/request state');
      metrics.criticalJourneyChecks++;
    }catch(error){fail(scope,'Critical case journey failed',error.stack||error.message);}
  }
}

async function main(){
  assertInventory();
  const browser=await chromium.launch({headless:true});
  try{
    const defaultTasks=screens.flatMap(screen=>widths.map(width=>({kind:'default',screen,width,path:routeFor(screen),scope:`default/${screen.id}/${width}`})));
    await runPool(browser,defaultTasks,8,async(page,task)=>{
      await basicDomAudit(page,task,{axe:task.width===360||task.width===1440,touch:task.width<=360,collectLinks:task.width===1440});metrics.defaultViewportChecks++;
    });

    const viewTasks=adminViews.flatMap(({screen,view})=>widths.map(width=>({kind:'view',screen,view,width,path:adminViewRoute(screen,view),scope:`view/${screen.id}/${view.id}/${width}`})));
    await runPool(browser,viewTasks,8,async(page,task)=>{
      await basicDomAudit(page,task,{axe:task.width===360||task.width===1440,touch:task.width<=360});metrics.viewViewportChecks++;
    });

    const stateItems=[...storefrontStates,...adminStates];
    const stateTasks=stateItems.flatMap(({screen,index})=>[360,1440].map(width=>({kind:'state',screen,index,width,path:qaStateRoute(screen,index),scope:`state/${screen.id}/${index}/${width}`})));
    await runPool(browser,stateTasks,10,async(page,task)=>{await basicDomAudit(page,task,{touch:task.width===360});metrics.stateViewportChecks++;});

    await runPool(browser,screens.flatMap(screen=>[360,1440].map(width=>({screen,width}))),6,async(page,{screen,width})=>exerciseDefaultControls(page,screen,width));
    await runPool(browser,adminViews,6,async(page,{screen,view})=>exerciseAdminView(page,screen,view));
    await runPool(browser,admin,5,async(page,target)=>testAdminNavigation(page,target));

    const context=await browser.newContext({locale:'fa-IR'}),page=await context.newPage();
    await testInternalLinks(page);await testBackForward(page);await testCriticalJourneys(page);await context.close();
  }finally{await browser.close();}

  const report={generatedAt:new Date().toISOString(),base,metrics,failures,warnings,expected:{screens:134,storefront:37,admin:97,adminViews:1142,adminStates:4472,journeys:24,widths}};
  writeFileSync(new URL('./step57-exhaustive-browser-audit.json',evidenceDir),JSON.stringify(report,null,2));
  const summary=[
    '# Step 57 exhaustive browser audit',
    '',`Result: ${failures.length?'FAIL':'PASS'}`,
    '',`- Screens: ${metrics.screens} (${metrics.storefront} storefront + ${metrics.admin} admin)`,
    `- Default screen × viewport checks: ${metrics.defaultViewportChecks}`,
    `- Admin view × viewport checks: ${metrics.viewViewportChecks}`,
    `- Contract state × desktop/mobile checks: ${metrics.stateViewportChecks}`,
    `- Admin views: ${metrics.adminViews}`,
    `- Admin states: ${metrics.adminStates}`,
    `- Journeys represented: ${metrics.journeys}`,
    `- axe WCAG scans: ${metrics.axeScans}`,
    `- Control exercises: ${metrics.controlExercises}`,
    `- Admin navigation checks: ${metrics.adminNavigationChecks}`,
    `- Internal link checks: ${metrics.internalLinkChecks}`,
    `- Critical journey checks: ${metrics.criticalJourneyChecks}`,
    `- Failures: ${failures.length}`,
    `- Warnings: ${warnings.length}`,
    '',...(failures.length?['## Failures','',...failures.slice(0,100).map(f=>`- **${f.scope}** — ${f.message}${f.detail?` — ${String(f.detail).replace(/\n/g,' | ')}`:''}`)]:['No blocking browser-audit failures were found.'])
  ].join('\n');
  writeFileSync(new URL('./STEP-57-EXHAUSTIVE-BROWSER-AUDIT.md',evidenceDir),summary);
  console.log(summary);
  if(failures.length)process.exitCode=1;
}

await main();
