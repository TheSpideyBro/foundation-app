// Debug delete v4: step through carefully — login, capture network DELETE responses, check DB
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { chromium } = require('playwright');
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log('ERR:', m.text().slice(0, 150)));
  const dels = [];
  page.on('response', (r) => {
    const req = r.request();
    if (req.method() === 'DELETE' && req.url().includes('/rest/v1/')) {
      dels.push(r.status() + ' ' + req.url().slice(-40));
    }
  });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'saddamakash234@gmail.com');
  await page.fill('input[type="password"]', '123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('http://localhost:3000/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  let dialogMsg = null;
  page.on('dialog', async (d) => { dialogMsg = d.message(); await d.accept(); });

  const card = page.locator('div', { hasText: 'E2ETest Member Edited' }).first();
  const trashBtn = card.locator('button').last();
  await trashBtn.click();
  console.log('clicked; awaiting...');
  await page.waitForTimeout(4000);
  console.log('DELETE requests:', dels);

  body = await page.textContent('body');
  console.log('still shows E2E on page:', body.includes('E2ETest'));
  await page.screenshot({ path: '/tmp/del4-final.png' });

  const r = await fetch(`${URL2}/rest/v1/members`, { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const rows = await r.json();
  console.log('members in DB:', rows.length, rows.map(m => m.name));

  await browser.close();
})();
