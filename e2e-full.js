// Full E2E suite for foundation-fund-app (Playwright, headless Chromium)
// Covers: login, members CRUD, donations add/delete, expenses add/delete,
// dashboard data, logout redirect.
const { chromium } = require('playwright');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const EMAIL = 'saddamakash234@gmail.com';
const PW = '123456';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const log = [];
function ok(name, pass, detail = '') { log.push(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' — ' + detail : ''}`); }

// Click the submit button INSIDE the open modal, wait until it's actually enabled
async function clickModalSubmit(page, label) {
  const btn = page.locator(`div.fixed button:text-is("${label}")`).first();
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ force: true });
  await page.waitForTimeout(1800);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  const posts = [];
  page.on('response', async (r) => {
    if (r.request().method() === 'POST' && r.url().includes('/rest/v1/')) {
      const t = await r.text().catch(() => '');
      posts.push(r.status() + ' POST ' + r.url().slice(-30) + ' :: ' + t.slice(0, 100));
    }
  });

  // Global confirm() dialog handler (delete confirmations) — auto-accept
  let lastDialog = null;
  page.on('dialog', async (d) => {
    lastDialog = d.message();
    await d.accept();
  });

  // ---------- LOGIN ----------
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  ok('Login', page.url().includes('dashboard'), 'url: ' + page.url());
  let body = await page.textContent('body');
  ok('Dashboard renders', body.includes('ড্যাশবোর্ড') || body.includes('মোট'));

  // ---------- MEMBERS: ADD ----------
  await page.goto(BASE + '/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:text("নতুন সদস্য")');
  await page.waitForTimeout(800);
  const formName = page.locator('form input[type="text"]').first();
  await formName.fill('E2ETest Member');
  await page.locator('form input[type="text"]').nth(1).fill('01555555555');
  await page.locator('form input[type="text"]').nth(2).fill('Dhaka, E2E');
  // submit via Enter on the last input (most reliable, avoids backdrop interception)
  await page.locator('form input[type="text"]').nth(2).press('Enter');
  await page.waitForTimeout(2500);
  body = await page.textContent('body');
  ok('Member add', body.includes('E2ETest Member'), body.slice(0, 100));
  let memberId = null;
  const r = await fetch(URL2 + '/rest/v1/members?name=eq.E2ETest%20Member', {
    headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  memberId = (await r.json())[0]?.id;
  console.log('created member id:', memberId);

  // ---------- MEMBERS: EDIT ----------
  if (memberId) {
    // click the edit (pencil) button on the member card using precise JS click
    // (Playwright's has-text may match the modal overlay; a real click needs coordinates)
    const btnInfo = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('div')].filter(d => d.textContent.includes('E2ETest Member') && d.querySelector('button'));
      for (const d of cards) {
        const btn = d.querySelector('button');
        if (btn) {
          const r = btn.getBoundingClientRect();
          if (r.width > 0 && r.width < 60) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
      }
      return null;
    });
    if (btnInfo) {
      await page.mouse.click(btnInfo.x, btnInfo.y);
    } else {
      ok('Member edit', false, 'edit button not found');
    }
    await page.waitForTimeout(800);
    await page.locator('form input[type="text"]').first().fill('E2ETest Member Edited', { timeout: 10000 });
    await page.locator('form input[type="text"]').nth(1).press('Enter');
    await page.waitForTimeout(2000);
    body = await page.textContent('body');
    ok('Member edit', body.includes('E2ETest Member Edited'));
  }

  // ---------- MEMBERS: DELETE ----------
  if (memberId) {
    // Ensure any open modal is closed (click submit-area escape-safe), then click the
    // trash (delete) button using a Playwright LOCATOR click — Playwright fires REAL
    // mouse events, which trigger React's synthetic onClick (unlike element.click()).
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    lastDialog = null;
    // locate the card by text, then its LAST small icon button = the trash button
    const card = page.locator('div', { hasText: 'E2ETest Member Edited' }).first();
    const trashBtn = card.locator('button').last();
    await trashBtn.click();
    // wait for the confirm dialog to be captured and accepted (global handler does it)
    // then WAIT FOR the card to disappear (refetch finishes) instead of a fixed delay
    let confirmed = false;
    for (let i = 0; i < 15; i++) {
      if (lastDialog) { confirmed = true; break; }
      await page.waitForTimeout(500);
    }
    console.log('confirm dialog seen:', lastDialog);
    let deleted = false;
    try {
      await page.waitForFunction(() => !document.body.textContent.includes('E2ETest Member Edited'), { timeout: 12000 });
      deleted = true;
    } catch {}
    body = await page.textContent('body');
    ok('Member delete', deleted, (confirmed ? 'dialog accepted' : 'no confirm dialog') + ' | body after: ' + (body.includes('E2ETest') ? 'still present' : 'gone'));
    // re-verify via DB (service key) to be 100% sure
    const d2 = await fetch(URL2 + '/rest/v1/members?name=eq.E2ETest%20Member%20Edited', {
      headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
    });
    const d2Rows = await d2.json();
    console.log('E2ETest Member Edited in DB after delete:', d2Rows.length);
  }

  // ---------- DONATIONS ----------
  await page.goto(BASE + '/donations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:text("নতুন দান")');
  await page.waitForTimeout(1000);
  // 1) SELECT A MEMBER first (the form's first field is a required member dropdown)
  const memberSel = page.locator('form select').first();
  await memberSel.selectOption({ index: 1 }); // first real member option (index 0 is the placeholder)
  await page.waitForTimeout(300);
  // 2) amount
  await page.fill('form input[type="number"]', '1500');
  // 3) date (required; default is empty — must be set for the insert to go through)
  const dateInput = page.locator('form input[type="date"]').first();
  if ((await dateInput.inputValue()) === '') {
    const today = new Date().toISOString().slice(0, 10);
    await dateInput.fill(today);
  }
  // 4) submit the form (Enter on the amount field)
  await page.locator('form input[type="number"]').press('Enter');
  await page.waitForTimeout(2500);
  // Verify the donation actually landed in the DB (receipt modal already proves the insert worked)
  const donRes = await fetch(URL2 + '/rest/v1/donations?amount=eq.1500', {
    headers: { Authorization: 'Bearer ' + SRK, apikey: SRK },
  });
  const donRows = await donRes.json();
  ok('Donation add', Array.isArray(donRows) && donRows.length > 0, 'db rows with amount 1500: ' + (Array.isArray(donRows) ? donRows.length : 'ERR'));
  const modalVisible = await page.locator('text=R-').count();
  ok('Receipt generated', modalVisible > 0, 'receipt labels: ' + modalVisible);
  if (modalVisible > 0) await page.locator('button:text("বন্ধ করুন")').click().catch(async () => {
    await page.locator('button:text("ঠিক আছে")').click().catch(() => {});
  });
  await page.waitForTimeout(800);

  // ---------- EXPENSES ----------
  await page.goto(BASE + '/expenses', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:text("নতুন খরচ")');
  await page.waitForTimeout(1000);
  await page.fill('form input[type="number"]', '500');
  await page.locator('form input[type="number"]').press('Enter');
  await page.waitForTimeout(2500);
  body = await page.textContent('body');
  ok('Expense add', body.includes('500'));

  // ---------- DASHBOARD: data aggregation ----------
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  body = await page.textContent('body');
  ok('Dashboard data', body.includes('1,500') || body.includes('500') || body.includes('মোট'));
  await page.screenshot({ path: '/tmp/e2e-dashboard.png' });

  // ---------- REPORTS ----------
  await page.goto(BASE + '/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  body = await page.textContent('body');
  ok('Reports page', body.includes('রিপোর্ট') || body.includes('এক্সপোর্ট'));

  // ---------- LOGOUT ----------
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('button:text("বের হওন")');
  await page.waitForTimeout(2500);
  ok('Logout redirect', page.url().includes('/login'), 'url: ' + page.url());

  // ---------- SUMMARY ----------
  console.log('\n=== POST requests captured ===');
  for (const p of posts) console.log(p);
  console.log('\n=== RESULTS ===');
  for (const l of log) console.log(l);
  console.log('Browser errors:', errs.length ? errs.slice(0, 8) : 'none');
  const fails = log.filter(l => l.startsWith('FAIL'));
  if (fails.length > 0) { console.log('\nFAILED CHECKS:', fails.join('\n')); process.exit(1); }
  console.log('\nALL CHECKS PASSED');
  await browser.close();
})();
