const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
app.use(express.json());

// Endpoint 1: /discover
app.post("/discover", async (req, res) => {
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

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const links = await page.$$eval("a", (as) =>
    as.map((a) => ({ text: a.innerText.trim(), href: a.href }))
  );

  const getUrl = (patterns) =>
    links.find((l) => new RegExp(patterns.join("|"), "i").test(l.href))?.href || null;

  const urls = {
    home: url,
    product: getUrl(["/product", "/producto", "/detalle", "/item"]),
    category: getUrl(["/category", "/collection", "/tienda", "/categoría"]),
    cart: getUrl(["/cart", "/carrito", "/cesta", "/basket"]),
    checkout: getUrl(["/checkout", "/finalizar", "/pago", "/compra"])
  };

  await browser.close();
  res.json({ urls });
});

// Endpoint 2: /scrape
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

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const html = await page.content();
  const screenshot = await page.screenshot({ encoding: "base64", fullPage: true });

  await browser.close();

  res.json({ url, html, screenshotBase64: screenshot });
});

app.get("/", (_, res) => res.send("🟢 Puppeteer API con /discover y /scrape activo"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("✅ Servidor en puerto " + PORT);
});