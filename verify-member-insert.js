// Verify member insert now succeeds as admin (anon key + JWT)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = 'c978f05b-a730-4a24-b2f3-7704230a1c9b';

(async () => {
  // 0. Check users visible to JWT now
  let res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: 'saddamakash4@gmail.com', password: 'ManusTest2026!' }),
  });
  const login = await res.json();
  const jh = { Authorization: 'Bearer ' + login.access_token, apikey: ANON };

  res = await fetch(URL + '/rest/v1/users', { headers: jh });
  console.log('select users as jwt:', res.status, (await res.text()).slice(0, 300));

  // 1. Insert a test member
  res = await fetch(URL + '/rest/v1/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation', ...jh },
    body: JSON.stringify({ name: 'TestManusMember', phone: '01000000000', address: 'Manus test', join_date: '2026-08-15', status: 'active', user_id: USER_ID }),
  });
  const body = await res.text();
  console.log('member insert:', res.status, body.slice(0, 400));

  // 2. Insert a test donation (verifies donations policies + receipt trigger)
  const member = JSON.parse(body)[0];
  if (member) {
    res = await fetch(URL + '/rest/v1/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation', ...jh },
      body: JSON.stringify({ member_id: member.id, amount: '500.00', date: '2026-08-15', method: 'cash', created_by: USER_ID }),
    });
    console.log('donation insert:', res.status, (await res.text()).slice(0, 300));
  }

  // 3. Clean up test records via service key
  await fetch(URL + '/rest/v1/members?name=eq.TestManusMember', { method: 'DELETE', headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  await fetch(URL + '/rest/v1/donations?received_by=eq.ManusTest', { method: 'DELETE', headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } }).catch(() => {});
  console.log('test records cleaned up');
})();
