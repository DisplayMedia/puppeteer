const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
app.use(express.json());

// Endpoint 1: /discover → analiza solo la home y detecta las URLs clave
app.post("/discover", async (req, res) => {
  const { url, mobile } = req.body;
  if (!url) return res.status(400).send("No URL provided");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  if (mobile) {
    const iPhone = puppeteer.devices["iPhone 12"];
    await page.emulate(iPhone);
  }

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const links = await page.$$eval("a", (as) =>
    as.map((a) => ({ text: a.innerText.trim(), href: a.href }))
  );

  const getUrl = (pattern) =>
    links.find((l) => new RegExp(pattern, "i").test(l.href))?.href || null;

  const urls = {
    home: url,
    product: getUrl("/product|producto"),
    category: getUrl("/category|collection|tienda"),
    cart: getUrl("/cart|carrito"),
    checkout: getUrl("/checkout")
  };

  await browser.close();

  res.json({ urls });
});

// Endpoint 2: /scrape → analiza una URL específica (producto, cart, etc.)
app.post("/scrape", async (req, res) => {
  const { url, mobile } = req.body;
  if (!url) return res.status(400).send("No URL provided");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  if (mobile) {
    const iPhone = puppeteer.devices["iPhone 12"];
    await page.emulate(iPhone);
  }

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const html = await page.content();
  const screenshot = await page.screenshot({ encoding: "base64", fullPage: true });

  await browser.close();

  res.json({
    url,
    html,
    screenshotBase64: screenshot
  });
});

app.get("/", (_, res) => res.send("🟢 Puppeteer API con /discover y /scrape activo"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("✅ Servidor en puerto " + PORT);
});