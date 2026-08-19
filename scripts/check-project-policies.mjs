import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const violations = [];
for (const file of filesUnder('src').concat(filesUnder('apps'))) {
  if (!file.endsWith('.ts')) continue;
  const text = readFileSync(file, 'utf8');
  if (/\b[a-zA-Z0-9_]*_irr\b/.test(text)) violations.push(`${file}: legacy _irr money field`);
  if (/\bwallet\b/i.test(text)) violations.push(`${file}: wallet concept is forbidden`);
  if (text.includes('process.env') && !file.includes('/platform/config/')) violations.push(`${file}: direct process.env outside config boundary`);
}
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', policy_set: 'toman-no-wallet-config-boundary' }, null, 2));

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else out.push(path.replaceAll('\\', '/'));
  }
  return out;
}
