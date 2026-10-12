// 画面の確認用：node test/shot.cjs <scenario> <width> <height> [extra]
const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('./_env.cjs');
const [scenario = 'title', ws = '1280', hs = '800', extra = ''] = process.argv.slice(2);
const W = +ws, H = +hs, tag = `${W}x${H}`;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: W < 700 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); console.log('PAGEERROR', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE', m.text()); } });
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await wait(800);
  const shot = async name => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const tap = async (x, y) => { if (W < 700) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  const start = async (speed = 'fast') => {
    await page.evaluate(sp => { document.getElementById('sp-' + sp).checked = true; }, speed);
    await page.click('#btnFound');
  };
  const runState = async (fn, arg) => page.evaluate(fn, arg);

  if (scenario === 'title') {
    await shot(`t-title-${tag}`);
    await page.click('#btnHelpTitle');
    await wait(400);
    await shot(`t-help-${tag}`);
  }

  // タイトルの下の飾り（窓・スレッド・トレンド）
  if (scenario === 'demo') {
    await page.evaluate(() => { document.getElementById('titleScreen').hidden = true; });
    await wait(400);
    await shot(`d-demo-${tag}`);
  }

  // 流れた話題がトレンドとして並ぶところ
  if (scenario === 'trend') {
    await page.evaluate(() => { window.__autoHuman = true; });
    await start('normal');
    await page.waitForFunction(() => document.querySelectorAll('#ended .trow').length >= +(new URLSearchParams(location.search).get('n') || 3) && window.__dyn.Feed.posts.length >= 1, null, { timeout: 300000 });
    await page.evaluate(() => { window.__dyn.Flow.paused = true; });
    await wait(1600);
    await shot(`tr-feed-${tag}`);
    console.log('trends', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#ended .trow')].map(r => r.innerText.replace(/\n+/g, ' / ')))));
    console.log('followers', JSON.stringify(await page.evaluate(() => { const d = window.__dyn; return d.seats.map(h => [h.name, d.curFollowers(h)]); })));
  }

  if (scenario === 'play') {
    await start('normal');
    await page.waitForFunction(() => window.__dyn.UI.mode === 'play', null, { timeout: 120000 });
    await wait(900);
    await shot(`p-turn-${tag}`);
    // 出せる札を1つ選ぶ
    const pts = await page.evaluate(() => {
      const d = window.__dyn;
      const legal = d.game.legalPlays(0);
      const pick = legal.find(p => p.type === 'set') || legal[0];
      return pick.cards.map(c => d.cardScreen(c.id));
    });
    for (const q of pts) { await tap(q.x, q.y); await wait(250); }
    await wait(400);
    await shot(`p-selected-${tag}`);
    await page.click('#btnPlay');
    await wait(260);
    await shot(`p-flying-${tag}`);
    await wait(1600);
    await shot(`p-played-${tag}`);
    // あとは自動で進め、場面ごとに撮る
    await page.evaluate(() => { window.__autoHuman = true; const d = window.__dyn; if (d.UI.finish && d.UI.mode === 'play') d.UI.finish(null); });
    const seen = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      const st = await page.evaluate(() => {
        const d = window.__dyn, g = d.game;
        if (!g || !g.field) return null;
        return { lock: !!g.field.lock, rank: !!g.field.rankLock, eb: !!g.field.elevenBack, rev: !!g.revolution, n: d.Feed.posts.length, fin: g.finished, chron: !document.getElementById('chronicle').hidden };
      });
      if (!st) { await wait(100); continue; }
      if (st.chron) break;
      for (const k of ['lock', 'rank', 'eb', 'rev']) if (st[k] && !seen.has(k)) { seen.add(k); await wait(900); await shot(`p-${k}-${tag}`); }
      if (st.n >= 4 && !seen.has('long')) { seen.add('long'); await wait(700); await shot(`p-thread-${tag}`); }
      await wait(120);
    }
    await page.waitForFunction(() => !document.getElementById('chronicle').hidden, null, { timeout: 200000 });
    await wait(900);
    await shot(`p-chronicle-${tag}`);
    await page.click('#btnNextGen');
    await page.waitForFunction(() => window.__dyn.dyn.gen === 2 && window.__dyn.game && window.__dyn.Feed.posts.length >= 1, null, { timeout: 200000 });
    await wait(1200);
    await shot(`p-gen2-${tag}`);
  }

  if (scenario === 'fx') {
    await page.evaluate(() => { window.__autoHuman = true; });
    await start('normal');
    await page.waitForFunction(() => window.__dyn.Feed.posts.length >= 2, null, { timeout: 120000 });
    await page.evaluate(() => { window.__dyn.Flow.paused = true; });
    await wait(2500);
    const which = extra || 'all';
    await page.evaluate(w => {
      const d = window.__dyn;
      const suit = w === 'spade' ? [0] : w === 'club' ? [3] : w === 'dc' ? [2, 3] : [1];
      d.fx.showLock(suit);
      d.fx.showStairs(5, 6, 7);
      if (w === 'all') { d.fx.showBackSign(); d.fx.showUpdatePanel(true); d.fx.setFeltMood(true, true); }
    }, which);
    await wait(1400);
    await shot(`f-${which}-${tag}`);
    if (which === 'all') {
      await page.evaluate(() => { const d = window.__dyn; d.fx.setFeltMood(false, true); d.fx.showUpdatePanel(false); d.fx.viralStrike(); d.fx.proclaim('8切り', 'VIRAL', { tone: 'pink', sub: 'TREND TAKEOVER：話題をかっさらった', sound: null, hold: 1400 }); });
      await wait(420);
      await shot(`f-viral-${tag}`);
      await wait(1600);
      await page.evaluate(() => { const d = window.__dyn; d.fx.factCheckStamp(); d.fx.glitchStage(); });
      await wait(700);
      await shot(`f-fact-${tag}`);
      await page.evaluate(() => { const d = window.__dyn; d.fx.faceMood(1, 'smug'); d.fx.facePass(2); d.fx.facePass(2); d.fx.setStamp(2, 'PASS', 'pass'); for (let i = 0; i < 3; i++) d.fx.facePass(3); });
      await wait(600);
      await shot(`f-faces-${tag}`);
    }
  }

  if (scenario === 'give') {
    await page.evaluate(() => {
      document.getElementById('sp-fast').checked = true;
      const d = window.__dyn;
      const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
      st.gen = 2;
      st.lastOrder = st.houses.map(h => h.id);
      st.houses.forEach((h, i) => { h.lastTitle = ['大富豪', '富豪', '貧民', '大貧民'][i]; });
      d.runDynasty(st);
    });
    await page.waitForFunction(() => window.__dyn.UI.mode === 'give', null, { timeout: 200000 });
    await wait(1500);
    await shot(`g-give-a-${tag}`);
    const pts = await page.evaluate(() => { const d = window.__dyn; return d.Hand.cards.slice(0, 2).map(c => d.cardScreen(c.card.id)); });
    for (const q of pts) { await tap(q.x, q.y); await wait(350); }
    await wait(600);
    await shot(`g-give-b-${tag}`);
    const info = await page.evaluate(() => {
      const me = document.getElementById('me').getBoundingClientRect();
      const d = window.__dyn;
      const tops = d.Hand.cards.map(c => c.el.getBoundingClientRect().top);
      return { meBottom: Math.round(me.bottom), minCardTop: Math.round(Math.min(...tops)), sel: d.Hand.cards.filter(c => c.selected).length, n: d.Hand.cards.length };
    });
    console.log('give layout', JSON.stringify(info));
    await page.click('#btnPlay');
    await wait(1500);
    await shot(`g-given-${tag}`);
  }

  if (scenario === 'seats') {
    const n = parseInt(extra || '7', 10);
    await page.evaluate(n => {
      document.getElementById('sp-fast').checked = true;
      const d = window.__dyn;
      const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
      while (st.houses.length < n) st.houses.push(d.makeHouse(st, Math.random, { power: 8, gen: 1 }));
      st.houses.length = n;
      const pw = [25, 18, 5, 2, 11, 21, 7];
      st.houses.forEach((h, i) => { h.power = pw[i]; h.maxPower = pw[i]; });
      if (n > 4) st.era = { key: 'rivals', left: 3, num: 2 };
      window.__autoHuman = true;
      d.runDynasty(st);
    }, n);
    await page.waitForFunction(() => window.__dyn.Feed.posts.length >= 3, null, { timeout: 200000 });
    await page.evaluate(() => { window.__dyn.Flow.paused = true; });
    await wait(2200);
    await shot(`s-seats${n}-${tag}`);
    const order = await page.evaluate(() => window.__dyn.Wins.filter(Boolean).map(W => ({ s: W.s, x: Math.round(W.r.x), y: Math.round(W.r.y), sz: W.sz })));
    console.log('wins', JSON.stringify(order));
  }

  if (scenario === 'season') {
    await page.evaluate(() => {
      document.getElementById('sp-fast').checked = true;
      const d = window.__dyn;
      const st = d.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test' });
      const pw = [24, 20, 4, 6];
      st.houses.forEach((h, i) => { h.power = pw[i]; h.maxPower = pw[i]; });
      window.__autoHuman = true;
      d.runDynasty(st);
    });
    await page.waitForFunction(() => window.__dyn.game && window.__dyn.game.finished, null, { timeout: 300000, polling: 50 });
    await page.waitForFunction(() => [...document.querySelectorAll('#proclaim .decree')].some(d => d.textContent.includes('1ヶ月経過')), null, { timeout: 30000, polling: 30 });
    await wait(450);
    await shot(`e-month-${tag}`);
    await page.evaluate(() => { window.__slowmo = 4; });
    await page.waitForFunction(() => window.__tokenPhase, null, { timeout: 60000, polling: 30 });
    await wait(900);
    await shot(`e-power-a-${tag}`);
    await wait(1600);
    await shot(`e-power-b-${tag}`);
    await page.evaluate(() => { window.__slowmo = 1; });
    await page.waitForFunction(() => !document.getElementById('chronicle').hidden, null, { timeout: 60000 });
    await wait(700);
    await shot(`e-chron-${tag}`);
  }

  if (scenario === 'long') {
    await page.evaluate(() => { document.getElementById('sp-fast').checked = true; window.__autoHuman = true; window.__ff = true; });
    await page.click('#btnFound');
    for (let g = 0; g < 40; g++) {
      await page.waitForFunction(() => !document.getElementById('chronicle').hidden || !document.getElementById('gameover').hidden, null, { timeout: 600000 });
      const st = await page.evaluate(() => { const d = window.__dyn.dyn; const p = d.houses.find(h => h.isPlayer); return { gen: d.gen, era: d.era.key, n: d.houses.length, power: p ? p.power : -1, fallen: d.fallen.length, go: !document.getElementById('gameover').hidden }; });
      console.log('gen', JSON.stringify(st));
      if (st.go) { await shot(`l-gameover-${tag}`); break; }
      const dead = await page.evaluate(() => document.getElementById('btnNextGen').textContent.includes('最後'));
      await page.click('#btnNextGen');
      if (dead) { await page.waitForFunction(() => !document.getElementById('gameover').hidden, null, { timeout: 30000 }); await wait(600); await shot(`l-gameover-${tag}`); break; }
      if (g % 5 === 2) {
        await page.evaluate(() => { window.__ff = false; });
        await page.waitForFunction(() => window.__dyn.Feed.posts.length >= 2, null, { timeout: 200000 }).catch(() => {});
        await wait(1200);
        const n = await page.evaluate(() => window.__dyn.seats.length);
        await shot(`l-table-g${g + 2}-n${n}-${tag}`);
        await page.evaluate(() => { window.__ff = true; });
      }
    }
  }

  if (scenario === 'resume') {
    await page.evaluate(() => { document.getElementById('sp-fast').checked = true; window.__autoHuman = true; window.__ff = true; });
    await page.click('#btnFound');
    await page.waitForFunction(() => !document.getElementById('chronicle').hidden, null, { timeout: 300000 });
    await page.evaluate(() => { window.__ff = false; });
    await page.click('#btnNextGen');
    await page.waitForFunction(() => window.__dyn.dyn && window.__dyn.dyn.gen === 2 && window.__dyn.Feed.posts.length >= 1, null, { timeout: 300000 });
    await page.evaluate(() => { window.__autoHuman = false; });
    await page.click('#btnMenu');
    await wait(400);
    await page.click('#mTitle');
    await wait(1200);
    console.log('resume btn:', await page.evaluate(() => document.getElementById('btnResume').hidden ? 'hidden' : document.getElementById('btnResume').textContent));
    await page.reload();
    await page.waitForFunction(() => window.__dyn, null, { timeout: 60000 });
    await wait(1500);
    console.log('after reload:', await page.evaluate(() => document.getElementById('btnResume').hidden ? 'hidden' : document.getElementById('btnResume').textContent));
    await page.click('#btnResume');
    await page.waitForFunction(() => window.__dyn.UI.mode === 'play' || window.__dyn.UI.mode === 'give', null, { timeout: 200000 });
    console.log('resumed gen', await page.evaluate(() => window.__dyn.dyn.gen));
    await wait(1200);
    await shot(`r-resumed-${tag}`);
    await page.setViewportSize({ width: H, height: W });
    await wait(1500);
    await shot(`r-rotated-${tag}`);
  }

  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
