import { Global,Module } from '@nestjs/common';
import { RequestContextModule } from '../request-context/request-context.module';
import { ScopePolicy } from './scope-policy';
@Global() @Module({imports:[RequestContextModule],providers:[ScopePolicy],exports:[ScopePolicy,RequestContextModule]})
export class AuthorizationPolicyModule{}
