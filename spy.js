const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const url = 'https://www.reddit.com/r/EbonyHotties/comments/1kp50nl/wanna_see_me_back_it_up_at_ebonybaddiescom/';
if (!url) {
  console.error('❌ Usage: node spy.js <URL>');
  process.exit(1);
}

(async () => {
  console.log('🕵️ Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

  let cacheCount = 1;
  let isDone = false;

  // Start saving HTML content every second
  const saveLoop = setInterval(async () => {
    if (isDone) return;

    try {
      const content = await page.content();
      const fileName = `cache${cacheCount}.html`;
      fs.writeFileSync(path.join(__dirname, fileName), content, 'utf-8');
      console.log(`💾 Saved snapshot: ${fileName}`);
      cacheCount++;
    } catch (err) {
      console.warn('⚠️ Error saving snapshot:', err.message);
    }
  }, 1000);

  try {
    console.log('🌐 Navigating to:', url);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    isDone = true;
    console.log('✅ Page fully loaded');
  } catch (err) {
    isDone = true;
    console.error('❌ Error during navigation:', err.message);
  } finally {
    clearInterval(saveLoop);
    await browser.close();
    console.log('🧹 Browser closed. Spy mission complete.');
  }
})();
