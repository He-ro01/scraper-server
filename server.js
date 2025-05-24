const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());
const app = express();
const PORT = 5000;

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send({ error: 'Missing URL' });

  console.log('✅ Starting Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    console.log(`🌐 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    console.log('🕒 Initial page loaded, simulating human pause...');

    console.log('🔍 Searching for first matching <a> tag...');
    const prefix = 'https://www.heroscrape.com/r';

    const postUrl = await page.evaluate((prefix) => {
      const links = Array.from(document.querySelectorAll('a'));
      const found = links.find(link => link.href && link.href.startsWith(prefix));
      return found ? found.href : null;
    }, prefix);

    if (!postUrl) {
      console.log('⚠️ No matching post URL found');
      throw new Error('View Post link not found');
    }

    console.log('✅ Post URL found:', postUrl);

    let fullPostUrl = postUrl;
    if (!postUrl.startsWith('http')) {
      const base = new URL(url);
      fullPostUrl = new URL(postUrl, base.origin).href;
      console.log('🧠 Converted to full URL:', fullPostUrl);
    }

    console.log(`📦 Navigating to post page: ${fullPostUrl}`);
    await page.goto(fullPostUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    console.log('🕒 Post page loaded, simulating human pause...');

    // Save HTML to cache.html
    const htmlContent = await page.content();
    const filePath = path.join(__dirname, 'cache.html');
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    console.log('📝 Saved initial page HTML to cache.html');

    // Extract video URL from cached HTML content
    const rawHtml = fs.readFileSync(filePath, 'utf-8');
    const match = rawHtml.match(/https:\/\/preview\.redd\.it\/[^\s"']+\.mp4/);


    if (!match || !match[1]) {
      console.log('❌ No video link found with prefix hero.preview/ and containing .mp4');
      throw new Error('MP4 video link not found in cached HTML');
    }

    const videoPath = match[1];
    const baseUrl = new URL(fullPostUrl);
    const fullVideoUrl = `${baseUrl.origin}/${videoPath}`;

    console.log('🎉 Video URL extracted from cache:', fullVideoUrl);
    res.json({ videoUrl: fullVideoUrl });

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
