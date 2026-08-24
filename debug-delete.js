// Debug: why does admin (saddamakash234) get 403 on member delete?
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

(async () => {
  const r = await fetch(URL2 + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'saddamakash234@gmail.com', password: '123456' }),
  });
  const body = await r.json();
  const tok = body.access_token;
  if (!tok) { console.log('login failed:', body); return; }

  // check role via get_my_role (as anon REST call with JWT)
  const roleRes = await fetch(URL2 + '/rest/v1/rpc/get_my_role', {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
  });
  console.log('get_my_role (anon+JWT):', roleRes.status, (await roleRes.text()).slice(0, 100));

  // try delete E2ETest Member as admin
  const delRes = await fetch(URL2 + '/rest/v1/members?name=eq.E2ETest%20Member', {
    method: 'DELETE',
    headers: { apikey: ANON, Authorization: 'Bearer ' + tok },
  });
  console.log('delete as admin:', delRes.status, (await delRes.text()).slice(0, 200));

  // also check users row role
  const uRes = await fetch(URL2 + '/rest/v1/rpc/get_my_role', {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: '{}',
  });
  console.log('role via rpc again:', uRes.status, (await uRes.text()).slice(0, 100));
})();
