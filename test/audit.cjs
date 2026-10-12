// 画面の総点検：タイトル・遊び方・メニュー・交換・結果・卒業・通知・ランキングを順に撮る
// node test/audit.cjs <width>x<height>   例: node test/audit.cjs 390x844
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('./_env.cjs');
const [W, H] = (process.argv[2] || '1280x800').split('x').map(Number);
const tag = `${W}x${H}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700 })).newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text()); } });
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await wait(600);
  const shot = async name => { await page.screenshot({ path: `${OUT}/a-${name}-${tag}.png` }); console.log('shot', name); };
  await shot('title');
  // 対局の設定を開く
  await page.evaluate(() => { document.querySelector('details.settings').open = true; });
  await wait(300);
  await shot('settings');
  await page.evaluate(() => { document.querySelector('details.settings').open = false; });
  // 遊び方（上と、表のあるところ）
  await page.click('#btnHelpTitle');
  await wait(400);
  await shot('help-top');
  await page.evaluate(() => { const h = [...document.querySelectorAll('#helpScreen h3')].find(x => x.textContent.trim() === '月日と勢い'); h.scrollIntoView({ block: 'start' }); });
  await wait(250);
  await shot('help-table');
  await page.click('#helpClose');
  // 2ヶ月目から始めて、交換の画面を撮る
  await page.evaluate(() => {
    document.getElementById('sp-fast').checked = true;
    const d = window.__dyn;
    const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
    st.gen = 3;
    st.lastOrder = st.houses.map(h => h.id);
    st.houses.forEach((h, i) => { h.lastTitle = ['大富豪', '富豪', '貧民', '大貧民'][i]; h.followers = [5200, 3100, 900, 1200][i]; h.power = [16, 12, 7, 4][i]; h.history = [1, 2].map(g => ({ gen: g, title: '平民', delta: 0, power: h.power, pos: 1, n: 4, fol: h.followers })); });
    d.runDynasty(st);
  });
  await page.waitForFunction(() => window.__dyn.UI.mode === 'give', null, { timeout: 200000 });
  await wait(700);
  await shot('give');
  await page.evaluate(() => { const d = window.__dyn; const f = d.UI.finish; if (f) f(); });
  await page.waitForFunction(() => window.__dyn.UI.mode === 'play', null, { timeout: 200000 });
  await wait(800);
  await shot('turn');
  // メニュー
  await page.click('#btnMenu');
  await wait(300);
  await shot('menu');
  await page.click('#mClose');
  // ランキング
  await page.click('#btnHouses');
  await wait(400);
  await shot('side');
  await page.click('#sideClose');
  // 通知の受信箱（空）
  await page.click('#btnInbox');
  await wait(300);
  await shot('inbox-empty');
  await page.click('#btnInbox');
  // 早送りで月末まで
  await page.evaluate(() => { window.__autoHuman = true; window.__ff = true; const d = window.__dyn; if (d.UI.finish) d.UI.finish(null); });
  await page.waitForFunction(() => !document.getElementById('chronicle').hidden, null, { timeout: 300000 });
  await wait(900);
  await shot('chronicle');
  // 卒業の画面（最後まで早送り）
  await page.evaluate(() => { const d = window.__dyn; d.dyn.houses.find(h => h.isPlayer).power = 1; });
  for (let k = 0; k < 12; k++) {
    const over = await page.evaluate(() => !document.getElementById('gameover').hidden);
    if (over) break;
    await page.click('#btnNextGen').catch(() => {});
    await page.waitForFunction(() => !document.getElementById('chronicle').hidden || !document.getElementById('gameover').hidden, null, { timeout: 300000 });
    await wait(400);
  }
  await wait(600);
  await shot('gameover');
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
