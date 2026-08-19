import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor,TransactionManager } from '../../../platform/database/transaction-manager';
import { DomainError } from '../../../shared/errors/domain-error';

@Injectable()
export class ReturnsRepository{
  constructor(private readonly tx:TransactionManager){}
  db(){return this.tx.readonly();}

  async byId(ex:DatabaseExecutor,id:string,lock=false){
    const r=await sql<any>`SELECT * FROM returns.returns WHERE id=${id}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }
  async byNumber(ex:DatabaseExecutor,number:string,customerId?:string,lock=false){
    const r=customerId
      ?await sql<any>`SELECT * FROM returns.returns WHERE return_number=${number} AND customer_id=${customerId}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex)
      :await sql<any>`SELECT * FROM returns.returns WHERE return_number=${number} ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows[0]??null;
  }
  async items(ex:DatabaseExecutor,returnId:string,lock=false){
    const r=await sql<any>`SELECT * FROM returns.return_items WHERE return_id=${returnId}::uuid ORDER BY id ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);
    return r.rows;
  }
  async createHeader(ex:DatabaseExecutor,i:{id:string;number:string;orderId:string;customerId:string;policyId?:string|null}){
    await sql`INSERT INTO returns.returns(id,return_number,order_id,customer_id,status,policy_id)
      VALUES(${i.id}::uuid,${i.number},${i.orderId}::uuid,${i.customerId}::uuid,'requested',${i.policyId??null}::uuid)`.execute(ex);
    return this.byId(ex,i.id,true);
  }
  async createItem(ex:DatabaseExecutor,i:{id:string;returnId:string;orderItemId:string;quantity:number;reasonCode:string;note?:string|null}){
    await sql`INSERT INTO returns.return_items(id,return_id,order_item_id,quantity,reason_code,note,status)
      VALUES(${i.id}::uuid,${i.returnId}::uuid,${i.orderItemId}::uuid,${i.quantity},${i.reasonCode},${i.note??null},'requested')`.execute(ex);
  }
  async transition(ex:DatabaseExecutor,id:string,status:string,fields:{comment?:string|null;reason?:string|null;receivedAt?:Date|null;resolutionNote?:string|null}={}){
    const r=await sql<any>`UPDATE returns.returns SET status=${status},
      reviewed_at=CASE WHEN ${status}='under_review' THEN COALESCE(reviewed_at,now()) ELSE reviewed_at END,
      approved_at=CASE WHEN ${status}='approved' THEN COALESCE(approved_at,now()) ELSE approved_at END,
      rejected_at=CASE WHEN ${status}='rejected' THEN COALESCE(rejected_at,now()) ELSE rejected_at END,
      received_at=CASE WHEN ${status}='received' THEN COALESCE(${fields.receivedAt??null}::timestamptz,received_at,now()) ELSE received_at END,
      inspection_started_at=CASE WHEN ${status}='inspecting' THEN COALESCE(inspection_started_at,now()) ELSE inspection_started_at END,
      resolved_at=CASE WHEN ${status}='resolved' THEN COALESCE(resolved_at,now()) ELSE resolved_at END,
      cancelled_at=CASE WHEN ${status}='cancelled' THEN COALESCE(cancelled_at,now()) ELSE cancelled_at END,
      review_comment=CASE WHEN ${fields.comment??null} IS NOT NULL THEN ${fields.comment??null} ELSE review_comment END,
      rejection_reason=CASE WHEN ${status}='rejected' THEN ${fields.reason??null} ELSE rejection_reason END,
      cancel_reason=CASE WHEN ${status}='cancelled' THEN ${fields.reason??null} ELSE cancel_reason END,
      resolution_note=CASE WHEN ${status}='resolved' THEN ${fields.resolutionNote??null} ELSE resolution_note END,
      version=version+1,updated_at=now()
      WHERE id=${id}::uuid RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }
  async setAllItemStatus(ex:DatabaseExecutor,returnId:string,status:string){
    await sql`UPDATE returns.return_items SET status=${status},version=version+1,updated_at=now() WHERE return_id=${returnId}::uuid`.execute(ex);
  }
  async receiveItems(ex:DatabaseExecutor,returnId:string,items:{returnItemId:string;receivedQuantity:number}[]){
    for(const x of items){
      const r=await sql<any>`UPDATE returns.return_items
        SET received_quantity=${x.receivedQuantity},status=CASE WHEN ${x.receivedQuantity}>0 THEN 'received' ELSE status END,version=version+1,updated_at=now()
        WHERE id=${x.returnItemId}::uuid AND return_id=${returnId}::uuid AND ${x.receivedQuantity} BETWEEN 0 AND quantity RETURNING id`.execute(ex);
      if(!r.rows[0])throw new DomainError('RETURN_RECEIVE_ITEM_INVALID','قلم یا تعداد دریافت مرجوعی معتبر نیست.');
    }
  }

  async resolveItem(ex:DatabaseExecutor,input:{returnItemId:string;resolution:string;disposition:string;refundId?:string|null;replacementRequestId?:string|null;inventoryMovementId?:string|null}){
    const r=await sql<any>`UPDATE returns.return_items SET status='resolved',resolution=${input.resolution},disposition=${input.disposition},
      refund_id=${input.refundId??null}::uuid,replacement_request_id=${input.replacementRequestId??null}::uuid,
      inventory_movement_id=${input.inventoryMovementId??null}::uuid,version=version+1,updated_at=now()
      WHERE id=${input.returnItemId}::uuid AND status='inspecting' RETURNING *`.execute(ex);
    if(!r.rows[0])throw new DomainError('RETURN_ITEM_NOT_INSPECTING','قلم مرجوعی در وضعیت قابل تعیین تکلیف نیست.');
    return r.rows[0];
  }

  async history(ex:DatabaseExecutor,returnId:string,fromStatus:string|null,toStatus:string,reason:string|null,actorType:string|null,actorId:string|null){
    await sql`INSERT INTO returns.status_history(id,return_id,from_status,to_status,reason,actor_type,actor_id)
      VALUES(gen_random_uuid(),${returnId}::uuid,${fromStatus},${toStatus},${reason},${actorType},${actorId??null}::uuid)`.execute(ex);
  }

  async timeline(ex:DatabaseExecutor,returnId:string){
    const r=await sql<any>`SELECT from_status,to_status status,reason,actor_type,created_at
      FROM returns.status_history WHERE return_id=${returnId}::uuid ORDER BY created_at,id`.execute(ex);
    return r.rows;
  }

  async view(ex:DatabaseExecutor,id:string){
    const h=await this.byId(ex,id,false);if(!h)return null;
    const items=await this.items(ex,id,false);
    return{...h,items};
  }
  async listCustomer(customerId:string){
    const r=await sql<any>`SELECT r.*,o.order_number FROM returns.returns r JOIN orders.orders o ON o.id=r.order_id
      WHERE r.customer_id=${customerId}::uuid ORDER BY r.requested_at DESC,r.id DESC LIMIT 500`.execute(this.db());return r.rows;
  }
  async listAdmin(){
    const r=await sql<any>`SELECT r.*,o.order_number FROM returns.returns r JOIN orders.orders o ON o.id=r.order_id
      ORDER BY r.requested_at DESC,r.id DESC LIMIT 500`.execute(this.db());return r.rows;
  }
}
