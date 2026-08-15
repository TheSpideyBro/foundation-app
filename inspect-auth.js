// Inspect Supabase auth state using the service role key (admin access)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  const res = await fetch(`${URL}/auth/v1/admin/users?per_page=100`, {
    headers: { Authorization: `Bearer ${SRK}`, apikey: SRK },
  });
  const users = await res.json();
  if (!Array.isArray(users)) {
    console.log('admin/users response:', JSON.stringify(users).slice(0, 500));
    return;
  }
  console.log(`Total auth users: ${users.length}`);
  for (const u of users) {
    console.log('---');
    console.log('email:', u.email);
    console.log('aud:', u.aud, '| role:', u.role);
    console.log('confirmed_at:', u.confirmed_at);
    console.log('last_sign_in_at:', u.last_sign_in_at);
    console.log('created_at:', u.created_at);
  }
})();
