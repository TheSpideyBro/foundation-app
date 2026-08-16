// Verify admin DELETE works via REST (anon key + admin JWT)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  // 1. Get one E2ETest member id via service key
  const g = await fetch(`${URL2}/rest/v1/members?name=eq.E2ETest%20Member%20Edited`, {
    headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  const rows = await g.json();
  console.log('E2ETest members:', rows.length);
  const id = rows[0]?.id;
  if (!id) { console.log('no E2ETest member found'); process.exit(0); }

  // 2. Attempt delete with ANON key + no auth (should fail due to RLS)
  const r1 = await fetch(`${URL2}/rest/v1/members?id=eq.${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + ANON, apikey: ANON },
  });
  console.log('delete as anon (no session):', r1.status, (await r1.text()).slice(0, 150));

  // 3. Count after anon delete attempt
  const c1 = await fetch(`${URL2}/rest/v1/members?name=eq.E2ETest%20Member%20Edited`, {
    headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  console.log('count after anon attempt:', (await c1.json()).length);
})();
