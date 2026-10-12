// 遊び方の「月日と勢い」「フォロワー」と、ランキング（サイド）を撮る
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
const [W, H] = (process.argv[2] || '1280x800').split('x').map(Number);
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700 })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));
  await page.click('#btnHelpTitle');
  await new Promise(r => setTimeout(r, 300));
  for (const [i, txt] of [[0, '投稿の規模は少しずつ育つ'], [1, '月日と勢い'], [2, '事務所からの連絡'], [3, '画面の見方']]) {
    await page.evaluate(t => { const h = [...document.querySelectorAll('#helpScreen h3')].find(x => x.textContent.trim() === t); h.scrollIntoView({ block: 'start' }); }, txt);
    await new Promise(r => setTimeout(r, 250));
    await page.screenshot({ path: `${OUT}/h-help${i}-${W}x${H}.png` });
  }
  await page.click('#helpClose');
  // 3ヶ月目まで早送りして、ランキングを開く
  await page.evaluate(() => {
    document.getElementById('sp-fast').checked = true; window.__autoHuman = true; window.__ff = true;
    const d = window.__dyn;
    d.runDynasty(d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' }));
  });
  for (let g = 0; g < 2; g++) {
    await page.waitForFunction(() => !document.getElementById('chronicle').hidden, null, { timeout: 300000 });
    await page.click('#btnNextGen');
  }
  await page.evaluate(() => { window.__ff = false; });
  await page.waitForFunction(() => window.__dyn.Feed.posts.length >= 2, null, { timeout: 200000 });
  await page.evaluate(() => { window.__dyn.Flow.paused = true; });
  await new Promise(r => setTimeout(r, 1500));
  await page.click('#btnHouses');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/h-side-${W}x${H}.png` });
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
