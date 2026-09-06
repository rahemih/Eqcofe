import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// @ts-ignore repository-native validator module
import {validateShell} from '../../scripts/validate-step56-admin-shell.mjs';
const read=()=>JSON.parse(readFileSync('docs/13-product-design/step56-admin-shell-wireframes.json','utf8'));
test('56-B inherits intact foundation authority and scope',()=>assert.deepEqual(validateShell(read()),[]));
for(const [name,mutate] of [
 ['missing surface',(c:any)=>c.screens.pop()],
 ['invented operation',(c:any)=>c.screens[4].operations.push('GET /admin/global-search')],
 ['dashboard success',(c:any)=>c.screens[2].states[0].coverage='SUCCESS'],
 ['dropped conflict',(c:any)=>c.sourceGaps.pop()],
 ['permission union',(c:any)=>c.authorization.permissions='ANY'],
 ['quick mutation',(c:any)=>c.authorization.quickActions='EXECUTE'],
 ['notification feed',(c:any)=>c.authorization.notifications='LIVE_BADGE'],
 ['bypassed FIDO',(c:any)=>c.authSequence.splice(1,2)],
 ['missing enrollment',(c:any)=>c.screens[0].views.splice(2,1)],
 ['omitted state',(c:any)=>c.screens[6].states.pop()],
 ['dropped destination',(c:any)=>c.destinations.pop()],
 ['hidden actor',(c:any)=>c.screens[0].actors.pop()],
 ['source forgery',(c:any)=>c.sources[0].sha256='0'.repeat(64)],
 ['C started',(c:any)=>c.nextGateStatus='IN_PROGRESS'],
 ['shrunk touch',(c:any)=>c.layout.touchMinPx=24],
 ['runtime claim',(c:any)=>c.review.runtimeAccessibilityCertified=true]
] as const)test('56-B rejects '+name,()=>{const c=read();mutate(c);assert.ok(validateShell(c).length>0);});
test('56-B generated inventory is deterministic',()=>{const r=spawnSync(process.execPath,['scripts/generate-step56-admin-shell.mjs','--check'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const m=JSON.parse(readFileSync('docs/13-product-design/step56-wireframes/B/manifest.json','utf8'));assert.equal(m.frameCount,74);assert.equal(m.screenCount,7);});
test('56-B public login exposes no authenticated navigation',()=>{const svg=readFileSync('docs/13-product-design/step56-wireframes/B/AD-B-01/AD-B-01--1440--login--v1.svg','utf8');assert.ok(!svg.includes('فروش و سفارش'));assert.ok(svg.includes('ورود امن کارکنان'));});
test('56-B dashboard does not fabricate commerce metrics',()=>{const svg=readFileSync('docs/13-product-design/step56-wireframes/B/AD-B-03/AD-B-03--320--unavailable--v1.svg','utf8');assert.ok(svg.includes('نمای کلی در دسترس نیست'));assert.ok(!svg.includes('میلیون'));});

test('56-B rejects operation/view authority corruption',()=>{const c=read();c.screens[0].operationViews[0].executionAuthority='ALLOWED';assert.ok(validateShell(c).length);});
test('56-B rejects missing visual review',()=>{const c=read();c.review.visual='PENDING';assert.ok(validateShell(c).length);});
