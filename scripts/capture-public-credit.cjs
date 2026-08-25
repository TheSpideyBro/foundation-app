const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const outputDir = '/home/ubuntu/app/foundation-fund-app/credit-screenshots';
  const targets = [
    { name: 'landing-credit-desktop.png', viewport: { width: 1440, height: 1000 } },
    { name: 'landing-credit-mobile.png', viewport: { width: 390, height: 844 } },
  ];

  for (const target of targets) {
    const page = await browser.newPage({ viewport: target.viewport, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${outputDir}/${target.name}` });
    const credit = await page.getByText('Developed by Saddam Hossain Akash', { exact: true }).count();
    if (credit !== 1) throw new Error(`Expected one footer credit on ${target.name}; found ${credit}.`);
    await page.close();
  }

  await browser.close();
  console.log('Public credit screenshots captured and verified.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
