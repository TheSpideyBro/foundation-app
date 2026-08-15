require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = 'c978f05b-a730-4a24-b2f3-7704230a1c9b';

(async () => {
  const res = await fetch(URL + '/auth/v1/admin/users/' + USER_ID, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SRK, apikey: SRK },
    body: JSON.stringify({ password: 'ManusTest2026!' }),
  });
  const body = await res.text();
  console.log('reset status:', res.status, body.slice(0, 300));
})();
