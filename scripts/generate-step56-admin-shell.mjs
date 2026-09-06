import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
const input='docs/13-product-design/step56-admin-shell-wireframes.json';
const root='docs/13-product-design/step56-wireframes/B';
const raw=readFileSync(input,'utf8').replaceAll('\r\n','\n');
const c=JSON.parse(raw); const files={};
const hash=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const json=x=>JSON.stringify(x,null,2)+'\n';
const name=(s,v,w)=>`${s.id}--${w}--${v.id}--v1.svg`;
function frame(s,v,w){
 const preAuth=s.id==='AD-B-01'&&v.id!=='credentials';
 const expanded=w>=840&&!preAuth, sidebar=expanded?240:0, m=w>=840?32:w>=600?24:16, width=preAuth?Math.min(480,w-m*2):w-sidebar-m*2, x=preAuth?(w-width)/2:m;
 let body='', y=120;
 const box=(xx,yy,ww,hh,fill='#ffffff')=>`<rect x="${xx}" y="${yy}" width="${ww}" height="${hh}" rx="4" fill="${fill}" stroke="#555555"/>`;
 const text=(t,xx,yy,size=16)=>`<text x="${xx}" y="${yy}" font-size="${size}" direction="rtl" text-anchor="start" unicode-bidi="plaintext">${esc(t)}</text>`;
 const wrap=(t,max)=>{let lines=[],line='';for(const word of t.split(' ')){if((line+' '+word).length>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;};
 const paragraph=(t,pad=16)=>{for(const line of wrap(t,Math.max(14,Math.floor((width-pad*2)/9)))){body+=text(line,x+width-pad,y);y+=28;}};
 body+=box(0,0,w,64,'#eeeeee')+text('مدیریت EQCOFE',w-m,28,18)+text(preAuth?'ورود امن کارکنان':'منو  |  مسیرها  |  حساب',w-m,52,14);
 if(expanded){body+=box(w-240,80,224,580,'#f5f5f5');c.adminNavigation.forEach((g,i)=>{body+=box(w-224,100+i*64,192,48)+text(g.label,w-240+192,130+i*64,16);});}
 body+=text(preAuth?'ورود به مدیریت':'مدیریت / مسیر جاری',x+width,y-26,14);
 paragraph(v.title);y+=12;
 if((v.kind==='navigation'&&!expanded)||v.kind==='drawer'){
  for(const g of c.adminNavigation){body+=box(x,y,width,48,'#f5f5f5')+text(g.label,x+width-16,y+30);y+=60;}
 }else if(v.kind==='table'){
  body+=box(x,y,width,48,'#f5f5f5')+text('فیلتر وضعیت: همه',x+width-16,y+30);y+=64;
  if(expanded){
   const col=width/3;
   for(const [i,label] of ['عنوان','وضعیت','اقدام'].entries())body+=box(x+width-(i+1)*col,y,col,48,'#eeeeee')+text(label,x+width-i*col-16,y+30);
   y+=48;
   for(let row=0;row<3;row++){for(const [i,label] of ['رکورد نمونه','فقط نمایش','مشاهده'].entries())body+=box(x+width-(i+1)*col,y,col,56)+text(label,x+width-i*col-16,y+34);y+=56;}
   y+=16;
  }else{
   for(let i=0;i<2;i++){body+=box(x,y,width,144);y+=30;paragraph('عنوان: رکورد نمونه');paragraph('وضعیت: فقط نمایش');paragraph('اقدام: مشاهده');y+=42;}
  }
  body+=box(x,y,width,48)+text('قبلی    صفحهٔ ۱    بعدی',x+width-16,y+30);y+=64;
 }

 for(const [itemIndex,item] of (v.kind==='table'?[]:v.items).entries()){
  const lines=wrap(item,Math.max(14,Math.floor((width-32)/9)));const h=lines.length*28+24;
  body+=box(x,y,width,h,v.kind==='error'||v.kind==='unavailable'?'#eeeeee':'#ffffff');y+=30;for(const l of lines){body+=text(l,x+width-16,y);y+=28;}y+=10;
  if((v.kind==='form'&&itemIndex<2)||(v.kind==='search'&&itemIndex===0)){body+=box(x,y,width,48,'#f5f5f5');y+=64;}
 }
 y+=12;body+=box(x,y,width,48,'#dddddd')+text(v.action,x+width-16,y+30);y+=70;
 if(v.kind==='dialog'){body+=box(x,y,width,48)+text(v.id==='confirmation'?'ادامه پس از بازبینی':v.id==='step-up'?'تأیید با کلید امنیتی':'بازگشت بدون انجام اقدام',x+width-16,y+30);y+=70;}
 paragraph('وایرفریم کم‌جزئیات؛ داده‌ها نمونه‌اند.');
 const h=Math.max(y+24,expanded?700:500);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${esc(s.id+' '+v.title+' '+w)}</title><desc id="desc">Persian RTL low-fidelity design evidence. ${esc(s.behavior)} Keyboard and state behavior are specified in companion documentation; this SVG is not an interactive implementation.</desc><rect width="${w}" height="${h}" fill="#ffffff"/><g font-family="Tahoma, Arial, sans-serif" fill="#111111">${body}</g></svg>\n`;
}
let frameCount=0;
for(const s of c.screens){
 const folder=`${root}/${s.id}`; const frames=[];
 for(const [i,v] of s.views.entries())for(const w of i===0?c.responsive.verificationWidthsPx:[320,1440]){
  const path=`${folder}/${name(s,v,w)}`;files[path]=frame(s,v,w);frames.push({path,view:v.id,width:w});frameCount++;
 }
 files[`${folder}/traceability.json`]=json({id:s.id,task:s.task,journeys:s.journeys,actors:s.actors,domains:s.domains,operations:s.operations,operationViews:s.operationViews,blockedOperations:s.blockedOperations,facets:s.requiredFacets,states:s.states,frames});
 files[`${folder}/README.md`]=`# ${s.id} — ${s.title}\n\n${s.behavior}\n\n## Focus and keyboard\n\n${Object.entries(s.focus).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n\n## Facet acceptance\n\n${s.requiredFacets.map(f=>`- ${f}: inspect the linked views, operation evidence and state matrix; unsupported authority remains unavailable.`).join('\n')}\n\n## State coverage\n\n| State | View | Required behavior |\n|---|---|---|\n${s.states.map(st=>`| ${st.id} | ${st.view} | ${st.behavior} |`).join('\n')}\n\n## Responsive acceptance\n\nPrimary view exists at all six inherited widths; other variants at 320/1440. At 400% zoom on 1280, use the 320 layout. Single column, logical RTL reading, no page horizontal scroll, card equivalent for tables, 44px minimum controls and no fixed action obstruction. Long Persian wraps; text spacing and user font overrides must not clip. Browser-runtime keyboard/screen-reader certification is deferred to implementation; these are design obligations.\n`;
}
files[`${root}/README.md`]=`# Step 56-B — Admin IA and Shell\n\n7 obligations, ${frameCount} low-fidelity RTL SVG frames. Only B is designed; C–H remain NOT_STARTED. A is an immutable foundation snapshot; the B contract records current progression. Open implementation evidence remains NO_ACTION.\n\nView gallery.html for a local review index; no network, Figma or paid service is required.\n\nThe sidebar covers all eight inherited groups. Search is local authorized destination navigation, not cross-domain data search. Notification management is a destination, not evidence of a personal notification feed. Generic patterns do not implement domain pages.\n`;
const cards=c.screens.flatMap(s=>s.views.flatMap((v,i)=>(i===0?c.responsive.verificationWidthsPx:[320,1440]).map(w=>`<article><h2>${esc(s.id+' / '+v.title+' / '+w)}</h2><a href="${s.id}/${name(s,v,w)}">نمایش اندازهٔ اصلی</a><img loading="lazy" src="${s.id}/${name(s,v,w)}" alt="${esc(s.title+'؛ '+v.title+'؛ عرض '+w)}"/></article>`))).join('\n');
files[`${root}/gallery.html`]=`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EQCOFE — Step 56-B</title><style>body{font:16px/1.8 Tahoma,Arial,sans-serif;background:#eee;color:#111;margin:24px}h1,h2{overflow-wrap:anywhere}article{background:white;padding:16px;margin:24px 0;border:1px solid #777}img{display:block;max-width:100%;height:auto;margin-top:16px}a{display:inline-block;min-height:44px}:focus-visible{outline:3px solid #111;outline-offset:4px}</style><h1>معماری و پوستهٔ مدیریت — مرحلهٔ 56-B</h1><p>این صفحه فهرست شواهد طراحی است؛ محصول اجرایی نیست. تصاویر کوچک‌شده را برای بررسی دقیق در اندازهٔ اصلی باز کنید.</p>${cards}</html>\n`;
files[`${root}/manifest.json`]=json({step:56,substep:'B',source:input,sourceSha256:hash(raw),screenCount:7,frameCount,artifacts:Object.entries(files).map(([path,content])=>({path,sha256:hash(content),bytes:Buffer.byteLength(content)}))});
function walk(p){try{return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);}catch{return [];}}
if(process.argv.includes('--check')){const errors=[];for(const [p,v] of Object.entries(files)){try{if(readFileSync(p,'utf8').replaceAll('\r\n','\n')!==v)errors.push(p);}catch{errors.push(p);}}errors.push(...walk(root).filter(p=>!(p in files)));if(errors.length)throw Error('B artifact drift: '+errors.join(', '));}
else for(const [p,v] of Object.entries(files)){mkdirSync(dirname(p),{recursive:true});writeFileSync(p,v);}
console.log(`Step 56-B: PASS; ${frameCount} frames; ${Object.keys(files).length} artifacts`);
