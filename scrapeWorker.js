const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const [,, inputUrl] = process.argv;

(async () => {
  if (!inputUrl) {
    console.error('❌ Missing input URL.');
    process.exit(1);
  }

  console.log(`🔍 Starting scrape worker for URL: ${inputUrl}`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    console.log('🧭 New browser page opened.');

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
    await page.setUserAgent(userAgent);
    console.log(`📱 User-Agent set to: ${userAgent}`);

    // Begin navigation
    console.log(`🌐 Navigating to input URL: ${inputUrl}`);
    const gotoPromise = page.goto(inputUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Try to extract post URL early while page is still loading
    let postUrl = null;
    try {
      postUrl = await Promise.race([
        page.waitForFunction(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const match = links.find(a => a.href && a.href.startsWith('https://www.reddit.com/r'));
          return match ? match.href : null;
        }, { polling: 'mutation', timeout: 8000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Post URL not found early.')), 8000))
      ]);

      if (postUrl && typeof postUrl.jsonValue === 'function') {
        postUrl = await postUrl.jsonValue(); // 🛠 Fix JSHandle to string
      }

      console.log(`🔁 Found early post URL: ${postUrl}`);
    } catch (e) {
      console.warn(`⚠️ Early post search failed: ${e.message}`);
    }

    await gotoPromise;
    console.log('✅ Initial page load complete.');

    const waitTime = 3000 + Math.random() * 2000;
    console.log(`⏳ Waiting ${Math.round(waitTime)}ms for dynamic content...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    if (postUrl) {
      if (!postUrl.startsWith('http')) {
        const base = new URL(inputUrl);
        postUrl = new URL(postUrl, base.origin).href;
        console.log(`🔧 Normalized relative post URL: ${postUrl}`);
      }

      console.log(`🌐 Navigating to Reddit post page: ${postUrl}`);
      await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log('✅ Post page loaded.');

      const waitTime2 = 3000 + Math.random() * 2000;
      console.log(`⏳ Waiting ${Math.round(waitTime2)}ms again...`);
      await new Promise(resolve => setTimeout(resolve, waitTime2));
    } else {
      console.warn('⚠️ Could not find post URL, staying on original page.');
    }

    const htmlContent = await page.content();
    console.log('📄 HTML content extracted.');

    const extractVideoUrl = (html) => {
      console.log('🎯 Searching for Reddit preview MP4 URL...');
      const match = html.match(/https:\/\/preview\.redd\.it\/[^\s"']+format=mp4[^\s"']*/g);
      if (!match) return undefined;
      const decoded = match[0].replace(/&amp;/g, '&');
      return `https://www.reddit.com/media?url=${encodeURIComponent(decoded)}`;
    };

    const finalUrl = extractVideoUrl(htmlContent);
    if (finalUrl) {
      console.log(`🚀 Final video URL: ${finalUrl}`);
      console.log(JSON.stringify({ videoUrl: finalUrl }));
    } else {
      console.warn('⚠️ No video URL found. Returning undefined.');
      console.log(JSON.stringify({ videoUrl: "undefined" }));
    }
  } catch (err) {
    console.error(`❌ Worker error: ${err.message}`);
    process.exit(1);
  } finally {
    console.log('🧹 Closing browser...');
    await browser.close();
    console.log('👋 Browser closed.');
  }
})();
