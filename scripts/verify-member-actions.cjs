const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // We'll use a local mock server or just check the code structure
  // Since we can't easily mock the Supabase auth state in a static check,
  // we will check if the 'opacity-0' class is removed from the file.
  const fs = require('fs');
  const content = fs.readFileSync('/home/ubuntu/app/foundation-fund-app/app/members/page.tsx', 'utf8');
  
  if (content.includes('opacity-0 group-hover:opacity-100')) {
    console.error('FAIL: Hover-hidden class still exists in members page.');
    process.exit(1);
  }
  
  console.log('SUCCESS: Hover-hidden class removed from members page.');
  await browser.close();
})();
