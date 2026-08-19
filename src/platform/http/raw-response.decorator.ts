import { SetMetadata } from '@nestjs/common';
export const RAW_RESPONSE = Symbol('RAW_RESPONSE');
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);
