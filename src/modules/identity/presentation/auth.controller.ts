import { Body, Controller, Get, Param, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerOnly, Permissions, Public, RequireStepUp, StaffOnly } from '../../../platform/auth/auth.decorators';
import { AuthService } from '../application/auth.service';
import { AdminAuthService } from '../application/admin-auth.service';
import { AdminSecurityService } from '../application/admin-security.service';
import { WebAuthnService } from '../application/webauthn.service';
import { SignedTokenService } from '../../../platform/auth/signed-token.service';
function meta(req:any){return {ip:req.ip,userAgent:req.headers?.['user-agent']};}
function cookieGet(req:any,name:string):string|undefined{for(const p of String(req.headers?.cookie??'').split(';')){const [k,...v]=p.trim().split('=');if(k===name)return decodeURIComponent(v.join('='));}}
function cookieAppend(res:any,value:string){const prev=res.getHeader?.('Set-Cookie');res.header('Set-Cookie',prev?[...(Array.isArray(prev)?prev:[prev]),value]:value);}
function authResponse(b:any){return {id:b.credential_id,rawId:b.credential_id,type:'public-key',response:{clientDataJSON:b.client_data_json,authenticatorData:b.authenticator_data,signature:b.signature,userHandle:b.user_handle??null},clientExtensionResults:{}};}
function registrationResponse(b:any){return {id:b.credential_id,rawId:b.credential_id,type:'public-key',response:{clientDataJSON:b.client_data_json,attestationObject:b.attestation_object,transports:b.transports??[]},clientExtensionResults:{}};}
@Controller()
export class AuthController {
  constructor(private readonly auth:AuthService,private readonly admin:AdminAuthService,private readonly security:AdminSecurityService,private readonly webauthn:WebAuthnService,private readonly tokens:SignedTokenService,private readonly config:ConfigService){}
  private cookieName(kind:'customer'|'admin'|'preauth'){const secure=this.config.get<boolean>('COOKIE_SECURE',false);const base=kind==='customer'?'eqcofe_session':kind==='admin'?'eqcofe_admin_session':'eqcofe_admin_pre_auth';return secure?`__Host-${base}`:base;}
  private cookieSet(res:any,name:string,token:string,expires:Date,sameSite:'Lax'|'Strict'){const secure=this.config.get<boolean>('COOKIE_SECURE',false);cookieAppend(res,`${name}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=${sameSite}; Expires=${expires.toUTCString()}`);}
  private cookieClear(res:any,name:string,sameSite:'Lax'|'Strict'){const secure=this.config.get<boolean>('COOKIE_SECURE',false);cookieAppend(res,`${name}=; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=${sameSite}; Max-Age=0`);}
  private preAuth(req:any){return cookieGet(req,this.cookieName('preauth'))??cookieGet(req,'eqcofe_admin_pre_auth')??cookieGet(req,'__Host-eqcofe_admin_pre_auth');}

  @Public() @Post('auth/otp/request') requestOtp(@Body() b:{mobile:string},@Req() req:any){return this.auth.requestOtp(b.mobile,req.ip);}
  @Public() @Post('auth/otp/verify') async verifyOtp(@Body() b:{challenge_id:string;code:string},@Req() req:any,@Res({passthrough:true}) res:any){const s=await this.auth.verifyOtp(b.challenge_id,b.code,meta(req));this.cookieSet(res,this.cookieName('customer'),s.session_token,s.expires_at,'Lax');return {session_id:s.session_id,expires_at:s.expires_at};}
  @CustomerOnly() @Post('auth/logout') async logout(@Req() req:any,@Res({passthrough:true}) res:any){await this.auth.logout(req.actor.sessionId);this.cookieClear(res,this.cookieName('customer'),'Lax');return {logged_out:true};}
  @CustomerOnly() @Post('auth/logout-all') async logoutAll(@Req() req:any,@Res({passthrough:true}) res:any){await this.auth.logoutAll(req.actor.accountId);this.cookieClear(res,this.cookieName('customer'),'Lax');return {logged_out:true};}
  @CustomerOnly() @Get('auth/session') session(@Req() req:any){return {actor:req.actor};}

  @Public() @Post('admin/auth/login') async adminLogin(@Body() b:{username:string;password:string},@Req() req:any,@Res({passthrough:true}) res:any){const r=await this.admin.begin(b.username,b.password,req.ip);this.cookieSet(res,this.cookieName('preauth'),r.pre_auth_token,new Date(Date.now()+r.expires_in_seconds*1000),'Strict');return {fido_required:true,expires_in_seconds:r.expires_in_seconds};}
  @Public() @Post('admin/auth/fido/challenge') async adminFidoChallenge(@Body() b:{enrollment_token?:string},@Req() req:any){const p=this.tokens.verify(this.preAuth(req)??'','admin_pre_auth');if(!p)throw new UnauthorizedException('ADMIN_PRE_AUTH_REQUIRED');const creds=await this.webauthn.credentialCount(p.sub);if(creds===0){if(!b?.enrollment_token||!(await this.webauthn.validateEnrollmentToken(p.sub,b.enrollment_token)))throw new UnauthorizedException('FIDO2_ENROLLMENT_TOKEN_REQUIRED');return {mode:'registration',...(await this.webauthn.registrationChallenge(p.sub,p.sub,'EQCOFE Admin',true))};}return {mode:'authentication',...(await this.webauthn.authenticationChallenge(p.sub,'webauthn_auth'))};}
  @Public() @Post('admin/auth/fido/verify') async adminFidoVerify(@Body() b:any,@Req() req:any,@Res({passthrough:true}) res:any){const p=this.tokens.verify(this.preAuth(req)??'','admin_pre_auth');if(!p)throw new UnauthorizedException('ADMIN_PRE_AUTH_REQUIRED');const mode=await this.webauthn.challengeMode(b.challenge_id,p.sub);if(mode==='registration'){if(!b.attestation_object)throw new UnauthorizedException('FIDO2_REGISTRATION_RESPONSE_REQUIRED');await this.webauthn.verifyRegistration(b.challenge_id,registrationResponse(b),b.device_name??'Security key',p.sub);}else await this.webauthn.verifyAuthentication(b.challenge_id,authResponse(b),'webauthn_auth',p.sub);const s=await this.admin.session(p.sub,meta(req));this.cookieSet(res,this.cookieName('admin'),s.session_token,s.expires_at,'Strict');this.cookieClear(res,this.cookieName('preauth'),'Strict');return {session_id:s.session_id,expires_at:s.expires_at};}

  @StaffOnly() @Post('admin/auth/step-up/challenge') stepUp(@Req() req:any){return this.webauthn.authenticationChallenge(req.actor.accountId,'step_up');}
  @StaffOnly() @Post('admin/auth/step-up/verify') async verifyStepUp(@Body() b:any,@Req() req:any){const r=await this.webauthn.verifyAuthentication(b.challenge_id,authResponse(b),'step_up',req.actor.accountId);return {step_up_token:this.tokens.sign({typ:'step_up',sub:r.account_id,sid:req.actor.sessionId,exp:Date.now()+5*60*1000})};}
  @StaffOnly() @Get('admin/me') me(@Req() req:any){return {id:req.actor.id,account_id:req.actor.accountId,type:req.actor.type};}
  @StaffOnly() @Get('admin/me/permissions') mePermissions(@Req() req:any){return {permissions:req.actor.permissions??[]};}
  @StaffOnly() @Get('admin/me/scopes') meScopes(@Req() req:any){return {scopes:req.actor.scopes??[]};}
  @StaffOnly() @Get('admin/security/sessions') @Permissions('security.sessions.manage') sessions(){return this.security.listSessions();}
  @StaffOnly() @Post('admin/security/sessions/:id/revoke') @Permissions('security.sessions.manage') @RequireStepUp() async revokeSessionById(@Param('id') id:string,@Body() b:{reason?:string}){await this.security.revokeSession(id,b?.reason);return {revoked:true};}
  @StaffOnly() @Post('admin/security/users/:id/revoke-sessions') @Permissions('security.sessions.manage') @RequireStepUp() async revokeUserSessions(@Param('id') id:string,@Body() b:{reason?:string}){await this.security.revokeStaffSessions(id,b?.reason);return {revoked:true};}
  @StaffOnly() @Post('admin/security/users/:id/lock') @Permissions('security.sessions.manage') @RequireStepUp() async lockUser(@Param('id') id:string,@Body() b:{reason?:string}){await this.security.setStaffLock(id,true,b?.reason);return {locked:true};}
  @StaffOnly() @Post('admin/security/users/:id/unlock') @Permissions('security.sessions.manage') @RequireStepUp() async unlockUser(@Param('id') id:string,@Body() b:{reason?:string}){await this.security.setStaffLock(id,false,b?.reason);return {unlocked:true};}
  @StaffOnly() @Get('admin/auth/fido/credentials') credentials(@Req() req:any){return this.webauthn.listCredentials(req.actor.accountId);}
  @StaffOnly() @Post('admin/auth/fido/credentials/register/challenge') @RequireStepUp() addCredentialChallenge(@Req() req:any){return this.webauthn.registrationChallenge(req.actor.accountId,req.actor.accountId,'EQCOFE Admin',false);}
  @StaffOnly() @Post('admin/auth/fido/credentials/register/verify') @RequireStepUp() async addCredentialVerify(@Body() b:any,@Req() req:any){return this.webauthn.verifyRegistration(b.challenge_id,registrationResponse(b),b.device_name??'Security key',req.actor.accountId);}
  @StaffOnly() @Post('admin/auth/fido/credentials/:id/revoke') @RequireStepUp() async revokeCredential(@Param('id') id:string,@Req() req:any){await this.webauthn.revokeCredential(req.actor.accountId,id);return {revoked:true};}
  @StaffOnly() @Post('admin/auth/logout') async adminLogout(@Req() req:any,@Res({passthrough:true}) res:any){await this.auth.logout(req.actor.sessionId);this.cookieClear(res,this.cookieName('admin'),'Strict');return {logged_out:true};}
  @StaffOnly() @Get('admin/auth/session') adminSession(@Req() req:any){return {actor:req.actor};}
}
