import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DatabaseSchema } from './database.types';
import { KYSELY_DB } from './database.tokens';
import { TransactionManager } from './transaction-manager';

const PG_POOL = Symbol('PG_POOL');

class DatabaseShutdown implements OnApplicationShutdown {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>) {}
  async onApplicationShutdown(): Promise<void> { await this.db.destroy(); }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new Pool({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        max: config.get<number>('DB_POOL_MAX', 20),
        application_name: config.get<string>('SERVICE_NAME', 'eqcofe'),
      }),
    },
    {
      provide: KYSELY_DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool }) }),
    },
    TransactionManager,
    DatabaseShutdown,
  ],
  exports: [KYSELY_DB, TransactionManager],
})
export class DatabaseModule {}
