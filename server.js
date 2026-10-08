const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.raw({ type: '*/*', limit: '10mb' }));

let browser = null;

// Initialize headless browser
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    console.log('Puppeteer Browser Started');
  }
}

app.use(async (req, res) => {
  let rawUrl = req.url;
  try {
    rawUrl = decodeURIComponent(rawUrl);
  } catch (e) {}

  if ((rawUrl === '/' || rawUrl === '') && req.method === 'GET') {
    return res.status(200).send('GD Proxy Server is Running!');
  }

  const match = rawUrl.match(/([a-zA-Z0-9_-]+\.php)/i);
  const endpoint = match ? match[1] : '';

  if (!endpoint) {
    return res.status(404).send('-1');
  }

  const targetUrl = `https://www.boomlings.com/database/${endpoint}`;
  console.log(`[PROXY REQUEST] ${req.method} -> ${targetUrl}`);

  try {
    await initBrowser();
    const page = await browser.newPage();

    // Prepare body content if POST
    const bodyString = (req.method === 'POST' && req.body && req.body.length > 0) 
      ? req.body.toString('utf-8') 
      : '';

    // Execute the request via full browser fetch context
    const responseData = await page.evaluate(async (url, method, bodyData) => {
      const opts = {
        method: method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };
      if (method === 'POST' && bodyData) {
        opts.body = bodyData;
      }

      const res = await fetch(url, opts);
      return {
        status: res.status,
        text: await res.text()
      };
    }, targetUrl, req.method, bodyString);

    await page.close();

    console.log(`[PROXY SUCCESS] ${req.method} ${targetUrl} -> HTTP ${responseData.status}`);

    res.status(responseData.status);
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.send(responseData.text);
  } catch (err) {
    console.error(`[PROXY ERROR] ${targetUrl}:`, err.message);
    res.status(500).send('-1');
  }
});

app.listen(PORT, async () => {
  console.log(`GD Proxy Server running on port ${PORT}`);
  await initBrowser();
});
