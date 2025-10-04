const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flotilla-orpin.vercel.app/');
  await page.waitForTimeout(5000); // Wait for page to load

  // Take a screenshot
  await page.screenshot({ path: 'site-screenshot.png', fullPage: true });

  // Get page HTML
  const html = await page.content();
  console.log('=== PAGE HTML ===');
  console.log(html.substring(0, 5000)); // First 5000 chars

  // Try to find any list-like elements
  console.log('\n=== POTENTIAL VESSEL CONTAINERS ===');
  const divs = await page.locator('div').all();
  console.log(`Total divs: ${divs.length}`);

  // Check for specific patterns
  const patterns = ['card', 'vessel', 'ship', 'item', 'list', 'container'];
  for (const pattern of patterns) {
    const count = await page.locator(`[class*="${pattern}"]`).count();
    console.log(`Elements with class containing "${pattern}": ${count}`);
  }

  await page.waitForTimeout(10000); // Keep browser open for manual inspection
  await browser.close();
})();
