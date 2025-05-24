const express = require('express');
const { spawn } = require('child_process');

const app = express();
const PORT = 5000;

app.get('/scrape', async (req, res) => {
  const { urls } = req.query;
  if (!urls) return res.status(400).json({ error: 'Missing URLs' });

  const urlArray = Array.isArray(urls) ? urls : urls.split(',');

  const scrapePromises = urlArray.map((url, index) => {
    return new Promise((resolve) => {
      const term = spawn('node', ['scrapeWorker.js', url], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      console.log(`🔄 Starting worker ${index + 1} for: ${url}`);

      let jsonOutput = '';
      let stderrData = '';

      term.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            jsonOutput = JSON.stringify(parsed); // Only capture valid JSON line
          } catch {
            console.log(`📝 Worker ${index + 1} log: ${trimmed}`);
          }
        }
      });

      term.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      term.on('exit', (code) => {
        if (code !== 0) {
          console.error(`⚠️ Worker ${index + 1} exited with code ${code}`);
          console.error(`❌ Worker ${index + 1} stderr:\n${stderrData}`);
          resolve({ url, error: stderrData.trim() || `Worker exited with code ${code}` });
          return;
        }

        console.log(`✅ Worker ${index + 1} completed.`);

        try {
          const result = JSON.parse(jsonOutput);
          resolve({ url, ...result });
        } catch (e) {
          console.error(`❌ JSON parse error from worker ${index + 1}: ${e.message}`);
          resolve({ url, videoUrl: "undefined" });
        }
      });
    });
  });

  const results = await Promise.all(scrapePromises);
  res.json({ results });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
