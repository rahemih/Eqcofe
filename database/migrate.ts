import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool, PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: databaseUrl, application_name: 'eqcofe-migrator' });
const migrationDir = resolve(process.cwd(), 'database/migrations');

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('eqcofe_schema_migrations'))");
    await bootstrap(client);
    const files = (await readdir(migrationDir)).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
    for (const file of files) {
      const sql = await readFile(resolve(migrationDir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const current = await client.query<{ checksum_sha256: string }>('SELECT checksum_sha256 FROM core.schema_migrations WHERE version=$1', [file]);
      if (current.rowCount) {
        if (current.rows[0]?.checksum_sha256 !== checksum) throw new Error(`Applied migration changed: ${file}`);
        continue;
      }
      const noTransaction = sql.split(/\r?\n/, 1)[0]?.includes('eqcofe:no-transaction') ?? false;
      if (!noTransaction) await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO core.schema_migrations(version, checksum_sha256) VALUES ($1,$2)', [file, checksum]);
        if (!noTransaction) await client.query('COMMIT');
        console.log(`applied ${file}`);
      } catch (error) {
        if (!noTransaction) await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('eqcofe_schema_migrations'))").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

async function bootstrap(client: PoolClient): Promise<void> {
  await client.query('CREATE SCHEMA IF NOT EXISTS core');
  await client.query(`CREATE TABLE IF NOT EXISTS core.schema_migrations (
    version text PRIMARY KEY, checksum_sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
}

void main();
