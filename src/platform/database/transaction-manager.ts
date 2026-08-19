import { Inject, Injectable } from '@nestjs/common';
import { Kysely, Transaction } from 'kysely';
import { DatabaseSchema } from './database.types';
import { KYSELY_DB } from './database.tokens';

export type DatabaseExecutor = Kysely<DatabaseSchema> | Transaction<DatabaseSchema>;

@Injectable()
export class TransactionManager {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}

  run<T>(work: (trx: Transaction<DatabaseSchema>) => Promise<T>): Promise<T> {
    return this.db.transaction().execute(work);
  }

  readonly(): Kysely<DatabaseSchema> {
    return this.db;
  }
}
