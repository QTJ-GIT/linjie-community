#!/usr/bin/env node
/**
 * 数据库迁移脚本
 * 读取 supabase/migrations/ 下的所有 SQL 文件，通过 Supabase Management API 执行
 *
 * 使用方法：
 *   node scripts/apply-migrations.js
 *
 * 环境变量（从 .env.local 读取）：
 *   SUPABASE_ACCESS_TOKEN  - Supabase Management API Token
 *   NEXT_PUBLIC_SUPABASE_URL - 用于提取 project ref
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('错误：找不到 .env.local 文件');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

function extractRef(url) {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

async function runQuery(projectRef, token, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const env = loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;

  if (!token) {
    console.error('错误：.env.local 中缺少 SUPABASE_ACCESS_TOKEN');
    console.error('获取方式：Supabase Dashboard → Account Settings → Access Tokens');
    process.exit(1);
  }
  if (!url) {
    console.error('错误：.env.local 中缺少 NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  const projectRef = extractRef(url);
  if (!projectRef) {
    console.error('错误：无法从 URL 提取 project ref');
    process.exit(1);
  }

  const migrationsDir = path.resolve('supabase/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`找到 ${files.length} 个迁移文件\n`);

  for (const file of files) {
    const filepath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filepath, 'utf-8');
    process.stdout.write(`执行 ${file} ... `);
    try {
      await runQuery(projectRef, token, sql);
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`\n错误：${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n所有迁移执行完成！');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
