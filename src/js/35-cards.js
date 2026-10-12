// ================================================================
//  札：持ち主のアカウントで描いた投稿の画像・自分の手札・飛んでいく札
// ================================================================
// 札の表は持ち主のアカウントで描く（手札＝自分の投稿ネタ、場に出た札＝その人の投稿）
const PaintState = { ver: 1 };
const ownerKey = o => o.id + '|' + o.name + '|' + o.handle + '|' + avaKey(o.ava, 'normal');
// 札の表の描き分け：持ち主と、その段階（規模）・箱の時期で変わる文面
const faceKey = (card, o) => ownerKey(o) + '|' + faceSig(card, o);
const FaceCache = new Map();
let faceCanvas = null;
function faceURL(card, owner) {
  const o = ownerOf(owner);
  const key = card.id + '|' + faceKey(card, o) + '|' + PaintState.ver;
  let u = FaceCache.get(key);
  if (u) { FaceCache.delete(key); FaceCache.set(key, u); return u; }
  faceCanvas = paintCardFace(card, o, faceCanvas);
  u = faceCanvas.toDataURL('image/jpeg', 0.92);     // 札は四隅まで塗りつぶしてあるので JPEG で軽く
  FaceCache.set(key, u);
  while (FaceCache.size > 180) FaceCache.delete(FaceCache.keys().next().value);
  return u;
}
let BACK_URL = '', FACT_URL = '';
function paintStaticImages() {
  BACK_URL = paintCardBack().toDataURL('image/png');
  document.documentElement.style.setProperty('--card-back', `url("${BACK_URL}")`);
  FACT_URL = paintFactStamp().toDataURL('image/png');
}

// ---------- 1枚の札（画面の上を動く） ----------
class CardEl {
  constructor(card) {
    this.card = card;
    this.owner = NOBODY;
    this.okey = '';
    this.ver = 0;
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = '<div class="cf front"><img alt="" draggable="false"></div><div class="cf back"></div>';
    el._ce = this;
    this.el = el;
    this.img = el.firstChild.firstChild;
    this.img.alt = cardName(card);
    this.selected = false;
    this.dim = false;
    this.st = { x: 0, y: 0, w: 80, h: 112, rot: 0, ry: 0, o: 1 };
  }
  setOwner(h) {
    const o = ownerOf(h);
    const k = faceKey(this.card, o);
    if (k === this.okey && this.ver === PaintState.ver) return;
    this.owner = o; this.okey = k;
    this.repaint();
  }
  repaint() {
    this.ver = PaintState.ver;
    this.img.src = faceURL(this.card, this.owner);
  }
  setDim(on) { if (this.dim === on) return; this.dim = on; this.el.classList.toggle('dim', on); }
  setGlow(on) { this.el.classList.toggle('sel', !!on); }
  apply() {
    const s = this.st, e = this.el;
    e.style.width = s.w.toFixed(1) + 'px';
    e.style.height = s.h.toFixed(1) + 'px';
    e.style.transform = `translate(${(s.x - s.w / 2).toFixed(1)}px,${(s.y - s.h / 2).toFixed(1)}px) rotate(${s.rot.toFixed(2)}deg)` + (Math.abs(s.ry) > 0.01 ? ` perspective(700px) rotateY(${s.ry.toFixed(1)}deg)` : '');
    e.style.opacity = s.o < 1 ? s.o.toFixed(3) : '';
  }
  set(o) { Object.assign(this.st, o); this.apply(); }
}
const CE = [];           // card id → CardEl
function buildCards() { for (const card of CARD_POOL) CE[card.id] = new CardEl(card); }

// 札の層（どちらも舞台いっぱい・同じ座標）
function toFly(ce) { const f = $('fly'); if (ce.el.parentNode !== f) f.appendChild(ce.el); ce.el.classList.remove('hover'); }
function toHandLayer(ce) { const h = $('hand'); if (ce.el.parentNode !== h) h.appendChild(ce.el); }
function detach(ce) { if (ce.el.parentNode) ce.el.remove(); ce.st.o = 1; ce.el.style.opacity = ''; }

// 札を動かす（位置・大きさ・傾き・裏表）。lift は弧の高さ（画面の上へ）
async function moveCE(ce, to, o = {}) {
  const tok = Flow.token;
  if (o.delay) await sleep(o.delay * spd());
  if (tok !== Flow.token) return false;
  const a = Object.assign({}, ce.st);
  const b = Object.assign({}, a, to);
  if (o.sound) Sound.play(o.sound);
  await Tween.add((o.duration || 420) * spd(), e => {
    const lift = o.lift ? Math.sin(Math.PI * e) * o.lift : 0;
    const s = ce.st;
    s.x = lerp(a.x, b.x, e); s.y = lerp(a.y, b.y, e) - lift;
    s.w = lerp(a.w, b.w, e); s.h = lerp(a.h, b.h, e);
    s.rot = lerp(a.rot, b.rot, e); s.ry = lerp(a.ry, b.ry, e);
    s.o = lerp(a.o == null ? 1 : a.o, b.o == null ? 1 : b.o, e);
    ce.apply();
  }, o.ease || Ease.inOutCubic);
  if (o.land && tok === Flow.token) Sound.play(o.land);
  return tok === Flow.token;
}

// ---------- 自分の手札（画面の下） ----------
const Hand = { cards: [], hover: null, interactive: false, keepN: 0 };
function handSlots(n, flags, hoverIdx) {
  const A = Lay.hand;
  if (!A) return [];
  const m = handMetrics(n, A.w);
  const slots = [];
  let idx = 0;
  for (let row = 0; row < m.rows; row++) {
    const cnt = m.perRow[row];
    const total = m.cardW + m.sp * (cnt - 1);
    const front = row === m.rows - 1;
    const baseY = Stage.H - safeBottomPx - m.cardH * 0.3 - (front ? 0 : m.cardH * 0.5);
    for (let i = 0; i < cnt; i++, idx++) {
      const x = A.x + A.w / 2 - total / 2 + m.cardW / 2 + i * m.sp;
      const dx = cnt > 1 ? (i - (cnt - 1) / 2) / ((cnt - 1) / 2) : 0;
      const lift = flags && flags[idx] ? m.cardH * 0.22 : hoverIdx === idx ? m.cardH * 0.07 : 0;
      slots.push({
        x, y: baseY + dx * dx * m.cardH * 0.06 - lift,
        w: m.cardW, h: m.cardH,
        rot: dx * Math.min(5, 0.65 * cnt),
        z: row * 100 + i + 1,
      });
    }
  }
  return slots;
}
function relayoutHand(duration = 260) {
  const n = Hand.cards.length;
  if (!Lay.hand || !n) return Promise.resolve();
  const flags = Hand.cards.map(c => c.selected);
  const hi = Hand.hover ? Hand.cards.indexOf(Hand.hover) : -1;
  const slots = handSlots(n, flags, hi);
  const d = Math.round(duration * spd());
  const layer = $('hand');
  layer.style.setProperty('--hd', d + 'ms');
  Hand.cards.forEach((c, i) => {
    if (c.el.parentNode !== layer) return;      // 飛んでいる最中の札は触らない
    const sl = slots[i];
    c.el.style.zIndex = sl.z;
    c.set({ x: sl.x, y: sl.y, w: sl.w, h: sl.h, rot: sl.rot, ry: 0, o: 1 });
  });
  return sleep(d);
}
// 手札が増えて段が変わったら、操作パネルを上へずらす（月の途中では広げるだけ）
function ensureHandBand() {
  if (!Flow.inGame || !Lay.hand) return false;
  const n = Math.max(1, Hand.cards.length);
  if (n <= (Hand.keepN || 0)) return false;
  Hand.keepN = n;
  const need = handMetrics(n, Lay.hand.w).band;
  if (need <= Lay.hand.h) return false;
  layoutAll();
  return true;
}
function sortHandCards() {
  const rev = game ? game.revolution : false;
  Hand.cards.sort((a, b) => (ordv(a.card.r, rev) - ordv(b.card.r, rev)) || (a.card.s - b.card.s));
}
function clearHandLayer() {
  for (const c of CE) if (c) { detach(c); c.selected = false; c.setGlow(false); c.setDim(false); c.el.classList.remove('hover'); }
  Hand.cards = []; Hand.hover = null;
}
