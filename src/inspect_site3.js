const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flotilla-orpin.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Look for grid rows or vessel items
  console.log('=== CHECKING FOR VESSEL ROWS ===');

  // Try different selectors
  const selectors = [
    'button[class*="grid"]',
    'div[class*="grid"] button',
    '[role="button"]',
    'button:has-text("SAILING")',
    'button:has-text("INTERCEPTED")'
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    console.log(`Selector "${selector}": ${count} elements`);
  }

  // Get all buttons on the page
  const allButtons = await page.locator('button').all();
  console.log(`\nTotal buttons on page: ${allButtons.length}`);

  // Sample first 10 buttons
  console.log('\n=== FIRST 10 BUTTON TEXT SAMPLES ===');
  for (let i = 0; i < Math.min(10, allButtons.length); i++) {
    const text = await allButtons[i].innerText().catch(() => '');
    console.log(`${i + 1}: ${text.substring(0, 100).replace(/\n/g, ' | ')}`);
  }

  // Look for buttons with specific text patterns
  console.log('\n=== VESSEL BUTTONS (with coordinates or status) ===');
  const vesselButtons = await page.locator('button').all();
  let vesselCount = 0;

  for (let i = 0; i < Math.min(50, vesselButtons.length); i++) {
    const text = await vesselButtons[i].innerText().catch(() => '');
    if (text.includes('SAILING') || text.includes('INTERCEPTED') || text.includes('°')) {
      vesselCount++;
      console.log(`\nVessel ${vesselCount}:`);
      console.log(text.substring(0, 300));
      console.log('---');

      if (vesselCount >= 3) break; // Show first 3 vessels
    }
  }

  await page.waitForTimeout(10000);
  await browser.close();
})();
