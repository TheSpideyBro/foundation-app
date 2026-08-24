// verify-clean.js — check DB is clean of E2E test data and count real rows
require('dotenv').config({ path: __dirname + '/../.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const [m, d, e, cat, users] = await Promise.all([
    c.from('members').select('id,name', { count: 'exact' }),
    c.from('donations').select('id', { count: 'exact' }),
    c.from('expenses').select('id', { count: 'exact' }),
    c.from('expense_categories').select('id,name'),
    c.from('users').select('id,email,role'),
  ]);
  const leftover = [...(m.data || []), ...(d.data || []), ...(e.data || [])].filter(x =>
    JSON.stringify(x).includes('E2E') || JSON.stringify(x).includes('Marker') ||
    x.amount === 1500 || x.amount === 500
  );
  console.log('members:', m.count, JSON.stringify((m.data || []).map(x => x.name)));
  console.log('donations:', d.count);
  console.log('expenses:', e.count);
  console.log('categories:', (cat.data || []).map(x => x.name).join(', '));
  console.log('users:', (users.data || []).map(x => `${x.email}(${x.role})`).join(', '));
  console.log('leftover_test_rows:', leftover.length);
  process.exit(leftover.length > 0 ? 1 : 0);
})();
