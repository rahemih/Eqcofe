import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { DatabaseExecutor } from '../../../platform/database/transaction-manager';

@Injectable()
export class PhysicalSaleRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async create(ex: DatabaseExecutor, input: { id: string; clientCommandId: string; staffActorId: string }) {
    const result = await sql<any>`INSERT INTO pos.physical_sales(id,client_command_id,staff_actor_id)
      VALUES(${input.id}::uuid,${input.clientCommandId}::uuid,${input.staffActorId}::uuid)
      ON CONFLICT (client_command_id) DO NOTHING
      RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }

  async byId(id: string, ex: DatabaseExecutor = this.db, lock = false) {
    const query = lock
      ? sql<any>`SELECT * FROM pos.physical_sales WHERE id=${id}::uuid FOR UPDATE`
      : sql<any>`SELECT * FROM pos.physical_sales WHERE id=${id}::uuid`;
    return (await query.execute(ex)).rows[0] ?? null;
  }

  async byClientCommandId(clientCommandId: string, ex: DatabaseExecutor = this.db, lock = false) {
    const query = lock
      ? sql<any>`SELECT * FROM pos.physical_sales WHERE client_command_id=${clientCommandId}::uuid FOR UPDATE`
      : sql<any>`SELECT * FROM pos.physical_sales WHERE client_command_id=${clientCommandId}::uuid`;
    return (await query.execute(ex)).rows[0] ?? null;
  }

  async addOrIncreaseLine(ex: DatabaseExecutor, input: { id: string; saleId: string; variantId: string; quantity: number }) {
    const result = await sql<any>`INSERT INTO pos.physical_sale_lines(id,sale_id,variant_id,quantity)
      VALUES(${input.id}::uuid,${input.saleId}::uuid,${input.variantId}::uuid,${input.quantity})
      ON CONFLICT (sale_id,variant_id) DO UPDATE SET quantity=pos.physical_sale_lines.quantity + EXCLUDED.quantity,
        base_price_toman=NULL,discount_toman=NULL,unit_price_toman=NULL,pricing_base_price_id=NULL,pricing_rule_ids=NULL,pricing_customer_type=NULL,priced_at=NULL
      WHERE pos.physical_sale_lines.quantity + EXCLUDED.quantity BETWEEN 1 AND 999
      RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }

  async linesForUpdate(ex: DatabaseExecutor, saleId: string) {
    const result = await sql<any>`SELECT * FROM pos.physical_sale_lines WHERE sale_id=${saleId}::uuid ORDER BY id FOR UPDATE`.execute(ex);
    return result.rows;
  }

  async applyPriceSnapshot(ex: DatabaseExecutor, input: { lineId:string;basePriceToman:number;discountToman:number;unitPriceToman:number;basePriceId:string;ruleIds:string[];customerType:'retail'|'wholesale' }) {
    const result=await sql<any>`UPDATE pos.physical_sale_lines SET base_price_toman=${input.basePriceToman},discount_toman=${input.discountToman},unit_price_toman=${input.unitPriceToman},pricing_base_price_id=${input.basePriceId}::uuid,pricing_rule_ids=${JSON.stringify(input.ruleIds)}::jsonb,pricing_customer_type=${input.customerType},priced_at=now() WHERE id=${input.lineId}::uuid RETURNING *`.execute(ex);
    return result.rows[0]??null;
  }

  async updateTotals(ex: DatabaseExecutor, saleId:string, subtotal:number, discount:number, total:number) {
    const result=await sql<any>`UPDATE pos.physical_sales SET subtotal_toman=${subtotal},discount_total_toman=${discount},total_toman=${total},version=version+1,updated_at=now() WHERE id=${saleId}::uuid AND status='draft' RETURNING *`.execute(ex);
    return result.rows[0]??null;
  }

  async voidDraft(ex: DatabaseExecutor, input: { saleId: string; expectedVersion: number }) {
    const result = await sql<any>`UPDATE pos.physical_sales
      SET status='voided',voided_at=now(),updated_at=now(),version=version+1
      WHERE id=${input.saleId}::uuid AND status='draft' AND version=${input.expectedVersion}
      RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }
}
