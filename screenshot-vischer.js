/**
 * Vischer.com Screenshot Tool
 * Nimmt Full-Page Screenshots aller Seiten und speichert sie als PNGs + kombinierte PDF
 *
 * Setup:  npm install puppeteer
 * Run:    node screenshot-vischer.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URLS = [
  { name: '01_home',           url: 'https://www.vischer.com/de' },
  { name: '02_expertise',      url: 'https://www.vischer.com/de/expertise' },
  { name: '03_employment',     url: 'https://www.vischer.com/de/expertise/employment' },
  { name: '04_startup-desk',   url: 'https://www.vischer.com/de/services/startup-desk' },
  { name: '05_insights',       url: 'https://www.vischer.com/de/insights?page=1&per=15' },
  { name: '06_team',           url: 'https://www.vischer.com/de/team?page=1&per=16' },
  { name: '07_uber-uns',       url: 'https://www.vischer.com/de/uber-uns' },
  { name: '08_innovation-lab', url: 'https://www.vischer.com/de/vischer-legal-innovation-lab' },
  { name: '09_careers',        url: 'https://www.vischer.com/de/careers' },
];

const OUT_DIR = path.join(__dirname, 'vischer-screenshots');
const VIEWPORT = { width: 1440, height: 900 };

async function waitForNetworkIdle(page, timeout = 3000) {
  await page.waitForNetworkIdle({ idleTime: timeout }).catch(() => {});
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=de-DE'],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });

  const screenshots = [];

  for (const { name, url } of URLS) {
    console.log(`📸 Screenshot: ${name}  →  ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForNetworkIdle(page);

      // Cookie-Banner wegklicken falls vorhanden
      try {
        await page.click('[id*="accept"], [class*="accept"], [class*="cookie"] button', { timeout: 2000 });
        await new Promise(r => setTimeout(r, 500));
      } catch (_) {}

      const file = path.join(OUT_DIR, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      screenshots.push({ name, file });
      console.log(`   ✓ Gespeichert: ${file}`);
    } catch (err) {
      console.error(`   ✗ Fehler bei ${url}:`, err.message);
    }
  }

  // --- Kombinierte PDF erstellen ---
  if (screenshots.length > 0) {
    console.log('\n📄 Erstelle kombinierte PDF...');
    const pdfPath = path.join(OUT_DIR, 'vischer-alle-seiten.pdf');

    const pdfPage = await browser.newPage();
    await pdfPage.setContent(`
      <html>
      <head><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; }
        .page { page-break-after: always; display:flex; justify-content:center; }
        img { max-width:100%; height:auto; display:block; }
      </style></head>
      <body>
        ${screenshots.map(s => `
          <div class="page">
            <img src="file://${s.file}" />
          </div>
        `).join('')}
      </body>
      </html>
    `);

    await pdfPage.pdf({
      path: pdfPath,
      printBackground: true,
      format: 'A4',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.log(`✅ PDF gespeichert: ${pdfPath}`);
    await pdfPage.close();
  }

  await browser.close();

  console.log(`\n🎉 Fertig! ${screenshots.length}/${URLS.length} Seiten erfasst.`);
  console.log(`📁 Ordner: ${OUT_DIR}`);
  console.log(`\nDateien für Claude Design:`);
  screenshots.forEach(s => console.log(`   ${s.file}`));
  if (screenshots.length > 0) {
    console.log(`   ${path.join(OUT_DIR, 'vischer-alle-seiten.pdf')}`);
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
