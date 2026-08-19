import { Controller, Get, Inject } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Redis } from 'ioredis';
import { Public } from '../auth/auth.decorators';
import { RawResponse } from '../http/raw-response.decorator';
import { KYSELY_DB } from '../database/database.tokens';
import { DatabaseSchema } from '../database/database.types';
import { REDIS_CLIENT } from '../redis/redis.tokens';

@Controller('health')
@Public()
@RawResponse()
export class HealthController {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<DatabaseSchema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok'; checks: Record<string, 'ok'> }> {
    await sql`select 1`.execute(this.db);
    await this.redis.ping();
    return { status: 'ok', checks: { postgres: 'ok', redis: 'ok' } };
  }
}
