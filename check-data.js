// Verify actual DB contents after E2E runs (via service key, RLS bypass)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const get = async (table, params = '') => {
    const r = await fetch(`${URL2}/rest/v1/${table}${params}`, {
      headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
    });
    return r.json();
  };
  const members = await get('members');
  console.log('members:', JSON.stringify(members.map(m => ({ id: m.id.slice(0, 8), name: m.name })), null, 1));
  const donations = await get('donations');
  console.log('donations:', JSON.stringify(donations.map(d => ({ amount: d.amount, receipt: d.receipt_no, member: d.member_id?.slice(0, 8) })), null, 1));
  const expenses = await get('expenses');
  console.log('expenses:', JSON.stringify(expenses.map(e => ({ amount: e.amount, cat: e.category })), null, 1));
})();
