const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
const app = express();
const PORT = 5000;

// Replace these with your proxiyum proxy info:
const proxyServer = 'http://proxy-address:port'; // e.g. 'http://123.45.67.89:8080'
const proxyUsername = 'your-username';          // if no auth, leave as ''
const proxyPassword = 'your-password';          // if no auth, leave as ''

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send({ error: 'Missing URL' });

  console.log('✅ Starting Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${proxyServer}`
    ],
  });

  try {
    const page = await browser.newPage();

    if (proxyUsername && proxyPassword) {
      await page.authenticate({
        username: proxyUsername,
        password: proxyPassword
      });
      console.log('🔐 Proxy authentication set');
    }

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    console.log(`🌐 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    console.log('🕒 Initial page loaded, simulating human pause...');

    console.log('🔍 Searching for first matching <a> tag...');
    const prefix = 'https://www.heroscrape.com/r';

    let postUrl = await page.evaluate((prefix) => {
      const links = Array.from(document.querySelectorAll('a'));
      const found = links.find(link => link.href && link.href.startsWith(prefix));
      return found ? found.href : null;
    }, prefix);

    if (!postUrl) {
      console.log('⚠️ No "View Post" link found. Assuming current page is the post page.');

      const htmlContent = await page.content();
      const match = htmlContent.match(/https:\/\/preview\.he\.ro\/[^\s"']+\.mp4/);

      if (!match) {
        console.log('❌ No video link found on current page');
        throw new Error('MP4 video link not found in page HTML');
      }

      const videoUrl = match[0];
      console.log('🎉 Video URL extracted directly:', videoUrl);
      res.json({ videoUrl });

    } else {
      console.log('✅ "View Post" URL found:', postUrl);

      if (!postUrl.startsWith('http')) {
        const base = new URL(url);
        postUrl = new URL(postUrl, base.origin).href;
        console.log('🧠 Converted to full URL:', postUrl);
      }

      console.log(`📦 Navigating to post page: ${postUrl}`);
      await page.goto(postUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      console.log('🕒 Post page loaded, simulating human pause...');

      const postHtml = await page.content();
      const match = postHtml.match(/https:\/\/preview\.redd\.it\/[^\s"']+\.mp4/);

      if (!match) {
        console.log('❌ No video link found on post page');
        throw new Error('MP4 video link not found on post page');
      }

      const videoUrl = match[0];
      console.log('🎉 Video URL extracted from post page:', videoUrl);
      res.json({ videoUrl });
    }

  } catch (error) {
    console.error('❌ Scraping error:', error);
    res.status(500).send({ error: error.message });
  } finally {
    console.log('🧹 Closing browser...');
    await browser.close();
    console.log('✅ Done.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
