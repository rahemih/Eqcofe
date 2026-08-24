import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor,TransactionManager } from '../../../platform/database/transaction-manager';

@Injectable()
export class ManagementExportRepository{
  constructor(private readonly tx:TransactionManager){}
  db(){return this.tx.readonly();}
  async claim(ex:DatabaseExecutor,input:{id:string;dataset:string;format:string;parameters:unknown;requestedBy:string;idempotencyHash:string}){
    const inserted=await sql<any>`INSERT INTO analytics.management_exports(id,dataset_key,format,parameters,status,requested_by,idempotency_hash,started_at)
      VALUES(${input.id}::uuid,${input.dataset},${input.format},${JSON.stringify(input.parameters)}::jsonb,'running',${input.requestedBy}::uuid,${input.idempotencyHash},now())
      ON CONFLICT(requested_by,idempotency_hash) DO NOTHING RETURNING *`.execute(ex);
    if(inserted.rows[0])return{job:inserted.rows[0],replay:false};
    const existing=await sql<any>`SELECT * FROM analytics.management_exports WHERE requested_by=${input.requestedBy}::uuid AND idempotency_hash=${input.idempotencyHash}`.execute(ex);
    return{job:existing.rows[0],replay:true};
  }
  async complete(ex:DatabaseExecutor,id:string,input:{rowCount:number;sourceWatermark:Date|null;filename:string;mimeType:string;contentHash:string;content:string}){
    const r=await sql<any>`UPDATE analytics.management_exports SET status='completed',row_count=${input.rowCount},source_watermark=${input.sourceWatermark},filename=${input.filename},mime_type=${input.mimeType},content_hash=${input.contentHash},content_text=${input.content},completed_at=now(),updated_at=now() WHERE id=${id}::uuid AND status='running' RETURNING id,dataset_key,format,parameters,status,requested_by,row_count,source_watermark,filename,mime_type,content_hash,created_at,started_at,completed_at`.execute(ex);return r.rows[0];
  }
  async fail(ex:DatabaseExecutor,id:string,errorCode:string){await sql`UPDATE analytics.management_exports SET status='failed',error_code=${errorCode},completed_at=now(),updated_at=now() WHERE id=${id}::uuid AND status='running'`.execute(ex);}
  async byId(id:string,actorId:string,withContent=false){const r=await sql<any>`SELECT id,dataset_key,format,parameters,status,requested_by,row_count,source_watermark,filename,mime_type,content_hash,error_code,created_at,started_at,completed_at${sql.raw(withContent?',content_text':'')} FROM analytics.management_exports WHERE id=${id}::uuid AND requested_by=${actorId}::uuid`.execute(this.db());return r.rows[0]??null;}
  async list(actorId:string,limit:number){return(await sql<any>`SELECT id,dataset_key,format,parameters,status,requested_by,row_count,source_watermark,filename,mime_type,content_hash,error_code,created_at,started_at,completed_at FROM analytics.management_exports WHERE requested_by=${actorId}::uuid ORDER BY created_at DESC,id DESC LIMIT ${limit}`.execute(this.db())).rows;}
}
