import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../platform/database/database.tokens';
import { DatabaseSchema } from '../../../platform/database/database.types';
import { ResolvedSession } from '../application/identity.types';
import { AuditWriter, AuditEntry } from '../../../platform/audit/audit.writer';
import { AppError, ConflictError } from '../../../shared/errors/app-error';

@Injectable()
export class IdentityRepository {
  constructor(@Inject(KYSELY_DB) private readonly db:Kysely<DatabaseSchema>,private readonly audit:AuditWriter){}

  async countRecentAttempts(type:string,subjectHash:string,minutes:number,success?:boolean):Promise<number>{
    const r=success===undefined
      ? await sql<any>`SELECT count(*)::int count FROM iam.auth_attempts WHERE attempt_type=${type} AND subject_hash=${subjectHash} AND occurred_at>now()-(${minutes}::text||' minutes')::interval`.execute(this.db)
      : await sql<any>`SELECT count(*)::int count FROM iam.auth_attempts WHERE attempt_type=${type} AND subject_hash=${subjectHash} AND success=${success} AND occurred_at>now()-(${minutes}::text||' minutes')::interval`.execute(this.db);
    return Number(r.rows[0]?.count??0);
  }
  async countRecentAttemptsByIp(type:string,ip:string,minutes:number,success?:boolean):Promise<number>{
    const r=success===undefined
      ? await sql<any>`SELECT count(*)::int count FROM iam.auth_attempts WHERE attempt_type=${type} AND source_ip=${ip}::inet AND occurred_at>now()-(${minutes}::text||' minutes')::interval`.execute(this.db)
      : await sql<any>`SELECT count(*)::int count FROM iam.auth_attempts WHERE attempt_type=${type} AND source_ip=${ip}::inet AND success=${success} AND occurred_at>now()-(${minutes}::text||' minutes')::interval`.execute(this.db);
    return Number(r.rows[0]?.count??0);
  }
  async recordAttempt(type:string,subjectHash:string,success:boolean,ip?:string):Promise<void>{await sql`INSERT INTO iam.auth_attempts(attempt_type,subject_hash,source_ip,success) VALUES(${type},${subjectHash},${ip??null}::inet,${success})`.execute(this.db);}

  async createOtp(input:{id:string;destinationHash:string;destinationEncrypted:string;purpose:string;codeHash:string;expiresAt:Date;maxAttempts:number}):Promise<void>{
    await sql`INSERT INTO iam.otp_challenges(id,destination_hash,destination_encrypted,purpose,code_hash,expires_at,max_attempts) VALUES(${input.id}::uuid,${input.destinationHash},${input.destinationEncrypted},${input.purpose},${input.codeHash},${input.expiresAt},${input.maxAttempts})`.execute(this.db);
  }
  async consumeOtpAttempt(id:string,candidateHash:string):Promise<any|undefined>{
    return this.db.transaction().execute(async trx=>{
      const r=await sql<any>`SELECT * FROM iam.otp_challenges WHERE id=${id}::uuid FOR UPDATE`.execute(trx); const row=r.rows[0];
      if(!row || row.consumed_at || new Date(row.expires_at)<=new Date() || row.attempts>=row.max_attempts)return undefined;
      const matched=row.code_hash===candidateHash;
      await sql`UPDATE iam.otp_challenges SET attempts=attempts+1,consumed_at=CASE WHEN ${matched} THEN now() ELSE consumed_at END WHERE id=${id}::uuid`.execute(trx);
      return {...row,matched,attempts:Number(row.attempts)+1};
    });
  }

  async findOrCreateCustomerAccount(mobile:string):Promise<{accountId:string;actorId:string}>{
    return this.db.transaction().execute(async trx=>{
      const r=await sql<any>`WITH a AS (
        INSERT INTO iam.accounts(mobile_normalized,status,mobile_verified_at) VALUES(${mobile},'active',now())
        ON CONFLICT (mobile_normalized) DO UPDATE SET mobile_verified_at=COALESCE(iam.accounts.mobile_verified_at,now()),updated_at=now()
        RETURNING id
      ), c AS (
        INSERT INTO customer.customers(id,account_id,customer_type,status,registered_at,created_at,updated_at,version)
        SELECT gen_random_uuid(),id,'retail','active',now(),now(),now(),1 FROM a
        ON CONFLICT (account_id) DO UPDATE SET updated_at=now() RETURNING id,account_id
      ) SELECT account_id,id actor_id FROM c`.execute(trx);
      return {accountId:r.rows[0].account_id,actorId:r.rows[0].actor_id};
    });
  }
  async createSession(input:{accountId:string;actorType:'customer'|'staff';tokenHash:string;expiresAt:Date;ip?:string;userAgent?:string}):Promise<string>{const r=await sql<any>`INSERT INTO iam.sessions(account_id,actor_type,token_hash,expires_at,ip_address,user_agent) VALUES(${input.accountId}::uuid,${input.actorType},${input.tokenHash},${input.expiresAt},${input.ip??null}::inet,${input.userAgent??null}) RETURNING id`.execute(this.db);return r.rows[0].id;}
  async resolveSession(tokenHash:string):Promise<ResolvedSession|undefined>{
    const base=await sql<any>`SELECT s.id session_id,s.account_id,s.actor_type,s.expires_at FROM iam.sessions s JOIN iam.accounts a ON a.id=s.account_id WHERE s.token_hash=${tokenHash} AND s.revoked_at IS NULL AND s.expires_at>now() AND a.status='active' LIMIT 1`.execute(this.db);const s=base.rows[0];if(!s)return;
    void sql`UPDATE iam.sessions SET last_seen_at=now() WHERE id=${s.session_id}::uuid AND last_seen_at<now()-interval '5 minutes'`.execute(this.db);
    if(s.actor_type==='customer'){const c=await sql<any>`SELECT id FROM customer.customers WHERE account_id=${s.account_id}::uuid AND status='active' LIMIT 1`.execute(this.db);if(!c.rows[0])return;return {sessionId:s.session_id,accountId:s.account_id,actorType:'customer',actorId:c.rows[0].id,permissions:[],scopes:[],expiresAt:s.expires_at};}
    const staff=await sql<any>`SELECT id FROM admin.staff_profiles WHERE account_id=${s.account_id}::uuid AND status='active' LIMIT 1`.execute(this.db);if(!staff.rows[0])return;
    const superAdmin=!!(await sql<any>`SELECT 1 FROM admin.staff_roles sr JOIN admin.roles r ON r.id=sr.role_id WHERE sr.staff_id=${staff.rows[0].id}::uuid AND r.key='superadmin' AND r.is_active=true AND (sr.expires_at IS NULL OR sr.expires_at>now()) LIMIT 1`.execute(this.db)).rows[0];const perms=superAdmin?await sql<any>`SELECT key FROM admin.permissions ORDER BY key`.execute(this.db):await sql<any>`SELECT DISTINCT p.key FROM admin.staff_roles sr JOIN admin.roles r ON r.id=sr.role_id AND r.is_active=true JOIN admin.role_permissions rp ON rp.role_id=r.id JOIN admin.permissions p ON p.id=rp.permission_id WHERE sr.staff_id=${staff.rows[0].id}::uuid AND (sr.expires_at IS NULL OR sr.expires_at>now())`.execute(this.db);
    const scopes=await sql<any>`SELECT scope_type||':'||scope_id::text value FROM admin.access_scopes WHERE staff_id=${staff.rows[0].id}::uuid`.execute(this.db);
    return {sessionId:s.session_id,accountId:s.account_id,actorType:'staff',actorId:staff.rows[0].id,permissions:perms.rows.map(x=>x.key),scopes:scopes.rows.map(x=>x.value),expiresAt:s.expires_at};
  }
  async listActiveSessions():Promise<any[]>{return (await sql<any>`SELECT s.id,s.account_id,s.actor_type,s.ip_address,s.user_agent,s.last_seen_at,s.created_at,s.expires_at FROM iam.sessions s WHERE s.revoked_at IS NULL AND s.expires_at>now() ORDER BY s.created_at DESC LIMIT 500`.execute(this.db)).rows;}
  async accountIdForStaff(staffId:string):Promise<string|undefined>{return (await sql<any>`SELECT account_id FROM admin.staff_profiles WHERE id=${staffId}::uuid LIMIT 1`.execute(this.db)).rows[0]?.account_id;}
  async setAccountStatus(accountId:string,status:'active'|'locked'):Promise<void>{await sql`UPDATE iam.accounts SET status=${status},updated_at=now() WHERE id=${accountId}::uuid`.execute(this.db);}
  async revokeSession(sessionId:string):Promise<void>{await sql`UPDATE iam.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE id=${sessionId}::uuid`.execute(this.db);}
  async revokeAll(accountId:string):Promise<void>{await sql`UPDATE iam.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=${accountId}::uuid AND revoked_at IS NULL`.execute(this.db);}

  async adminRevokeSession(sessionId:string,audit:AuditEntry):Promise<boolean>{return this.db.transaction().execute(async trx=>{const before=(await sql<any>`SELECT id,account_id,actor_type,revoked_at FROM iam.sessions WHERE id=${sessionId}::uuid FOR UPDATE`.execute(trx)).rows[0];if(!before)return false;await sql`UPDATE iam.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE id=${sessionId}::uuid`.execute(trx);await this.audit.writeWith(trx,{...audit,resourceType:'session',resourceId:sessionId,beforeData:{revoked_at:before.revoked_at},afterData:{revoked:true,account_id:before.account_id,actor_type:before.actor_type}});return true;});}
  async adminRevokeStaffSessions(staffId:string,audit:AuditEntry):Promise<boolean>{return this.db.transaction().execute(async trx=>{const staff=(await sql<any>`SELECT id,account_id FROM admin.staff_profiles WHERE id=${staffId}::uuid FOR UPDATE`.execute(trx)).rows[0];if(!staff)return false;const r=await sql<any>`UPDATE iam.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=${staff.account_id}::uuid AND revoked_at IS NULL RETURNING id`.execute(trx);await this.audit.writeWith(trx,{...audit,resourceType:'staff',resourceId:staffId,afterData:{sessions_revoked:r.rows.length}});return true;});}
  async adminSetStaffAccountLock(staffId:string,locked:boolean,audit:AuditEntry):Promise<boolean>{return this.db.transaction().execute(async trx=>{const staff=(await sql<any>`SELECT sp.id,sp.account_id,a.status account_status FROM admin.staff_profiles sp JOIN iam.accounts a ON a.id=sp.account_id WHERE sp.id=${staffId}::uuid FOR UPDATE OF sp,a`.execute(trx)).rows[0];if(!staff)return false;await sql`UPDATE iam.accounts SET status=${locked?'locked':'active'},updated_at=now() WHERE id=${staff.account_id}::uuid`.execute(trx);let revoked=0;if(locked){const r=await sql<any>`UPDATE iam.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=${staff.account_id}::uuid AND revoked_at IS NULL RETURNING id`.execute(trx);revoked=r.rows.length;}await this.audit.writeWith(trx,{...audit,resourceType:'staff',resourceId:staffId,beforeData:{account_status:staff.account_status},afterData:{account_status:locked?'locked':'active',sessions_revoked:revoked}});return true;});}

  async findAdminAccount(identifier:string):Promise<any|undefined>{return (await sql<any>`SELECT a.id account_id,a.password_hash,a.status,sp.id staff_id FROM iam.accounts a JOIN admin.staff_profiles sp ON sp.account_id=a.id WHERE (a.mobile_normalized=${identifier} OR lower(a.email_normalized)=lower(${identifier})) AND sp.status='active' LIMIT 1`.execute(this.db)).rows[0];}
  async createChallenge(input:{accountId?:string;type:string;challenge:string;context?:unknown;expiresAt:Date}):Promise<string>{const r=await sql<any>`INSERT INTO iam.auth_challenges(account_id,challenge_type,challenge,context,expires_at) VALUES(${input.accountId??null}::uuid,${input.type},${input.challenge},${JSON.stringify(input.context??{})}::jsonb,${input.expiresAt}) RETURNING id`.execute(this.db);return r.rows[0].id;}
  async peekChallenge(id:string,accountId:string):Promise<any|undefined>{return (await sql<any>`SELECT id,account_id,challenge_type,context FROM iam.auth_challenges WHERE id=${id}::uuid AND account_id=${accountId}::uuid AND consumed_at IS NULL AND expires_at>now() LIMIT 1`.execute(this.db)).rows[0];}
  async getChallenge(id:string,type:string,accountId:string):Promise<any|undefined>{return (await sql<any>`SELECT * FROM iam.auth_challenges WHERE id=${id}::uuid AND challenge_type=${type} AND account_id=${accountId}::uuid AND consumed_at IS NULL AND expires_at>now() LIMIT 1`.execute(this.db)).rows[0];}
  async finalizeAuthentication(input:{challengeId:string;type:string;accountId:string;credentialRowId:string;newCounter:number}):Promise<boolean>{
    return this.db.transaction().execute(async trx=>{
      const consumed=await sql<any>`UPDATE iam.auth_challenges SET consumed_at=now() WHERE id=${input.challengeId}::uuid AND challenge_type=${input.type} AND account_id=${input.accountId}::uuid AND consumed_at IS NULL AND expires_at>now() RETURNING id`.execute(trx);if(consumed.rows.length!==1)return false;
      const updated=await sql<any>`UPDATE iam.webauthn_credentials SET sign_count=${input.newCounter},last_used_at=now() WHERE id=${input.credentialRowId}::uuid AND account_id=${input.accountId}::uuid AND revoked_at IS NULL RETURNING id`.execute(trx);return updated.rows.length===1;
    });
  }
  async finalizeRegistration(input:{challengeId:string;accountId:string;credentialId:string;publicKey:Uint8Array;counter:number;deviceName:string;transports:string[];webauthnUserId?:string;deviceType?:string;backedUp?:boolean;consumeEnrollment:boolean;audit:AuditEntry}):Promise<boolean>{
    return this.db.transaction().execute(async trx=>{
      const consumed=await sql<any>`UPDATE iam.auth_challenges SET consumed_at=now() WHERE id=${input.challengeId}::uuid AND challenge_type='webauthn_register' AND account_id=${input.accountId}::uuid AND consumed_at IS NULL AND expires_at>now() RETURNING id`.execute(trx);if(consumed.rows.length!==1)return false;
      await sql`INSERT INTO iam.webauthn_credentials(account_id,credential_id,public_key,webauthn_user_id,credential_device_type,backed_up,sign_count,device_name,transports) VALUES(${input.accountId}::uuid,${input.credentialId},${Buffer.from(input.publicKey)},${input.webauthnUserId??null},${input.deviceType??null},${input.backedUp??false},${input.counter},${input.deviceName},${JSON.stringify(input.transports)}::jsonb)`.execute(trx);
      if(input.consumeEnrollment)await sql`UPDATE admin.staff_profiles SET fido_enrollment_token_hash=NULL,fido_enrollment_expires_at=NULL WHERE account_id=${input.accountId}::uuid`.execute(trx);await this.audit.writeWith(trx,{...input.audit,resourceType:'account',resourceId:input.accountId,afterData:{credential_id:input.credentialId,device_name:input.deviceName,initial_enrollment:input.consumeEnrollment}});
      return true;
    });
  }
  async validateEnrollmentToken(accountId:string,tokenHash:string):Promise<boolean>{return !!(await sql<any>`SELECT 1 FROM admin.staff_profiles WHERE account_id=${accountId}::uuid AND fido_enrollment_token_hash=${tokenHash} AND fido_enrollment_expires_at>now() LIMIT 1`.execute(this.db)).rows[0];}
  async listCredentials(accountId:string):Promise<any[]>{return (await sql<any>`SELECT id,credential_id,public_key,sign_count,device_name,transports FROM iam.webauthn_credentials WHERE account_id=${accountId}::uuid AND revoked_at IS NULL`.execute(this.db)).rows;}
  async listCredentialSummaries(accountId:string):Promise<any[]>{return (await sql<any>`SELECT id,device_name,credential_device_type,backed_up,last_used_at,created_at FROM iam.webauthn_credentials WHERE account_id=${accountId}::uuid AND revoked_at IS NULL ORDER BY created_at`.execute(this.db)).rows;}
  async revokeCredential(accountId:string,credentialRowId:string,audit:AuditEntry):Promise<void>{await this.db.transaction().execute(async trx=>{const rows=await sql<any>`SELECT id,device_name FROM iam.webauthn_credentials WHERE account_id=${accountId}::uuid AND revoked_at IS NULL FOR UPDATE`.execute(trx);if(rows.rows.length<=1)throw new ConflictError('LAST_FIDO2_CREDENTIAL_CANNOT_BE_REVOKED','آخرین کلید فیزیکی مدیر قابل حذف نیست.');const target=rows.rows.find(x=>x.id===credentialRowId);if(!target)throw new AppError('FIDO2_CREDENTIAL_NOT_FOUND','کلید فیزیکی پیدا نشد.',404);await sql`UPDATE iam.webauthn_credentials SET revoked_at=now() WHERE id=${credentialRowId}::uuid AND account_id=${accountId}::uuid AND revoked_at IS NULL`.execute(trx);await this.audit.writeWith(trx,{...audit,resourceType:'account',resourceId:accountId,beforeData:{credential_id:credentialRowId,device_name:target.device_name},afterData:{credential_revoked:true}});});}
  async resetFidoEnrollmentForStaff(staffId:string,enrollmentHash:string,expectedVersion:number,audit:AuditEntry):Promise<string|undefined>{return this.db.transaction().execute(async trx=>{const before=(await sql<any>`SELECT id,account_id,version FROM admin.staff_profiles WHERE id=${staffId}::uuid FOR UPDATE`.execute(trx)).rows[0];if(!before)return;if(Number(before.version)!==expectedVersion)throw new ConflictError('VERSION_CONFLICT','نسخه کارمند تغییر کرده است.',{current_version:Number(before.version)});const r=await sql<any>`UPDATE admin.staff_profiles SET fido_enrollment_token_hash=${enrollmentHash},fido_enrollment_expires_at=now()+interval '30 minutes',version=version+1 WHERE id=${staffId}::uuid AND version=${expectedVersion} RETURNING account_id,version`.execute(trx);const accountId=r.rows[0]?.account_id;await sql`UPDATE iam.webauthn_credentials SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=${accountId}::uuid`.execute(trx);await sql`UPDATE iam.sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=${accountId}::uuid AND revoked_at IS NULL`.execute(trx);await this.audit.writeWith(trx,{...audit,resourceType:'staff',resourceId:staffId,beforeData:{version:Number(before.version)},afterData:{version:Number(r.rows[0].version),fido_credentials_revoked:true,sessions_revoked:true}});return accountId;});}
}
