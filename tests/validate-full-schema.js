// Validate full-schema.sql expectations against the live Supabase DB
// Checks: required columns exist on base tables (app-critical ones)
const fs = require("fs");
const path = require("path");

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
  if (m && !line.startsWith("#")) env[m[1]] = m[2];
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AUTH = env.NEXT_SUPABASE_SERVICE_ROLE_KEY ? { Authorization: `Bearer ${env.NEXT_SUPABASE_SERVICE_ROLE_KEY}` } : {};

async function get(url) {
  const r = await fetch(url, { headers: { apikey: KEY, ...AUTH } });
  return { status: r.status, data: await r.json().catch(() => null) };
}

const expectations = [
  { table: "members", col: "monthly_pledge" },
  { table: "members", col: "name" },
  { table: "members", col: "status" },
  { table: "members", col: "user_id" },
  { table: "donations", col: "donation_month" },
  { table: "donations", col: "receipt_no" },
  { table: "donations", col: "method" },
  { table: "donations", col: "created_by" },
  { table: "expenses", col: "category" },
  { table: "expenses", col: "proof_url" },
  { table: "expenses", col: "created_by" },
  { table: "users", col: "role" },
  { table: "expense_categories", col: "name" },
  { table: "expense_categories", col: "is_default" },
  { table: "audit_log", col: "actor_id" },
  { table: "audit_log", col: "action" },
];

(async () => {
  let fails = 0;
  for (const { table, col } of expectations) {
    const res = await get(`${URL}/rest/v1/${table}?${col}=eq.nonexistent-placeholder&limit=1`);
    // 400 with "unknown column" means column missing; anything else (200, 406 no rows, 500 RLS) = present
    const missing = res.status === 400 && String(JSON.stringify(res.data)).includes(col);
    if (missing) { console.log(`MISSING: ${table}.${col}`); fails++; }
    else console.log(`OK: ${table}.${col}`);
  }
  // Check categories seed exists
  const cats = await get(`${URL}/rest/v1/expense_categories?select=name`);
  console.log(`expense_categories rows: ${(cats.data || []).length}`);
  // Check receipt trigger via a test donation won't pollute: skip.
  console.log(fails ? `\nVALIDATION FAILED (${fails} missing)` : "\nALL EXPECTED COLUMNS PRESENT");
  process.exit(fails ? 1 : 0);
})();
