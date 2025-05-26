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
    const iPhone = puppeteer.devices["iPhone 12"];
    await page.emulate(iPhone);
  }

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const html = await page.content();

  const links = await page.$$eval("a", (as) =>
    as.map((a) => ({ text: a.innerText.trim(), href: a.href }))
  );

  const screenshot = await page.screenshot({ encoding: "base64", fullPage: true });

  await browser.close();

  res.json({
    html,
    links,
    screenshotBase64: screenshot
  });
});

app.get("/", (_, res) => res.send("🟢 Puppeteer API lista"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Servidor en puerto " + PORT);
});