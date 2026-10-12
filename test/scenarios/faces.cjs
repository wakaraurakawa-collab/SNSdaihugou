const { chromium } = require('playwright-core');
const { OUT, BASE, CHROME, fontRoutes } = require('../_env.cjs');
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 760 } })).newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await fontRoutes(page);
  await page.goto(BASE + '/test/index.html');
  await page.waitForFunction(() => window.__dyn);
  await page.evaluate(() => {
    const d = window.__dyn;
    const ex = ['normal', 'curious', 'anxious', 'panic', 'smug', 'happy', 'cry'];
    let rnd = 7; const R = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    const avs = Array.from({ length: 6 }, () => d.makeAvatar(R));
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:999;background:#0c1027;padding:16px;display:grid;gap:10px;font:12px sans-serif;color:#fff';
    box.innerHTML = '<div>' + ex.join(' / ') + '　（左7つ：顔に寄せた 66px、右7つ：これまでの全身 52px）</div>' + avs.map(a => '<div style="display:flex;gap:10px;align-items:center">' +
      ex.map(e => `<img src="${d.avatarURL(a, e)}" style="width:66px;height:66px;border-radius:50%;image-rendering:pixelated;background:#4f8bff">`).join('') + '<span style="width:20px"></span>' +
      ex.map(e => `<img src="${d.avatarURL(a, e, true)}" style="width:52px;height:52px;border-radius:50%;image-rendering:pixelated;background:#4f8bff">`).join('') + '</div>').join('');
    document.body.append(box);
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}/faces.png` });
  await browser.close();
})();
