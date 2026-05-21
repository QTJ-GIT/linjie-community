// Migration runner — uses pg to execute 0016_teaching_resources.sql
// Usage: node run_migration.cjs
// Or:    SUPABASE_DB_PASSWORD=xxx node run_migration.cjs

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
function readEnv() {
  const envPath = path.join(__dirname, '.env.local');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = readEnv();
const dbPassword = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.error('ERROR: SUPABASE_DB_PASSWORD is not set.');
  console.error('Find it at: Supabase Dashboard > Settings > Database > Database password');
  console.error('Then add it to .env.local:  SUPABASE_DB_PASSWORD=your_password');
  console.error('Or run:  SUPABASE_DB_PASSWORD=your_password node run_migration.cjs');
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, 'supabase/migrations/0016_teaching_resources.sql'),
  'utf8'
);

const client = new Client({
  host: 'db.sauiiffziggisbzfenxe.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected. Running migration...');
    await client.query(sql);
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
