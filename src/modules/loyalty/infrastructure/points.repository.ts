import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

export interface PointsEntryRow {
  id:string; customer_id:string; entry_type:'earn'|'redeem'|'expire'|'adjust'|'reverse'; points_delta:string|number|bigint;
  reference_type:string; reference_id:string; reverses_entry_id:string|null; metadata:Record<string,unknown>; created_at:Date;
}

@Injectable()
export class PointsRepository {
  constructor(@Inject(KYSELY_DB) private readonly db:Kysely<DatabaseSchema>) {}

  async balance(customerId:string, ex:DatabaseExecutor=this.db):Promise<number> {
    const r=await sql<{balance:string|number|bigint}>`SELECT COALESCE(sum(points_delta),0) balance FROM loyalty.points_entries WHERE customer_id=${customerId}::uuid`.execute(ex);
    return Number(r.rows[0]?.balance??0);
  }

  async history(customerId:string, limit=100, ex:DatabaseExecutor=this.db):Promise<PointsEntryRow[]> {
    const r=await sql<PointsEntryRow>`SELECT id,customer_id,entry_type,points_delta,reference_type,reference_id,reverses_entry_id,metadata,created_at
      FROM loyalty.points_entries WHERE customer_id=${customerId}::uuid ORDER BY created_at DESC,id DESC LIMIT ${limit}`.execute(ex);
    return r.rows;
  }

  async byId(customerId:string,id:string,ex:DatabaseExecutor=this.db,lock=false):Promise<PointsEntryRow|null> {
    const q=lock
      ? sql<PointsEntryRow>`SELECT id,customer_id,entry_type,points_delta,reference_type,reference_id,reverses_entry_id,metadata,created_at FROM loyalty.points_entries WHERE customer_id=${customerId}::uuid AND id=${id}::uuid FOR UPDATE`
      : sql<PointsEntryRow>`SELECT id,customer_id,entry_type,points_delta,reference_type,reference_id,reverses_entry_id,metadata,created_at FROM loyalty.points_entries WHERE customer_id=${customerId}::uuid AND id=${id}::uuid`;
    return (await q.execute(ex)).rows[0]??null;
  }

  async append(ex:DatabaseExecutor,input:{id:string;customerId:string;type:string;pointsDelta:number;referenceType:string;referenceId:string;reversesEntryId?:string|null;metadata?:Record<string,unknown>}):Promise<PointsEntryRow|null> {
    const r=await sql<PointsEntryRow>`INSERT INTO loyalty.points_entries(id,customer_id,entry_type,points_delta,reference_type,reference_id,reverses_entry_id,metadata)
      VALUES(${input.id}::uuid,${input.customerId}::uuid,${input.type},${input.pointsDelta},${input.referenceType},${input.referenceId},${input.reversesEntryId??null}::uuid,${JSON.stringify(input.metadata??{})}::jsonb)
      ON CONFLICT(customer_id,entry_type,reference_type,reference_id) DO NOTHING
      RETURNING id,customer_id,entry_type,points_delta,reference_type,reference_id,reverses_entry_id,metadata,created_at`.execute(ex);
    return r.rows[0]??null;
  }
}
