import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ReceiptCostService } from '../src/modules/procurement/application/receipt-cost.service';
import { ScopePolicy } from '../src/platform/auth/scope-policy';
import { ProcurementController } from '../src/modules/procurement/presentation/procurement.controller';
import { DomainError } from '../src/shared/errors/domain-error';

const W1='11111111-1111-4111-8111-111111111111';
const W2='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333';
const PO='44444444-4444-4444-8444-444444444444';
const INVOICE='55555555-5555-4555-8555-555555555555';
const supplierInvoice={supplier_id:S,invoice_number:'SI-2026-001',invoice_date:'2026-11-18',amount_toman:125000};
const recorded=(purchase_order_id:string|null=null,status='recorded')=>({
  id:INVOICE,purchase_order_id,status,amount_toman:125000,version:4,
});
const linkedPO={id:PO,supplier_id:S,warehouse_id:W1,total_toman:125000};
const assertion=(code:string)=>(e:any)=>e?.message?.includes(code)===true || e?.code===code;

function setup(options:{warehouseIds?:string[];invoice?:Record<string,unknown>|null;po?:Record<string,unknown>|null}={}){
  const actor:any={type:'staff',id:'66666666-6666-4666-8666-666666666666',
    scopes:(options.warehouseIds??[]).map(id=>'warehouse:'+id)};
  const request:any={actor,requestId:'test-request',traceId:'test-trace'};
  const calls:string[]=[];
  let allowedSeen: string[]|null|undefined=undefined;
  const repo:any={
    supplier:async()=>({status:'active'}),
    purchaseOrderForUpdate:async()=>options.po??null,
    invoiceForUpdate:async()=>options.invoice??null,
    invoices:async(allowed:string[]|null)=>{allowedSeen=allowed;return[];},
    createInvoice:async()=>{calls.push('create');},
    updateInvoiceStatus:async()=>{calls.push('update');},
  };
  const tx:any={run:async(fn:any)=>fn({})};
  const audit:any={writeWith:async()=>{calls.push('audit');}};
  const ctx:any={get:()=>request,require:()=>request};
  const service=new ReceiptCostService(tx,repo,{} as any,audit,{} as any,ctx,new ScopePolicy());
  return {service,calls,allowed:()=>allowedSeen,actor};
}

test('SQL filters orphan/unlinked supplier invoices from restricted warehouse staff list',()=>{
  const src=fs.readFileSync('src/modules/procurement/infrastructure/procurement.repository.ts','utf8');
  const query=src.match(/async invoices\(allowed:string\[\]\|null\)\{([\s\S]*?)\}\s*async createInvoice\(/)?.[1]??'';
  assert.notEqual(query.length,0,'repository listing must exist');
  assert.match(query,/LEFT JOIN procurement\.purchase_orders po ON po\.id=si\.purchase_order_id/);
  assert.match(query,/\$\{allowed\}::uuid\[\] IS NULL OR po\.warehouse_id=ANY\(\$\{allowed\}::uuid\[\]\)/);
  assert.doesNotMatch(query,/OR po\.id IS NULL|OR si\.purchase_order_id IS NULL/);
});

test('service passes explicit warehouse scope array or null-global scope to the SQL filter',async()=>{
  const scoped=setup({warehouseIds:[W1]});
  await scoped.service.invoices();
  assert.deepEqual(scoped.allowed(),[W1]);
  const global=setup();
  await global.service.invoices();
  assert.equal(global.allowed(),null);
});

test('restricted staff cannot create PO-unlinked supplier invoice; no write or audit',async()=>{
  const {service,calls}=setup({warehouseIds:[W1]});
  await assert.rejects(service.createInvoice(supplierInvoice),assertion('SCOPE_GLOBAL_REQUIRED'));
  assert.deepEqual(calls,[]);
});

test('global procurement staff can still create PO-unlinked invoice and retain audit',async()=>{
  const {service,calls}=setup();
  const result=await service.createInvoice(supplierInvoice);
  assert.ok(result.id);
  assert.deepEqual(calls,['create','audit']);
});

test('linked invoice creation preserves supplier/warehouse checks and audit',async()=>{
  const allowed=setup({warehouseIds:[W1],po:linkedPO});
  await allowed.service.createInvoice({...supplierInvoice,purchase_order_id:PO});
  assert.deepEqual(allowed.calls,['create','audit']);
  const wrong=setup({warehouseIds:[W2],po:linkedPO});
  await assert.rejects(wrong.service.createInvoice({...supplierInvoice,purchase_order_id:PO}),assertion('SCOPE_FORBIDDEN'));
  assert.deepEqual(wrong.calls,[]);
  const absent=setup({warehouseIds:[W1],po:null});
  await assert.rejects(absent.service.createInvoice({...supplierInvoice,purchase_order_id:PO}),assertion('INVOICE_PO_MISMATCH'));
  const wrongSupplier=setup({warehouseIds:[W1],po:{...linkedPO,supplier_id:W2}});
  await assert.rejects(wrongSupplier.service.createInvoice({...supplierInvoice,purchase_order_id:PO}),assertion('INVOICE_PO_MISMATCH'));
});

for(const target of ['disputed','cancelled','matched'] as const){
  test('restricted staff cannot mutate PO-unlinked invoice: '+target,async()=>{
    const {service,calls}=setup({warehouseIds:[W1],invoice:recorded()});
    await assert.rejects(service.transitionInvoice(INVOICE,target,4,'reason'),assertion('SCOPE_GLOBAL_REQUIRED'));
    assert.deepEqual(calls,[]);
  });
}

test('global staff can dispute and cancel PO-unlinked invoice, without relaxing reason/version',async()=>{
  for(const target of ['disputed','cancelled'] as const){
    const h=setup({invoice:recorded()});
    const res=await h.service.transitionInvoice(INVOICE,target,4,'explicit reason');
    assert.equal(res.status,target);
    assert.deepEqual(h.calls,['update','audit']);
    await assert.rejects(h.service.transitionInvoice(INVOICE,target,4,''),assertion('REASON_REQUIRED'));
  }
});

test('global matching an unlinked invoice still requires a linked purchase order',async()=>{
  const h=setup({invoice:recorded()});
  await assert.rejects(h.service.transitionInvoice(INVOICE,'matched',4),assertion('SUPPLIER_INVOICE_PO_REQUIRED'));
  assert.deepEqual(h.calls,[]);
});

for(const target of ['disputed','cancelled','matched'] as const){
  test('linked invoice denies cross-warehouse '+target+' before mutation',async()=>{
    const h=setup({warehouseIds:[W2],invoice:recorded(PO),po:linkedPO});
    await assert.rejects(h.service.transitionInvoice(INVOICE,target,4,'reason'),assertion('SCOPE_FORBIDDEN'));
    assert.deepEqual(h.calls,[]);
  });
  test('linked invoice rejects missing purchase order on '+target+' before mutation',async()=>{
    const h=setup({warehouseIds:[W1],invoice:recorded(PO),po:null});
    await assert.rejects(h.service.transitionInvoice(INVOICE,target,4,'reason'),assertion('SUPPLIER_INVOICE_PO_NOT_FOUND'));
    assert.deepEqual(h.calls,[]);
  });
}

test('linked matching keeps amount check, expected version and central audit path',async()=>{
  const good=setup({warehouseIds:[W1],invoice:recorded(PO),po:linkedPO});
  const r=await good.service.transitionInvoice(INVOICE,'matched',4);
  assert.equal(r.status,'matched');
  assert.deepEqual(good.calls,['update','audit']);
  const mismatch=setup({warehouseIds:[W1],invoice:recorded(PO),po:{...linkedPO,total_toman:99}});
  await assert.rejects(mismatch.service.transitionInvoice(INVOICE,'matched',4),assertion('SUPPLIER_INVOICE_AMOUNT_MISMATCH'));
  assert.deepEqual(mismatch.calls,[]);
});

test('unauthorized invoice status is not leaked before validating warehouse scope',async()=>{
  const x=setup({warehouseIds:[W2],invoice:recorded(PO,'cancelled'),po:linkedPO});
  await assert.rejects(x.service.transitionInvoice(INVOICE,'disputed',4,'reason'),assertion('SCOPE_FORBIDDEN'));
  assert.deepEqual(x.calls,[]);
});

test('existing invoice endpoint staff permissions, idempotency and If-Match stay unmodified',()=>{
  const controller=fs.readFileSync('src/modules/procurement/presentation/procurement.controller.ts','utf8');
  assert.match(controller,/@StaffOnly\(\) @Permissions\('procurement\.invoice\.manage'\) @RequireIdempotency\('procurement\.invoice\.create'\)/);
  assert.match(controller,/@StaffOnly\(\) @Permissions\('procurement\.invoice\.manage'\) @Post\('supplier-invoices\/:id\/cancel'\)/);
  assert.match(controller,/@Headers\('if-match'\)v:string/);
  assert.ok(ProcurementController);
  assert.ok(DomainError);
});
