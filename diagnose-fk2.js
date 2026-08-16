// Reproduce members_user_id_fkey precisely
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
  const payload = JSON.parse(Buffer.from(login.access_token.split('.')[1], 'base64').toString());
  console.log('jwt sub:', payload.sub, '| matches USER_ID:', payload.sub === USER_ID);

  const base = { name: 'ManusFKTest', join_date: '2026-08-15', status: 'active' };

  // A: with explicit user_id
  let r = await fetch(URL + '/rest/v1/members', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', ...jh },
    body: JSON.stringify({ ...base, user_id: USER_ID }),
  });
  console.log('A explicit user_id:', r.status, (await r.text()).slice(0, 150));

  // B: without user_id (column may be NOT NULL or have default?)
  r = await fetch(URL + '/rest/v1/members', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', ...jh },
    body: JSON.stringify(base),
  });
  console.log('B no user_id:', r.status, (await r.text()).slice(0, 150));

  // C: service-key insert without user_id to test NOT NULL / default
  r = await fetch(URL + '/rest/v1/members', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', Authorization: 'Bearer ' + SRK, apikey: SRK },
    body: JSON.stringify(base),
  });
  console.log('C srk no user_id:', r.status, (await r.text()).slice(0, 150));

  // Check members columns via swagger definitions
  const api = await fetch(URL + '/rest/v1/', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const swagger = await api.json();
  const defs = swagger.components && swagger.components.schemas;
  const mdef = defs && (defs.members || (swagger.definitions && swagger.definitions.members));
  if (mdef) {
    console.log('members schema props:', Object.keys(mdef.properties || {}));
    const p = mdef.properties || {};
    for (const k in p) console.log(' ', k, '->', JSON.stringify(p[k]).slice(0, 120));
  }
})();
