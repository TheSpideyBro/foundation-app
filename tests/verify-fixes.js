/**
 * Automated verification suite for foundation-fund-app bug fixes.
 *
 * Runs against a production build and checks each fixed issue:
 *  1. Middleware no longer crashes without Supabase env vars (all routes 200)
 *  2. No infinite loading spinners on dashboard / members / expenses / reports
 *  3. Logout navigates to /login
 *  4. Login flow works without console errors
 *  5. Donations receipt form modal opens
 *
 * Usage (from project root):
 *   npm run build                        # build the app first
 *   node --experimental-specifier-resolution=node scripts/prepare-standalone.mjs  (or the manual copy below)
 *   PORT=3001 node .next/standalone/server.js &
 *   node tests/verify-fixes.js
 *
 * Easiest one-liner (run from project root):
 *   npm run test:verify
 */

const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3001';

const checks = [
  {
    name: 'Root redirects to /login',
    run: async (page) => {
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      return page.url().includes('/login');
    },
  },
  {
    name: 'Login page renders',
    run: async (page) => {
      await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const body = await page.textContent('body');
      return body.includes('লগইন') && body.includes('নতুন একাউন্ট');
    },
  },
  {
    name: 'Login flow works (mock) with no console errors',
    run: async (page) => {
      await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      // Use TEST_EMAIL / TEST_PASSWORD env vars when present (real backend),
      // otherwise fall back to placeholder credentials (mock mode).
      const email = process.env.TEST_EMAIL || 'debug@example.com';
      const password = process.env.TEST_PASSWORD || 'password123';
      await page.fill('input#email', email);
      await page.fill('input#password', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2500);
      return page.url().includes('/dashboard');
    },
  },
  {
    name: 'Dashboard does not hang on loading spinner',
    run: async (page) => {
      await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const body = await page.textContent('body');
      return !body.includes('লোড হচ্ছে...');
    },
  },
  {
    name: 'Members page does not hang on loading spinner',
    run: async (page) => {
      await page.goto(BASE + '/members', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const body = await page.textContent('body');
      return !body.includes('লোড হচ্ছে...');
    },
  },
  {
    name: 'Expenses page does not hang on loading spinner',
    run: async (page) => {
      await page.goto(BASE + '/expenses', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const body = await page.textContent('body');
      return !body.includes('লোড হচ্ছে...');
    },
  },
  {
    name: 'Donations form modal opens',
    run: async (page) => {
      await page.goto(BASE + '/donations', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.click('button:has-text("নতুন দান যোগ করুন")');
      await page.waitForTimeout(1000);
      return await page.locator('select').first().isVisible();
    },
  },
  {
    name: 'Reports page does not hang on loading spinner',
    run: async (page) => {
      await page.goto(BASE + '/reports', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const body = await page.textContent('body');
      return !body.includes('লোড হচ্ছে...');
    },
  },
  {
    name: 'Logout navigates to /login',
    run: async (page) => {
      await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.click('button:has-text("বের হওন")');
      await page.waitForTimeout(2000);
      return page.url().includes('/login');
    },
  },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const httpErrors = [];
  const pageErrors = [];
  page.on('response', (res) => {
    if (res.status() >= 400) httpErrors.push(`HTTP ${res.status()} ${res.url()}`);
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  let pass = 0;
  let fail = 0;
  console.log(`Running ${checks.length} checks against ${BASE}\n`);
  for (const check of checks) {
    try {
      const ok = await check.run(page);
      if (ok) { pass++; console.log(`PASS  ${check.name}`); }
      else { fail++; console.log(`FAIL  ${check.name}`); }
    } catch (err) {
      fail++;
      console.log(`FAIL  ${check.name}  (${err.message})`);
    }
  }

  await browser.close();

  console.log('');
  console.log('HTTP 4xx/5xx during tests:', httpErrors.length ? httpErrors.join('\n') : 'none');
  console.log('Browser page errors during tests:', pageErrors.length ? pageErrors.join('\n') : 'none');
  console.log('');
  console.log(`Result: ${pass}/${pass + fail} checks passed`);
  process.exit(fail > 0 || httpErrors.length > 0 || pageErrors.length > 0 ? 1 : 0);
})();
