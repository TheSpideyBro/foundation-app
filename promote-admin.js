// Promote the new account to admin
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEW_ID = '1a78410b-a221-4c37-856b-08e43f97da93';

(async () => {
  const r = await fetch(URL2 + '/rest/v1/users?id=eq.' + NEW_ID, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', Authorization: 'Bearer ' + SRK, apikey: SRK },
    body: JSON.stringify({ role: 'admin' }),
  });
  console.log('role update:', r.status, (await r.text()).slice(0, 150));

  const r2 = await fetch(URL2 + '/rest/v1/users', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('users now:', JSON.stringify(await r2.json()).slice(0, 400));
})();
