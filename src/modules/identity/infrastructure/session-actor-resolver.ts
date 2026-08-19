import { Injectable } from '@nestjs/common';
import { ActorResolverPort } from '../../../platform/auth/actor-resolver.port';
import { ExecutionActor } from '../../../shared/application/execution-context';
import { AuthService } from '../application/auth.service';
function cookie(header:string|undefined,name:string):string|undefined{if(!header)return;for(const p of header.split(';')){const [k,...v]=p.trim().split('=');if(k===name)return decodeURIComponent(v.join('='));}}
function first(header:string|undefined,names:string[]):string|undefined{for(const n of names){const v=cookie(header,n);if(v)return v;}}
@Injectable()
export class SessionActorResolver implements ActorResolverPort {
  constructor(private readonly auth:AuthService){}
  async resolve(request:any):Promise<ExecutionActor|null>{
    const path=String(request.url??request.raw?.url??''); const h=request.headers??{};
    const admin=path.includes('/admin/');
    const names=admin?['__Host-eqcofe_admin_session','eqcofe_admin_session']:['__Host-eqcofe_session','eqcofe_session'];
    const token=first(h.cookie,names); if(!token)return null;
    const s=await this.auth.resolve(token); if(!s)return null;
    if(admin && s.actorType!=='staff')return null; if(!admin && s.actorType!=='customer')return null;
    request.__session=s;
    return {type:s.actorType,id:s.actorId,accountId:s.accountId,sessionId:s.sessionId,permissions:s.permissions,scopes:s.scopes} as ExecutionActor;
  }
}
