import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=[];
walk('test');
const result=spawnSync(process.execPath,['--import','tsx','--test',...files],{stdio:'inherit'});
process.exit(result.status ?? 1);
function walk(dir){ for(const name of readdirSync(dir)){ const p=join(dir,name); if(statSync(p).isDirectory()) walk(p); else if(p.endsWith('.spec.ts')) files.push(p); } }
