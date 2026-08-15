// End-to-end: simulate missing users row, then verify the app flow works.
// Steps:
// 1. Delete the users row via service key (simulates user's broken state)
// 2. Load the app's login page, sign in (this triggers providers' ensureProfile)
// 3. Navigate to /members, add a member, expect success
// 4. Clean up test member
const { chromium } = require('playwright');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = 'c978f05b-a730-4a24-b2f3-7704230a1c9b';
const EMAIL = 'saddamakash4@gmail.com';
const PW = process.env.TEST_PASSWORD || 'ManusTest2026!';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  // 1. Wipe the users row
  let r = await fetch(URL + '/rest/v1/users?id=eq.' + USER_ID, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  console.log('users row deleted:', r.status);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

  // 2. Sign in through the app
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const afterLoginUrl = page.url();
  console.log('after login url:', afterLoginUrl);

  // 3. Add a member
  await page.goto(BASE + '/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const before = await page.content();
  await page.click('button:text("নতুন সদস্য")');
  await page.waitForTimeout(800);
  await page.fill('input[placeholder*="নাম"], input[type="text"]', 'ManusE2ETest');
  const phone = page.locator('input[type="text"]').nth(1);
  await phone.fill('01999999999');
  await page.click('button:text("যোগ করুন")');
  await page.waitForTimeout(3000);
  const bodyText = await page.textContent('body');
  const found = bodyText.includes('ManusE2ETest');
  console.log('member visible on page:', found);
  console.log('console/page errors during flow:', errs.length ? errs.slice(0, 5) : 'none');

  // 4. Verify users row was bootstrapped, then clean up member
  r = await fetch(URL + '/rest/v1/users', { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const rows = await r.json();
  console.log('users row after bootstrap:', JSON.stringify(rows).slice(0, 300));

  await fetch(URL + '/rest/v1/members?name=eq.ManusE2ETest', {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  console.log('test member cleaned up');

  // Restore admin role (bootstrap inserts with no role = 'member' default!)
  await fetch(URL + '/rest/v1/users?id=eq.' + USER_ID, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal', Authorization: 'Bearer ' + SRK, apikey: SRK },
    body: JSON.stringify({ role: 'admin' }),
  });
  console.log('admin role restored');

  await browser.close();
  console.log(found && rows.length === 1 ? 'E2E PASS' : 'E2E FAIL');
})();
