/**
 * Vischer → Figma: Screenshot & Server
 *
 * 1. Macht JPEG-Screenshots aller 9 Seiten (Puppeteer)
 * 2. Startet lokalen HTTP-Server (localhost:3456)
 * 3. Öffne danach das Figma-Plugin (vischer-to-figma/) in Figma Desktop
 *
 * Setup:
 *   cd vischer-to-figma
 *   npm install
 *
 * Run:
 *   node generate.js
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PAGES = [
  { name: 'Home',              slug: '01_home',           url: 'https://www.vischer.com/de' },
  { name: 'Expertise',         slug: '02_expertise',      url: 'https://www.vischer.com/de/expertise' },
  { name: 'Employment',        slug: '03_employment',     url: 'https://www.vischer.com/de/expertise/employment' },
  { name: 'Startup Desk',      slug: '04_startup-desk',   url: 'https://www.vischer.com/de/services/startup-desk' },
  { name: 'Insights',          slug: '05_insights',       url: 'https://www.vischer.com/de/insights?page=1&per=15' },
  { name: 'Team',              slug: '06_team',           url: 'https://www.vischer.com/de/team?page=1&per=16' },
  { name: 'Über uns',          slug: '07_uber-uns',       url: 'https://www.vischer.com/de/uber-uns' },
  { name: 'Innovation Lab',    slug: '08_innovation-lab', url: 'https://www.vischer.com/de/vischer-legal-innovation-lab' },
  { name: 'Careers',           slug: '09_careers',        url: 'https://www.vischer.com/de/careers' },
];

const OUT_DIR  = path.join(__dirname, 'screenshots');
const PORT     = 3456;
const VIEWPORT = { width: 1440, height: 900 };

// ── Screenshots ──────────────────────────────────────────────────────────────

async function takeScreenshots() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=de-DE'],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });

  const manifest = [];

  for (const entry of PAGES) {
    console.log(`📸  ${entry.name}  →  ${entry.url}`);
    try {
      await page.goto(entry.url, { waitUntil: 'networkidle2', timeout: 45000 });

      // Cookie-Banner wegklicken
      try {
        const selectors = [
          '[id*="cookie"] button[class*="accept"]',
          '[class*="cookie-accept"]',
          'button[id*="accept"]',
        ];
        for (const sel of selectors) {
          const el = await page.$(sel);
          if (el) { await el.click(); break; }
        }
        await new Promise(r => setTimeout(r, 600));
      } catch (_) {}

      // Tatsächliche Seitenhöhe ermitteln
      const dims = await page.evaluate(() => ({
        width:  Math.max(document.documentElement.scrollWidth,  1440),
        height: Math.max(document.documentElement.scrollHeight, 900),
      }));

      await page.setViewport({ width: dims.width, height: dims.height });

      const file = path.join(OUT_DIR, `${entry.slug}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 85, fullPage: true });

      await page.setViewport(VIEWPORT); // zurücksetzen für nächste Seite

      manifest.push({ name: entry.name, slug: entry.slug, width: dims.width, height: dims.height });
      console.log(`   ✓  ${dims.width} × ${dims.height}px`);
    } catch (err) {
      console.error(`   ✗  Fehler: ${err.message}`);
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅  ${manifest.length} Seiten gespeichert.\n`);
  return manifest;
}

// ── HTTP-Server ───────────────────────────────────────────────────────────────

function startServer() {
  const server = http.createServer((req, res) => {
    const parsed   = url.parse(req.url);
    const filePath = path.join(OUT_DIR, parsed.pathname === '/' ? 'manifest.json' : parsed.pathname);

    if (!filePath.startsWith(OUT_DIR)) {
      res.writeHead(403); res.end(); return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404); res.end(); return;
    }

    const ext  = path.extname(filePath);
    const mime = { '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log('─'.repeat(55));
    console.log(`🌐  Server läuft auf  http://localhost:${PORT}`);
    console.log('─'.repeat(55));
    console.log('');
    console.log('Nächste Schritte:');
    console.log('  1. Öffne Figma Desktop');
    console.log('  2. Rechtsklick → Plugins → Development → Import plugin from manifest');
    console.log(`  3. Wähle:  ${path.resolve(__dirname, 'manifest.json')}`);
    console.log('  4. Plugin ausführen → alle 9 Seiten werden importiert');
    console.log('');
    console.log('Server läuft … CTRL+C zum Beenden (erst nach Plugin-Import)');
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  await takeScreenshots();
  startServer();
})();
