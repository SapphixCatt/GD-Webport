const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Parse raw binary/buffer bodies sent by GD
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use(async (req, res, next) => {
  const rawUrl = req.url;

  if (rawUrl === '/' || rawUrl === '') {
    return res.status(200).send('GD Proxy Server is Running!');
  }

  if (!rawUrl.includes('__proxy') && !rawUrl.includes('__gdproxy') && !rawUrl.includes('.php')) {
    return next();
  }

  let targetUrl = '';

  if (req.query && req.query.url) {
    targetUrl = decodeURIComponent(req.query.url);
  } else {
    const urlParts = rawUrl.split('?');
    const queryString = urlParts[1] ? `?${urlParts[1]}` : '';
    let cleanPath = urlParts[0];
    
    let parts = cleanPath.split('/').filter(Boolean);
    let endpoint = parts[parts.length - 1] || '';

    if (!endpoint || endpoint === '__proxy' || endpoint === '__gdproxy') {
      return res.status(400).send('-1');
    }

    if (!endpoint.endsWith('.php')) {
      endpoint += '.php';
    }

    targetUrl = `https://www.boomlings.com/database/${endpoint}${queryString}`;
  }

  console.log(`[PROXY REQUEST] ${req.method} -> ${targetUrl}`);

  try {
    const headers = {
      'User-Agent': 'GeometryDash/2.2',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'www.boomlings.com',
      'Accept': '*/*',
      'Connection': 'keep-alive'
    };

    const options = {
      method: req.method,
      headers: headers
    };

    if (req.method === 'POST' && req.body && Buffer.isBuffer(req.body)) {
      options.body = req.body;
      headers['Content-Length'] = req.body.length.toString();
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
