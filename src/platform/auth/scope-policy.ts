import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExecutionActor } from '../../shared/application/execution-context';

@Injectable()
export class ScopePolicy {
  allowedIds(actor:ExecutionActor|undefined,scopeType:string):string[]|null {
    if(!actor || actor.type==='system' || actor.type==='service') return null;
    if(actor.type!=='staff') return [];
    const prefix=`${scopeType}:`;
    const ids=(actor.scopes??[]).filter(x=>x.startsWith(prefix)).map(x=>x.slice(prefix.length));
    return ids.length?ids:null;
  }
  assertGlobal(actor:ExecutionActor|undefined,scopeType:string):void {
    const ids=this.allowedIds(actor,scopeType);
    if(ids!==null) throw new ForbiddenException('SCOPE_GLOBAL_REQUIRED');
  }
  assert(actor:ExecutionActor|undefined,scopeType:string,scopeId:string):void {
    const ids=this.allowedIds(actor,scopeType);
    if(ids!==null && !ids.includes(scopeId)) throw new ForbiddenException('SCOPE_FORBIDDEN');
  }
}
