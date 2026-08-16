const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const msgs = [];
  page.on('console', (m) => msgs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => msgs.push('[pageerror] ' + e.message));

  // Instrument: override window.performance timing & intercept requests to supabase endpoints
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);

  // Check if the page reached /dashboard but with loading stuck: inspect DOM for what rendered
  const body = await page.textContent('body');
  console.log('stuck on loading:', body.includes('লোড হচ্ছে...'));

  // Try the login flow: does getSession work AFTER signInWithPassword mock?
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input#email', 'debug@example.com');
  await page.fill('input#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('after login url:', page.url());
  await page.waitForTimeout(5000);
  const dashBody = await page.textContent('body');
  console.log('dashboard after login stuck:', dashBody.includes('লোড হচ্ছে...'));
  console.log('has মোট তহবিল:', dashBody.includes('মোট তহবিল'));
  console.log('\nAll console messages:');
  console.log(msgs.join('\n'));

  await browser.close();
})();
