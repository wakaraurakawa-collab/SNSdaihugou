// 規模の段階が上がる月（STAGE UP の告知・マネージャーの連絡）と、月末のハイライトを撮る
// node test/stageup.cjs <width>x<height>
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('./_env.cjs');
const [W, H] = (process.argv[2] || '1280x800').split('x').map(Number);
const tag = `${W}x${H}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700 })).newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text()); } });
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    document.getElementById('sp-fast').checked = true;
    const d = window.__dyn;
    const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
    st.gen = 7;     // 7ヶ月目・登録者1万 → 中堅（③）に上がる月
    st.lastOrder = st.houses.map(h => h.id);
    st.houses.forEach((h, i) => { h.lastTitle = ['大富豪', '富豪', '貧民', '大貧民'][i]; h.followers = [12000, 3100, 900, 1200][i]; h.power = [16, 12, 7, 9][i]; h.history = [1, 2, 3, 4, 5, 6].map(g => ({ gen: g, title: '平民', delta: 0, power: h.power, pos: 1, n: 4, fol: h.followers })); });
    st.houses[0].stageSeen = 2;
    window.__autoHuman = true;
    d.runDynasty(st);
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.decree .ja')].some(e => e.textContent.includes('入り')), null, { timeout: 30000 }).catch(() => console.log('no stage-up proclaim'));
  await wait(500);
  await page.screenshot({ path: `${OUT}/su-proclaim-${tag}.png` });
  await page.waitForFunction(() => document.querySelectorAll('#notes .note').length >= 1, null, { timeout: 30000 }).catch(() => console.log('no toast'));
  await wait(400);
  await page.screenshot({ path: `${OUT}/su-toast-${tag}.png` });
  console.log('notes', JSON.stringify(await page.evaluate(() => window.__dyn.Notify.items.map(x => x.text))));
  await page.evaluate(() => { window.__ff = true; });
  await page.waitForFunction(() => !document.getElementById('chronicle').hidden, null, { timeout: 300000 });
  await wait(900);
  await page.screenshot({ path: `${OUT}/su-chronicle-${tag}.png` });
  console.log('highlights', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#chronHi .hi-row')].map(r => r.innerText.replace(/\n+/g, ' / ')))));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
