// Focused delete debug: JS-click the trash, capture dialog events, screenshot steps.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { chromium } = require('playwright');
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && console.log('ERR:', m.text().slice(0, 200)));

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'saddamakash234@gmail.com');
  await page.fill('input[type="password"]', '123456');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('logged in:', page.url());

  await page.goto('http://localhost:3000/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // find first "E2ETest Member Edited" card's trash button and JS-click it
  const clicked = await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (el.textContent && el.textContent.includes('E2ETest Member Edited') && el.textContent.length < 800) {
        const btns = [...el.querySelectorAll('button')].filter(b => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.width < 60;
        });
        if (btns.length > 0) {
          const b = btns[btns.length - 1]; // last small icon button = trash
          b.click();
          return 'clicked trash in card: ' + b.parentElement.className.slice(0, 40);
        }
      }
    }
    return 'no card found';
  });
  console.log('click result:', clicked);
  await page.screenshot({ path: '/tmp/del-step1.png' });

  // wait for confirm dialog
  let dialogMsg = null;
  const dlgPromise = page.waitForEvent('dialog', { timeout: 3000 }).then(d => { dialogMsg = d.message(); return d.accept(); }).catch(() => 'no dialog');
  await dlgPromise;
  console.log('dialog:', dialogMsg);
  await page.screenshot({ path: '/tmp/del-step2.png' });
  await page.waitForTimeout(2500);

  const body = await page.textContent('body');
  const remaining = body.includes('E2ETest Member Edited');
  console.log('member still on page:', remaining);
  await page.screenshot({ path: '/tmp/del-step3.png' });

  // DB count check
  const r = await fetch(URL2 + '/rest/v1/members', {
    headers: { Authorization: 'Bearer ' + ANON, apikey: ANON },
  });
  const rows = await r.json();
  console.log('members in DB (as anon — should be empty due to RLS; check anyway):', Array.isArray(rows) ? rows.length : JSON.stringify(rows).slice(0, 100));

  await browser.close();
})();
