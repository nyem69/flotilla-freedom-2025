const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flotilla-orpin.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Look for button elements that might be vessel toggles
  console.log('=== CHECKING BUTTONS ===');
  const buttons = await page.locator('button[class*="item"]').all();
  console.log(`Found ${buttons.length} button elements with "item" in class`);

  if (buttons.length > 0) {
    // Get the first button's HTML
    const firstButton = buttons[0];
    const html = await firstButton.evaluate(el => el.outerHTML);
    console.log('\n=== FIRST BUTTON HTML ===');
    console.log(html);

    // Get text content
    const text = await firstButton.innerText();
    console.log('\n=== FIRST BUTTON TEXT ===');
    console.log(text);

    // Click the first button to expand
    console.log('\n=== CLICKING FIRST BUTTON ===');
    await firstButton.click();
    await page.waitForTimeout(1000);

    // Check what appeared after clicking
    const afterClickHtml = await firstButton.evaluate(el => {
      const parent = el.parentElement;
      return parent ? parent.outerHTML : el.outerHTML;
    });
    console.log('\n=== AFTER CLICK (parent element) ===');
    console.log(afterClickHtml.substring(0, 2000));
  }

  await page.waitForTimeout(10000);
  await browser.close();
})();
