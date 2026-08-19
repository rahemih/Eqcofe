import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { Permissions, RequireIdempotency, RequireStepUp, StaffOnly } from '../../../platform/auth/auth.decorators';
import { DomainError } from '../../../shared/errors/domain-error';
import { SupplierService } from '../application/supplier.service';
import { PurchaseService } from '../application/purchase.service';
import { ReceiptCostService } from '../application/receipt-cost.service';
import { PurchaseReturnService } from '../application/purchase-return.service';
function version(value?:string){const n=Number(String(value??'').replace(/"/g,''));if(!Number.isSafeInteger(n)||n<1)throw new DomainError('PRECONDITION_REQUIRED','If-Match معتبر الزامی است.');return n;}
@Controller('admin/procurement')
export class ProcurementController{
 constructor(private readonly suppliers:SupplierService,private readonly purchase:PurchaseService,private readonly receipts:ReceiptCostService,private readonly returns:PurchaseReturnService){}
 @StaffOnly() @Permissions('procurement.view') @Get('suppliers') listSuppliers(){return this.suppliers.list();}
 @StaffOnly() @Permissions('procurement.view') @Get('suppliers/:id') supplier(@Param('id')id:string){return this.suppliers.get(id);}
 @StaffOnly() @Permissions('procurement.supplier.manage') @RequireIdempotency('procurement.supplier.create') @Post('suppliers') createSupplier(@Body()b:any){return this.suppliers.create({code:b.code,name_fa:b.name_fa,legal_name:b.legal_name,national_id:b.national_id??b.tax_identifier,mobile:b.mobile,phone:b.phone,email:b.email,payment_terms_days:b.payment_terms_days??b.lead_time_days,notes:b.notes});}
 @StaffOnly() @Permissions('procurement.supplier.manage') @Patch('suppliers/:id') updateSupplier(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.suppliers.update(id,{...b,national_id:b.national_id??b.tax_identifier,payment_terms_days:b.payment_terms_days??b.lead_time_days},version(v));}
 @StaffOnly() @Permissions('procurement.supplier.manage') @Post('suppliers/:id/activate') activateSupplier(@Param('id')id:string,@Headers('if-match')v:string){return this.suppliers.setStatus(id,'active',version(v));}
 @StaffOnly() @Permissions('procurement.supplier.manage') @Post('suppliers/:id/deactivate') deactivateSupplier(@Param('id')id:string,@Headers('if-match')v:string){return this.suppliers.setStatus(id,'inactive',version(v));}

 @StaffOnly() @Permissions('procurement.view') @Get('purchase-requests') listRequests(){return this.purchase.requests();}
 @StaffOnly() @Permissions('procurement.view') @Get('purchase-requests/:id') request(@Param('id')id:string){return this.purchase.request(id);}
 @StaffOnly() @Permissions('procurement.request.manage') @RequireIdempotency('procurement.request.create') @Post('purchase-requests') createRequest(@Body()b:any){return this.purchase.createRequest({warehouse_id:b.warehouse_id,reason:b.reason,items:(b.items??[]).map((x:any)=>({variant_id:x.variant_id,requested_quantity:x.requested_quantity,note:x.note??x.notes}))});}
 @StaffOnly() @Permissions('procurement.request.manage') @Patch('purchase-requests/:id') updateRequest(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.purchase.updateRequest(id,{reason:b.reason,items:b.items?.map((x:any)=>({variant_id:x.variant_id,requested_quantity:x.requested_quantity,note:x.note??x.notes}))},version(v));}
 @StaffOnly() @Permissions('procurement.request.manage') @Post('purchase-requests/:id/submit') submitRequest(@Param('id')id:string,@Headers('if-match')v:string){return this.purchase.transitionRequest(id,'submitted',version(v));}
 @StaffOnly() @Permissions('procurement.request.approve') @RequireStepUp() @Post('purchase-requests/:id/approve') approveRequest(@Param('id')id:string,@Headers('if-match')v:string){return this.purchase.transitionRequest(id,'approved',version(v));}
 @StaffOnly() @Permissions('procurement.request.approve') @RequireStepUp() @Post('purchase-requests/:id/reject') rejectRequest(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.purchase.transitionRequest(id,'rejected',version(v),b.reason??b.note);}
 @StaffOnly() @Permissions('procurement.request.manage') @Post('purchase-requests/:id/cancel') cancelRequest(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.purchase.transitionRequest(id,'cancelled',version(v),b.reason??b.note);}

 @StaffOnly() @Permissions('procurement.view') @Get('purchase-orders') listOrders(){return this.purchase.orders();}
 @StaffOnly() @Permissions('procurement.view') @Get('purchase-orders/:id') order(@Param('id')id:string){return this.purchase.order(id);}
 @StaffOnly() @Permissions('procurement.po.manage') @RequireIdempotency('procurement.po.create') @Post('purchase-orders') createOrder(@Body()b:any){return this.purchase.createOrder({...b,items:(b.items??[]).map((x:any)=>({...x,discount_toman:x.discount_toman??0,tax_toman:x.tax_toman??0}))});}
 @StaffOnly() @Permissions('procurement.po.manage') @Patch('purchase-orders/:id') updateOrder(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.purchase.updateOrder(id,{expected_at:b.expected_at,items:b.items},version(v));}
 @StaffOnly() @Permissions('procurement.po.manage') @Post('purchase-orders/:id/submit') submitOrder(@Param('id')id:string,@Headers('if-match')v:string){return this.purchase.transitionOrder(id,'submitted',version(v));}
 @StaffOnly() @Permissions('procurement.po.approve') @RequireStepUp() @Post('purchase-orders/:id/approve') approveOrder(@Param('id')id:string,@Headers('if-match')v:string){return this.purchase.transitionOrder(id,'approved',version(v));}
 @StaffOnly() @Permissions('procurement.po.manage') @Post('purchase-orders/:id/send') sendOrder(@Param('id')id:string,@Headers('if-match')v:string){return this.purchase.transitionOrder(id,'sent',version(v));}
 @StaffOnly() @Permissions('procurement.po.manage') @Post('purchase-orders/:id/cancel') cancelOrder(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.purchase.transitionOrder(id,'cancelled',version(v),b.reason??b.note);}
 @StaffOnly() @Permissions('procurement.po.manage') @Post('purchase-orders/:id/close') closeOrder(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.purchase.transitionOrder(id,'closed',version(v),b.reason??b.note);}

 @StaffOnly() @Permissions('procurement.view') @Get('goods-receipts') listReceipts(){return this.receipts.receipts();}
 @StaffOnly() @Permissions('procurement.view') @Get('goods-receipts/:id') receipt(@Param('id')id:string){return this.receipts.receipt(id);}
 @StaffOnly() @Permissions('procurement.receipt.manage') @RequireIdempotency('procurement.receipt.create') @Post('goods-receipts') createReceipt(@Body()b:any){return this.receipts.createReceipt(b);}
 @StaffOnly() @Permissions('procurement.receipt.manage') @Patch('goods-receipts/:id') updateReceipt(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.receipts.updateReceipt(id,{items:b.items},version(v));}
 @StaffOnly() @Permissions('procurement.receipt.manage') @Post('goods-receipts/:id/submit') submitReceipt(@Param('id')id:string,@Headers('if-match')v:string){return this.receipts.transitionReceipt(id,'submitted',version(v));}
 @StaffOnly() @Permissions('procurement.receipt.post') @RequireStepUp() @RequireIdempotency('procurement.receipt.post') @Post('goods-receipts/:id/post') postReceipt(@Param('id')id:string,@Headers('if-match')v:string){return this.receipts.transitionReceipt(id,'posted',version(v));}
 @StaffOnly() @Permissions('procurement.receipt.reverse') @RequireStepUp() @RequireIdempotency('procurement.receipt.reverse') @Post('goods-receipts/:id/reverse') reverseReceipt(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.receipts.transitionReceipt(id,'reversed',version(v),b.reason??b.note);}

 @StaffOnly() @Permissions('procurement.view') @Get('landed-costs') landedCosts(){return this.receipts.landedCosts();}
 @StaffOnly() @Permissions('procurement.view') @Get('landed-costs/:id') landedCost(@Param('id')id:string){return this.receipts.landedCost(id);}
 @StaffOnly() @Permissions('procurement.landed_cost.manage') @RequireIdempotency('procurement.landed_cost.create') @Post('landed-costs') createLandedCost(@Body()b:any){return this.receipts.createLandedCost(b);}
 @StaffOnly() @Permissions('procurement.landed_cost.manage') @Post('landed-costs/:id/preview-allocation') previewLanded(@Param('id')id:string,@Body()b:any){return this.receipts.previewAllocation(id,b?.allocations);}
 @StaffOnly() @Permissions('procurement.landed_cost.manage') @RequireStepUp() @RequireIdempotency('procurement.landed_cost.finalize') @Post('landed-costs/:id/finalize') finalizeLanded(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.receipts.finalizeLandedCost(id,version(v),b?.allocations);}

 @StaffOnly() @Permissions('procurement.view') @Get('supplier-invoices') invoices(){return this.receipts.invoices();}
 @StaffOnly() @Permissions('procurement.invoice.manage') @RequireIdempotency('procurement.invoice.create') @Post('supplier-invoices') createInvoice(@Body()b:any){return this.receipts.createInvoice(b);}
 @StaffOnly() @Permissions('procurement.invoice.manage') @Post('supplier-invoices/:id/match') matchInvoice(@Param('id')id:string,@Headers('if-match')v:string){return this.receipts.transitionInvoice(id,'matched',version(v));}
 @StaffOnly() @Permissions('procurement.invoice.manage') @Post('supplier-invoices/:id/dispute') disputeInvoice(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.receipts.transitionInvoice(id,'disputed',version(v),b.reason??b.note);}
 @StaffOnly() @Permissions('procurement.invoice.manage') @Post('supplier-invoices/:id/cancel') cancelInvoice(@Param('id')id:string,@Headers('if-match')v:string,@Body()b:any){return this.receipts.transitionInvoice(id,'cancelled',version(v),b.reason??b.note);}

 @StaffOnly() @Permissions('procurement.view') @Get('purchase-returns') purchaseReturns(){return this.returns.list();}
 @StaffOnly() @Permissions('procurement.view') @Get('purchase-returns/:id') purchaseReturn(@Param('id')id:string){return this.returns.get(id);}
 @StaffOnly() @Permissions('procurement.return.manage') @RequireIdempotency('procurement.return.create') @Post('purchase-returns') createPurchaseReturn(@Body()b:any){return this.returns.create(b);}
 @StaffOnly() @Permissions('procurement.return.manage') @RequireStepUp() @Post('purchase-returns/:id/approve') approvePurchaseReturn(@Param('id')id:string,@Headers('if-match')v:string){return this.returns.approve(id,version(v));}
 @StaffOnly() @Permissions('procurement.return.manage') @RequireStepUp() @RequireIdempotency('procurement.return.ship') @Post('purchase-returns/:id/ship') shipPurchaseReturn(@Param('id')id:string,@Headers('if-match')v:string){return this.returns.ship(id,version(v));}
 @StaffOnly() @Permissions('procurement.return.manage') @Post('purchase-returns/:id/complete') completePurchaseReturn(@Param('id')id:string,@Headers('if-match')v:string){return this.returns.complete(id,version(v));}
}
