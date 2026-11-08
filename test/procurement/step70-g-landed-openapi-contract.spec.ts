import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";
import { ReceiptCostService } from "../../src/modules/procurement/application/receipt-cost.service";
import { ScopePolicy } from "../../src/platform/auth/scope-policy";

const doc = parse(readFileSync("contracts/http/openapi.yaml", "utf8")) as {
  components: { schemas: Record<string, any> };
  paths: Record<string, any>;
};
const schemas = doc.components.schemas;

test("70-G B3 create contract makes quantity default and excludes unsupported weight", () => {
  const body = schemas.PostAdminProcurementLandedCostsRequest;
  assert.deepEqual(body.properties.allocation_method.enum, ["quantity", "value", "manual"]);
  assert.equal(body.properties.allocation_method.default, "quantity");
  assert.ok(!body.required.includes("allocation_method"));
  assert.deepEqual(body.required, ["cost_type", "amount_toman"]);
  assert.equal(body.additionalProperties, false);
});

for (const [action, schemaName] of [
  ["preview-allocation", "PostAdminProcurementLandedCostsIdPreviewAllocationRequest"],
  ["finalize", "PostAdminProcurementLandedCostsIdFinalizeRequest"],
] as const) {
  test(`70-G B3 ${action} accepts only optional source-aligned manual allocations`, () => {
    const body = schemas[schemaName];
    assert.equal(body.type, "object");
    assert.equal(body.additionalProperties, false);
    assert.deepEqual(Object.keys(body.properties), ["allocations"]);
    assert.equal(body.required, undefined);
    const field = body.properties.allocations;
    assert.equal(field.type, "array");
    assert.equal(field.items.type, "object");
    assert.equal(field.items.additionalProperties, false);
    assert.deepEqual(field.items.required, ["goods_receipt_item_id", "allocated_amount_toman"]);
    assert.equal(field.items.properties.goods_receipt_item_id.$ref, "#/components/schemas/EntityId");
    assert.equal(schemas.EntityId.format, "uuid");
    assert.equal(field.items.properties.allocated_amount_toman.$ref, "#/components/schemas/MoneyToman");
    assert.equal(schemas.MoneyToman.type, "integer");
    assert.equal(schemas.MoneyToman.minimum, 0);
    const operation = doc.paths[`/admin/procurement/landed-costs/{id}/${action}`].post;
    assert.equal(operation.requestBody.required, false);
    assert.deepEqual(operation.security[0].adminSession, []);
    assert.equal(operation["x-eqcofe"].permission, "procurement.landed_cost.manage");
    if (action === "finalize") {
      const headers = operation.parameters.filter((p: any) => p.$ref).map((p: any) => p.$ref);
      assert.deepEqual(headers, [
        "#/components/parameters/IfMatch",
        "#/components/parameters/IdempotencyKey",
      ]);
      assert.deepEqual(operation.security[0].stepUpToken, []);
    }
  });
}

test("70-G B3 controller uses persisted allocation method and never a preview token", () => {
  const source = readFileSync("src/modules/procurement/presentation/procurement.controller.ts", "utf8");
  assert.match(source, /previewAllocation\(id,b\?\.allocations\)/);
  assert.match(source, /finalizeLandedCost\(id,version\(v\),b\?\.allocations\)/);
  const runtime = readFileSync("src/modules/procurement/application/receipt-cost.service.ts", "utf8");
  assert.match(runtime, /input\.allocation_method\?\?'quantity'/);
  assert.match(runtime, /\['quantity','value','manual'\]/);
});

test("70-G B3 committed generated types exactly match versioned openapi-typescript", () => {
  const dir = mkdtempSync(join(tmpdir(), "eqcofe-openapi-b3-"));
  try {
    const target = join(dir, "openapi.ts");
    const run = spawnSync("pnpm", ["exec", "openapi-typescript", "contracts/http/openapi.yaml", "-o", target], {
      cwd: process.cwd(), encoding: "utf8", timeout: 90000,
    });
    assert.equal(run.status, 0, `OpenAPI types generator failed: ${run.stderr || run.error || run.stdout}`);
    const actual = readFileSync(target, "utf8");
    const committed = readFileSync("src/generated/openapi.ts", "utf8");
    const i = [...actual].findIndex((ch, idx) => ch !== committed[idx]);
    assert.equal(i, -1,
      `Generated types differ from committed output at offset ${i}: generated=${JSON.stringify(actual.slice(i, i + 150))} committed=${JSON.stringify(committed.slice(i, i + 150))}`);
    assert.equal(actual.length, committed.length, "Generated file length differs from committed types");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
function fixture() {
  const calls: string[] = [];
  const actor = { type: "staff" as const, id: "88888888-8888-4888-8888-888888888888", scopes: ["warehouse:warehouse-a"] };
  const lc = { id: A, goods_receipt_id: B, purchase_order_id: null, status: "draft", version: 1,
    amount_toman: 100, allocation_method: "manual" };
  const repo = {
    landedCostForUpdate: async () => { calls.push("lock-cost"); return lc; },
    receiptForUpdate: async () => { calls.push("lock-receipt"); return { id: B, warehouse_id: "warehouse-a" }; },
    allocationCandidates: async () => { calls.push("candidates"); return [
      { id: B, accepted_quantity: 1, quarantine_quantity: 0, unit_cost_toman: 100 },
      { id: OTHER, accepted_quantity: 1, quarantine_quantity: 0, unit_cost_toman: 100 },
    ]; },
    replaceAllocations: async () => { calls.push("allocations"); },
    finalizeLandedCost: async () => { calls.push("finalized"); },
  };
  const context = { require: () => ({ actor, requestId: "req", traceId: "trace" }), get: () => ({ actor }) };
  const inventory = { revalueReceiptItem: async () => ({ inventory_revaluation_toman: 100, consumed_cogs_revaluation_toman: 0 }) };
  const tx = { run: async <T>(fn: (trx: object) => Promise<T>): Promise<T> => fn({}) };
  const audit = { writeWith: async () => undefined };
  const outbox = { append: async () => undefined };
  return { calls, service: new ReceiptCostService(tx as never, repo as never, inventory as never,
    audit as never, outbox as never, context as never, new ScopePolicy()) };
}
test("70-G B3 manual preview validates candidate uniqueness, scope and exact integer total", async () => {
  const f = fixture();
  const good = [{ goods_receipt_item_id: B, allocated_amount_toman: 100 }];
  const valid = await f.service.previewAllocation(A, good);
  assert.deepEqual(valid.allocations, good);
  await assert.rejects(f.service.previewAllocation(A, [
    { goods_receipt_item_id: B, allocated_amount_toman: 50 },
    { goods_receipt_item_id: B, allocated_amount_toman: 50 },
  ]), { code: "DUPLICATE_ALLOCATION_ITEM" });
  await assert.rejects(f.service.previewAllocation(A, [
    { goods_receipt_item_id: A, allocated_amount_toman: 100 },
  ]), { code: "INVALID_ALLOCATION_ITEM" });
  await assert.rejects(f.service.previewAllocation(A, [
    { goods_receipt_item_id: B, allocated_amount_toman: 90 },
  ]), { code: "LANDED_COST_ALLOCATION_MISMATCH" });
  await assert.rejects(f.service.previewAllocation(A, [
    { goods_receipt_item_id: B, allocated_amount_toman: -1 },
  ]));
  await assert.rejects(f.service.previewAllocation(A, [
    { goods_receipt_item_id: B, allocated_amount_toman: 0.5 },
  ]));
});
test("70-G B3 finalize independently rejects untrusted manual candidate and wrong total", async () => {
  const f = fixture();
  await assert.rejects(f.service.finalizeLandedCost(A, 1,
    [{ goods_receipt_item_id: A, allocated_amount_toman: 100 }]), { code: "INVALID_ALLOCATION_ITEM" });
  await assert.rejects(f.service.finalizeLandedCost(A, 1,
    [{ goods_receipt_item_id: B, allocated_amount_toman: 95 }]), { code: "LANDED_COST_ALLOCATION_MISMATCH" });
  assert.ok(!f.calls.includes("finalized"));
});
