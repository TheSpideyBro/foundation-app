// Focused delete debug v3: use Playwright locator click (real mouse events) on the trash button.
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { chromium } = require('playwright');
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

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

  // Register dialog listener BEFORE clicking
  let dialogMsg = null;
  page.on('dialog', async (dialog) => {
    console.log('DIALOG type:', dialog.type(), 'msg:', dialog.message());
    dialogMsg = dialog.message();
    await dialog.accept();
  });

  // Click the first trash button using locator (real mouse events)
  const trash = page.locator('button').filter({ has: page.locator('svg').first() }).first();
  console.log('trash button count (all svg buttons):', await page.locator('button').count());

  // More targeted: click trash inside the FIRST E2ETest card. Locate the card by text, then its last small button.
  const card = page.locator('div', { hasText: 'E2ETest Member Edited' }).first();
  const trashBtn = card.locator('button').last();
  await trashBtn.click({ force: false });
  console.log('clicked first trash button, awaiting dialog...');

  await page.waitForTimeout(500);
  console.log('dialog captured:', dialogMsg);
  await page.screenshot({ path: '/tmp/del3-step2.png' });

  // If confirm dialog didn't appear (auto-dismissed before listener?), retry with force + coordinates
  if (dialogMsg === null) {
    console.log('no dialog — retrying with coordinate click...');
    const box = await trashBtn.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1000);
    console.log('after retry, dialog captured:', dialogMsg);
  }

  await page.waitForTimeout(2000);
  const body = await page.textContent('body');
  console.log('E2ETest Member Edited still on page:', body.includes('E2ETest Member Edited'));
  await page.screenshot({ path: '/tmp/del3-step3.png' });

  // DB check via service key
  const r = await fetch(`${URL2}/rest/v1/members`, { headers: { Authorization: 'Bearer ' + SRK, apikey: SRK } });
  const rows = await r.json();
  console.log('members in DB:', rows.length, JSON.stringify(rows.map(m => ({ name: m.name })), null, 1));

  await browser.close();
})();
