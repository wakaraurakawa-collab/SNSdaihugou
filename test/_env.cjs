// 画面テストの共通設定（撮った画像の置き場・ローカルサーバー・ブラウザの場所・フォント）
//   SHOT_OUT   : 画像の出力先（既定 test/_shots）
//   SHOT_BASE  : ローカルサーバー（既定 http://127.0.0.1:8766。`npm run serve` で立つ）
//   CHROME_PATH: Chromium の実行ファイル。未指定なら playwright-core が知っている場所（`npx playwright install chromium` で入る）
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const OUT = process.env.SHOT_OUT || path.join(__dirname, '_shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:8766';
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    for (const d of fs.readdirSync(root)) if (/^chromium-\d+$/.test(d)) cands.push(path.join(root, d, 'chrome-linux', 'chrome'), path.join(root, d, 'chrome-linux', 'headless_shell'));
  }
  cands.push(...['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/opt/google/chrome/chrome']);
  for (const c of cands) if (fs.existsSync(c)) return c;
  try { return chromium.executablePath(); } catch (e) { return undefined; }
}
const CHROME = findChrome();
// Google Fonts の代わりに node_modules の @fontsource を読む（ネットに出ない）
const FONT_CSS = ['m-plus-rounded-1c/500.css', 'm-plus-rounded-1c/700.css', 'm-plus-rounded-1c/800.css', 'dela-gothic-one/400.css', 'dotgothic16/400.css']
  .map(f => `@import url("${BASE}/node_modules/@fontsource/${f}");`).join('\n');
async function fontRoutes(page) {
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS }));
  await page.route(/fonts\.gstatic\.com/, r => r.abort());
}
module.exports = { OUT, BASE, CHROME, FONT_CSS, fontRoutes };
