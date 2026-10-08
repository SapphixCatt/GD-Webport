const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use(async (req, res) => {
  let rawUrl = req.url;
  try {
    rawUrl = decodeURIComponent(rawUrl);
  } catch (e) {}

  // Root diagnostic status check
  if ((rawUrl === '/' || rawUrl === '') && req.method === 'GET') {
    return res.status(200).send('GD Proxy Server is Running!');
  }

  // Strictly match valid GD PHP endpoints
  const match = rawUrl.match(/([a-zA-Z0-9_-]+\.php)/i);
  const endpoint = match ? match[1] : '';

  if (!endpoint) {
    return res.status(404).send('-1');
  }

  const targetUrl = `https://www.boomlings.com/database/${endpoint}`;
  console.log(`[PROXY REQUEST] ${req.method} -> ${targetUrl}`);

  try {
    const headers = {
      'User-Agent': '',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'www.boomlings.com',
      'Accept': '*/*'
    };

    if (req.method === 'POST' && req.body && Buffer.isBuffer(req.body)) {
      headers['Content-Length'] = req.body.length.toString();
    }

    const options = {
      method: req.method,
      headers: headers
    };

    if (req.method === 'POST' && req.body && req.body.length > 0) {
      options.body = req.body;
    }

    const response = await fetch(targetUrl, options);
    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    console.log(`[PROXY SUCCESS] ${req.method} ${targetUrl} -> HTTP ${response.status}`);

    res.status(response.status);
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.send(data);
  } catch (err) {
    console.error(`[PROXY ERROR] ${targetUrl}:`, err.message);
    res.status(500).send('-1');
  }
});

app.listen(PORT, () => {
  console.log(`GD Proxy Server running on port ${PORT}`);
});
