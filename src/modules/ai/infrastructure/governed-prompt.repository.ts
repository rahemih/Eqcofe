import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseExecutor, TransactionManager } from '../../../platform/database/transaction-manager';
import { AiOperationKind } from '../domain/ai-provider-contracts';
import { GovernedPromptStatus } from '../domain/governed-prompt';

export interface PromptDefinitionRow {
  id:string; prompt_key:string; operation:AiOperationKind; status:GovernedPromptStatus; active_version:number|null;
  created_by:string|null; updated_by:string|null; created_at:Date; updated_at:Date; version:string|number|bigint;
}
export interface PromptVersionRow {
  id:string; prompt_id:string; version_number:number; template:string; created_by:string|null; created_at:Date;
}

@Injectable()
export class GovernedPromptRepository {
  constructor(private readonly tx:TransactionManager){}
  db(){ return this.tx.readonly(); }

  async byKey(key:string,ex:DatabaseExecutor=this.db(),lock=false):Promise<PromptDefinitionRow|null>{
    const q=lock
      ? sql<PromptDefinitionRow>`SELECT * FROM ai.prompt_definitions WHERE prompt_key=${key} FOR UPDATE`
      : sql<PromptDefinitionRow>`SELECT * FROM ai.prompt_definitions WHERE prompt_key=${key}`;
    return (await q.execute(ex)).rows[0]??null;
  }

  async createDefinition(ex:DatabaseExecutor,input:{id:string;key:string;operation:AiOperationKind;staffId:string}):Promise<PromptDefinitionRow>{
    const r=await sql<PromptDefinitionRow>`INSERT INTO ai.prompt_definitions(id,prompt_key,operation,status,created_by,updated_by)
      VALUES(${input.id}::uuid,${input.key},${input.operation},'draft',${input.staffId}::uuid,${input.staffId}::uuid) RETURNING *`.execute(ex);
    return r.rows[0]!;
  }

  async nextVersion(promptId:string,ex:DatabaseExecutor):Promise<number>{
    const r=await sql<{next_version:number|string|bigint}>`SELECT COALESCE(MAX(version_number),0)+1 AS next_version FROM ai.prompt_versions WHERE prompt_id=${promptId}::uuid`.execute(ex);
    return Number(r.rows[0]?.next_version??1);
  }

  async addVersion(ex:DatabaseExecutor,input:{id:string;promptId:string;version:number;template:string;staffId:string}):Promise<PromptVersionRow>{
    const r=await sql<PromptVersionRow>`INSERT INTO ai.prompt_versions(id,prompt_id,version_number,template,created_by)
      VALUES(${input.id}::uuid,${input.promptId}::uuid,${input.version},${input.template},${input.staffId}::uuid) RETURNING *`.execute(ex);
    return r.rows[0]!;
  }

  async version(promptId:string,version:number,ex:DatabaseExecutor=this.db()):Promise<PromptVersionRow|null>{
    const r=await sql<PromptVersionRow>`SELECT * FROM ai.prompt_versions WHERE prompt_id=${promptId}::uuid AND version_number=${version}`.execute(ex);
    return r.rows[0]??null;
  }

  async activate(ex:DatabaseExecutor,input:{id:string;expectedVersion:number;activeVersion:number;staffId:string}):Promise<PromptDefinitionRow|null>{
    const r=await sql<PromptDefinitionRow>`UPDATE ai.prompt_definitions SET status='active',active_version=${input.activeVersion},updated_by=${input.staffId}::uuid,updated_at=now(),version=version+1
      WHERE id=${input.id}::uuid AND version=${input.expectedVersion} RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async disable(ex:DatabaseExecutor,input:{id:string;expectedVersion:number;staffId:string}):Promise<PromptDefinitionRow|null>{
    const r=await sql<PromptDefinitionRow>`UPDATE ai.prompt_definitions SET status='disabled',active_version=NULL,updated_by=${input.staffId}::uuid,updated_at=now(),version=version+1
      WHERE id=${input.id}::uuid AND version=${input.expectedVersion} RETURNING *`.execute(ex);
    return r.rows[0]??null;
  }

  async resolveActive(key:string,operation:AiOperationKind,ex:DatabaseExecutor=this.db()):Promise<{definition:PromptDefinitionRow;version:PromptVersionRow}|null>{
    const r=await sql<any>`SELECT d.*,v.id AS pv_id,v.prompt_id AS pv_prompt_id,v.version_number AS pv_version_number,v.template AS pv_template,v.created_by AS pv_created_by,v.created_at AS pv_created_at
      FROM ai.prompt_definitions d JOIN ai.prompt_versions v ON v.prompt_id=d.id AND v.version_number=d.active_version
      WHERE d.prompt_key=${key} AND d.operation=${operation} AND d.status='active' LIMIT 1`.execute(ex);
    const x=r.rows[0]; if(!x)return null;
    return {definition:x as PromptDefinitionRow,version:{id:x.pv_id,prompt_id:x.pv_prompt_id,version_number:x.pv_version_number,template:x.pv_template,created_by:x.pv_created_by,created_at:x.pv_created_at}};
  }
}
