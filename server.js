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

  if ((rawUrl === '/' || rawUrl === '') && req.method === 'GET') {
    return res.status(200).send('Proxy Running');
  }

  const match = rawUrl.match(/([a-zA-Z0-9_-]+\.php)/i);
  const endpoint = match ? match[1] : '';

  if (!endpoint) {
    return res.status(404).send('-1');
  }

  const targetUrl = `https://www.boomlings.com/database/${endpoint}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': ''
      },
      body: req.method === 'POST' ? req.body : undefined
    });

    const data = await response.buffer();
    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).send('-1');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
