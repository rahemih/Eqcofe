import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SessionGuard } from './session.guard';
import { ActorTypeGuard } from './actor-type.guard';
import { PermissionsGuard } from './permissions.guard';
import { StepUpGuard } from './step-up.guard';
import { OriginGuard } from './origin.guard';
import { SignedTokenService } from './signed-token.service';
import { AuthorizationPolicyModule } from './authorization-policy.module';

@Global()
@Module({
  imports:[AuthorizationPolicyModule],
  providers:[
    SignedTokenService,
    {provide:APP_GUARD,useClass:OriginGuard},
    {provide:APP_GUARD,useClass:SessionGuard},
    {provide:APP_GUARD,useClass:ActorTypeGuard},
    {provide:APP_GUARD,useClass:PermissionsGuard},
    {provide:APP_GUARD,useClass:StepUpGuard},
  ],
  exports:[SignedTokenService,AuthorizationPolicyModule],
})
export class AuthPlatformModule {}
