import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

@Injectable()
export class OfflineCommandRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async create(ex:DatabaseExecutor,input:{id:string;clientCommandId:string;staffActorId:string;commandType:string;payload:Record<string,unknown>;payloadHash:string}){
    const r=await sql<any>`INSERT INTO pos.offline_commands(id,client_command_id,staff_actor_id,command_type,payload,payload_hash)
      VALUES(${input.id}::uuid,${input.clientCommandId}::uuid,${input.staffActorId}::uuid,${input.commandType},${JSON.stringify(input.payload)}::jsonb,${input.payloadHash})
      ON CONFLICT (client_command_id) DO NOTHING RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async byClientCommandId(ex:DatabaseExecutor,clientCommandId:string,lock=false){
    const q=lock?sql<any>`SELECT * FROM pos.offline_commands WHERE client_command_id=${clientCommandId}::uuid FOR UPDATE`:sql<any>`SELECT * FROM pos.offline_commands WHERE client_command_id=${clientCommandId}::uuid`;
    return (await q.execute(ex)).rows[0]??null;
  }

  async byId(ex:DatabaseExecutor,id:string,lock=false){
    const q=lock?sql<any>`SELECT * FROM pos.offline_commands WHERE id=${id}::uuid FOR UPDATE`:sql<any>`SELECT * FROM pos.offline_commands WHERE id=${id}::uuid`;
    return (await q.execute(ex)).rows[0]??null;
  }

  async markApplied(ex:DatabaseExecutor,id:string,result:Record<string,unknown>){
    const r=await sql<any>`UPDATE pos.offline_commands SET status='applied',result=${JSON.stringify(result)}::jsonb,error_code=NULL,applied_at=now(),failed_at=NULL,abandoned_at=NULL,updated_at=now()
      WHERE id=${id}::uuid AND status='queued' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async markFailed(ex:DatabaseExecutor,id:string,errorCode:string){
    const r=await sql<any>`UPDATE pos.offline_commands SET status='failed',result=NULL,error_code=${errorCode},failed_at=now(),applied_at=NULL,abandoned_at=NULL,updated_at=now()
      WHERE id=${id}::uuid AND status='queued' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async reopenFailedForRetry(ex:DatabaseExecutor,input:{id:string;actorId:string;note:string|null;historyId:string}){
    const current=await this.byId(ex,input.id,true);
    if(!current||String(current.status)!=='failed'||String(current.staff_actor_id)!==input.actorId)return null;
    const priorError=String(current.error_code??'');
    const nextRecovery=Number(current.recovery_count??0)+1;
    if(!priorError||!Number.isSafeInteger(nextRecovery)||nextRecovery>5)return null;
    await sql`INSERT INTO pos.offline_command_reconciliation_history(id,command_id,action,actor_id,prior_error_code,recovery_count,note)
      VALUES(${input.historyId}::uuid,${input.id}::uuid,'retry_requested',${input.actorId}::uuid,${priorError},${nextRecovery},${input.note})`.execute(ex);
    const r=await sql<any>`UPDATE pos.offline_commands SET status='queued',error_code=NULL,failed_at=NULL,abandoned_at=NULL,recovery_count=${nextRecovery},updated_at=now()
      WHERE id=${input.id}::uuid AND status='failed' AND staff_actor_id=${input.actorId}::uuid AND recovery_count=${Number(current.recovery_count??0)} RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async abandonFailed(ex:DatabaseExecutor,input:{id:string;actorId:string;note:string|null;historyId:string}){
    const current=await this.byId(ex,input.id,true);
    if(!current||String(current.status)!=='failed'||String(current.staff_actor_id)!==input.actorId)return null;
    const priorError=String(current.error_code??'');
    if(!priorError)return null;
    await sql`INSERT INTO pos.offline_command_reconciliation_history(id,command_id,action,actor_id,prior_error_code,recovery_count,note)
      VALUES(${input.historyId}::uuid,${input.id}::uuid,'abandoned',${input.actorId}::uuid,${priorError},${Number(current.recovery_count??0)},${input.note})`.execute(ex);
    const r=await sql<any>`UPDATE pos.offline_commands SET status='abandoned',abandoned_at=now(),updated_at=now()
      WHERE id=${input.id}::uuid AND status='failed' AND staff_actor_id=${input.actorId}::uuid RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async reconciliationHistory(ex:DatabaseExecutor,commandId:string){
    return (await sql<any>`SELECT id,command_id,action,actor_id,prior_error_code,recovery_count,note,created_at
      FROM pos.offline_command_reconciliation_history WHERE command_id=${commandId}::uuid ORDER BY created_at,id`.execute(ex)).rows;
  }

  async failedForStaff(ex:DatabaseExecutor,staffActorId:string,limit:number){
    return (await sql<any>`SELECT id,client_command_id,command_type,status,error_code,recovery_count,queued_at,failed_at,updated_at
      FROM pos.offline_commands WHERE staff_actor_id=${staffActorId}::uuid AND status='failed'
      ORDER BY failed_at,id LIMIT ${limit}`.execute(ex)).rows;
  }

  async lockLineIdentity(ex:DatabaseExecutor,commandId:string,lineIndex:number){
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${commandId}:${lineIndex}`},0))`.execute(ex);
  }

  async lineEffect(ex:DatabaseExecutor,commandId:string,lineIndex:number){
    const r=await sql<any>`SELECT * FROM pos.offline_command_line_effects WHERE command_id=${commandId}::uuid AND line_index=${lineIndex}`.execute(ex);
    return r.rows[0]??null;
  }

  async recordLineEffect(ex:DatabaseExecutor,input:{commandId:string;lineIndex:number;saleId:string;variantId:string;quantity:number}){
    const r=await sql<any>`INSERT INTO pos.offline_command_line_effects(command_id,line_index,sale_id,variant_id,quantity)
      VALUES(${input.commandId}::uuid,${input.lineIndex},${input.saleId}::uuid,${input.variantId}::uuid,${input.quantity}) RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }
}
