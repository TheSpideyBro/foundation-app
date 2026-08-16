require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const res = await fetch(URL + '/rest/v1/', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const body = await res.text();
  const api = JSON.parse(body);
  console.log('status:', res.status);
  const paths = Object.keys(api.paths).filter(p => p.startsWith('/'));
  console.log('Table endpoints:', paths.filter(p => p !== '/').map(p => p.slice(1).split('?')[0]).join(', ') || 'NONE');
})();
