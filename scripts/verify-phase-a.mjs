import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.error('PHASE_A_VERIFY_FAIL: DATABASE_URL is required for the live migration gate');
  process.exit(1);
}

for (let step = 1; step <= 28; step += 1) {
  const number = String(step).padStart(2, '0');
  const path = `docs/11-step-history/historical-verification/STEP-${number}-VERIFICATION.md`;
  if (!existsSync(path)) throw new Error(`missing Phase A evidence document: ${path}`);
  const text = readFileSync(path, 'utf8');
  if (!/Definition of Done/i.test(text)) throw new Error(`missing Definition of Done section: ${path}`);
  if (!/(final verdict|verdict)/i.test(text)) throw new Error(`missing verdict section: ${path}`);
}

run('pnpm', ['verify']);
run('pnpm', ['db:migrate']);
run(process.execPath, ['scripts/verify-phase-a-postgres.mjs']);
// A second migration pass proves the applied-lineage checksum guard and no-op replay path.
run('pnpm', ['db:migrate']);
run(process.execPath, ['scripts/verify-phase-a-postgres.mjs']);

console.log(JSON.stringify({
  status: 'PASS',
  gate: 'phase-a-steps-01-28',
  evidenceDocuments: 28,
  canonicalVerification: 'PASS',
  liveMigrationPasses: 2,
}, null, 2));

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`PHASE_A_VERIFY_FAIL: ${command} ${args.join(' ')} exited ${result.status}`);
    process.exit(result.status ?? 1);
  }
}
