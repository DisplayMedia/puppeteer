const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { url, mobile } = req.body;
  if (!url) return res.status(400).send("No URL provided");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  if (mobile) {
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1");
    await page.setViewport({ width: 375, height: 812, isMobile: true });
  }

  let totalSize = 0;
  let requestCount = 0;
  page.on('response', async (response) => {
    try {
      const buffer = await response.buffer();
      totalSize += buffer.length;
      requestCount++;
    } catch (e) {}
  });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const html = await page.content();
  const screenshot = await page.screenshot({ encoding: "base64", fullPage: true });

  const performanceTiming = await page.evaluate(() => {
    const t = performance.timing;
    return {
      dnsLookup: t.domainLookupEnd - t.domainLookupStart,
      tcpConnectionTime: t.connectEnd - t.connectStart,
      timeToFirstByte: t.responseStart - t.requestStart,
      domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
      loadEventTime: t.loadEventEnd - t.loadEventStart,
      totalLoadTime: t.loadEventEnd - t.navigationStart
    };
  });

  const meta = await page.evaluate(() => {
    return {
      title: document.querySelector('title')?.innerText || null,
      description: document.querySelector('meta[name="description"]')?.content || null
    };
  });

  const headings = await page.evaluate(() => ({
    h1: Array.from(document.querySelectorAll('h1')).map(e => e.innerText),
    h2: Array.from(document.querySelectorAll('h2')).map(e => e.innerText),
    h3: Array.from(document.querySelectorAll('h3')).map(e => e.innerText)
  }));

  const imageAlts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt || "ALT vacío"
    }));
  });

  const trackingScripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]')).filter(script => {
      const src = script.src.toLowerCase();
      return src.includes("google-analytics") || src.includes("gtag") || src.includes("facebook") || src.includes("hotjar") || src.includes("clarity");
    }).map(script => script.src);
  });

  const accessibility = await page.evaluate(() => {
    const imagesSinAlt = Array.from(document.querySelectorAll('img')).filter(img => !img.alt).length;
    const linksSinText = Array.from(document.querySelectorAll('a')).filter(a => !a.innerText.trim()).length;
    return { imagesSinAlt, linksSinText };
  });

  const funnelSimulation = await page.evaluate(() => {
    return {
      hasProductLinks: !!document.querySelector('a[href*="product"], a[href*="producto"]'),
      hasCartLink: !!document.querySelector('a[href*="cart"], a[href*="carrito"]'),
      hasCheckoutLink: !!document.querySelector('a[href*="checkout"], a[href*="pago"]')
    };
  });

  await browser.close();

  res.json({
    url,
    html,
    screenshotBase64: screenshot,
    performance: performanceTiming,
    requests: {
      count: requestCount,
      totalBytesKB: (totalSize / 1024).toFixed(2)
    },
    meta,
    headings,
    imageAlts,
    trackingScripts,
    accessibility,
    funnelSimulation
  });
});

app.get("/", (_, res) => res.send("🟢 Puppeteer API con análisis completo activo"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("✅ Servidor en puerto " + PORT);
});