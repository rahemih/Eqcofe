import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const sourcePath = 'docs/13-product-design/step55-discovery-wireframes.json';
const gate = require('../../docs/13-product-design/step55-discovery-wireframes.json');
const foundation = require('../../docs/13-product-design/step55-storefront-wireframe-contract.json');
const step53 = require('../../docs/13-product-design/step53-experience-contract.json');
const step54 = require('../../docs/13-product-design/step54-design-system-contract.json');
const root = 'docs/13-product-design/step55-wireframes/B';

test('Step 55-B has the six frozen discovery screens and no later-gate screen', () => {
  const expected = foundation.acceptanceGates.find((item: { id: string }) => item.id === '55-B').requiredScreens;
  assert.deepEqual(gate.screens.map((screen: { id: string }) => screen.id), expected);
  assert.equal(gate.screens.every((screen: { id: string }) => screen.id.startsWith('SF-B-')), true);
  assert.equal(gate.status, 'B_COMPLETE_STEP_IN_PROGRESS');
  assert.equal(foundation.nextGate, '55-C');
});

test('Step 55-B covers every required state with compact and expanded evidence', () => {
  let frames = 0;
  for (const screen of gate.screens) {
    const frozen = foundation.screenInventory.find((item: { id: string }) => item.id === screen.id);
    assert.deepEqual(screen.states.map((state: { id: string }) => state.id), frozen.requiredStates);
    for (const [index, state] of screen.states.entries()) {
      assert.equal(existsSync(`${root}/${screen.id}/${screen.id}--320--${state.id}--v1.svg`), true);
      frames += 1;
      if (index === 0) {
        assert.equal(existsSync(`${root}/${screen.id}/${screen.id}--1440--${state.id}--v1.svg`), true);
        frames += 1;
      }
    }
  }
  assert.equal(frames, 24);
  assert.equal(frames, gate.acceptance.expectedFrameCount);
});

test('Step 55-B uses only mapped journeys, operations and Step 54 components', () => {
  const journeys = new Map(step53.journeys.map((journey: { id: string; operations: string[] }) => [journey.id, journey]));
  const components = new Set(Object.keys(step54.components));
  for (const screen of gate.screens) {
    const allowedOperations = new Set(screen.journeys.flatMap((id: string) => journeys.get(id).operations));
    assert.equal(screen.operations.every((operation: string) => allowedOperations.has(operation)), true);
    assert.equal(screen.components.every((component: string) => components.has(component)), true);
  }
});

test('Step 55-B records every inherited width, reflow and accessibility threshold', () => {
  assert.deepEqual(gate.acceptance.requiredWidths, [320, 360, 600, 840, 1200, 1440]);
  assert.deepEqual(gate.acceptance.requiredWidths, foundation.responsive.verificationWidthsPx);
  assert.equal(gate.acceptance.zoomPercent, 400);
  assert.equal(gate.acceptance.minimumTargetPx, 44);
  for (const screen of gate.screens) {
    const trace = require(`../../docs/13-product-design/step55-wireframes/B/${screen.id}/traceability.json`);
    assert.deepEqual(trace.responsiveEvidence.map((item: { width: number }) => item.width), gate.acceptance.requiredWidths);
    assert.equal(trace.zoomEvidence.horizontalTwoAxisScroll, false);
  }
});

test('Step 55-B preserves Persian RTL, Toman, no-Wallet and low-fidelity boundaries', () => {
  assert.equal(gate.language, 'fa-IR');
  assert.equal(gate.direction, 'rtl');
  assert.equal(gate.currency, 'Toman');
  assert.equal(gate.walletAllowed, false);
  assert.equal(gate.fidelity, 'structural-low-fidelity');
  for (const screen of gate.screens) {
    const trace = require(`../../docs/13-product-design/step55-wireframes/B/${screen.id}/traceability.json`);
    assert.deepEqual(trace.boundary, {
      highFidelity: false,
      runtimeImplementation: false,
      apiMutation: false,
      businessRuleMutation: false,
      inventedBrandAsset: false,
      paidDependency: false
    });
  }
});

test('Step 55-B manifest pins the source hash and all generated artifacts', () => {
  const manifest = require('../../docs/13-product-design/step55-wireframes/B/gate-b-manifest.json');
  const normalizedSource = readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(manifest.sourceSha256, createHash('sha256').update(normalizedSource).digest('hex'));
  assert.equal(manifest.screenCount, 6);
  assert.equal(manifest.frameCount, 24);
  assert.equal(manifest.generatedArtifacts.length, 43);
  assert.equal(manifest.generatedArtifacts.every((artifact: { path: string; sha256: string }) => existsSync(artifact.path) && /^[a-f0-9]{64}$/.test(artifact.sha256)), true);
});
