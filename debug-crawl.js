const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      consoleErrors.push(`[http ${res.status()}] ${res.url()}`);
    }
  });

  const routes = ['/', '/login', '/dashboard', '/members', '/donations', '/expenses', '/reports'];
  for (const route of routes) {
    consoleErrors.length = 0;
    const resp = await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(e => { console.log(`GOTO FAIL ${route}: ${e.message}`); return null; });
    await page.waitForTimeout(1500);
    const title = await page.title();
    const bodyText = await page.textContent('body').then(t => (t || '').trim().slice(0, 200));
    const url = page.url();
    console.log(`\n=== ROUTE ${route} ===`);
    console.log('final url:', url);
    console.log('title:', title);
    console.log('body start:', bodyText);
    if (consoleErrors.length) console.log('errors:', consoleErrors.slice(0, 15).join(' | '));
    await page.screenshot({ path: `/tmp/debug-${route.replace(/\//g, '-') || 'root'}.png` }).catch(() => {});
  }

  // Try the login flow with mock backend
  console.log('\n=== LOGIN FLOW TEST ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Fill email and password, click sign in
  const emailInput = await page.locator('input[type="email"], input[placeholder*="ইমেইল" i], input[placeholder*="email" i], input[placeholder*="Email" i]').first();
  const passInput = await page.locator('input[type="password"]').first();
  if (await emailInput.isVisible() && await passInput.isVisible()) {
    await emailInput.fill('debug@example.com');
    await passInput.fill('password123');
    // Submit form
    await page.locator('input[type="submit"], button[type="submit"]').first().click().catch(() => page.keyboard.press('Enter'));
    await page.waitForTimeout(3000);
    console.log('after login submit, url:', page.url());
    console.log('body:', (await page.textContent('body')).trim().slice(0, 300));
  }
  await page.screenshot({ path: '/tmp/debug-login-flow.png' }).catch(() => {});

  // Try signup tab
  console.log('\n=== SIGNUP FLOW TEST ===');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // look for tab/button labeled নতুন একাউন্ট
  const signupBtn = page.locator('button:has-text("নতুন একাউন"), button:has-text("সাইন আপ"), a:has-text("নতুন একাউন")').first();
  if (await signupBtn.isVisible().catch(() => false)) {
    await signupBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/debug-signup-tab.png' }).catch(() => {});
    const passInputs = await page.locator('input[type="password"]').count();
    console.log('password fields after signup click:', passInputs);
    const inputs = await page.locator('input').count();
    console.log('total inputs:', inputs);
  } else {
    console.log('signup button not found');
  }

  await browser.close();
})();
