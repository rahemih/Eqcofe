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

  async byClientCommandId(clientCommandId: string, ex: DatabaseExecutor = this.db, lock = false) {
    const query = lock
      ? sql<any>`SELECT * FROM pos.physical_sales WHERE client_command_id=${clientCommandId}::uuid FOR UPDATE`
      : sql<any>`SELECT * FROM pos.physical_sales WHERE client_command_id=${clientCommandId}::uuid`;
    return (await query.execute(ex)).rows[0] ?? null;
  }

  async addOrIncreaseLine(ex: DatabaseExecutor, input: { id: string; saleId: string; variantId: string; quantity: number }) {
    const result = await sql<any>`INSERT INTO pos.physical_sale_lines(id,sale_id,variant_id,quantity)
      VALUES(${input.id}::uuid,${input.saleId}::uuid,${input.variantId}::uuid,${input.quantity})
      ON CONFLICT (sale_id,variant_id) DO UPDATE SET quantity=pos.physical_sale_lines.quantity + EXCLUDED.quantity
      WHERE pos.physical_sale_lines.quantity + EXCLUDED.quantity BETWEEN 1 AND 999
      RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }

  async voidDraft(ex: DatabaseExecutor, input: { saleId: string; expectedVersion: number }) {
    const result = await sql<any>`UPDATE pos.physical_sales
      SET status='voided',voided_at=now(),updated_at=now(),version=version+1
      WHERE id=${input.saleId}::uuid AND status='draft' AND version=${input.expectedVersion}
      RETURNING *`.execute(ex);
    return result.rows[0] ?? null;
  }
}
