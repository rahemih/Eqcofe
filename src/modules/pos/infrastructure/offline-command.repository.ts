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
    const r=await sql<any>`UPDATE pos.offline_commands SET status='applied',result=${JSON.stringify(result)}::jsonb,error_code=NULL,applied_at=now(),failed_at=NULL,updated_at=now()
      WHERE id=${id}::uuid AND status='queued' RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async markFailed(ex:DatabaseExecutor,id:string,errorCode:string){
    const r=await sql<any>`UPDATE pos.offline_commands SET status='failed',result=NULL,error_code=${errorCode},failed_at=now(),applied_at=NULL,updated_at=now()
      WHERE id=${id}::uuid AND status='queued' RETURNING *`.execute(ex);
    return r.rows[0]??null;
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
