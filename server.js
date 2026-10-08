const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use(async (req, res) => {
  let rawUrl = req.url;
  try {
    rawUrl = decodeURIComponent(rawUrl);
  } catch (e) {}

  // Root status check
  if ((rawUrl === '/' || rawUrl === '') && req.method === 'GET') {
    return res.status(200).send('GD Proxy Server is Running!');
  }

  // Extract PHP endpoint
  const match = rawUrl.match(/([a-zA-Z0-9_-]+\.php)/i);
  const endpoint = match ? match[1] : '';

  if (!endpoint) {
    return res.status(404).send('-1');
  }

  const targetUrl = `https://www.boomlings.com/database/${endpoint}`;
  console.log(`[PROXY REQUEST] ${req.method} -> ${targetUrl}`);

  try {
    // Dynamic import for ESM package got-scraping
    const { gotScraping } = await import('got-scraping');

    const options = {
      url: targetUrl,
      method: req.method,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'GeometryDash/2.200',
        'host': 'www.boomlings.com',
        'accept': '*/*'
      },
      headerGeneratorOptions: {
        browsers: [{ name: 'chrome', minVersion: 110 }],
        devices: ['desktop'],
        locales: ['en-US'],
        operatingSystems: ['windows']
      },
      responseType: 'buffer',
      throwHttpErrors: false
    };

    if (req.method === 'POST' && req.body && req.body.length > 0) {
      options.body = req.body;
    }

    const response = await gotScraping(options);

    console.log(`[PROXY SUCCESS] ${req.method} ${targetUrl} -> HTTP ${response.statusCode}`);

    res.status(response.statusCode);
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.send(response.body);
  } catch (err) {
    console.error(`[PROXY ERROR] ${targetUrl}:`, err.message);
    res.status(500).send('-1');
  }
});

app.listen(PORT, () => {
  console.log(`GD Proxy Server running on port ${PORT}`);
});
