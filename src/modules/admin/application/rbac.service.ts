import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RbacRepository } from '../infrastructure/rbac.repository';
import { AuthService } from '../../identity/application/auth.service';
import { SessionToken } from '../../identity/domain/session-token';
import { WebAuthnService } from '../../identity/application/webauthn.service';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';
import { AuditEntry } from '../../../platform/audit/audit.writer';
import { AppError } from '../../../shared/errors/app-error';

@Injectable()
export class RbacService {
  constructor(private readonly repo:RbacRepository,private readonly context:RequestContextStore,private readonly webauthn:WebAuthnService,private readonly auth:AuthService){}
  private audit(action:string,reason?:string):AuditEntry{const c=this.context.require();return {actorType:c.actor.type,actorId:c.actor.id,action,resourceType:'pending',reason,requestId:c.requestId,traceId:c.traceId};}
  listPermissions(){return this.repo.listPermissions();} listRoles(){return this.repo.listRoles();} getRole(id:string){return this.repo.getRole(id);} listStaff(){return this.repo.listStaff();} getStaff(id:string){return this.repo.getStaff(id);}
  createRole(i:any){const key=String(i.key??'').trim().toLowerCase();if(!/^[a-z][a-z0-9_.-]{2,99}$/.test(key))throw new AppError('INVALID_ROLE_KEY','کلید نقش معتبر نیست.',422);const name=String(i.name_fa??'').trim();if(!name||name.length>150)throw new AppError('INVALID_ROLE_NAME','نام نقش معتبر نیست.',422);return this.repo.createRole({...i,key,name_fa:name},this.audit('rbac.role.create',i.reason));}
  updateRole(id:string,i:any,version:number){return this.repo.updateRole(id,i,version,this.audit('rbac.role.update',i.reason));}
  setPermissions(id:string,ids:string[],version:number,reason?:string){return this.repo.replaceRolePermissions(id,[...new Set(ids)],version,this.audit('rbac.role.permissions.replace',reason));}
  updateStaff(id:string,i:any,version:number){return this.repo.updateStaff(id,i,version,this.audit('staff.update',i.reason));}
  async createStaff(i:any){const first=String(i.first_name??'').trim(),last=String(i.last_name??'').trim();if(!first||!last||first.length>100||last.length>100)throw new AppError('INVALID_STAFF_NAME','نام کارمند معتبر نیست.',422);const email=i.email?String(i.email).trim().toLowerCase():undefined;if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError('INVALID_EMAIL','ایمیل معتبر نیست.',422);const mobile=i.mobile?this.auth.normalizeMobile(String(i.mobile)):undefined;if(!email&&!mobile)throw new AppError('STAFF_IDENTITY_REQUIRED','حداقل ایمیل یا موبایل کارمند الزامی است.',422);const enrollmentToken=randomBytes(32).toString('base64url');const staff=await this.repo.createStaff({...i,first_name:first,last_name:last,email,mobile},AuthService.hashPassword(i.password),SessionToken.hash(enrollmentToken),this.audit('staff.create',i.reason));return {...staff,fido_enrollment_token:enrollmentToken,fido_enrollment_expires_in_seconds:86400};}
  resetFidoEnrollment(id:string,version:number){return this.webauthn.resetEnrollmentForStaff(id,version,this.audit('security.fido.reset_enrollment'));}
  disable(id:string,version:number,reason?:string){return this.repo.setStaffStatus(id,'disabled',version,this.audit('staff.disable',reason));}
  enable(id:string,version:number,reason?:string){return this.repo.setStaffStatus(id,'active',version,this.audit('staff.enable',reason));}
  setRoles(id:string,ids:string[],version:number,actor?:string,reason?:string){return this.repo.replaceStaffRoles(id,[...new Set(ids)],version,actor,this.audit('staff.roles.replace',reason));}
  setScopes(id:string,s:any[],version:number,reason?:string){const allowed=new Set(['warehouse','physical_store']);for(const x of s){if(!allowed.has(x?.scope_type)||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(x?.scope_id??'')))throw new AppError('INVALID_ACCESS_SCOPE','محدوده دسترسی معتبر نیست.',422);}return this.repo.replaceStaffScopes(id,s,version,this.audit('staff.scopes.replace',reason));}
}
