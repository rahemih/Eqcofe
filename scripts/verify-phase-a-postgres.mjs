import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('PHASE_A_POSTGRES_FAIL: DATABASE_URL is required');
  process.exit(1);
}

const migrationDir = resolve(process.cwd(), 'database/migrations');
const files = (await readdir(migrationDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
const expected = new Map();
for (const file of files) {
  const sql = await readFile(resolve(migrationDir, file), 'utf8');
  expected.set(file, createHash('sha256').update(sql).digest('hex'));
}

const pool = new Pool({ connectionString: databaseUrl, application_name: 'eqcofe-phase-a-verifier' });
try {
  const migrations = await pool.query(
    'SELECT version, checksum_sha256 FROM core.schema_migrations ORDER BY version',
  );
  if (migrations.rowCount !== files.length) {
    throw new Error(`migration count mismatch: db=${migrations.rowCount} source=${files.length}`);
  }

  for (const row of migrations.rows) {
    const sourceChecksum = expected.get(row.version);
    if (!sourceChecksum) throw new Error(`unexpected applied migration: ${row.version}`);
    if (sourceChecksum !== row.checksum_sha256) {
      throw new Error(`checksum mismatch: ${row.version}`);
    }
  }

  for (const file of files) {
    if (!migrations.rows.some((row) => row.version === file)) {
      throw new Error(`missing applied migration: ${file}`);
    }
  }

  const constraints = await pool.query(`
    SELECT c.conname, n.nspname
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE NOT c.convalidated
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  `);
  if (constraints.rowCount !== 0) {
    throw new Error(`unvalidated constraints: ${constraints.rows.map((r) => `${r.nspname}.${r.conname}`).join(', ')}`);
  }

  const indexes = await pool.query(`
    SELECT idx.relname AS index_name, n.nspname
    FROM pg_index i
    JOIN pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_class tbl ON tbl.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = tbl.relnamespace
    WHERE NOT i.indisvalid
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  `);
  if (indexes.rowCount !== 0) {
    throw new Error(`invalid indexes: ${indexes.rows.map((r) => `${r.nspname}.${r.index_name}`).join(', ')}`);
  }

  console.log(JSON.stringify({
    status: 'PASS',
    gate: 'phase-a-postgres-integrity',
    migrations: files.length,
    checksums: migrations.rowCount,
    unvalidatedConstraints: constraints.rowCount,
    invalidIndexes: indexes.rowCount,
  }, null, 2));
} catch (error) {
  console.error('PHASE_A_POSTGRES_FAIL:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
