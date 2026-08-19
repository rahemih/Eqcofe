import { Injectable, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IdentityRepository } from '../infrastructure/identity.repository';
import { AuthService } from './auth.service';
import { SignedTokenService } from '../../../platform/auth/signed-token.service';

@Injectable()
export class AdminAuthService {
  constructor(private readonly repo:IdentityRepository,private readonly auth:AuthService,private readonly tokens:SignedTokenService){}
  async begin(identifierRaw:string,password:string,ip?:string){
    const identifier=this.auth.normalizeAdminIdentifier(identifierRaw);const h=createHash('sha256').update(identifier).digest('hex');
    if(await this.repo.countRecentAttempts('admin_login',h,15,false)>=5 || (ip&&await this.repo.countRecentAttemptsByIp('admin_login',ip,15,false)>=20))throw new HttpException('LOGIN_RATE_LIMITED',HttpStatus.TOO_MANY_REQUESTS);
    const a=await this.repo.findAdminAccount(identifier);const validPassword=this.auth.verifyPassword(password,a?.password_hash??null);const ok=!!a&&a.status==='active'&&validPassword;await this.repo.recordAttempt('admin_login',h,ok,ip);if(!ok)throw new UnauthorizedException('INVALID_CREDENTIALS');
    const preAuth=this.tokens.sign({typ:'admin_pre_auth',sub:a.account_id,exp:Date.now()+5*60*1000});return {pre_auth_token:preAuth,expires_in_seconds:300};
  }
  session(accountId:string,meta:{ip?:string;userAgent?:string}){return this.auth.createSession(accountId,'staff',meta);}
}
