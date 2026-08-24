// Deeper diagnosis: try several member insert variants and reads to pinpoint the blocking policy
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = 'c978f05b-a730-4a24-b2f3-7704230a1c9b';

(async () => {
  const res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: 'saddamakash4@gmail.com', password: 'ManusTest2026!' }),
  });
  const login = await res.json();
  const jh = { Authorization: 'Bearer ' + login.access_token, apikey: ANON };

  // Can the JWT user even SELECT from users? (policy users_select_own)
  let r = await fetch(URL + '/rest/v1/users', { headers: jh });
  console.log('select users as jwt:', r.status, (await r.text()).slice(0, 300));

  // Can the JWT user SELECT members (empty is fine)?
  r = await fetch(URL + '/rest/v1/members', { headers: jh });
  console.log('select members as jwt:', r.status, (await r.text()).slice(0, 200));

  // Variant A: insert without user_id
  r = await fetch(URL + '/rest/v1/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', ...jh },
    body: JSON.stringify({ name: 'ManusTestA', join_date: '2026-08-15', status: 'active' }),
  });
  console.log('insert without user_id:', r.status, (await r.text()).slice(0, 200));

  // Variant B: insert with user_id
  r = await fetch(URL + '/rest/v1/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', ...jh },
    body: JSON.stringify({ name: 'ManusTestB', join_date: '2026-08-15', status: 'active', user_id: USER_ID }),
  });
  console.log('insert with user_id:', r.status, (await r.text()).slice(0, 200));
})();
