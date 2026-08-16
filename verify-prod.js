const { chromium } = require('playwright');

const BASE = 'http://localhost:3001';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('response', (res) => { if (res.status() >= 400) errors.push(`[http ${res.status()}] ${res.url()}`); });

  // 1. Root redirects to login
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('1. Root ->', page.url(), page.url().includes('/login') ? 'OK' : 'FAIL');

  // 2. Login page renders with all fields
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const body = await page.textContent('body');
  console.log('2. Login page renders:', body.includes('লগইন') && body.includes('নতুন একাউন্ট') ? 'OK' : 'FAIL');

  // 3. Mock login submits without crashing
  await page.fill('input#email', 'debug@example.com');
  await page.fill('input#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('3. Login submit ->', page.url(), 'errors:', errors.length === 0 ? 'none' : errors.join(' | '));

  // 4. Dashboard renders cards/chart and does not hang on loading
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const dashBody = await page.textContent('body');
  console.log('4. Dashboard loading:', !dashBody.includes('লোড হচ্ছে...') ? 'resolved OK' : 'STUCK (loading)');
  await page.screenshot({ path: '/tmp/verify-dashboard.png' });

  // 5. Donations page loads and form opens
  await page.goto(BASE + '/donations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.click('button:has-text("নতুন দান যোগ করুন")');
  await page.waitForTimeout(1000);
  console.log('5. Donations form modal:', await page.locator('select').first().isVisible() ? 'OK' : 'FAIL');
  await page.screenshot({ path: '/tmp/verify-donations.png' });

  // 6. Reports page loads
  await page.goto(BASE + '/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const repBody = await page.textContent('body');
  console.log('6. Reports loading:', !repBody.includes('লোড হচ্ছে...') ? 'resolved OK' : 'STUCK (loading)');
  await page.screenshot({ path: '/tmp/verify-reports.png' });

  // 7. Logout button navigates to /login
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.click('button:has-text("বের হওন")');
  await page.waitForTimeout(2000);
  console.log('7. Logout ->', page.url(), page.url().includes('/login') ? 'OK' : 'FAIL');

  await browser.close();
  console.log('\nAll done. Errors:', errors.join(' | ') || 'none');
})();
