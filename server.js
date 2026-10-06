const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());

// Parse raw binary/buffer bodies sent by GD
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use(express.static('.'));

app.use(async (req, res, next) => {
  const rawUrl = req.url;

  // Check if request is targeting proxy paths or PHP endpoints
  if (!rawUrl.includes('__proxy') && !rawUrl.includes('__gdproxy') && !rawUrl.includes('.php')) {
    return next();
  }

  let targetUrl = '';

  // Case 1: URL passed via query parameter (e.g. /__proxy?url=https%3A%2F%2F...)
  if (req.query && req.query.url) {
    targetUrl = decodeURIComponent(req.query.url);
  } else {
    // Case 2: Direct endpoint path (e.g. /getGJLevels21.php or /__gdproxy/getGJLevels21.php)
    let cleanPath = rawUrl.split('?')[0];
    let parts = cleanPath.split('/').filter(Boolean);
    let endpoint = parts[parts.length - 1] || '';

    if (!endpoint || endpoint === '__proxy' || endpoint === '__gdproxy') {
      return res.status(400).send('-1');
    }

    if (!endpoint.endsWith('.php')) {
      endpoint += '.php';
    }

    targetUrl = `https://www.boomlings.com/database/${endpoint}`;
  }

  console.log(`[PROXY REQUEST] ${req.method} -> ${targetUrl}`);

  try {
    const headers = {
      'User-Agent': '',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'www.boomlings.com'
    };

    const options = {
      method: req.method,
      headers: headers
    };

    if (req.method === 'POST' && req.body && req.body.length > 0) {
      options.body = req.body;
    }

    const response = await fetch(targetUrl, options);
    const data = await response.buffer();

    console.log(`[PROXY SUCCESS] ${req.method} ${targetUrl} -> HTTP ${response.status}`);

    res.status(response.status);
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.send(data);
  } catch (err) {
    console.error(`[PROXY ERROR] ${targetUrl}:`, err.message);
    res.status(500).send('-1');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(8080, () => {
  console.log('GD Proxy Server running at http://localhost:8080');
});