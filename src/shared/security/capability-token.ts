import { createHash, randomBytes } from 'node:crypto';

export const hashCapabilityToken=(value:string)=>createHash('sha256').update(value).digest('hex');
export const newCapabilityToken=()=>randomBytes(32).toString('base64url');
