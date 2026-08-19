import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateAuthenticationOptions,generateRegistrationOptions,verifyAuthenticationResponse,verifyRegistrationResponse } from '@simplewebauthn/server';
import { IdentityRepository } from '../infrastructure/identity.repository';
import { SessionToken } from '../domain/session-token';
import { randomBytes } from 'node:crypto';
import { AuditEntry } from '../../../platform/audit/audit.writer';
import { RequestContextStore } from '../../../platform/request-context/request-context.store';

@Injectable()
export class WebAuthnService {
  constructor(private readonly repo:IdentityRepository,private readonly config:ConfigService,private readonly context:RequestContextStore){}
  private audit(action:string,accountId:string):AuditEntry{const c=this.context.get();return {actorType:c?.actor.type??'system',actorId:c?.actor.id,action,resourceType:'account',resourceId:accountId,requestId:c?.requestId,traceId:c?.traceId};}
  private rpID(){return this.config.getOrThrow<string>('WEBAUTHN_RP_ID');} private origin(){return this.config.getOrThrow<string>('WEBAUTHN_ORIGIN');}
  async credentialCount(accountId:string){return (await this.repo.listCredentials(accountId)).length;}
  validateEnrollmentToken(accountId:string,raw:string){return this.repo.validateEnrollmentToken(accountId,SessionToken.hash(raw));}
  async challengeMode(challengeId:string,accountId:string):Promise<'registration'|'authentication'>{const r=await this.repo.peekChallenge(challengeId,accountId);if(!r)throw new UnauthorizedException('FIDO2_CHALLENGE_INVALID');return r.challenge_type==='webauthn_register'?'registration':'authentication';}
  listCredentials(accountId:string){return this.repo.listCredentialSummaries(accountId);} revokeCredential(accountId:string,id:string){return this.repo.revokeCredential(accountId,id,this.audit('security.fido.credential_revoke',accountId));}
  async resetEnrollmentForStaff(staffId:string,expectedVersion:number,audit:AuditEntry){const token=randomBytes(32).toString('base64url');const accountId=await this.repo.resetFidoEnrollmentForStaff(staffId,SessionToken.hash(token),expectedVersion,audit);if(!accountId)throw new UnauthorizedException('STAFF_NOT_FOUND');return {account_id:accountId,fido_enrollment_token:token,expires_in_seconds:1800};}
  async authenticationChallenge(accountId:string,type:'webauthn_auth'|'step_up'='webauthn_auth'){
    const creds=await this.repo.listCredentials(accountId);if(creds.length===0)throw new UnauthorizedException('FIDO2_CREDENTIAL_REQUIRED');
    const options=await generateAuthenticationOptions({rpID:this.rpID(),userVerification:'required',allowCredentials:creds.map(c=>({id:c.credential_id,transports:c.transports}))});
    const challengeId=await this.repo.createChallenge({accountId,type,challenge:options.challenge,context:{credentialIds:creds.map(c=>c.credential_id)},expiresAt:new Date(Date.now()+120000)});return {challenge_id:challengeId,options};
  }
  async verifyAuthentication(challengeId:string,response:any,type:'webauthn_auth'|'step_up',expectedAccountId:string){
    const ch=await this.repo.getChallenge(challengeId,type,expectedAccountId);if(!ch)throw new UnauthorizedException('FIDO2_CHALLENGE_INVALID');const creds=await this.repo.listCredentials(expectedAccountId);const cred=creds.find(c=>c.credential_id===response.id);if(!cred)throw new UnauthorizedException('FIDO2_CREDENTIAL_UNKNOWN');
    let result:any;try{result=await verifyAuthenticationResponse({response,expectedChallenge:ch.challenge,expectedOrigin:this.origin(),expectedRPID:this.rpID(),credential:{id:cred.credential_id,publicKey:new Uint8Array(cred.public_key),counter:Number(cred.sign_count),transports:cred.transports},requireUserVerification:true});}catch{throw new UnauthorizedException('FIDO2_VERIFICATION_FAILED');}if(!result.verified)throw new UnauthorizedException('FIDO2_VERIFICATION_FAILED');
    const committed=await this.repo.finalizeAuthentication({challengeId,type,accountId:expectedAccountId,credentialRowId:cred.id,newCounter:result.authenticationInfo.newCounter});if(!committed)throw new UnauthorizedException('FIDO2_CHALLENGE_ALREADY_USED');return {account_id:expectedAccountId};
  }
  async registrationChallenge(accountId:string,userName:string,displayName:string,initialEnrollment=false){
    const existing=await this.repo.listCredentials(accountId);const options=await generateRegistrationOptions({rpName:'EQCOFE',rpID:this.rpID(),userID:new TextEncoder().encode(accountId),userName,userDisplayName:displayName,attestationType:'none',excludeCredentials:existing.map(c=>({id:c.credential_id,transports:c.transports})),authenticatorSelection:{authenticatorAttachment:'cross-platform',residentKey:'discouraged',userVerification:'required'}});
    const challengeId=await this.repo.createChallenge({accountId,type:'webauthn_register',challenge:options.challenge,context:{initialEnrollment},expiresAt:new Date(Date.now()+120000)});return {challenge_id:challengeId,options};
  }
  async verifyRegistration(challengeId:string,response:any,deviceName:string,expectedAccountId:string){
    deviceName=String(deviceName??'Security key').trim().slice(0,150)||'Security key';const ch=await this.repo.getChallenge(challengeId,'webauthn_register',expectedAccountId);if(!ch)throw new UnauthorizedException('FIDO2_CHALLENGE_INVALID');let result:any;try{result=await verifyRegistrationResponse({response,expectedChallenge:ch.challenge,expectedOrigin:this.origin(),expectedRPID:this.rpID(),requireUserVerification:true});}catch{throw new UnauthorizedException('FIDO2_REGISTRATION_FAILED');}if(!result.verified||!result.registrationInfo)throw new UnauthorizedException('FIDO2_REGISTRATION_FAILED');const c=result.registrationInfo.credential;
    const ok=await this.repo.finalizeRegistration({challengeId,accountId:expectedAccountId,credentialId:c.id,publicKey:c.publicKey,counter:c.counter,deviceName,transports:c.transports??[],webauthnUserId:Buffer.from(new TextEncoder().encode(expectedAccountId)).toString('base64url'),deviceType:result.registrationInfo.credentialDeviceType,backedUp:result.registrationInfo.credentialBackedUp,consumeEnrollment:!!ch.context?.initialEnrollment,audit:this.audit(ch.context?.initialEnrollment?'security.fido.initial_enrollment':'security.fido.credential_register',expectedAccountId)});if(!ok)throw new UnauthorizedException('FIDO2_CHALLENGE_ALREADY_USED');return {registered:true};
  }
}
