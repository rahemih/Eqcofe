import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const sourcePath='docs/13-product-design/step55-content-policy-final-audit-wireframes.json';
const gate=require('../../docs/13-product-design/step55-content-policy-final-audit-wireframes.json');
const foundation=require('../../docs/13-product-design/step55-storefront-wireframe-contract.json');
const step54=require('../../docs/13-product-design/step54-design-system-contract.json');
const audit=require('../../docs/13-product-design/step55-wireframes/F/storefront-final-audit.json');
const root='docs/13-product-design/step55-wireframes/F';

test('Step 55-F owns exactly the seven frozen content, support and policy screens',()=>{
  const expected=foundation.acceptanceGates.find((item:{id:string})=>item.id==='55-F').requiredScreens;
  assert.deepEqual(gate.screens.map((screen:{id:string})=>screen.id),expected);
  assert.equal(gate.screens.every((screen:{id:string})=>screen.id.startsWith('SF-F-')),true);
  assert.equal(gate.status,'F_COMPLETE_STEP_CLOSURE_CANDIDATE');
  assert.deepEqual(foundation.completedGates,['55-A','55-B','55-C','55-D','55-E','55-F']);
  assert.equal(foundation.nextGate,null);
});

test('Step 55-F covers every required state with compact and expanded evidence',()=>{
  let frames=0;
  for(const screen of gate.screens){
    const frozen=foundation.screenInventory.find((item:{id:string})=>item.id===screen.id);
    assert.deepEqual(screen.states.map((state:{id:string})=>state.id),frozen.requiredStates);
    for(const [index,state] of screen.states.entries()){
      assert.equal(existsSync(`${root}/${screen.id}/${screen.id}--320--${state.id}--v1.svg`),true);frames+=1;
      if(index===0){assert.equal(existsSync(`${root}/${screen.id}/${screen.id}--1440--${state.id}--v1.svg`),true);frames+=1;}
    }
  }
  assert.equal(frames,25);assert.equal(frames,gate.acceptance.expectedFrameCount);
});

test('Step 55-F traces article reads to OpenAPI and invents no static or support operation',()=>{
  const openapi=readFileSync('contracts/http/openapi.yaml','utf8');
  const direct=new Set(gate.directOpenApiCapabilities);
  const components=new Set(Object.keys(step54.components));
  for(const operation of direct){const [method,path]=operation.split(' ');assert.equal(method,'GET');assert.ok(openapi.includes(`  ${path}:`));}
  for(const screen of gate.screens){
    assert.equal(screen.components.every((component:string)=>components.has(component)),true);
    if(screen.operationTraceMode==='openapi-direct-content-capability') assert.equal(screen.operations.length>0&&screen.operations.every((operation:string)=>direct.has(operation)),true);
    else assert.deepEqual(screen.operations,[]);
  }
});

test('Step 55-F records all responsive, reflow and accessibility thresholds',()=>{
  assert.deepEqual(gate.acceptance.requiredWidths,[320,360,600,840,1200,1440]);
  assert.deepEqual(gate.acceptance.requiredWidths,foundation.responsive.verificationWidthsPx);
  assert.equal(gate.acceptance.zoomPercent,400);assert.equal(gate.acceptance.minimumTargetPx,44);
  for(const screen of gate.screens){const trace=require(`../../docs/13-product-design/step55-wireframes/F/${screen.id}/traceability.json`);assert.deepEqual(trace.responsiveEvidence.map((item:{width:number})=>item.width),gate.acceptance.requiredWidths);assert.equal(trace.zoomEvidence.horizontalTwoAxisScroll,false);}
});

test('Step 55-F preserves published content, policy truth and support privacy boundaries',()=>{
  assert.equal(gate.language,'fa-IR');assert.equal(gate.direction,'rtl');assert.equal(gate.currency,'Toman');assert.equal(gate.walletAllowed,false);
  assert.ok(gate.crossCutting.contentTruth.some((rule:string)=>/published/.test(rule)));
  assert.ok(gate.crossCutting.policySafety.some((rule:string)=>/Business Rule/.test(rule)));
  assert.ok(gate.crossCutting.supportPrivacy.some((rule:string)=>/OTP/.test(rule)));
  for(const screen of gate.screens){const trace=require(`../../docs/13-product-design/step55-wireframes/F/${screen.id}/traceability.json`);assert.equal(Object.values(trace.boundary).some(Boolean),false);}
});

test('Step 55-F manifest pins the source hash and every generated child',()=>{
  const manifest=require('../../docs/13-product-design/step55-wireframes/F/gate-f-manifest.json');
  const normalized=readFileSync(sourcePath,'utf8').replace(/\r\n/g,'\n');
  assert.equal(manifest.sourceSha256,createHash('sha256').update(normalized).digest('hex'));
  assert.equal(manifest.screenCount,7);assert.equal(manifest.frameCount,25);assert.equal(manifest.generatedArtifacts.length,49);
  for(const artifact of manifest.generatedArtifacts){assert.equal(existsSync(artifact.path),true);assert.equal(createHash('sha256').update(readFileSync(artifact.path,'utf8')).digest('hex'),artifact.sha256);}
});

test('Step 55 final audit passes all 37 screens, 145 frames and five manifests with no exception',()=>{
  assert.equal(audit.gateCount,5);assert.equal(audit.screenCount,37);assert.equal(audit.frameCount,145);assert.equal(audit.manifestCount,5);
  assert.equal(audit.generatedArtifactCountIncludingManifests,268);assert.equal(audit.journeyCount,12);
  assert.equal(new Set(audit.screens.map((screen:{id:string})=>screen.id)).size,37);
  assert.equal(audit.screens.every((screen:{verdict:string})=>screen.verdict==='PASS'),true);
  assert.equal(audit.checks.every((check:{verdict:string})=>check.verdict==='PASS'),true);
  assert.deepEqual(audit.openExceptions,[]);assert.equal(Object.values(audit.boundary).some(Boolean),false);
});
