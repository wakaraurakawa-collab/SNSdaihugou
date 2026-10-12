// 卒業の危機の月：告知・運営とマネージャーの連絡・自分の欄の印を撮る
// node danger.cjs 1280x800 [power] [streak] [falling]
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
const [W, H] = (process.argv[2] || '1280x800').split('x').map(Number);
const power = +(process.argv[3] || 2), streak = +(process.argv[4] || 2), tag = process.argv[5] || 'a', speed = process.argv[6] || 'normal';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700 })).newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  if (tag === 'idle') await page.evaluate(() => { window.__idleTest = true; });
  await page.evaluate(([power, streak, speed]) => {
    document.getElementById('sp-' + speed).checked = true;
    const d = window.__dyn;
    const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
    st.gen = 5;
    st.era = { key: 'rivals', left: 2, num: 2 };
    const ids = st.houses.map(h => h.id);
    st.lastOrder = ids.slice(1).concat(ids[0]);
    const me = st.houses[0];
    if (streak < 0) {
      // 覇権が -streak ヶ月続いている
      const n = -streak;
      me.power = power; me.maxPower = power; me.poorStreak = 0; me.lastTitle = '大富豪'; me.followers = 42000;
      me.history = [1, 2, 3, 4].map(g => ({ gen: g, title: g > 4 - n ? '大富豪' : '平民', delta: g > 4 - n ? 3 : -1, power: 10 + g * 2, pos: 0, n: 4, fol: 9000 * g }));
      st.lastOrder = ids;
      st.houses.forEach((h, i) => { if (i) { h.power = 12; h.lastTitle = ['富豪', '貧民', '大貧民'][i - 1]; h.followers = 3000 * i; } });
    } else {
    me.power = power; me.maxPower = 12; me.poorStreak = streak; me.lastTitle = streak ? '大貧民' : '平民'; me.followers = 4200;
    me.history = [1, 2, 3, 4].map(g => ({ gen: g, title: g < 3 ? '平民' : '大貧民', delta: -1 - g, power: 12 - g * 2, pos: 3, n: 4, fol: 1000 * g }));
    st.houses.forEach((h, i) => { if (i) { h.power = 12; h.lastTitle = ['大富豪', '富豪', '貧民'][i - 1]; h.followers = 3000 * i; } });
    }
    window.__autoHuman = !window.__idleTest;
    d.runDynasty(st);
  }, [power, streak, speed]);
  await wait(1500);
  await page.screenshot({ path: `${OUT}/dg-${tag}-proclaim-${W}x${H}.png` });
  if (tag === 'idle') {
    // 交換で札を返す番が来たら自動で返し、自分の番で手を止める
    const t1 = Date.now();
    while (Date.now() - t1 < 60000) {
      const m = await page.evaluate(() => window.__dyn.UI.mode);
      if (m === 'give' || m === 'exchange') { await page.evaluate(() => { const f = window.__dyn.UI.finish; if (f) f(); }); }
      if (m === 'play') break;
      await wait(300);
    }
    console.log('my turn; waiting 16s');
    await wait(16000);
    console.log('notes', JSON.stringify(await page.evaluate(() => window.__dyn.Notify.items.map(x => x.text))));
    await page.screenshot({ path: `${OUT}/dg-idle-${W}x${H}.png` });
    await page.click('#meDanger');
    await wait(400);
    await page.screenshot({ path: `${OUT}/dg-idle-banner-${W}x${H}.png` });
    console.log('errors:', errors.length);
    await browser.close();
    return;
  }
  console.log('pressure', JSON.stringify(await page.evaluate(() => { const P = window.__dyn.Pressure; return { on: P.on, dead: P.deadPos, line: P.line, need: P.need, level: P.level, falling: P.falling, streak: P.streak, peak: P.peak, top: P.top, queue: P.queue.map(q => q.kind) }; })));
  await page.waitForFunction(() => document.querySelectorAll('#notes .note').length >= 1, null, { timeout: 30000 }).catch(() => console.log('no toast'));
  await wait(300);
  await page.screenshot({ path: `${OUT}/dg-${tag}-toast1-${W}x${H}.png` });
  await page.waitForFunction(() => window.__dyn.Notify.items.length >= 2, null, { timeout: 30000 }).catch(() => console.log('no 2nd'));
  await wait(400);
  await page.screenshot({ path: `${OUT}/dg-${tag}-toast2-${W}x${H}.png` });
  // しばらく遊ばせる
  const t0 = Date.now();
  let shot3 = false;
  while (Date.now() - t0 < (speed === 'fast' ? 120000 : 70000)) {
    await wait(1000);
    const st = await page.evaluate(() => ({ n: window.__dyn.Notify.items.length, fin: !window.__dyn.game || window.__dyn.game.finished, chron: !document.getElementById('chronicle').hidden }));
    if (!shot3 && st.n >= 5) { shot3 = true; await page.screenshot({ path: `${OUT}/dg-${tag}-mid-${W}x${H}.png` }); }
    if (st.chron) break;
  }
  await page.screenshot({ path: `${OUT}/dg-${tag}-end-${W}x${H}.png` });
  const items = await page.evaluate(() => window.__dyn.Notify.items.slice().reverse().map(x => `[${x.kind}] ${(x.from ? x.from.name : x.logo)}：${x.text}`));
  console.log(items.join('\n'));
  console.log('badge', await page.evaluate(() => { const b = document.getElementById('meDanger'); return b ? b.textContent : null; }));
  console.log('warn', await page.evaluate(() => { const w = document.getElementById('chronWarn'); return w && !w.hidden ? w.textContent : null; }));
  await page.evaluate(() => { window.__dyn.Flow.paused = true; });
  console.log('errors:', errors.length);
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
