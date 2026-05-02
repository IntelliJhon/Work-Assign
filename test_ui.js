import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot_ui.png' });
  await browser.close();
})();
