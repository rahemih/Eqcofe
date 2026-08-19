import { Inject, Injectable, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID } from 'node:crypto';
import { IdentityRepository } from '../infrastructure/identity.repository';
import { OtpCode } from '../domain/otp-code';
import { SessionToken } from '../domain/session-token';
import { OTP_DELIVERY_PORT, OtpDeliveryPort } from './identity.types';
import { PasswordHasher } from '../domain/password-hasher';

@Injectable()
export class AuthService {
  constructor(private readonly repo:IdentityRepository,private readonly config:ConfigService,@Inject(OTP_DELIVERY_PORT) private readonly delivery:OtpDeliveryPort){}
  private key():Buffer{return createHash('sha256').update(this.config.getOrThrow<string>('AUTH_ENCRYPTION_KEY')).digest();}
  private encrypt(value:string):string{const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',this.key(),iv);const body=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv.toString('base64url'),c.getAuthTag().toString('base64url'),body.toString('base64url')].join('.');}
  private decrypt(value:string):string{const [i,t,b]=value.split('.');if(!i||!t||!b)throw new UnauthorizedException('OTP_DATA_INVALID');const d=createDecipheriv('aes-256-gcm',this.key(),Buffer.from(i,'base64url'));d.setAuthTag(Buffer.from(t,'base64url'));return Buffer.concat([d.update(Buffer.from(b,'base64url')),d.final()]).toString('utf8');}
  normalizeMobile(v:string):string{const s=String(v??'').replace(/[\s-]/g,'');if(!/^(?:\+98|0098|98|0)?9\d{9}$/.test(s))throw new UnauthorizedException('INVALID_MOBILE');if(s.startsWith('+98'))return '0'+s.slice(3);if(s.startsWith('0098'))return '0'+s.slice(4);if(s.startsWith('98'))return '0'+s.slice(2);return s.startsWith('0')?s:'0'+s;}
  normalizeAdminIdentifier(v:string):string{return String(v??'').trim().toLowerCase();}
  async requestOtp(mobileRaw:string,ip?:string){const mobile=this.normalizeMobile(mobileRaw);const subjectHash=createHash('sha256').update(mobile).digest('hex');if(await this.repo.countRecentAttempts('otp_request',subjectHash,10)>=3 || (ip&&await this.repo.countRecentAttemptsByIp('otp_request',ip,10)>=10))throw new HttpException('OTP_RATE_LIMITED',HttpStatus.TOO_MANY_REQUESTS);const id=randomUUID();const secret=this.config.getOrThrow<string>('OTP_HMAC_SECRET');const {code,hash}=OtpCode.generate(secret,id);const expiresAt=new Date(Date.now()+this.config.get<number>('OTP_TTL_SECONDS',120)*1000);await this.repo.createOtp({id,destinationHash:subjectHash,destinationEncrypted:this.encrypt(mobile),purpose:'customer_login',codeHash:hash,expiresAt,maxAttempts:5});await this.repo.recordAttempt('otp_request',subjectHash,true,ip);await this.delivery.sendLoginCode(mobile,code);return {challenge_id:id,expires_at:expiresAt};}
  async verifyOtp(challengeId:string,code:string,meta:{ip?:string;userAgent?:string}){if(!/^[0-9]{6}$/.test(String(code??'')))throw new UnauthorizedException('OTP_INVALID');const candidate=OtpCode.hash(code,this.config.getOrThrow<string>('OTP_HMAC_SECRET'),challengeId);const row=await this.repo.consumeOtpAttempt(challengeId,candidate);if(!row)throw new UnauthorizedException('OTP_EXPIRED_OR_CONSUMED');if(!row.matched){if(row.attempts>=row.max_attempts)throw new HttpException('OTP_ATTEMPTS_EXCEEDED',HttpStatus.TOO_MANY_REQUESTS);throw new UnauthorizedException('OTP_INVALID');}const mobile=this.decrypt(row.destination_encrypted);const identity=await this.repo.findOrCreateCustomerAccount(mobile);return this.createSession(identity.accountId,'customer',meta);}
  async createSession(accountId:string,actorType:'customer'|'staff',meta:{ip?:string;userAgent?:string}){const token=SessionToken.generate();const expiresAt=new Date(Date.now()+this.config.get<number>('SESSION_TTL_SECONDS',604800)*1000);const sessionId=await this.repo.createSession({accountId,actorType,tokenHash:token.hash,expiresAt,ip:meta.ip,userAgent:meta.userAgent});return {session_id:sessionId,session_token:token.raw,expires_at:expiresAt};}
  async resolve(raw:string){return this.repo.resolveSession(SessionToken.hash(raw));}
  listActiveSessions(){return this.repo.listActiveSessions();}
  async revokeStaffSessions(staffId:string){const accountId=await this.repo.accountIdForStaff(staffId);if(accountId)await this.repo.revokeAll(accountId);}
  async setStaffAccountLock(staffId:string,locked:boolean){const accountId=await this.repo.accountIdForStaff(staffId);if(!accountId)throw new UnauthorizedException('STAFF_NOT_FOUND');await this.repo.setAccountStatus(accountId,locked?'locked':'active');if(locked)await this.repo.revokeAll(accountId);}
  logout(sessionId:string){return this.repo.revokeSession(sessionId);} logoutAll(accountId:string){return this.repo.revokeAll(accountId);}
  verifyPassword(password:string,encoded:string|null):boolean{return PasswordHasher.verify(password,encoded);}
  static hashPassword(password:string):string{return PasswordHasher.hash(password);}
}
