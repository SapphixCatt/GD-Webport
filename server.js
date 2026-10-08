const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all incoming browser requests
app.use(cors());

// Parse raw binary/text buffer bodies sent by GD POST calls
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.use(async (req, res) => {
  const rawUrl = req.url;

  // 1. Root diagnostic page: strictly return text ONLY on GET /
  if ((rawUrl === '/' || rawUrl === '') && req.method === 'GET') {
    return res.status(200).send('GD Proxy Server is Running!');
  }

  // 2. Extract the target PHP endpoint from path or query string
  let endpoint = '';
  if (req.query && req.query.url) {
    const decoded = decodeURIComponent(req.query.url);
    endpoint = decoded.split('/').pop();
  } else {
    const urlParts = rawUrl.split('?');
    const cleanPath = urlParts[0];
    const parts = cleanPath.split('/').filter(Boolean);
    endpoint = parts[parts.length - 1] || '';
  }

  // Ensure endpoint ends with .php
  if (!endpoint.endsWith('.php')) {
    endpoint += '.php';
  }

  const targetUrl = `https://www.boomlings.com/database/${endpoint}`;
  console.log(`[PROXY REQUEST] ${req.method} -> ${targetUrl}`);

  try {
    const headers = {
      'User-Agent': '',
      'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
      'Host': 'www.boomlings.com',
      'Accept': '*/*',
      'Connection': 'keep-alive'
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
