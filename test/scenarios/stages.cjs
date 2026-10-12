// 段階①〜⑤で、同じ札の文面と数字がどう育つか
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 800));
  const res = await page.evaluate(() => {
    const d = window.__dyn;
    d.Clock.era = 'peace';
    const ava = { st: 2, hc: 5, sk: 0, ey: 2, ac: 3, of: 1, oc: 4, th: 5 };
    const owners = [[1, 0], [4, 3000], [9, 20000], [18, 200000], [30, 800000]].map(([age, followers], k) => ({ id: 'st' + k, name: 'ひなた', handle: '@hinata_ch', ava, age, followers, ki: 1 }));
    const pool = d.CE.map(c => c.card);
    const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
    const lines = [];
    for (const s of [1, 0, 2, 3]) for (let r = 3; r <= 15; r++) {
      const c = pool.find(x => x.s === s && x.r === r);
      lines.push(`${'♠♥♦♣'[s]}${RANKS[r - 3].padEnd(2)} ` + owners.map(o => d.postInfo(c, o).title).join(' ｜ '));
    }
    const jk = pool.find(x => x.r === 16);
    lines.push('JK  ' + owners.map(o => d.postInfo(jk, o).title).join(' ｜ '));
    const pick = (s, r) => pool.find(x => x.s === s && x.r === r);
    const rows = [[2, 15], [1, 12], [0, 8], [3, 14]].map(([s, r]) => owners.map(o => d.faceURL(pick(s, r), o)));
    return { lines, rows };
  });
  fs.writeFileSync(`${OUT}/stages.txt`, res.lines.join('\n'));
  res.rows.forEach((row, i) => row.forEach((u, j) => fs.writeFileSync(`${OUT}/st-${i}-${j}.jpg`, Buffer.from(u.split(',')[1], 'base64'))));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
