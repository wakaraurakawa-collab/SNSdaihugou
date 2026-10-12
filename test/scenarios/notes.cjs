// 人気者・覇権の月に通知が届くところを撮る
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
const [W, H] = (process.argv[2] || '1280x800').split('x').map(Number);
const title = process.argv[3] || '大富豪';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700 })).newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', e.message); });
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(t => {
    document.getElementById('sp-normal').checked = true;
    const d = window.__dyn;
    const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
    st.gen = 3;
    st.lastOrder = st.houses.map(h => h.id);
    const titles = t === '大富豪' ? ['大富豪', '富豪', '貧民', '大貧民'] : t === '平民' ? ['平民', '大富豪', '富豪', '大貧民'] : ['富豪', '大富豪', '貧民', '大貧民'];
    st.houses.forEach((h, i) => { h.lastTitle = titles[i]; h.followers = [52000, 31000, 9000, 120000][i]; h.power = [22, 18, 7, 3][i]; });
    window.__autoHuman = true;
    d.runDynasty(st);
  }, title);
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelectorAll('#notes .note').length >= 1, null, { timeout: 30000 }).catch(() => console.log('no toast in 30s'));
  console.log('first note after', Math.round((Date.now() - t0) / 1000), 's');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/n-toast-${W}x${H}.png` });
  // しばらく遊ばせて、届いた数を数える
  await new Promise(r => setTimeout(r, 40000));
  const st = await page.evaluate(() => { const N = window.__dyn.Notify; return { n: N.items.length, unread: N.unread, kinds: N.items.map(x => x.kind).join(','), texts: N.items.slice(0, 6).map(x => (x.from ? x.from.name : x.logo) + '：' + x.text) }; });
  console.log(JSON.stringify(st, null, 1));
  await page.evaluate(() => { window.__dyn.Flow.paused = true; });
  await page.click('#btnInbox');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${OUT}/n-inbox-${W}x${H}.png` });
  console.log('errors:', errors.length);
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
