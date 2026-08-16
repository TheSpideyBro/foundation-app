// Diagnose members_user_id_fkey violation
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  // 1. users table via service key
  let res = await fetch(URL + '/rest/v1/users', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('users table (srk):', JSON.stringify(await res.json()).slice(0, 500));

  // 2. auth user id via service key
  res = await fetch(URL + '/auth/v1/admin/users?per_page=5', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const users = await res.json();
  if (Array.isArray(users)) {
    for (const u of users) console.log('auth user:', u.id, u.email);
  } else console.log('admin/users response:', JSON.stringify(users).slice(0, 200));

  // 3. login and compare JWT sub
  res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: 'saddamakash4@gmail.com', password: 'ManusTest2026!' }),
  });
  const login = await res.json();
  const payload = JSON.parse(Buffer.from(login.access_token.split('.')[1], 'base64').toString());
  console.log('jwt sub:', payload.sub);

  // 4. members table columns/constraints via swagger
  res = await fetch(URL + '/rest/v1/', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const api = await res.json();
  const m = api.paths['/members'] || {};
  const postDef = m.post;
  if (postDef && postDef.parameters) {
    console.log('members.post params:', JSON.stringify(postDef.parameters.map(p => p.name + '=' + JSON.stringify(p.schema && (p.schema.enum || p.schema.default || p.schema.type)))));
  }
})();
