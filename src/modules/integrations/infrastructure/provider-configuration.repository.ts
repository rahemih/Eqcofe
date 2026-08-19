import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';

@Injectable()
export class ProviderConfigurationRepository {
  constructor(@Inject(KYSELY_DB) private readonly db:Kysely<DatabaseSchema>){}

  async list(){return (await sql<any>`SELECT provider_key,provider_kind,enabled,base_url,timeout_ms,retry_max_attempts,secret_ref,config,version,created_at,updated_at FROM integrations.provider_configurations ORDER BY provider_kind,provider_key`.execute(this.db)).rows;}

  async byKey(key:string){return (await sql<any>`SELECT provider_key,provider_kind,enabled,base_url,timeout_ms,retry_max_attempts,secret_ref,config,version,created_at,updated_at FROM integrations.provider_configurations WHERE provider_key=${key}`.execute(this.db)).rows[0]??null;}
}
