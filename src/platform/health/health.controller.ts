import { Controller, Get, Inject } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok'; checks: Record<string, 'ok'> }> {
    const timeoutMs=this.config.get<number>('HEALTH_READINESS_TIMEOUT_MS',5_000);
    await Promise.all([
      this.withDeadline(sql`select 1`.execute(this.db),timeoutMs,'postgres'),
      this.withDeadline(this.redis.ping(),timeoutMs,'redis'),
    ]);
    return { status: 'ok', checks: { postgres: 'ok', redis: 'ok' } };
  }

  private async withDeadline<T>(operation:Promise<T>,timeoutMs:number,dependency:string):Promise<T>{
    let timer:NodeJS.Timeout|undefined;
    try{return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`READINESS_${dependency.toUpperCase()}_TIMEOUT`)),timeoutMs);})]);}
    finally{if(timer)clearTimeout(timer);}
  }
}
