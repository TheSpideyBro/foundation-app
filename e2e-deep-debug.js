// Deep debug: why do members + donations inserts fail but expenses succeed?
// Capture ALL console messages (incl. warnings) and network requests during the flows.
const { chromium } = require('playwright');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const EMAIL = 'saddamakash234@gmail.com';
const PW = '123456';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const msgs = [];
  page.on('console', (m) => msgs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => msgs.push('PAGEERROR: ' + e.message));
  const reqs = [];
  page.on('response', (r) => {
    if (r.url().includes('/rest/v1/')) {
      r.text().then((t) => reqs.push(r.status() + ' ' + r.url().slice(-40) + ' :: ' + t.slice(0, 120))).catch(() => {});
    }
  });

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // MEMBERS flow
  await page.goto(BASE + '/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:text("নতুন সদস্য")');
  await page.waitForTimeout(800);
  await page.fill('input[placeholder*="নাম"]', 'DeepDbg');
  await page.locator('div.fixed button:text("যোগ করুন")').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/deepdbg-members.png' });

  // DONATIONS flow
  await page.goto(BASE + '/donations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:has-text("নতুন দান")');
  await page.waitForTimeout(1000);
  try {
    const sel = page.locator('select').first();
    if (await sel.count() > 0 && (await sel.inputValue()) === '') {
      const opts = await sel.locator('option').count();
      if (opts > 1) await sel.selectIndex(1);
    }
  } catch {}
  await page.fill('input[type="number"]', '1500');
  await page.locator('div.fixed button:text("যোগ করুন")').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/deepdbg-donations.png' });

  console.log('=== REST responses captured ===');
  for (const r of reqs) console.log(r);
  console.log('=== console logs (last 25) ===');
  for (const m of msgs.slice(-25)) console.log(m);
  await browser.close();
})();
