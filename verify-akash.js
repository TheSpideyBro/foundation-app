// Check members/donations full history with created_at
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const get = async (table) => {
    const r = await fetch(`${URL2}/rest/v1/${table}?select=*`, { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
    return r.json();
  };
  console.log('members:', JSON.stringify((await get('members')).map(m => ({ name: m.name, created: m.created_at })), null, 1));
  console.log('donations:', JSON.stringify((await get('donations')).map(d => ({ amount: d.amount, receipt: d.receipt_no, created: d.created_at, member: (d.member_name || d.member_id || '').toString().slice(0, 30) })), null, 1));
})();
