import { Injectable } from '@nestjs/common';
import { sql, Transaction } from 'kysely';
import { DatabaseSchema } from '../database/database.types';
import { TransactionManager } from '../database/transaction-manager';
import { IntegrationEvent } from './integration-event';

@Injectable()
export class ConsumerInboxService {
  constructor(private readonly tx: TransactionManager) {}

  async execute(consumerName:string, event:IntegrationEvent, work:(trx:Transaction<DatabaseSchema>)=>Promise<void>): Promise<boolean> {
    try {
      return await this.tx.run(async (trx) => {
        await trx.withSchema('events').insertInto('consumer_inbox').values({
          consumer_name:consumerName,event_id:event.event_id,event_type:event.event_type,
          status:'processing',processed_at:null,last_error_code:null,
        }).onConflict((oc)=>oc.columns(['consumer_name','event_id']).doNothing()).execute();
        const inbox=await trx.withSchema('events').selectFrom('consumer_inbox').selectAll()
          .where('consumer_name','=',consumerName).where('event_id','=',event.event_id).forUpdate().executeTakeFirstOrThrow();
        if(inbox.status==='processed') return false;
        await trx.withSchema('events').updateTable('consumer_inbox').set({
          status:'processing',attempt_count:inbox.attempt_count+1,last_error_code:null,
        }).where('consumer_name','=',consumerName).where('event_id','=',event.event_id).execute();
        await work(trx);
        await trx.withSchema('events').updateTable('consumer_inbox').set({status:'processed',processed_at:new Date()})
          .where('consumer_name','=',consumerName).where('event_id','=',event.event_id).execute();
        return true;
      });
    } catch(error) {
      const code=error instanceof Error?error.name.slice(0,120):'UNKNOWN_ERROR';
      await this.tx.run(async (trx)=>{
        await trx.withSchema('events').insertInto('consumer_inbox').values({
          consumer_name:consumerName,event_id:event.event_id,event_type:event.event_type,status:'failed',
          attempt_count:1,processed_at:null,last_error_code:code,
        }).onConflict((oc)=>oc.columns(['consumer_name','event_id']).doUpdateSet({
          status:'failed',last_error_code:code,attempt_count:sql`events.consumer_inbox.attempt_count + 1`,
        })).execute();
      }).catch(()=>undefined);
      throw error;
    }
  }
}
