import {pathToFileURL} from 'node:url';
import {buildAudit,read,same,root} from './step56-final-audit.mjs';
export function validateFinalAudit(c){const errors=[];try{if(!same(c,buildAudit()))errors.push('Final audit does not match independent source union/manifests/authority');}catch(e){errors.push(e.message);}return errors;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const errors=validateFinalAudit(read(`${root}/step56-final-audit.json`));if(errors.length)throw Error(errors.join('\n'));console.log('Step56-H final semantic audit: PASS; runtime release remains blocked');}
