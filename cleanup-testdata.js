// Clean up E2E test data from DB (service key) — run once after tests pass
require('dotenv').config({ path: './.env.local' });
(async () => {
  const K = {
    Authorization: 'Bearer ' + process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY,
    apikey: process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
  const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const del = async (table, filter) => {
    const r = await fetch(`${U}/rest/v1/${table}?${filter}`, { method: 'DELETE', headers: K });
    console.log(`${table} delete (${filter.slice(0, 40)}): ${r.status}`);
  };
  await del('members', "name=like.E2ETest%25");
  await del('members', "name=eq.MarkerTest");
  await del('members', "name=eq.MarkerTest2");
  await del('members', "name=eq.E2ETest%20Donor");
  await del('members', "name=like.E2ETest%25Donor%25");
  await del('donations', "amount=eq.1500");
  await del('expenses', "amount=eq.500");
  await del('expenses', "category=eq.চিকিৎসা");
  // final state
  for (const t of ['members', 'donations', 'expenses']) {
    const r = await fetch(`${U}/rest/v1/${t}`, { headers: K });
    const data = await r.json();
    console.log(`${t}: ${data.length} rows`, JSON.stringify(data.slice(0, 2)));
  }
})();
