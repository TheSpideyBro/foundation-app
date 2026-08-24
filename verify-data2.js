// Re-check all tables with raw rows
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  for (const t of ['members', 'donations', 'expenses']) {
    const r = await fetch(`${URL2}/rest/v1/${t}?select=*`, { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
    const rows = await r.json();
    console.log('=== ' + t + ' (' + rows.length + ' rows) ===');
    console.log(JSON.stringify(rows, null, 1));
  }
})();
