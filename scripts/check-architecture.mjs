import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const violations = [];
const moduleFiles = filesUnder('src/modules');
for (const file of moduleFiles) {
  if (!file.endsWith('.ts')) continue;
  const text = readFileSync(file, 'utf8');
  if (file.includes('/domain/')) {
    for (const forbidden of ['@nestjs/', 'kysely', "from 'pg'", 'ioredis', '/infrastructure/']) {
      if (text.includes(forbidden)) violations.push(`${file}: domain imports forbidden dependency ${forbidden}`);
    }
    if (/\bany\b/.test(text)) violations.push(`${file}: domain layer must not use any`);
  }
  if (file.includes('/presentation/') && /platform\/database|kysely|from 'pg'/.test(text)) {
    violations.push(`${file}: presentation accesses database directly`);
  }
  const moduleMatch = file.match(/src\/modules\/([^/]+)\//);
  if (moduleMatch) {
    const owner = moduleMatch[1];
    const repoImports = [...text.matchAll(/from ['"]([^'"]*modules\/([^/]+)\/[^'"]*repository[^'"]*)['"]/g)];
    for (const match of repoImports) {
      if (match[2] !== owner) violations.push(`${file}: cross-module repository import ${match[1]}`);
    }
  }
}
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', rule_set: 'step31-architecture', files_scanned: moduleFiles.length }, null, 2));

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else out.push(path.replaceAll('\\', '/'));
  }
  return out;
}
