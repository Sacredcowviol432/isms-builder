#!/usr/bin/env node
/**
 * Screenshot generator for ISMS Builder
 * Usage: node tools/make-screenshots.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

const BASE = 'https://localhost:3000';
const OUT  = path.join(__dirname, '..', 'docs', 'screenshots');
const W    = 1440;
const H    = 900;

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function shot(page, filename, label) {
  const dest = path.join(OUT, filename);
  return page.screenshot({ path: dest, fullPage: false }).then(() => {
    console.log('OK ' + label + ' → ' + dest);
  });
}

async function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'admin@example.com', password: 'adminpass' });
    const req = https.request({
      hostname: 'localhost', port: 3000, path: '/login',
      method: 'POST', rejectUnauthorized: false,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      let cookie = '';
      res.headers['set-cookie']?.forEach(c => { if (c.includes('sm_session')) cookie = c.split(';')[0]; });
      res.on('data', d => { data += d; });
      res.on('end', () => resolve({ data: JSON.parse(data), cookie }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function navigateTo(page, section, delay) {
  await page.evaluate((s) => {
    const el = document.querySelector('[data-section="' + s + '"]');
    if (el) el.click();
  }, section);
  await new Promise(r => setTimeout(r, delay || 2000));
}

(async () => {
  // Get session cookie via API
  console.log('Logging in via API...');
  const { cookie } = await apiLogin();
  if (!cookie) { console.error('Login failed — no cookie'); process.exit(1); }
  console.log('Got session cookie.');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  try {
    // --- 01: Login page ---
    await page.goto(BASE + '/ui/login.html', { waitUntil: 'networkidle2', timeout: 20000 });
    await shot(page, '01-login.png', 'Login page');

    // Inject session cookie and go directly to app
    const cookieParts = cookie.split('=');
    await page.setCookie({
      name: cookieParts[0],
      value: cookieParts.slice(1).join('='),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: true,
    });

    // --- 02: Dashboard ---
    await page.goto(BASE + '/ui/index.html', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));
    await shot(page, '02-dashboard.png', 'Dashboard');

    // --- 03: Templates ---
    await navigateTo(page, 'templates');
    await shot(page, '03-templates.png', 'Policy Templates');

    // --- 04: SoA ---
    await navigateTo(page, 'soa', 2500);
    await shot(page, '04-soa.png', 'Statement of Applicability');

    // --- 05: Risks ---
    await navigateTo(page, 'risks');
    await shot(page, '05-risks.png', 'Risk Management');

    // --- 06: Goals ---
    await navigateTo(page, 'goals');
    await shot(page, '06-goals.png', 'Security Goals');

    // --- 07: Assets ---
    await navigateTo(page, 'assets');
    await shot(page, '07-assets.png', 'Asset Management');

    // --- 08: GDPR ---
    await navigateTo(page, 'gdpr');
    await shot(page, '08-gdpr.png', 'GDPR & Datenschutz');

    // --- 09: Legal ---
    await navigateTo(page, 'legal');
    await shot(page, '09-legal.png', 'Legal & Contracts');

    // --- 10: Suppliers ---
    await navigateTo(page, 'suppliers');
    await shot(page, '10-suppliers.png', 'Supplier Management');

    // --- 11: BCM ---
    await navigateTo(page, 'bcm');
    await shot(page, '11-bcm.png', 'BCM / BCP');

    // --- 12: Training ---
    await navigateTo(page, 'training');
    await shot(page, '12-training.png', 'Training Records');

    // --- 13: Guidance ---
    await navigateTo(page, 'guidance');
    await shot(page, '13-guidance.png', 'Guidance / Documentation');

    // --- 14: Reports ---
    await navigateTo(page, 'reports');
    await shot(page, '14-reports.png', 'Reports');

    // --- 15: Calendar ---
    await navigateTo(page, 'calendar');
    await shot(page, '15-calendar.png', 'Calendar');

    // --- 16: Incident ---
    await navigateTo(page, 'incident');
    await shot(page, '16-incident.png', 'Incident Inbox');

    // --- 17: Admin ---
    await navigateTo(page, 'admin', 2500);
    await shot(page, '17-admin.png', 'Admin Panel');

    // --- 18: Settings ---
    await navigateTo(page, 'settings');
    await shot(page, '18-settings.png', 'Personal Settings');

    const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png') && !f.startsWith('_'));
    console.log('\nDone! ' + files.length + ' screenshots saved to ' + OUT);

  } catch (err) {
    console.error('Error:', err.message);
    await shot(page, '_error.png', 'Error state').catch(() => {});
  } finally {
    await browser.close();
  }
})();
