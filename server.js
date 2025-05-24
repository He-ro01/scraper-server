const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 5000;

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send({ error: 'Missing URL' });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Step 1: Find <a>View Post</a>
    const postUrl = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'View Post');
      return link ? link.href : null;
    });

    if (!postUrl) throw new Error('View Post link not found');

    // Step 2: Go to that post page
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

    // Step 3: Find <video> and get src
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.src : null;
    });

    if (!videoSrc) throw new Error('Video tag not found');

    res.json({ videoUrl: videoSrc });

  } catch (error) {
    res.status(500).send({ error: error.message });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
