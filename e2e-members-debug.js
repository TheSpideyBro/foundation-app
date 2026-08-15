// Debug member add failure: check REST state + console messages during the add flow
const { chromium } = require('playwright');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = 'saddamakash234@gmail.com';
const PW = '123456';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const r = await fetch(URL + '/rest/v1/members', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('current members:', JSON.stringify(await r.json()).slice(0, 500));
  const r2 = await fetch(URL + '/rest/v1/users', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  console.log('users rows:', JSON.stringify(await r2.json()).slice(0, 300));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', (m) => consoleLogs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => consoleLogs.push('PAGEERROR: ' + e.message));

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto(BASE + '/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:text("নতুন সদস্য")');
  await page.waitForTimeout(800);
  await page.fill('input[placeholder*="নাম"]', 'DbgMember');
  await page.locator('input[type="text"]').nth(1).fill('01777777777');
  await page.locator('div.fixed button:text("যোগ করুন")').first().click({ force: true });
  await page.waitForTimeout(2500);
  console.log('console logs during flow:', consoleLogs.slice(-15).join('\n  '));
  await page.screenshot({ path: '/tmp/e2e-members-debug.png', fullPage: false });

  const r3 = await fetch(URL + '/rest/v1/members?name=eq.DbgMember', {
    headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  const rows = await r3.json();
  console.log('DbgMember rows after add attempt:', JSON.stringify(rows).slice(0, 300));
  await browser.close();
})();
