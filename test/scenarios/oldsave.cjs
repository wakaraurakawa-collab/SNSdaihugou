// 前の版の保存データ（フォロワーなし）を読み込めるか
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  // 6ヶ月目の古い記録を作る（フォロワーの項目を消す）
  await page.evaluate(() => {
    const d = window.__dyn;
    const st = d.createDynasty({ houseName: 'ふるい', roma: 'old', handle: '@old' });
    st.gen = 6;
    st.houses.forEach((h, i) => { delete h.followers; delete h.maxFollowers; delete h.ki; h.history = [1, 2, 3, 4, 5].map(g => ({ gen: g, title: '平民', delta: 0, power: h.power, pos: 1, n: 4 })); });
    delete st.lastKi;
    st.houses[2].founded = 3; st.houses[3].founded = 5;
    const gone = st.houses.pop(); gone.fallenGen = 4; delete gone.followers; st.fallen.push(gone);
    localStorage.setItem('sns-daifugo:dynasty', JSON.stringify(st));
    localStorage.setItem('sns-daifugo:best', JSON.stringify({ gens: 9, name: 'むかし', maxPower: 20 }));
  });
  await page.reload();
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1200));
  console.log('resume:', await page.evaluate(() => document.getElementById('btnResume').textContent));
  console.log('record:', await page.evaluate(() => document.getElementById('recordLine').textContent));
  await page.evaluate(() => { document.getElementById('sp-fast').checked = true; window.__autoHuman = true; });
  await page.click('#btnResume');
  await page.waitForFunction(() => window.__dyn.game && window.__dyn.Feed.posts.length >= 2, null, { timeout: 120000 });
  console.log('followers:', JSON.stringify(await page.evaluate(() => { const d = window.__dyn; return d.dyn.houses.concat(d.dyn.fallen).map(h => [h.name, h.followers, h.maxFollowers]); })));
  console.log('ki:', JSON.stringify(await page.evaluate(() => { const d = window.__dyn; return { lastKi: d.dyn.lastKi, clock: d.Clock && d.Clock.lastKi, houses: d.dyn.houses.concat(d.dyn.fallen).map(h => [h.name, h.founded, h.ki]) }; })));
  console.log('meta:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.win .w-meta, .win .meta')].map(e => e.textContent))));
  console.log('window numbers:', JSON.stringify(await page.evaluate(() => window.__dyn.Wins.filter(Boolean).map(W => W.fn.textContent))));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
