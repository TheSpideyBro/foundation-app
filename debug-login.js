// Verify login with the reset password against real Supabase
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const requests = [];
  page.on('response', (res) => {
    if (res.url().includes('/auth/v1/')) {
      res.json().then(body => requests.push({ status: res.status(), body })).catch(() => {});
    }
  });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Fill in the known email and the reset password
  await page.fill('input#email', 'saddamakash4@gmail.com');
  await page.fill('input#password', 'ManusTest2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log('Auth requests:');
  for (const r of requests) console.log('  ', r.status, JSON.stringify(r.body).slice(0, 200));

  const url = page.url();
  console.log('final url:', url);
  console.log('login successful:', url.includes('/dashboard'));
  await page.screenshot({ path: '/tmp/login-ok.png' });
  await browser.close();
})();
