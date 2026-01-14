import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  await page.goto('http://localhost:5500');
  
  await page.waitForTimeout(3000);
  
  // Check if tbody has content
  const tbodyHTML = await page.locator('#tableBody').innerHTML();
  console.log('TBODY Content:', tbodyHTML);
  
  // Check if example row exists
  const exampleRow = await page.locator('.example-row').count();
  console.log('Example rows found:', exampleRow);
  
  await browser.close();
})();
