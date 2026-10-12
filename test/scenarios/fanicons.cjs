// ファンのアイコンの一覧（実寸32pxと拡大）を撮る
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  const data = await page.evaluate(() => {
    const d = window.__dyn;
    return d.fanIconKinds.map(k => ({ k, urls: [1, 2, 3, 4, 5, 6].map(s => d.fanIconURL({ kind: k, seed: s * 7919 + k.length })) }));
  });
  const size = +(process.argv[2] || 32);
  const html = `<body style="margin:0;padding:12px;background:#151a33;font:11px sans-serif;color:#ccd">` + data.map(row =>
    `<div style="display:flex;align-items:center;gap:8px;margin:0 0 6px"><span style="width:80px">${row.k}</span>` +
    row.urls.map(u => `<img src="${u}" style="width:${size}px;height:${size}px;border-radius:50%;box-shadow:0 0 0 1.5px rgba(255,255,255,.6)">`).join('') + `</div>`).join('') + `</body>`;
  const p2 = await (await browser.newContext({ viewport: { width: 120 + 6 * (size + 8), height: 30 + data.length * (size + 6) }, deviceScaleFactor: 2 })).newPage();
  await p2.setContent(html);
  await new Promise(r => setTimeout(r, 500));
  await p2.screenshot({ path: `${OUT}/fanicons-${size}.png`, fullPage: true });
  console.log('kinds', data.length, 'errors', errors.length, errors.slice(0, 2));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
