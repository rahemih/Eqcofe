import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor,TransactionManager } from '../../../platform/database/transaction-manager';
@Injectable()
export class WarrantyRepository{
  constructor(private readonly tx:TransactionManager){}
  db(){return this.tx.readonly();}
  async byId(ex:DatabaseExecutor,id:string,lock=false){const r=await sql<any>`SELECT * FROM warranty.claims WHERE id=${id}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);return r.rows[0]??null;}
  async byNumber(ex:DatabaseExecutor,number:string,customerId?:string,lock=false){const r=customerId
    ?await sql<any>`SELECT * FROM warranty.claims WHERE claim_number=${number} AND customer_id=${customerId}::uuid ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex)
    :await sql<any>`SELECT * FROM warranty.claims WHERE claim_number=${number} ${sql.raw(lock?'FOR UPDATE':'')}`.execute(ex);return r.rows[0]??null;}
  async create(ex:DatabaseExecutor,i:{id:string;number:string;customerId:string;orderId:string;orderItemId:string;issueType:string;issueDescription:string;preferredResolution?:string|null;policyId?:string|null}){
    const r=await sql<any>`INSERT INTO warranty.claims(id,claim_number,customer_id,order_id,order_item_id,policy_id,issue_type,issue_description,preferred_resolution,status)
      VALUES(${i.id}::uuid,${i.number},${i.customerId}::uuid,${i.orderId}::uuid,${i.orderItemId}::uuid,${i.policyId??null}::uuid,${i.issueType},${i.issueDescription},${i.preferredResolution??null},'requested') RETURNING *`.execute(ex);
    return r.rows[0];
  }
  async transition(ex:DatabaseExecutor,id:string,status:string,fields:{comment?:string|null;reason?:string|null;receivedAt?:Date|null;conditionNote?:string|null;resolutionNote?:string|null}={}){
    const r=await sql<any>`UPDATE warranty.claims SET status=${status},
      reviewed_at=CASE WHEN ${status}='under_review' THEN COALESCE(reviewed_at,now()) ELSE reviewed_at END,
      approved_at=CASE WHEN ${status}='approved' THEN COALESCE(approved_at,now()) ELSE approved_at END,
      rejected_at=CASE WHEN ${status}='rejected' THEN COALESCE(rejected_at,now()) ELSE rejected_at END,
      received_at=CASE WHEN ${status}='received' THEN COALESCE(${fields.receivedAt??null}::timestamptz,received_at,now()) ELSE received_at END,
      repair_started_at=CASE WHEN ${status}='repairing' THEN COALESCE(repair_started_at,now()) ELSE repair_started_at END,
      resolved_at=CASE WHEN ${status}='resolved' THEN COALESCE(resolved_at,now()) ELSE resolved_at END,
      closed_at=CASE WHEN ${status}='closed' THEN COALESCE(closed_at,now()) ELSE closed_at END,
      review_comment=CASE WHEN ${fields.comment??null} IS NOT NULL THEN ${fields.comment??null} ELSE review_comment END,
      rejection_reason=CASE WHEN ${status}='rejected' THEN ${fields.reason??null} ELSE rejection_reason END,
      condition_note=CASE WHEN ${fields.conditionNote??null} IS NOT NULL THEN ${fields.conditionNote??null} ELSE condition_note END,
      resolution_note=CASE WHEN ${fields.resolutionNote??null} IS NOT NULL THEN ${fields.resolutionNote??null} ELSE resolution_note END,
      version=version+1,updated_at=now() WHERE id=${id}::uuid RETURNING *`.execute(ex);return r.rows[0]??null;
  }

  async resolveClaim(ex:DatabaseExecutor,id:string,input:{resolution:string;resolutionNote:string;refundId?:string|null;replacementRequestId?:string|null}){
    const r=await sql<any>`UPDATE warranty.claims SET status='resolved',resolution=${input.resolution},resolution_note=${input.resolutionNote},
      refund_id=${input.refundId??null}::uuid,replacement_request_id=${input.replacementRequestId??null}::uuid,
      resolved_at=COALESCE(resolved_at,now()),version=version+1,updated_at=now()
      WHERE id=${id}::uuid AND status IN ('received','repairing') RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async history(ex:DatabaseExecutor,claimId:string,fromStatus:string|null,toStatus:string,reason:string|null,actorType:string|null,actorId:string|null){
    await sql`INSERT INTO warranty.status_history(id,claim_id,from_status,to_status,reason,actor_type,actor_id)
      VALUES(gen_random_uuid(),${claimId}::uuid,${fromStatus},${toStatus},${reason},${actorType},${actorId??null}::uuid)`.execute(ex);
  }

  async timeline(ex:DatabaseExecutor,claimId:string){
    const r=await sql<any>`SELECT from_status,to_status status,reason,actor_type,created_at
      FROM warranty.status_history WHERE claim_id=${claimId}::uuid ORDER BY created_at,id`.execute(ex);
    return r.rows;
  }

  async listCustomer(customerId:string){return(await sql<any>`SELECT c.*,o.order_number FROM warranty.claims c JOIN orders.orders o ON o.id=c.order_id WHERE c.customer_id=${customerId}::uuid ORDER BY c.requested_at DESC,c.id DESC LIMIT 500`.execute(this.db())).rows;}
  async listAdmin(){return(await sql<any>`SELECT c.*,o.order_number FROM warranty.claims c JOIN orders.orders o ON o.id=c.order_id ORDER BY c.requested_at DESC,c.id DESC LIMIT 500`.execute(this.db())).rows;}
}
