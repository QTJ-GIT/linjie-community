// One-shot migration runner — delete after use
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://sauiiffziggisbzfenxe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdWlpZmZ6aWdnaXNiemZlbnhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU4MDkwNiwiZXhwIjoyMDk0MTU2OTA2fQ.KjsyNxDTtzg_rl-33PfGwe3Qt8DccLeVR_NHwj_mUTo';

const sql = readFileSync(join(__dirname, 'supabase/migrations/0016_teaching_resources.sql'), 'utf8');

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  // Try the pg endpoint
  console.log('rpc/ failed, trying pg endpoint...');
  const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text2 = await res2.text();
  console.log('pg/query status:', res2.status);
  console.log(text2);
} else {
  const text = await res.text();
  console.log('Success:', res.status);
  console.log(text);
}
