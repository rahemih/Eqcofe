import { Injectable, NotFoundException } from '@nestjs/common';
import { IdentityRepository } from '../infrastructure/identity.repository';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditEntry } from '../../../platform/audit/audit.writer';

@Injectable()
export class AdminSecurityService {
  constructor(private readonly repo:IdentityRepository,private readonly context:RequestContextStore){}
  private audit(action:string,reason?:string):AuditEntry{const c=this.context.require();return {actorType:c.actor.type,actorId:c.actor.id,action,resourceType:'pending',reason,requestId:c.requestId,traceId:c.traceId};}
  listSessions(){return this.repo.listActiveSessions();}
  async revokeSession(id:string,reason?:string){if(!(await this.repo.adminRevokeSession(id,this.audit('security.session.revoke',reason))))throw new NotFoundException('SESSION_NOT_FOUND');}
  async revokeStaffSessions(staffId:string,reason?:string){if(!(await this.repo.adminRevokeStaffSessions(staffId,this.audit('security.staff_sessions.revoke',reason))))throw new NotFoundException('STAFF_NOT_FOUND');}
  async setStaffLock(staffId:string,locked:boolean,reason?:string){if(!(await this.repo.adminSetStaffAccountLock(staffId,locked,this.audit(locked?'security.staff.lock':'security.staff.unlock',reason))))throw new NotFoundException('STAFF_NOT_FOUND');}
}
