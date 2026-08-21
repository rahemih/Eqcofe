import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';

@Injectable()
export class PosVariantLookupRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  async bySku(sku: string) {
    const result = await sql<any>`SELECT id,product_id,sku,barcode,status,sales_enabled
      FROM catalog.product_variants
      WHERE lower(sku)=lower(${sku})
      LIMIT 2`.execute(this.db);
    return result.rows;
  }

  async byBarcode(barcode: string) {
    const result = await sql<any>`SELECT id,product_id,sku,barcode,status,sales_enabled
      FROM catalog.product_variants
      WHERE barcode=${barcode}
      LIMIT 2`.execute(this.db);
    return result.rows;
  }
}
