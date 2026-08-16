// Set up new admin account: saddamakash234@gmail.com / 123456
// 1. Create auth user via Admin API (service key) with email_confirmed
// 2. Ensure users table row with role = 'admin'
// 3. Verify login works
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = 'saddamakash234@gmail.com';
const PW = '123456';

(async () => {
  const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SRK, apikey: SRK };

  // 1. Create auth user (auto-confirm email)
  let res = await fetch(URL + '/auth/v1/admin/users', {
    method: 'POST', headers: h,
    body: JSON.stringify({ email: EMAIL, password: PW, email_confirm: true }),
  });
  const body = await res.text();
  console.log('create auth user:', res.status, body.slice(0, 300));
  let newId = null;
  try { newId = JSON.parse(body).id; } catch {}
  if (!newId) {
    // user may already exist — fetch
    res = await fetch(URL + '/auth/v1/admin/users?email=' + encodeURIComponent(EMAIL), { headers: h });
    const list = await res.json();
    newId = list.users?.[0]?.id;
    console.log('existing auth user id:', newId);
  }
  if (!newId) { console.log('ABORT: no user id'); return; }

  // 2. Ensure users row (upsert via service key)
  res = await fetch(URL + '/rest/v1/users', {
    method: 'POST', headers: { ...h, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ id: newId, email: EMAIL, role: 'admin' }),
  });
  console.log('upsert users row:', res.status, (await res.text()).slice(0, 200));

  // 3. Verify
  res = await fetch(URL + '/rest/v1/users', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('users table now:', JSON.stringify(await res.json()).slice(0, 500));

  // 4. Test login
  res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  const tok = await res.json();
  console.log('login with new admin:', res.status, tok.access_token ? 'token ok' : JSON.stringify(tok).slice(0, 200));

  // 5. Test members insert as new admin
  const jh = { Authorization: 'Bearer ' + tok.access_token, apikey: ANON };
  res = await fetch(URL + '/rest/v1/members', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation', ...jh },
    body: JSON.stringify({ name: 'NewAdminTest', phone: '01888888888', join_date: '2026-08-15', status: 'active', user_id: newId }),
  });
  console.log('member insert as new admin:', res.status, (await res.text()).slice(0, 200));

  // Cleanup
  await fetch(URL + '/rest/v1/members?name=eq.NewAdminTest', { method: 'DELETE', headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('cleanup done');
})();
