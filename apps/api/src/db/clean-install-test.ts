import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { migrate, safe, verify } from './runner.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
dotenv.config({ path: path.join(repoRoot, '.env') });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio.');
const baseUrl = new URL(process.env.DATABASE_URL);
const baseDatabaseName = baseUrl.pathname.slice(1);
const derivedUrl = (suffix: string) => {
  const value = new URL(baseUrl);
  value.pathname = `/${baseDatabaseName}${suffix}`;
  return value.toString();
};
const urls = [
  process.env.TEST_DATABASE_URL_1 || derivedUrl('_test_one'),
  process.env.TEST_DATABASE_URL_2 || derivedUrl('_test_two'),
];
if (process.env.DB_ALLOW_DESTRUCTIVE !== 'true') throw new Error('DB_ALLOW_DESTRUCTIVE=true es obligatorio.');

for (const connectionUrl of urls as string[]) {
  safe(connectionUrl, true);
  const url = new URL(connectionUrl);
  const databaseName = url.pathname.slice(1);
  url.pathname = '/postgres';
  const administrator = new Client({ connectionString: url.toString() });
  await administrator.connect();
  try {
    await administrator.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [databaseName]);
    const escapedName = databaseName.replaceAll('"', '""');
    await administrator.query(`DROP DATABASE IF EXISTS "${escapedName}"`);
    await administrator.query(`CREATE DATABASE "${escapedName}"`);
  } finally {
    await administrator.end();
  }
  await migrate(connectionUrl);
  await verify(connectionUrl);
}

console.log('Dos instalaciones limpias verificadas.');
