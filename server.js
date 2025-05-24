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

    // Go to the initial URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Print whole HTML of the initial page
    const htmlContent = await page.content();
    console.log('--- Initial Page HTML ---');
    console.log(htmlContent);

    // Step 1: Find <a>View Post</a> link and get href
    const postUrl = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'View Post');
      return link ? link.href : null;
    });

    if (!postUrl) throw new Error('View Post link not found');

    // Go to the post page
    await page.goto(postUrl, { waitUntil: 'domcontentloaded' });

    // Print whole HTML of the post page
    const postHtml = await page.content();
    console.log('--- Post Page HTML ---');
    console.log(postHtml);

    // Step 3: Find <video> and get src
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.src : null;
    });

    if (!videoSrc) throw new Error('Video tag not found');

    // Send video URL as JSON response
    res.json({ videoUrl: videoSrc });

  } catch (error) {
    res.status(500).send({ error: error.message });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
