// ================================================================
//  画面の割り付け：中央にタイムライン、まわりに各アカウントのブラウザ窓（手番の順に時計回り）
//  横長：左の列を下から上へ → 右の列を上から下へ／縦長のスマホ：上の一列を左から右へ
//  自分（手番の起点）は手前＝画面の下。手札と操作パネルは中央の列の下に置く
// ================================================================
const IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const Stage = { W: 800, H: 600, left: 0, top: 0 };
const CARD_ASPECT = 260 / 364;
let safeBottomPx = 0;
function measureSafeArea() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;left:0;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;';
  document.body.appendChild(p);
  safeBottomPx = parseFloat(getComputedStyle(p).paddingBottom) || 0;
  p.remove();
}
function measureStage() {
  const r = $('stage').getBoundingClientRect();
  Stage.W = Math.max(1, Math.round(r.width));
  Stage.H = Math.max(1, Math.round(r.height));
  Stage.left = r.left; Stage.top = r.top;
}
function isShortLandscape() { return Stage.H < 470 && Stage.W > Stage.H * 1.3; }
// 要素の四角（舞台の座標）
function stageRect(el) {
  const r = el.getBoundingClientRect();
  const x = r.left - Stage.left, y = r.top - Stage.top;
  return { x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2 };
}
function setBox(el, r) {
  el.style.left = Math.round(r.x) + 'px'; el.style.top = Math.round(r.y) + 'px';
  el.style.width = Math.round(r.w) + 'px'; el.style.height = Math.round(r.h) + 'px';
}

const Lay = { mode: 'cols', short: false, wins: [], feed: null, dock: null, hand: null, center: null, hm: null, k: 0, th: [110, 64, 36] };

// 手札の札の大きさと並び（1段か2段か）。band は画面の下から手札が占める高さ
function handMetrics(n, areaW) {
  const short = isShortLandscape();
  const cardH = short ? clamp(Stage.H * 0.25, 70, 112)
    : Stage.W < 700 ? clamp(Math.min(Stage.H * 0.13, Stage.W * 0.3), 76, 116)
    : clamp(Math.min(Stage.H * 0.18, areaW * 0.2), 92, 150);
  const cardW = cardH * CARD_ASPECT;
  const n1 = Math.max(1, n);
  let sp = n1 > 1 ? Math.min(cardW * 0.64, (areaW - cardW) / (n1 - 1)) : 0;
  let rows = 1, perRow = [n1];
  if (n1 > 8 && sp < cardW * 0.34) {
    rows = 2;
    const a = Math.ceil(n1 / 2);
    perRow = [a, n1 - a];
    sp = Math.min(cardW * 0.64, (areaW - cardW) / Math.max(1, a - 1));
  }
  // 選んで持ち上げた札が操作パネルに隠れないよう、上に余白を取る
  const band = Math.round(safeBottomPx + 6 + cardH * (rows === 2 ? 1.3 : 0.8) + cardH * 0.25);
  return { cardH, cardW, sp, rows, perRow, band };
}

function computeLayout(k, inGame, handN) {
  const W = Stage.W, H = Stage.H;
  const short = isShortLandscape();
  const strip = W < 700 && !short;
  const pad = strip || short ? 8 : 12, gap = strip || short ? 6 : 12;
  const L = { mode: strip ? 'strip' : 'cols', short, wins: [], k, pad, gap };
  let cx, cw, top = pad;
  if (strip) {
    cx = pad; cw = W - pad * 2;
    if (k) {
      const ww = (cw - gap * (k - 1)) / k;
      const wh = ww >= 104 ? 110 : 100;
      for (let i = 0; i < k; i++) L.wins.push({ x: cx + i * (ww + gap), y: pad, w: ww, h: wh });
      top = pad + wh + gap;
    }
  } else {
    const colW = short ? clamp(W * 0.17, 110, 168) : clamp(W * 0.19, 150, 340);
    cx = pad + colW + gap; cw = W - 2 * cx;
    const nl = Math.ceil(k / 2), nr = k - nl;
    const column = (n, x) => {
      const out = [];
      if (!n) return out;
      const maxH = short ? 140 : clamp(H * 0.3, 236, 300);
      const wh = Math.min(maxH, (H - 2 * pad - gap * (n - 1)) / n);
      const total = n * wh + (n - 1) * gap;
      const y0 = pad + Math.max(0, (H - 2 * pad - total) / 2);
      for (let i = 0; i < n; i++) out.push({ x, y: y0 + i * (wh + gap), w: colW, h: wh });
      return out;
    };
    // 左の列は下から（席1が左下）、右の列は上から
    L.wins = column(nl, pad).reverse().concat(column(nr, W - pad - colW));
  }
  L.center = { x: cx, w: cw };
  const fw = strip ? cw : Math.min(cw, W > 1500 ? 720 : 640);
  const fx = strip ? pad : cx + (cw - fw) / 2;
  if (inGame) {
    const hw = strip ? W - 8 : cw;
    const hm = handMetrics(handN, hw);
    L.hm = hm;
    L.hand = { x: strip ? 4 : cx, w: hw, y: H - hm.band, h: hm.band };
    const dw = strip ? W - 2 * pad : fw;
    const dock = $('dock');
    dock.classList.toggle('narrow', !short && dw < 560);
    dock.classList.toggle('tight', short);
    dock.style.width = Math.round(dw) + 'px';
    const dh = $('me').offsetHeight || 56;
    L.dock = { x: strip ? pad : fx, w: dw, y: L.hand.y - dh - 6, h: dh };
    L.feed = { x: fx, w: fw, y: top, h: Math.max(120, L.dock.y - gap - top) };
  } else {
    L.feed = { x: fx, w: fw, y: top, h: Math.max(120, H - pad - top) };
  }
  // 投稿に添える札の大きさ（新しい投稿ほど大きい）
  const t0 = Math.round(clamp(Math.min(L.feed.h * 0.26, L.feed.w * 0.24), 54, 128));
  L.th = [t0, Math.round(t0 * 0.56), Math.round(clamp(t0 * 0.34, 26, 40))];
  return L;
}

function handCountForLayout() {
  return Math.max(1, Hand.cards.length, game && Flow.inGame ? game.players[0].hand.length : 0);
}
function layoutAll() {
  measureStage();
  measureSafeArea();
  $('app').classList.toggle('short', isShortLandscape());
  const k = Flow.inGame ? Math.max(0, seats.length - 1) : (TitleDemo.k || 0);
  const L = computeLayout(k, Flow.inGame, Math.max(handCountForLayout(), Hand.keepN || 0));
  Object.assign(Lay, L);
  const fe = $('feed');
  setBox(fe, Lay.feed);
  fe.style.setProperty('--th0', Lay.th[0] + 'px');
  fe.style.setProperty('--th1', Lay.th[1] + 'px');
  fe.style.setProperty('--th2', Lay.th[2] + 'px');
  fe.classList.toggle('compact', Lay.feed.w < 420);
  $('notes').className = Lay.mode === 'strip' ? 'strip' : '';
  Wins.forEach((W, s) => { if (W && Lay.wins[s - 1]) placeWin(W, Lay.wins[s - 1]); });
  if (Lay.dock) {
    const d = $('dock');
    d.style.left = Math.round(Lay.dock.x) + 'px';
    d.style.top = Math.round(Lay.dock.y) + 'px';
  }
  for (const p of Feed.posts) spacePost(p);
  if (Lock.on) layoutChain();
  if (Hand.cards.length) relayoutHand(0);
}
