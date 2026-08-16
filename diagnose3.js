// Check users table policies indirectly: can JWT insert into users? (users_insert_self)
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

  // Try inserting a duplicate-ish row into users as the JWT user
  let r = await fetch(URL + '/rest/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', ...jh },
    body: JSON.stringify({ id: USER_ID, email: 'saddamakash4@gmail.com', role: 'admin' }),
  });
  console.log('jwt insert into users:', r.status, (await r.text()).slice(0, 200));

  // Service-key select with explicit select=*
  r = await fetch(URL + '/rest/v1/users?select=*', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('srk select users:', r.status, (await r.text()).slice(0, 300));

  // Try JWT update on the users row
  r = await fetch(URL + '/rest/v1/users?id=eq.' + USER_ID, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', ...jh },
    body: JSON.stringify({ role: 'admin' }),
  });
  console.log('jwt update users:', r.status, (await r.text()).slice(0, 200));
})();
