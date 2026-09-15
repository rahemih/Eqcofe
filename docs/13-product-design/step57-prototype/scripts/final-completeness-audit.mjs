import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const require=createRequire(import.meta.url);
const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const coverage=JSON.parse(readFileSync(new URL('../src/coverage.json',import.meta.url),'utf8'));
const base=process.env.STEP57_BASE_URL||'http://127.0.0.1:4173';
const widths=[320,360,600,840,1200,1440];
const batchSize=160;
const screens=coverage.screens||[];
const admin=screens.filter(screen=>screen.area==='admin');
const storefront=screens.filter(screen=>screen.area==='storefront');
const adminStates=admin.flatMap(screen=>(screen.states||[]).map((state,index)=>({screen,state,index})));
const storefrontStates=storefront.flatMap(screen=>(screen.states||[]).map((state,index)=>({screen,state,index})));
const allStates=[...storefrontStates,...adminStates];
const failures=[];
const warnings=[];
const evidenceDir=new URL('../qa-evidence/',import.meta.url);
mkdirSync(evidenceDir,{recursive:true});

const metrics={screens:screens.length,adminStates:adminStates.length,storefrontStates:storefrontStates.length,stateViewportChecks:0,stateAxeBatchScans:0,stateBatches:0,buttonInventory:0,buttonExercises:0,fileChooserExercises:0};

function fail(scope,message,detail=''){failures.push({scope,message,detail});}
function routeFor(screen){return screen.area==='admin'?`/admin?id=${encodeURIComponent(screen.id)}`:`/store?id=${encodeURIComponent(screen.id)}`;}

async function runPool(browser,tasks,concurrency,fn){
  let cursor=0;
  await Promise.all(Array.from({length:concurrency},async()=>{
    const context=await browser.newContext({locale:'fa-IR'});
    const page=await context.newPage();
    while(true){const i=cursor++;if(i>=tasks.length)break;await fn(page,tasks[i]);}
    await context.close();
  }));
}

async function auditStateBatch(page,task){
  const scope=`full-state-batch/${task.offset}/${task.width}`;
  const errors=[];const external=[];
  const onConsole=msg=>{if(msg.type()==='error')errors.push(msg.text());};
  const onPageError=err=>errors.push(err.message);
  const onRequest=req=>{try{const u=new URL(req.url()),b=new URL(base);if(u.origin!==b.origin&&!['data:','blob:'].includes(u.protocol))external.push(req.url());}catch{}};
  page.on('console',onConsole);page.on('pageerror',onPageError);page.on('request',onRequest);
  try{
    await page.setViewportSize({width:task.width,height:1000});
    await page.goto(`${base}/qa?batch=1&offset=${task.offset}&limit=${batchSize}`,{waitUntil:'domcontentloaded',timeout:12000});
    await page.locator('h1').first().waitFor({state:'visible',timeout:5000});
    const result=await page.evaluate(({expectedKeys})=>{
      const main=document.querySelector('main,[role="main"]');
      const cards=[...document.querySelectorAll('[data-qa-state-key]')];
      const keys=cards.map(card=>card.getAttribute('data-qa-state-key'));
      const cardFailures=cards.flatMap(card=>{
        const direction=getComputedStyle(card).direction;
        const overflow=card.scrollWidth-card.clientWidth;
        const key=card.getAttribute('data-qa-state-key');
        const problems=[];
        if(direction!=='rtl')problems.push(`${key}:direction=${direction}`);
        if(overflow>2)problems.push(`${key}:overflow=${overflow}`);
        return problems;
      });
      return {h1:document.querySelectorAll('h1').length,main:!!main,dir:main?getComputedStyle(main).direction:getComputedStyle(document.documentElement).direction,overflow:document.documentElement.scrollWidth-window.innerWidth,keys,expectedKeys,cardFailures};
    },{expectedKeys:task.keys});
    if(result.h1!==1)fail(scope,`Expected one h1; found ${result.h1}`);
    if(!result.main)fail(scope,'Missing semantic main');
    if(result.dir!=='rtl')fail(scope,`Expected rtl; found ${result.dir}`);
    if(result.overflow>2)fail(scope,`Horizontal overflow ${result.overflow}px`);
    if(JSON.stringify(result.keys)!==JSON.stringify(result.expectedKeys))fail(scope,'Batch state identity/order mismatch',`expected=${result.expectedKeys.length}; actual=${result.keys.length}`);
    if(result.cardFailures.length)fail(scope,`Per-state layout failures: ${result.cardFailures.length}`,result.cardFailures.slice(0,20).join(' | '));
    if(errors.length)fail(scope,`Browser errors: ${errors.length}`,errors.slice(0,5).join(' | '));
    if(external.length)fail(scope,`Unexpected external requests: ${external.length}`,external.slice(0,5).join(' | '));
    if(task.width===360||task.width===1440){
      await page.addScriptTag({content:axeSource});
      const axeResult=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
      metrics.stateAxeBatchScans++;
      if(axeResult.violations.length)fail(scope,`axe WCAG violations: ${axeResult.violations.length}`,axeResult.violations.slice(0,6).map(v=>`${v.id}:${v.nodes.length}`).join(' | '));
    }
    metrics.stateViewportChecks+=task.keys.length;
    metrics.stateBatches++;
  }catch(error){fail(scope,'State batch render/reflow audit failed',error.stack||error.message);}
  finally{page.off('console',onConsole);page.off('pageerror',onPageError);page.off('request',onRequest);}
}

async function exerciseEveryButton(page,screen,width){
  const baseScope=`all-buttons/${screen.id}/${width}`;
  try{
    await page.setViewportSize({width,height:1000});
    await page.goto(base+routeFor(screen),{waitUntil:'domcontentloaded',timeout:12000});
    await page.locator('h1').first().waitFor({state:'visible',timeout:5000});
    const buttonCount=await page.locator('main button:visible:not([disabled])').count();
    metrics.buttonInventory+=buttonCount;
    for(let i=0;i<buttonCount;i++){
      const scope=`${baseScope}/${i}`;const errors=[];const external=[];
      const onConsole=msg=>{if(msg.type()==='error')errors.push(msg.text());};
      const onPageError=err=>errors.push(err.message);
      const onRequest=req=>{try{const u=new URL(req.url()),b=new URL(base);if(u.origin!==b.origin&&!['data:','blob:'].includes(u.protocol))external.push(req.url());}catch{}};
      page.on('console',onConsole);page.on('pageerror',onPageError);page.on('request',onRequest);
      try{
        await page.goto(base+routeFor(screen),{waitUntil:'domcontentloaded',timeout:12000});
        await page.locator('h1').first().waitFor({state:'visible',timeout:5000});
        const current=page.locator('main button:visible:not([disabled])').nth(i);
        if(!await current.count()){fail(scope,'Button disappeared after deterministic reload');continue;}
        const name=((await current.getAttribute('aria-label'))||(await current.textContent())||'').trim();
        const beforeUrl=page.url();
        if(name.includes('انتخاب فایل نمونه')){
          const chooserPromise=page.waitForEvent('filechooser',{timeout:3000});
          await current.click({timeout:3000});
          const chooser=await chooserPromise;
          await chooser.setFiles({name:'step57-completeness.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});
          metrics.fileChooserExercises++;
        }else await current.click({timeout:3000});
        await page.waitForTimeout(40);metrics.buttonExercises++;
        const dialog=page.locator('dialog[open]');
        if(await dialog.count()){
          const focusedInside=await page.evaluate(()=>document.querySelector('dialog[open]')?.contains(document.activeElement));
          if(!focusedInside)fail(scope,'Opened dialog did not receive focus');
          await page.keyboard.press('Escape').catch(()=>{});
        }
        if(page.url()!==beforeUrl){try{await page.locator('h1').first().waitFor({state:'visible',timeout:4000});}catch{fail(scope,'Button navigated to destination without visible h1',page.url());}}
        if(errors.length)fail(scope,`Browser errors after activation: ${errors.length}`,errors.slice(0,5).join(' | '));
        if(external.length)fail(scope,`External requests after activation: ${external.length}`,external.slice(0,5).join(' | '));
      }catch(error){fail(scope,'Button activation failed',error.stack||error.message);}
      finally{page.off('console',onConsole);page.off('pageerror',onPageError);page.off('request',onRequest);}
    }
  }catch(error){fail(baseScope,'Button inventory failed',error.stack||error.message);}
}

async function main(){
  if(screens.length!==134)fail('inventory',`Expected 134 screens; found ${screens.length}`);
  if(adminStates.length!==4472)fail('inventory',`Expected 4472 admin states; found ${adminStates.length}`);
  const browser=await chromium.launch({headless:true});
  try{
    const batches=[];
    for(let offset=0;offset<allStates.length;offset+=batchSize){
      const slice=allStates.slice(offset,offset+batchSize);
      const keys=slice.map(({screen,index})=>`${screen.id}:${index}`);
      for(const width of widths)batches.push({offset,width,keys});
    }
    await runPool(browser,batches,6,auditStateBatch);
    const buttonTasks=screens.flatMap(screen=>[360,1440].map(width=>({screen,width})));
    await runPool(browser,buttonTasks,8,async(page,task)=>exerciseEveryButton(page,task.screen,task.width));
  }finally{await browser.close();}
  const expectedStateChecks=allStates.length*widths.length;
  if(metrics.stateViewportChecks!==expectedStateChecks)fail('coverage',`Expected ${expectedStateChecks} state×viewport checks; completed ${metrics.stateViewportChecks}`);
  const report={generatedAt:new Date().toISOString(),base,widths,batchSize,metrics,expected:{screens:134,adminStates:4472,stateViewportChecks:expectedStateChecks,buttonCoverage:'every visible enabled main button at 360 and 1440; no artificial cap'},failures,warnings};
  writeFileSync(new URL('./step57-final-completeness-audit.json',evidenceDir),JSON.stringify(report,null,2)+'\n');
  const summary=['# Step 57 final completeness audit','',`Result: ${failures.length?'FAIL':'PASS'}`,'',`- Screens: ${metrics.screens}`,`- Admin states: ${metrics.adminStates}`,`- Storefront states: ${metrics.storefrontStates}`,`- State × six-width checks: ${metrics.stateViewportChecks}/${expectedStateChecks}`,`- State batches rendered: ${metrics.stateBatches}`,`- Axe batch scans (360 + 1440): ${metrics.stateAxeBatchScans}`,`- Visible enabled button inventory (360 + 1440): ${metrics.buttonInventory}`,`- Button exercises: ${metrics.buttonExercises}`,`- File chooser exercises: ${metrics.fileChooserExercises}`,`- Failures: ${failures.length}`,'',...(failures.length?['## Failures','',...failures.slice(0,150).map(f=>`- **${f.scope}** — ${f.message}${f.detail?` — ${String(f.detail).replace(/\n/g,' | ')}`:''}`)]:['No blocking completeness failures were found.'])].join('\n');
  writeFileSync(new URL('./STEP-57-FINAL-COMPLETENESS-AUDIT.md',evidenceDir),summary+'\n');
  console.log(summary);
  if(failures.length)process.exitCode=1;
}

await main();
