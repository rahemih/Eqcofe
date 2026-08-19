import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor,TransactionManager } from '../../../platform/database/transaction-manager';
import { CustomerProfileRow } from './customer.repository';

export interface CustomerWholesaleApplicationRow {
  id:string;customer_id:string;business_name:string;manager_name:string;business_type:string;province_id:string;city_id:string;business_identifier:string|null;note:string|null;
  status:'submitted'|'under_review'|'approved'|'rejected';submitted_at:Date;review_started_at:Date|null;reviewed_at:Date|null;reviewer_staff_id:string|null;
  decision_note:string|null;rejection_reason:string|null;created_at:Date;updated_at:Date;version:string|number|bigint;
}

@Injectable()
export class CustomerWholesaleRepository{
  constructor(private readonly tx:TransactionManager){}
  db(){return this.tx.readonly();}
  async customer(customerId:string,ex:DatabaseExecutor=this.db(),lock=false):Promise<CustomerProfileRow|null>{const q=lock?sql<CustomerProfileRow>`SELECT * FROM customer.customers WHERE id=${customerId}::uuid FOR UPDATE`:sql<CustomerProfileRow>`SELECT * FROM customer.customers WHERE id=${customerId}::uuid`;const r=await q.execute(ex);return r.rows[0]??null;}
  async active(customerId:string,ex:DatabaseExecutor=this.db()){const r=await sql<CustomerWholesaleApplicationRow>`SELECT * FROM customer.wholesale_applications WHERE customer_id=${customerId}::uuid AND status IN ('submitted','under_review') ORDER BY submitted_at DESC,id DESC LIMIT 1`.execute(ex);return r.rows[0]??null;}
  async latest(customerId:string,ex:DatabaseExecutor=this.db()){const r=await sql<CustomerWholesaleApplicationRow>`SELECT * FROM customer.wholesale_applications WHERE customer_id=${customerId}::uuid ORDER BY submitted_at DESC,id DESC LIMIT 1`.execute(ex);return r.rows[0]??null;}
  async create(ex:DatabaseExecutor,input:{customerId:string;businessName:string;managerName:string;businessType:string;provinceId:string;cityId:string;businessIdentifier:string|null;note:string|null}){const r=await sql<CustomerWholesaleApplicationRow>`INSERT INTO customer.wholesale_applications(customer_id,business_name,manager_name,business_type,province_id,city_id,business_identifier,note) VALUES(${input.customerId}::uuid,${input.businessName},${input.managerName},${input.businessType},${input.provinceId}::uuid,${input.cityId}::uuid,${input.businessIdentifier},${input.note}) RETURNING *`.execute(ex);return r.rows[0]!;}
  async byId(id:string,ex:DatabaseExecutor=this.db(),lock=false){const q=lock?sql<CustomerWholesaleApplicationRow>`SELECT * FROM customer.wholesale_applications WHERE id=${id}::uuid FOR UPDATE`:sql<CustomerWholesaleApplicationRow>`SELECT * FROM customer.wholesale_applications WHERE id=${id}::uuid`;const r=await q.execute(ex);return r.rows[0]??null;}
  async list(status:'submitted'|'under_review'|'approved'|'rejected'|null,ex:DatabaseExecutor=this.db()){if(status){const r=await sql<CustomerWholesaleApplicationRow>`SELECT * FROM customer.wholesale_applications WHERE status=${status} ORDER BY submitted_at ASC,id ASC LIMIT 200`.execute(ex);return r.rows;}const r=await sql<CustomerWholesaleApplicationRow>`SELECT * FROM customer.wholesale_applications ORDER BY submitted_at DESC,id DESC LIMIT 200`.execute(ex);return r.rows;}
  async startReview(ex:DatabaseExecutor,id:string,version:number,staffId:string){const r=await sql<CustomerWholesaleApplicationRow>`UPDATE customer.wholesale_applications SET status='under_review',review_started_at=now(),reviewer_staff_id=${staffId}::uuid,version=version+1,updated_at=now() WHERE id=${id}::uuid AND status='submitted' AND version=${version} RETURNING *`.execute(ex);return r.rows[0]??null;}
  async approve(ex:DatabaseExecutor,id:string,version:number,note:string|null){const r=await sql<CustomerWholesaleApplicationRow>`UPDATE customer.wholesale_applications SET status='approved',reviewed_at=now(),decision_note=${note},rejection_reason=NULL,version=version+1,updated_at=now() WHERE id=${id}::uuid AND status='under_review' AND version=${version} RETURNING *`.execute(ex);return r.rows[0]??null;}
  async reject(ex:DatabaseExecutor,id:string,version:number,reason:string){const r=await sql<CustomerWholesaleApplicationRow>`UPDATE customer.wholesale_applications SET status='rejected',reviewed_at=now(),decision_note=NULL,rejection_reason=${reason},version=version+1,updated_at=now() WHERE id=${id}::uuid AND status='under_review' AND version=${version} RETURNING *`.execute(ex);return r.rows[0]??null;}
  async promote(ex:DatabaseExecutor,customerId:string,version:number){const r=await sql<CustomerProfileRow>`UPDATE customer.customers SET customer_type='wholesale',version=version+1,updated_at=now() WHERE id=${customerId}::uuid AND customer_type='retail' AND status='active' AND version=${version} RETURNING *`.execute(ex);return r.rows[0]??null;}
}
