import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationDirectory = 'database/migrations';
const bridgeName = '0053a_admin_permission_sensitive_risk.sql';

test('Step 52 A3 orders the forward-only permission-risk bridge before sensitive grants', () => {
  const files = fs.readdirSync(migrationDirectory).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  const bridge = files.indexOf(bridgeName);
  const pos = files.indexOf('0054_pos_rbac_audit_api.sql');
  const excel = files.indexOf('0057_excel_rbac_audit_api.sql');

  assert.notEqual(bridge, -1);
  assert.equal(bridge > files.indexOf('0053_pos_offline_reconciliation.sql'), true);
  assert.equal(bridge < pos, true);
  assert.equal(pos < excel, true);
});

test('Step 52 A3 expands only the admin permission risk constraint', () => {
  const sql = fs.readFileSync(`${migrationDirectory}/${bridgeName}`, 'utf8');

  assert.match(sql, /ALTER TABLE admin\.permissions/);
  assert.match(sql, /DROP CONSTRAINT IF EXISTS permissions_risk_level_check/);
  assert.match(sql, /CHECK \(risk_level IN \('low', 'normal', 'high', 'sensitive', 'critical'\)\)/);
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  assert.doesNotMatch(sql, /ALTER TABLE (?!admin\.permissions)/i);
});

test('Step 52 A3 preserves the sensitive permission declarations that exposed the clean-lineage gap', () => {
  const pos = fs.readFileSync(`${migrationDirectory}/0054_pos_rbac_audit_api.sql`, 'utf8');
  const excel = fs.readFileSync(`${migrationDirectory}/0057_excel_rbac_audit_api.sql`, 'utf8');

  assert.match(pos, /'pos\.sell'.*'sensitive'/s);
  assert.match(pos, /'pos\.reconcile'.*'sensitive'/s);
  assert.match(excel, /'excel\.import'.*'sensitive'/s);
});
