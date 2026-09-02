import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const sourcePath='docs/13-product-design/step55-account-wholesale-after-sales-wireframes.json';
const gate=require('../../docs/13-product-design/step55-account-wholesale-after-sales-wireframes.json');
const foundation=require('../../docs/13-product-design/step55-storefront-wireframe-contract.json');
const step53=require('../../docs/13-product-design/step53-experience-contract.json');
const step54=require('../../docs/13-product-design/step54-design-system-contract.json');
const root='docs/13-product-design/step55-wireframes/E';

test('Step 55-E owns exactly the twelve frozen account, wholesale and after-sales screens',()=>{
  const expected=foundation.acceptanceGates.find((item:{id:string})=>item.id==='55-E').requiredScreens;
  assert.deepEqual(gate.screens.map((screen:{id:string})=>screen.id),expected);
  assert.equal(gate.screens.every((screen:{id:string})=>screen.id.startsWith('SF-E-')),true);
  assert.equal(gate.status,'E_COMPLETE_STEP_IN_PROGRESS');
  assert.deepEqual(foundation.completedGates,['55-A','55-B','55-C','55-D','55-E']);
  assert.equal(foundation.nextGate,'55-F');
});

test('Step 55-E covers every required state with compact and expanded evidence',()=>{
  let frames=0;
  for(const screen of gate.screens){
    const frozen=foundation.screenInventory.find((item:{id:string})=>item.id===screen.id);
    assert.deepEqual(screen.states.map((state:{id:string})=>state.id),frozen.requiredStates);
    for(const [index,state] of screen.states.entries()){
      assert.equal(existsSync(`${root}/${screen.id}/${screen.id}--320--${state.id}--v1.svg`),true);frames+=1;
      if(index===0){assert.equal(existsSync(`${root}/${screen.id}/${screen.id}--1440--${state.id}--v1.svg`),true);frames+=1;}
    }
  }
  assert.equal(frames,48);assert.equal(frames,gate.acceptance.expectedFrameCount);
});

test('Step 55-E references only mapped journeys, operations and Step 54 components',()=>{
  const journeys=new Map(step53.journeys.map((journey:{id:string;operations:string[]})=>[journey.id,journey]));
  const components=new Set(Object.keys(step54.components));
  for(const screen of gate.screens){
    const allowed=new Set(screen.journeys.flatMap((id:string)=>journeys.get(id).operations));
    assert.equal(screen.operations.every((operation:string)=>allowed.has(operation)),true);
    assert.equal(screen.components.every((component:string)=>components.has(component)),true);
  }
});

test('Step 55-E records all responsive, reflow and accessibility thresholds',()=>{
  assert.deepEqual(gate.acceptance.requiredWidths,[320,360,600,840,1200,1440]);
  assert.deepEqual(gate.acceptance.requiredWidths,foundation.responsive.verificationWidthsPx);
  assert.equal(gate.acceptance.zoomPercent,400);assert.equal(gate.acceptance.minimumTargetPx,44);
  for(const screen of gate.screens){const trace=require(`../../docs/13-product-design/step55-wireframes/E/${screen.id}/traceability.json`);assert.deepEqual(trace.responsiveEvidence.map((item:{width:number})=>item.width),gate.acceptance.requiredWidths);assert.equal(trace.zoomEvidence.horizontalTwoAxisScroll,false);}
});

test('Step 55-E preserves ownership, wholesale and after-sales fail-closed boundaries',()=>{
  assert.equal(gate.language,'fa-IR');assert.equal(gate.direction,'rtl');assert.equal(gate.currency,'Toman');assert.equal(gate.walletAllowed,false);
  assert.ok(gate.crossCutting.ownershipPrivacy.some((rule:string)=>/customer-owned/.test(rule)));
  assert.ok(gate.crossCutting.wholesale.some((rule:string)=>/approval authoritative/.test(rule)));
  assert.ok(gate.crossCutting.afterSales.some((rule:string)=>/eligibility/.test(rule)));
  for(const screen of gate.screens){const trace=require(`../../docs/13-product-design/step55-wireframes/E/${screen.id}/traceability.json`);assert.equal(Object.values(trace.boundary).some(Boolean),false);}
});

test('Step 55-E manifest pins the source hash and all generated artifacts',()=>{
  const manifest=require('../../docs/13-product-design/step55-wireframes/E/gate-e-manifest.json');
  const normalized=readFileSync(sourcePath,'utf8').replace(/\r\n/g,'\n');
  assert.equal(manifest.sourceSha256,createHash('sha256').update(normalized).digest('hex'));
  assert.equal(manifest.screenCount,12);assert.equal(manifest.frameCount,48);assert.equal(manifest.generatedArtifacts.length,85);
  assert.equal(manifest.generatedArtifacts.every((artifact:{path:string;sha256:string})=>existsSync(artifact.path)&&/^[a-f0-9]{64}$/.test(artifact.sha256)),true);
});
