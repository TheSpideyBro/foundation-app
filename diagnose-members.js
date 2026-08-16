// Diagnose why member insert violates RLS even as admin.
// 1. Check users table row for the admin account
// 2. Log in as the user, then try inserting a member with the anon key + JWT
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  // Step 1: users table content
  const h = { Authorization: 'Bearer ' + SRK, apikey: SRK };
  let res = await fetch(URL + '/rest/v1/users', { headers: h });
  const rows = await res.json();
  console.log('users table rows:', JSON.stringify(rows, null, 1).slice(0, 800));

  // Step 2: log in as the user to get a JWT
  res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: 'saddamakash4@gmail.com', password: 'ManusTest2026!' }),
  });
  const login = await res.json();
  if (!login.access_token) { console.log('login failed', JSON.stringify(login).slice(0, 200)); return; }
  console.log('login ok, token length:', login.access_token.length);

  // Step 3: check users row via anon+JWT (this is what the RLS policy sees)
  const jh = { Authorization: 'Bearer ' + login.access_token, apikey: ANON };
  res = await fetch(URL + '/rest/v1/users', { headers: jh });
  const mine = await res.json();
  console.log('users visible to JWT:', JSON.stringify(mine).slice(0, 400));

  // Step 4: try member insert with the JWT (simulate the app)
  res = await fetch(URL + '/rest/v1/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation', ...jh },
    body: JSON.stringify({ name: 'TestManusMember', phone: '01000000000', address: 'test', join_date: '2026-08-15', status: 'active', user_id: rows[0]?.id || login.user.id }),
  });
  const body = await res.text();
  console.log('member insert status:', res.status);
  console.log('body:', body.slice(0, 500));
})();
