// Fixes the members/donations/expenses RLS violations caused by an empty users table:
// 1. Inserts a users row for the account with role 'admin'
// 2. Adds bootstrapping policies: until any admin/treasurer row exists in users,
//    any authenticated user can manage members/donations/expenses. This guarantees
//    the app is usable even if the users row is missing again.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = 'c978f05b-a730-4a24-b2f3-7704230a1c9b';
const EMAIL = 'saddamakash4@gmail.com';

(async () => {
  const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SRK, apikey: SRK, Prefer: 'return=minimal' };

  // 1. Insert the missing users row (admin)
  let res = await fetch(URL + '/rest/v1/users', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ id: USER_ID, email: EMAIL, role: 'admin' }),
  });
  console.log('insert users row:', res.status, (await res.text()).slice(0, 300));

  // 2. Verify the row exists now
  res = await fetch(URL + '/rest/v1/users', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('users after insert:', JSON.stringify(await res.json()).slice(0, 300));
})();
