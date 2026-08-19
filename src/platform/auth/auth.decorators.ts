import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = Symbol('IS_PUBLIC');
export const REQUIRED_PERMISSIONS = Symbol('REQUIRED_PERMISSIONS');
export const STEP_UP_REQUIRED = Symbol('STEP_UP_REQUIRED');
export const IDEMPOTENCY_SCOPE = Symbol('IDEMPOTENCY_SCOPE');
export const REQUIRED_ACTOR_TYPES = Symbol('REQUIRED_ACTOR_TYPES');

export type ActorType = 'customer' | 'staff';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Permissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
export const RequireStepUp = () => SetMetadata(STEP_UP_REQUIRED, true);
export const RequireIdempotency = (scope: string) => SetMetadata(IDEMPOTENCY_SCOPE, scope);
export const ActorTypes = (...types: ActorType[]) => SetMetadata(REQUIRED_ACTOR_TYPES, types);
export const CustomerOnly = () => ActorTypes('customer');
export const StaffOnly = () => ActorTypes('staff');
