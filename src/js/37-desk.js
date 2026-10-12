// ================================================================
//  机：中央のタイムライン（場）と、各アカウントのブラウザ窓
//  場に出た札＝投稿。場が流れるまで投稿はスレッドとしてつながり、新しい投稿が上に積まれる
// ================================================================
const LOCK_SVG = '<svg viewBox="0 0 10 12" width="10" height="12" fill="currentColor" aria-hidden="true"><path d="M2 5V3.6a3 3 0 0 1 6 0V5h.6c.5 0 .9.4.9.9v5.2c0 .5-.4.9-.9.9H1.4a.9.9 0 0 1-.9-.9V5.9c0-.5.4-.9.9-.9H2zm1.5 0h3V3.6a1.5 1.5 0 0 0-3 0V5z"/></svg>';
const ICO = {
  heart: '<svg viewBox="-0.55 -0.55 1.1 1.1" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="' + SUIT_D[1] + '"/></svg>',
  rt: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5V5a2 2 0 0 1 2-2h7l-2-2M13 9.5V11a2 2 0 0 1-2 2H4l2 2"/></svg>',
  reply: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 13.5l1.2-3A5.5 5.5 0 1 1 6 12.8z"/></svg>',
  upd: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3"/></svg>',
  rev: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2v12M5 2L2.5 4.5M5 2l2.5 2.5M11 14V2M11 14l-2.5-2.5M11 14l2.5-2.5"/></svg>',
  person: '<svg class="i-person" viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><circle cx="8" cy="4.8" r="3.1"/><path d="M1.8 15c.5-3.6 3-5.8 6.2-5.8s5.7 2.2 6.2 5.8z"/></svg>',
};
const Holder = { seat: -1 };     // いちばん上の投稿をした人（話題を握っている）

// ---------- 登録者（チャンネル登録者。中身は followers）：投稿のたびに増える数字（勢いとは別） ----------
const Fol = { month: {} };       // 今月の投稿で増えた分（月末に家の数字へ足す）
const curFollowers = h => Math.max(0, Math.round(((h && h.followers) || 0) + ((h && Fol.month[h.id]) || 0)));
// 数字の持ち主：窓（席1〜）と、あなたの操作パネル（席0）。登録者・同接・勢いを持つ
const Me = { hid: null, fol: null, fn: null, folN: 0, tok: 0, ava: null, gauge: null, pnum: null, powN: null, lv: null, ln: null, view: null, lvShown: -1 };
const holder = s => s === 0 ? Me : Wins[s];
const folHolder = holder;
// 数字を書き換える（animate なら数え上げる）。小さな窓では数字がタイトルバーにもある
const folEls = H => H.fols || (H.fol ? [H.fol] : []);
function setFolNum(H, n, animate) {
  if (!H || !H.fn) return Promise.resolve();
  n = Math.max(0, Math.round(n));
  const from = H.folN || 0;
  H.folN = n;
  const tok = H.tok = (H.tok || 0) + 1;
  const nums = H.fns || [H.fn];
  const put = v => { const t = fmtCount(v); for (const el of nums) el.textContent = t; };
  if (!animate || !spd() || from === n) { put(n); return Promise.resolve(); }
  for (const f of folEls(H)) { f.classList.remove('bump', 'sink'); void f.offsetWidth; f.classList.add(n > from ? 'bump' : 'sink'); }
  const ms = Math.min(950, 380 + Math.log10(1 + Math.abs(n - from)) * 95) * spd();
  return Tween.add(ms, e => { if (H.tok === tok) put(from + (n - from) * e); }, Ease.outCubic);
}
// 増えた（減った）数が登録者の数字の上に浮かぶ。数字が見えない窓では顔のところ
function floatFol(s, delta, note) {
  if (!spd() || !Flow.inGame || !delta) return;
  const H = folHolder(s);
  if (!H || !H.fn) return;
  let r = null;
  for (const f of folEls(H)) { const q = stageRect(f); if (q.w) { r = q; break; } }
  if (!r && H.ava) r = stageRect(H.ava);
  if (!r || !r.w) return;
  const el = document.createElement('div');
  el.className = 'folfloat ' + (delta > 0 ? 'up' : 'down');
  el.innerHTML = (note ? `<small>${esc(note)}</small>` : '') + ICO.person + (delta > 0 ? '+' : '−') + fmtCount(Math.abs(delta));
  el.style.left = Math.round(clamp(r.cx, 44, Stage.W - 44)) + 'px';
  el.style.top = Math.round(clamp(r.y - 4, 18, Stage.H - 18)) + 'px';
  $('fly').append(el);
  setTimeout(() => el.remove(), 1900);
}
// あなたの登録者が節目を越えた
const FOL_MILESTONES = [1000, 1e4, 1e5, 1e6, 1e7, 1e8];
function folMilestone(before, after) {
  const m = FOL_MILESTONES.filter(x => before < x && after >= x).pop();
  if (!m) return;
  banner(`登録者${fmtCount(m)}人 突破！`, 2000);
  addLog(`登録者が${fmtCount(m)}人を突破`, 'fx');
  Sound.play('chime');
  notifyCongrats(`登録者${fmtCount(m)}人おめでとうございます！`);
}
// 投稿で増えた登録者を窓（あなたは操作パネル）の数字へ
function bumpFollowers(s, h, gain) {
  const H = folHolder(s);
  const before = H ? H.folN : 0;
  const after = curFollowers(h);
  floatFol(s, gain);
  if (s === 0) folMilestone(before, after);
  return setFolNum(H, after, true);
}

// ---------- アカウントの窓 ----------
const Wins = [];                 // seat → 窓
function titleBadge(h, isNew) {
  if (h.lastTitle) return `<span class="badge ${titleClass(h.lastTitle)}"><span class="full">${tl(h.lastTitle)}</span><span class="short">${TITLE_SHORT[h.lastTitle] || tl(h.lastTitle)}</span></span>`;
  return isNew ? `<span class="badge new">${h.ki > 1 ? h.ki + '期生' : '新人'}</span>` : '';
}
// 同接（いま見ている人）と、勢いの数字・ゲージ
const EYE_SVG = '<svg class="i-eye" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M1.2 8s2.5-4.6 6.8-4.6S14.8 8 14.8 8s-2.5 4.6-6.8 4.6S1.2 8 1.2 8z"/><circle cx="8" cy="8" r="2.1" fill="currentColor" stroke="none"/></svg>';
const liveHTML = () => `<span class="live-pill"><i></i><span class="lp-t">LIVE</span></span><span class="lv" title="同接（いま見ている人）">${EYE_SVG}<b class="lv-n">0</b><small>人</small></span>`;
const powHTML = () => `<span class="w-pw" title="勢い"><small>勢い</small><b class="w-pnum"></b></span>`;
const GAUGE_HTML = '<span class="pow-gauge" aria-hidden="true"><i></i></span>';
function makeWin(h, s, o = {}) {
  const el = document.createElement('section');
  el.className = 'win rwin';
  el.style.setProperty('--th', themeColor(h.ava));
  el.setAttribute('aria-label', `${h.name}（${h.handle}）`);
  el.innerHTML = `<div class="win-bar"><span class="lights"><i></i><i></i><i></i></span><span class="tab"><img class="tab-ico" src="${avatarURL(h.ava, 'normal')}" alt=""><span class="tab-spin"></span><span class="tab-t">${esc(h.name)}</span></span><span class="w-hot">話題中</span><span class="w-fol w-fol2" aria-hidden="true">${ICO.person}<b class="w-fn">0</b></span></div>`
    + `<div class="win-url"><span class="nav">‹ ›</span><span class="url">${LOCK_SVG}<span>tl.local/<b>${esc(h.handle)}</b></span></span></div>`
    + `<div class="win-body"><div class="cover"></div>`
    + `<div class="w-prof">${moodAva(h, o.expr || 'normal', 'w-ava')}<div class="w-id"><b class="w-name">${esc(h.name)}</b><span class="w-handle">${esc(h.handle)}</span><span class="w-fol" title="チャンネル登録者">${ICO.person}<b class="w-fn">0</b><small>登録者</small></span></div><span class="w-badge">${titleBadge(h, o.isNew)}</span></div>`
    + `<div class="w-stats"><div class="w-row w-hand"><span class="backs"></span><b class="w-count">0</b><small>枚</small></div>`
    + `<div class="w-row w-live">${liveHTML()}${powHTML()}</div>${GAUGE_HTML}</div>`
    + `<div class="w-meta">${o.meta || ''}</div>`
    + `</div><div class="w-stamp"></div>`;
  return {
    el, h, s, sz: '', r: null, n: 0, stampText: '', folN: 0, tok: 0, powN: null, view: null, lvShown: -1,
    ava: el.querySelector('img.w-ava'), backs: el.querySelector('.backs'), count: el.querySelector('.w-count'),
    gauge: el.querySelector('.pow-gauge'), pnum: el.querySelector('.w-pnum'), stamp: el.querySelector('.w-stamp'),
    lv: el.querySelector('.w-live'), ln: el.querySelector('.lv-n'),
    fol: el.querySelector('.w-id .w-fol'), fn: el.querySelector('.w-id .w-fn'),
    fols: [...el.querySelectorAll('.w-fol')], fns: [...el.querySelectorAll('.w-fn')],
  };
}
function placeWin(W, r) {
  W.r = r;
  setBox(W.el, r);
  const sz = r.w >= 150 && r.h >= 196 ? 'sz-l' : r.h >= 100 && r.w >= 100 ? 'sz-m' : 'sz-s';
  if (W.sz !== sz) { W.el.classList.remove('sz-l', 'sz-m', 'sz-s'); W.el.classList.add(sz); W.sz = sz; }
  W.el.classList.toggle('xl', sz === 'sz-l' && r.w >= 270 && r.h >= 280);
  W.el.classList.toggle('nourl', sz === 'sz-l' && r.h < (r.w >= 270 && r.h >= 280 ? 0 : 226));
  W.el.classList.toggle('wide', sz === 'sz-m' && r.w >= 168 && r.h >= 128);
  W.el.classList.toggle('slim', sz === 'sz-l' && r.w < 170);      // 「登録者」の字が入らない幅
  W.el.classList.toggle('tiny', sz === 'sz-s' && r.w < 80);       // タイトルバーにも数字が入らない幅
  fitBacks(W);
}
function clearWins() { for (const W of Wins) if (W) W.el.remove(); Wins.length = 0; }
// 席の窓を作り直す（前の月にいなかった人の窓は開く動き）
function renderWins(list) {
  const prev = new Set(Wins.filter(Boolean).map(W => W.h.id));
  clearWins();
  const root = $('wins');
  list.forEach((it, i) => {
    const s = i + 1;
    const W = makeWin(it.h, s, it);
    root.append(W.el);
    Wins[s] = W;
    if (it.animate && !prev.has(it.h.id)) W.el.classList.add('enter');
    setBacks(W, it.count || 0);
    setPower(W, it.power != null ? it.power : it.h.power, false);
    setFolNum(W, it.fol != null ? it.fol : curFollowers(it.h), false);
    liveStart(W);
  });
}
// 残りの札（裏向きの札の数で見せる）
function setBacks(W, n) {
  if (!W) return;
  W.n = n;
  W.count.textContent = n;
  const have = W.backs.children.length;
  if (have < n) W.backs.insertAdjacentHTML('beforeend', '<i></i>'.repeat(n - have));
  else for (let k = have; k > n; k--) W.backs.lastChild.remove();
  fitBacks(W);
}
function fitBacks(W) {
  if (!W.r) return;
  const bw = W.el.classList.contains('xl') ? 17 : 13;
  const avail = W.r.w - 28 - 48;
  const n = Math.max(1, W.n);
  const bo = n > 1 ? Math.floor((avail - bw) / (n - 1)) - bw : 0;
  W.backs.style.setProperty('--bo', clamp(bo, -bw + 2, -3) + 'px');
}
// 札の出入り口（窓の裏向きの札の端。小さな窓ではアイコン）
function winPoint(s) {
  const W = Wins[s];
  if (!W) return { x: Stage.W / 2, y: -40 };
  const el = W.sz === 'sz-s' || !W.backs.lastElementChild ? W.ava : W.backs.lastElementChild;
  const r = stageRect(el);
  return { x: r.cx, y: r.cy };
}
// 勢い：小さな数字と細いゲージ（25で満タン・金色、5以下は赤）。animate ならゲージが伸び縮みし、数字が数え上がる
function setPower(H, n, animate) {
  if (!H || !H.gauge) return Promise.resolve();
  n = clamp(Math.round(n), 0, MAX_POWER);
  const from = H.powN == null ? n : H.powN;
  H.powN = n;
  const g = H.gauge;
  const anim = animate && spd() > 0 && from !== n;
  const ms = anim ? Math.round(760 * spd()) : 0;
  g.classList.toggle('low', n <= 5);
  g.classList.toggle('top', n >= MAX_POWER);
  g.style.setProperty('--dur', ms + 'ms');
  g.style.setProperty('--p', (n / MAX_POWER * 100).toFixed(1) + '%');
  if (H.pnum) {
    H.pnum.className = 'w-pnum' + (n <= 5 ? ' low' : n >= MAX_POWER ? ' top' : '');
    if (!anim) H.pnum.textContent = n;
    else { const el = H.pnum; Tween.add(ms, e => { el.textContent = Math.round(from + (n - from) * e); }, Ease.outCubic); }
  }
  if (anim) g.animate([{ filter: 'brightness(1.9)' }, { filter: 'none' }], { duration: ms + 200, easing: 'ease-out' });
  return sleep(ms);
}

// ---------- 同接：いま配信を見ている人の数。勢いと登録者で水準が決まり、細かく±する ----------
// 投稿すると強い札ほど跳ね、パスが続くと減っていく。ネタを出し切ったら（上がったら）配信終了
// 登録者が多くても勢いがなければ同接は伸びない（オワコンの「登録者の割に同接が少ない」）
function viewerBase(power, F) {
  const p = Math.max(0, power || 0);
  F = Math.max(0, F || 0);
  if (!p) return 0;
  // 勢いで決まる分（おすすめから来る人）＋ 登録者のうち見に来る割合。登録者より多くは集まりにくい
  return Math.min(2 * Math.pow(1.25, p) + F * 0.0005 * Math.pow(1.18, p), 20 + F * 0.6);
}
function liveStart(H) {
  if (!H || !H.ln) return;
  const id = H.h ? H.h.id : H.hid;
  const prev = H.view;
  if (!(prev && prev.gen === Clock.gen && prev.id === id)) {
    const base = viewerBase(H.powN, H.folN);
    H.view = { id, gen: Clock.gen, v: base * (0.9 + Math.random() * 0.2), wob: 1, boost: 0, ended: false, next: performance.now() + 400 + Math.random() * 1400 };
  }
  H.lvShown = -1;
  liveShow(H);
  if (H.view.ended) liveMarkEnded(H);
}
function liveShow(H) {
  if (!H || !H.ln || !H.view) return;
  const n = Math.max(0, Math.round(H.view.v));
  if (n === H.lvShown) return;
  const before = H.lvShown;
  H.lvShown = n;
  H.ln.textContent = fmtCount(n);
  if (before >= 0 && !H.view.ended && H.ln.animate) H.ln.animate([{ color: n > before ? '#7cf0c4' : '#ff8c9c' }, { color: '' }], { duration: 650, easing: 'ease-out' });
}
function liveStep(H, now) {
  const V = H && H.view;
  if (!V || V.ended || now < V.next || !H.ln) return;
  V.next = now + 650 + Math.random() * 1500;
  const base = viewerBase(H.powN, H.folN);
  V.wob = clamp(V.wob + (Math.random() - 0.5) * 0.06 + (1 - V.wob) * 0.1, 0.86, 1.14);
  V.boost *= 0.78;
  const target = base * V.wob * (1 + V.boost);
  let v = V.v + (target - V.v) * 0.45;
  if (Math.abs(Math.round(v) - Math.round(V.v)) < 1 && Math.random() < 0.55) v += Math.random() < 0.5 ? -1 : 1;   // 小さな数字でも動く
  V.v = Math.max(base > 0 ? 1 : 0, v);
  liveShow(H);
}
// 毎フレーム呼ばれる（窓ごとにばらばらの間隔で数字が動く）
function liveTick(now) {
  liveStep(Me, now);
  for (let s = 1; s < Wins.length; s++) if (Wins[s]) liveStep(Wins[s], now);
}
// 投稿・パスなどで同接が動く（amount は割合。+1 で一時的に倍）
function liveKick(s, amount) {
  const H = holder(s);
  if (!H || !H.view || H.view.ended) return;
  H.view.boost = clamp(H.view.boost + amount, -0.7, 2.5);
  H.view.next = 0;
}
// 投稿の大きさ → 同接の跳ね方
function liveKickForPlay(s, play, rev, eff) {
  const top = play.cards.reduce((m, c, k) => Math.max(m, postStrength(c.r !== 16 ? c.r : play.type === 'seq' ? play.rank + k : play.rank, rev)), 0);
  let amt = 0.06 * Math.pow(1.28, top) + 0.05 * (play.cards.length - 1);
  if (eff && eff.eightCut) amt = Math.max(amt, 1.0);
  if (eff && eff.spade3) amt = Math.max(amt, 1.2);
  if (eff && eff.revolution !== undefined) amt += 1.0;
  liveKick(s, Math.min(amt, 2.2));
}
function liveMarkEnded(H) {
  if (!H.lv) return;
  H.lv.classList.add('ended');
  const t = H.lv.querySelector('.lp-t');
  if (t) t.textContent = '終了';
}
// 配信終了（ネタを出し切った・覇権陥落）。数字は最後の同接のまま止まる
function liveEndH(H) {
  if (!H || !H.view || H.view.ended) return;
  H.view.ended = true;
  liveMarkEnded(H);
}
function liveEnd(s) { liveEndH(holder(s)); }
// 少し盛り上がって（落ち込んで）から終了。月が替わって窓が作り直されていたら何もしない
function liveEndAfter(s, kick, ms) {
  const H = holder(s), V = H && H.view;
  if (!V || V.ended) return;
  if (kick) liveKick(s, kick);
  if (!spd()) { liveEndH(H); return; }
  setTimeout(() => { if (H.view === V) liveEndH(H); }, ms * Math.max(0.5, spd()));
}
function setWinActive(s) { Wins.forEach((W, i) => { if (W) W.el.classList.toggle('active', i === s); }); }
function setTyping(s, on) { const W = Wins[s]; if (W) W.el.classList.toggle('typing', !!on); }
function setStamp(s, text, cls) {
  const W = Wins[s];
  if (!W) return;
  W.stampText = text || '';
  W.stamp.textContent = text || '';
  W.stamp.className = 'w-stamp' + (text ? ' on ' + (cls || '') : '');
}
function setHolder(s) {
  Holder.seat = s;
  Wins.forEach((W, i) => { if (W) W.el.classList.toggle('holder', i === s); });
}

// ---------- タイムライン ----------
const Feed = { posts: [], topic: 0 };   // いまの話題の投稿（新しい順）と、その月の何番目の話題か
// 今月の記録（月末の「今月のハイライト」用）：投稿・トレンド・パスの数
const MonthStats = { posts: [], trends: [], passes: {}, nPosts: {} };
function statsReset() { MonthStats.posts = []; MonthStats.trends = []; MonthStats.passes = {}; MonthStats.nPosts = {}; }
function statsPost(h, play, eff, rev, buzz) {
  MonthStats.posts.push({ h, title: playTitle(play, h), buzz, suit: playTopCard(play) ? playTopCard(play).s : -1, fx: postFx(play, eff) });
  MonthStats.nPosts[h.id] = (MonthStats.nPosts[h.id] || 0) + 1;
}
function statsPass(h) { if (h) MonthStats.passes[h.id] = (MonthStats.passes[h.id] || 0) + 1; }
// ハイライト：いちばんバズった投稿・いちばん大きなトレンド・いちばん静かだった人
function monthHighlights() {
  const out = [];
  // ジョーカー（∞）は別枠。ふつうの投稿のうち、いちばんいいねが多かったもの
  const best = MonthStats.posts.filter(p => isFinite(p.buzz)).sort((a, b) => b.buzz - a.buzz)[0];
  if (best) out.push({ kind: 'post', h: best.h, suit: best.suit, text: `「${best.title}」`, num: `${ICO.heart} ${fmtCount(best.buzz)}`, label: 'いちばんバズった投稿' });
  const tr = MonthStats.trends.slice().sort((a, b) => b.count - a.count)[0];
  if (tr) out.push({ kind: 'trend', h: tr.h, suit: tr.suit, text: tr.tag, num: `${fmtCount(tr.count)}件のポスト`, label: '今月のトレンド1位' });
  const ids = Object.keys(MonthStats.passes);
  if (ids.length) {
    const id = ids.sort((a, b) => MonthStats.passes[b] - MonthStats.passes[a])[0];
    const h = dyn && houseById(dyn, id);
    if (h && MonthStats.passes[id] >= 3) out.push({ kind: 'quiet', h, suit: -1, text: `パス${MonthStats.passes[id]}回`, num: '', label: 'いちばん静かだった人' });
  }
  return out;
}
function setTopicNo(n) {
  Feed.topic = n;
  const el = $('fhTopic');
  if (el) { el.textContent = n ? `話題 #${n}` : ''; el.hidden = !n; }
}
function feedReset() {
  Feed.posts = [];
  setTopicNo(0);
  $('thread').innerHTML = '';
  $('ended').innerHTML = '';
  $('feedBody').scrollTop = 0;
  feedNote('');
  StatusBadges.clear();
}
function playKind(play) {
  if (play.type === 'single') return play.rank === 16 ? 'JOKER' : RANK_TXT[play.rank] + '・1枚';
  if (play.type === 'seq') return playLabel(play).replace(' の階段', '') + '・連続投稿';
  return playLabel(play).replace(' の', '・');
}
function postFx(play, eff) {
  const out = [];
  if (play.cards.some(c => c.r === 16)) out.push(['GLITCH', '#6b4cff']);
  if (eff) {
    if (eff.revolution !== undefined) out.push([eff.revolution ? 'UPDATE' : 'ROLLBACK', '#3b82ff']);
    if (eff.eightCut) out.push(['VIRAL', '#ff2d7a']);
    if (eff.elevenBack) out.push(['REVERSE', '#8b5cff']);
    if (eff.spade3) out.push(['COUNTER', '#0ea5b7']);
    if (eff.lock) out.push(['LOCK', SNS_SUIT[eff.lock[0]].c]);
    if (eff.rankLock) out.push(['SERIES', '#ff5fae']);
  }
  return out.map(([t, c]) => `<span style="--fc:${c}">${t}</span>`).join('');
}
// o.rev：投稿したときの強さの並び（いいねの数に効く）、o.fol：この投稿で増えた登録者
function postHTML(h, play, eff, o = {}) {
  const top = playTopCard(play);
  const suit = top ? top.s : -1;
  const buzz = o.buzz != null ? o.buzz : playBuzz(play, !!o.rev, ownerStage(h));
  const tag = suit >= 0 ? SNS_SUIT[suit].tag : '#全SNS';
  const cards = play.cards.map(c => `<span class="p-card wait"><img alt="${esc(cardName(c))}" src="${faceURL(c, h)}" draggable="false"></span>`).join('');
  return `<article class="post lv0 ${suit >= 0 ? 's' + suit : 'sj'}">`
    + `<div class="p-side">${avaImg(h, 'normal', 'p-ava')}</div>`
    + `<div class="p-main"><div class="p-head"><b>${esc(h.name)}</b><span class="p-handle">${esc(h.handle)}</span><span class="p-time">たった今</span><span class="p-kind">${esc(playKind(play))}</span></div>`
    + `<div class="p-text">${esc(playTitle(play, h))}<span class="tag">${esc(tag)}</span></div>`
    + `<div class="p-cards">${cards}</div>`
    + `<div class="p-foot"><span class="lk">${ICO.heart} ${fmtCount(buzz)}</span><span class="rt">${ICO.rt} ${fmtCount(buzz * 0.21 + 1)}</span><span class="rp">${ICO.reply} ${fmtCount(buzz * 0.04 + 1)}</span>`
    + (o.fol ? `<span class="fl" title="この投稿で増えた登録者">${ICO.person}+${fmtCount(o.fol)}</span>` : '')
    + `<span class="p-fx">${postFx(play, eff)}</span></div>`
    + `</div></article>`;
}
// 古い投稿ほど小さく。時刻も「たった今」「1分前」…と進む
function relevel() {
  Feed.posts.forEach((p, i) => {
    const lv = Math.min(i, 2);
    if (p.lv !== lv) { p.el.classList.remove('lv0', 'lv1', 'lv2'); p.el.classList.add('lv' + lv); p.lv = lv; }
    if (p.time) p.time.textContent = i ? `${i}分前` : 'たった今';
  });
}
// 札が多い投稿は札を重ねて収める
function spacePost(p) {
  const fw = Lay.feed ? Lay.feed.w : 400;
  const n = p.play.cards.length;
  if (n < 2) return;
  const avail = [fw - 80, fw - 72, (fw - 64) * 0.5];
  const gaps = [7, 5, 3];
  for (let lv = 0; lv < 3; lv++) {
    const w = Lay.th[lv] * CARD_ASPECT;
    const need = n * w + (n - 1) * gaps[lv];
    const ov = need > avail[lv] ? Math.floor((avail[lv] - n * w) / (n - 1)) : gaps[lv];
    p.el.style.setProperty('--ov' + lv, Math.max(-w * 0.72, ov) + 'px');
  }
}
// 新しい投稿をスレッドのいちばん上に入れる。札の着地点（最終の位置）を返す
function feedAddPost(h, play, eff, s, o = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'pw closed';
  wrap.setAttribute('role', 'listitem');
  const buzz = playBuzz(play, !!o.rev, ownerStage(h));
  wrap.innerHTML = postHTML(h, play, eff, Object.assign({ buzz }, o));
  if (s >= 0) statsPost(h, play, eff, !!o.rev, buzz);
  if (!Feed.posts.length) setTopicNo(Feed.topic + 1);     // 場が空なら、新しい話題の始まり
  $('thread').prepend(wrap);
  const post = { wrap, el: wrap.firstElementChild, h, s, play, eff: eff || {}, rev: !!o.rev, lv: 0, thumbs: [...wrap.querySelectorAll('.p-card')], time: wrap.querySelector('.p-time') };
  Feed.posts.unshift(post);
  relevel();
  spacePost(post);
  $('feedBody').scrollTop = 0;
  const instant = o.instant || !spd();
  $('feed').classList.toggle('instant', !!instant);
  if (instant) wrap.classList.remove('closed');
  const rects = post.thumbs.map(t => stageRect(t));
  if (!instant) requestAnimationFrame(() => wrap.classList.remove('closed'));
  if (o.reveal || instant && o.instant) post.thumbs.forEach(t => t.classList.remove('wait'));
  return { post, rects };
}
function revealThumb(post, i) { const t = post.thumbs[i]; if (t) t.classList.remove('wait'); }
// ---------- 話題終了：スレッドをたたみ、#タグ付きの「トレンド」として残す ----------
// 流れた話題を、トレンド欄の1件（カテゴリ・#タグ・「〇〇さんが…で注目」・ポスト数）にまとめる
function trendOf(posts, why) {
  const top = posts[0];
  const h = top.h, play = top.play;
  const card = playTopCard(play);
  const [tag, noun, stage] = trendWordsFor(play, h);
  const name = h.name + 'さん';
  const n = play.cards.length;
  let cat = card ? `${SNS_SUIT[card.s].ja}のトレンド` : 'みんなのトレンド', sum;
  if (why === 'spade3') {
    const victim = posts[1] && posts[1].h !== h ? posts[1].h : null;
    cat = 'ファクトチェック';
    sum = victim ? `${name}の指摘で${victim.name}さんの投稿が失速` : `${name}の指摘で話題が収束`;
  } else if (why === 'eight') {
    cat += ' · 急上昇';
    sum = `${name}の${noun}がバズって話題をさらう`;
  } else if (!card) sum = `${name}の${noun}で${JOKER_TREND_TAIL[stage - 1]}`;
  else if (top.eff && top.eff.revolution !== undefined) {
    cat += ' · 急上昇';
    sum = `${name}の${play.type === 'seq' ? n + '連続投稿' : noun + n + '連投'}で${top.eff.revolution ? 'アルゴリズムが激変' : 'アルゴリズムが元通りに'}`;
  } else if (play.type === 'seq') sum = `${name}が${n}連続投稿で注目`;
  else if (n > 1) sum = `${name}が${noun}を${n}連投して注目`;
  else {
    const st = postStrength(card.r, top.rev);
    sum = st >= 10 ? `${name}の${noun}に注目集まる` : st <= 2 ? `${name}の${noun}がじわじわ話題に` : `${name}が${noun}で注目`;
  }
  // ポスト数：話題の大きさ（いいねの合計）と、スレッドの長さから
  const count = posts.reduce((a, p) => a + Math.min(playBuzz(p.play, p.rev, ownerStage(p.h)), [0, 4e3, 3e4, 2.5e5, 1e6, 4e6][ownerStage(p.h)] || 4e6), 0) * 0.05 + posts.length * 37;
  return { h, tag, sum, cat, count, suit: card ? card.s : -1 };
}
function trendRowHTML(t, no) {
  return `<div class="tr-meta"><span class="tr-no">${no}</span><span class="tr-dot">·</span><span class="tr-cat">${esc(t.cat)}</span><span class="tr-n">${fmtCount(t.count)}件のポスト</span></div>`
    + `<div class="tr-tag">${esc(t.tag)}</div>`
    + `<div class="tr-sum">${avaImg(t.h, 'smug', 'tr-ava')}<span>${esc(t.sum)}</span></div>`;
}
function addTrendRow(t, animate) {
  const ended = $('ended');
  if (!ended.querySelector('.ended-h')) ended.insertAdjacentHTML('afterbegin', '<div class="ended-h"><b>トレンド</b><small>TRENDS</small></div>');
  const row = document.createElement('div');
  row.className = 'trow ' + (t.suit >= 0 ? 's' + t.suit : 'sj') + (animate ? ' new' : '');
  row.innerHTML = trendRowHTML(t, 1);
  row.setAttribute('aria-label', `トレンド：${t.tag}。${t.sum}`);
  ended.querySelector('.ended-h').after(row);
  const rows = ended.querySelectorAll('.trow');
  rows.forEach((r, i) => { if (i >= 4) r.remove(); else { r.querySelector('.tr-no').textContent = i + 1; r.classList.toggle('latest', i === 0); } });
}
async function feedClear(why) {
  const posts = Feed.posts;
  Feed.posts = [];
  if (!posts.length) return;
  if (spd()) {
    $('feed').classList.remove('instant');
    for (const p of posts) p.wrap.classList.add('fade');
    await sleep(170 * spd());
    for (const p of posts) p.wrap.classList.add('closed');
    await sleep(360 * spd());
  }
  for (const p of posts) p.wrap.remove();
  const t = trendOf(posts, why);
  MonthStats.trends.push(t);
  addTrendRow(t, !!spd());
}
// 入力欄の行：だれが入力中か
function feedNote(html, me) {
  const c = $('composer');
  c.classList.toggle('me', !!me);
  c.innerHTML = html || '<span class="cp-idle">…</span>';
}
function feedTyping(s) {
  const h = seats[s];
  if (s == null || s < 0 || !h) { feedNote(''); return; }
  const fresh = !(game && game.field && game.field.top);
  if (s === 0) feedNote(`${avaImg(h, exprFor(0), 'cp-ava')}<span class="cp-t"><b>あなたの番</b>　${fresh ? '新しい話題を投稿しよう' : 'いちばん上の投稿を上回るネタを選ぼう'}</span>`, true);
  else feedNote(`${avaImg(h, exprFor(s), 'cp-ava')}<span class="cp-t"><b>${esc(h.name)}</b> が${fresh ? '新しい話題を' : '返信を'}入力中</span><span class="dots"><i></i><i></i><i></i></span>`);
}

// ---------- タイムラインの見出しの状態（縛り・連番・REVERSE・UPDATE） ----------
const StatusBadges = {
  map: new Map(),
  clear() { this.map.clear(); $('fhStatus').innerHTML = ''; },
  set(key, html, sig) {
    const box = $('fhStatus');
    let it = this.map.get(key);
    if (!html) { if (it) { it.el.remove(); this.map.delete(key); } return null; }
    if (it && it.sig === sig) return it.el;
    if (!it) {
      const el = document.createElement('span');
      el.className = 'fbadge fb-' + key;
      it = { el, sig: '' };
      this.map.set(key, it);
      const order = ['upd', 'rev', 'lock', 'stairs'];
      const next = order.slice(order.indexOf(key) + 1).map(k => this.map.get(k)).find(x => x && x.el.parentNode);
      if (next) box.insertBefore(el, next.el); else box.append(el);
    }
    it.el.innerHTML = html;
    it.sig = sig;
    return it.el;
  },
};
const Stairs = { on: false, ranks: null };
function stairsHTML(r, flip) {
  return `<span class="stairs" aria-hidden="true"><span>${esc(rankLabel(r.prev))}</span><span>${esc(rankLabel(r.cur))}</span><span class="nx${flip ? ' flip' : ''}">${esc(rankLabel(r.next))}</span></span>連番<small>次は ${esc(rankWord(r.next))}</small>`;
}
function rankLabel(rank) { return rank === 16 ? 'JK' : rank === 'S3' ? '♠3' : (rank == null || !RANK_TXT[rank]) ? '—' : RANK_TXT[rank]; }
// 状態の見出しを今の場に合わせる（名前は前の版の「チップ」のまま）
function updateChips(flipStairs) {
  const live = !!(game && game.field && !game.finished && Flow.inGame);
  const f = live ? game.field : null;
  StatusBadges.set('upd', live && game.revolution ? `${ICO.upd}UPDATE<small>強さ逆転中</small>` : '', 'u');
  StatusBadges.set('rev', f && f.elevenBack ? `${ICO.rev}REVERSE<small>タイムライン逆転</small>` : '', 'r');
  if (f && f.lock) {
    const el = StatusBadges.set('lock', `${LOCK_SVG}<span>${f.lock.map(s => suitHtml(s) + SNS_SUIT[s].ja).join(' ')}</span><small>ジャンル固定</small>`, f.lock.join());
    if (el) el.style.setProperty('--bc', SNS_SUIT[f.lock[0]].c);
  } else StatusBadges.set('lock', '');
  if (f && f.rankLock && f.top) {
    const r = Stairs.ranks || { prev: null, cur: f.top.rank, next: stairsNext() };
    StatusBadges.set('stairs', stairsHTML(r, flipStairs), [r.prev, r.cur, r.next].join() + (flipStairs ? 'f' : ''));
  } else StatusBadges.set('stairs', '');
}
function showStairs(prev, cur, next) {
  Stairs.on = true; Stairs.ranks = { prev, cur, next };
  updateChips();
  Sound.play('chime');
  return sleep(260 * spd());
}
async function climbStairs(prev, cur, next) {
  if (!Stairs.on) return;
  Stairs.ranks = { prev, cur, next };
  updateChips(true);
  Sound.play('flip');
  await sleep(380 * spd());
}
function hideStairs() { Stairs.on = false; Stairs.ranks = null; updateChips(); return Promise.resolve(); }

// ---------- 縛り：タイムラインをマークの形の鎖が囲み、上に錠前 ----------
const Lock = { on: false, suits: [], svg: null, pad: null };
const CHAIN_M = 13;
function perimeter(x, y, w, h, r) {
  const segs = [];
  const L = (x0, y0, x1, y1) => ({ len: Math.hypot(x1 - x0, y1 - y0), at: t => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, a: Math.atan2(y1 - y0, x1 - x0) }) });
  const A = (cx, cy, a0, a1) => ({ len: r * Math.abs(a1 - a0), at: t => { const a = a0 + (a1 - a0) * t; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a: a + Math.PI / 2 }; } });
  const xm = x + w / 2;
  segs.push(L(xm, y, x + w - r, y), A(x + w - r, y + r, -Math.PI / 2, 0), L(x + w, y + r, x + w, y + h - r), A(x + w - r, y + h - r, 0, Math.PI / 2),
    L(x + w - r, y + h, x + r, y + h), A(x + r, y + h - r, Math.PI / 2, Math.PI), L(x, y + h - r, x, y + r), A(x + r, y + r, Math.PI, Math.PI * 1.5), L(x + r, y, xm, y));
  const total = segs.reduce((a, s) => a + s.len, 0);
  return { total, at(d) { d = ((d % total) + total) % total; for (const s of segs) { if (d <= s.len) return s.at(s.len ? d / s.len : 0); d -= s.len; } return segs[0].at(0); } };
}
function suitShapeSvg(s) {
  if (s === 3) return CLUB_CIRCLES.slice(0, 3).map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('') + `<path d="${CLUB_STEM}"/>`;
  return `<path d="${SUIT_D[s]}"/>`;
}
function buildChain(animate) {
  const F = Lay.feed;
  if (!F) return;
  if (!Lock.svg) {
    Lock.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Lock.svg.setAttribute('class', 'chain');
    Lock.svg.setAttribute('aria-hidden', 'true');
    $('desk').append(Lock.svg);
  }
  const M = CHAIN_M, svg = Lock.svg;
  const W = F.w + 2 * M, H = F.h + 2 * M;
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.left = Math.round(F.x - M) + 'px'; svg.style.top = Math.round(F.y - M) + 'px';
  svg.style.setProperty('--glow', SNS_SUIT[Lock.suits[0]].c);
  svg.classList.remove('off');
  const per = perimeter(M, M, F.w, F.h, 13);
  const link = F.w < 420 ? 14 : 17;
  const n = Math.max(12, Math.round(per.total / (link * 1.9)));
  const sw = (2.5 / link).toFixed(3);
  const out = [];
  const glow = s => SNS_SUIT[s].c;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = per.at(t * per.total);
    const s = Lock.suits[i % Lock.suits.length];
    const dist = Math.min(t, 1 - t) * 2;
    const d = animate ? Math.round(dist * 520) : 0;
    const deg = (p.a * 180 / Math.PI).toFixed(1);
    out.push(`<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${deg})"><g class="lk" style="--d:${d}ms;--d2:${Math.round((1 - dist) * 220)}ms"><g transform="scale(${link})" fill="${glow(s)}" fill-opacity="0.18" stroke="${glow(s)}" stroke-width="${sw}" stroke-linejoin="round">${suitShapeSvg(s)}</g></g></g>`);
    // 隣の輪とのつなぎ
    const q = per.at((i + 1) / n * per.total);
    const qa = ((p.a + q.a) / 2) * 180 / Math.PI;
    const mid = per.at((t + 0.5 / n) * per.total);
    out.push(`<g transform="translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)}) rotate(${(Math.abs(p.a - q.a) > Math.PI ? p.a * 180 / Math.PI : qa).toFixed(1)})"><g class="lk" style="--d:${d + 40}ms;--d2:${Math.round((1 - dist) * 220)}ms"><ellipse rx="5" ry="2.4" fill="none" style="stroke:var(--chain-ring)" stroke-width="1.9"/></g></g>`);
  }
  svg.innerHTML = out.join('');
  if (!animate) svg.querySelectorAll('.lk').forEach(e => { e.style.animation = 'none'; });
}
function padlockSVG(suits) {
  const c = SNS_SUIT[suits[0]].c;
  const n = suits.length, size = n === 1 ? 22 : 16;
  const glyphs = suits.map((s, i) => `<g transform="translate(${40 + (i - (n - 1) / 2) * size * 1.15} 62) scale(${size})" fill="${SNS_SUIT[s].c}">${suitShapeSvg(s)}</g>`).join('');
  return `<svg viewBox="0 0 80 90"><g class="shackle"><path d="M24 46V29a16 16 0 0 1 32 0v17" fill="none" stroke="#c3cae6" stroke-width="7.5" stroke-linecap="round"/></g><rect x="8" y="40" width="64" height="46" rx="11" fill="#141a35" stroke="${c}" stroke-width="3"/>${glyphs}</svg>`;
}
function layoutChain() {
  if (!Lock.on || !Lay.feed) return;
  buildChain(false);
}
async function showLock(suits) {
  Lock.on = true; Lock.suits = suits.slice();
  const fe = $('feed');
  fe.style.setProperty('--sc', SNS_SUIT[suits[0]].c);
  fe.classList.add('locked');
  if (Lock.pad) Lock.pad.remove();
  Lock.pad = null;
  if (!spd()) { buildChain(false); return; }
  buildChain(true);
  Sound.play('chain');
  const pad = document.createElement('div');
  pad.className = 'padlock';
  pad.innerHTML = padlockSVG(suits);
  pad.style.left = Math.round(Lay.feed.x + Lay.feed.w / 2) + 'px';
  pad.style.top = Math.round(Lay.feed.y + Math.min(Lay.feed.h * 0.4, 170)) + 'px';
  Lock.pad = pad;
  await sleep(380);
  if (!Lock.on) return;
  pad.classList.add('drop');
  $('desk').append(pad);
  await sleep(330);
  if (!Lock.on) return;
  pad.classList.add('shut');
  Sound.play('lock');
  await sleep(520);
  // 見出しの「ジャンル固定」の札へ縮んで収まる
  const badge = StatusBadges.map.get('lock');
  if (badge && badge.el.isConnected && Lock.pad === pad) {
    const r = stageRect(badge.el);
    pad.classList.add('stow');
    pad.style.left = Math.round(r.x + 12) + 'px';
    pad.style.top = Math.round(r.cy) + 'px';
    await sleep(380);
  } else pad.classList.add('leave');
  setTimeout(() => pad.remove(), 420);
  if (Lock.pad === pad) Lock.pad = null;
}
async function hideLock(instant) {
  if (!Lock.on) return;
  Lock.on = false;
  $('feed').classList.remove('locked');
  const svg = Lock.svg, pad = Lock.pad;
  Lock.pad = null;
  if (instant || !spd()) { if (svg) svg.innerHTML = ''; if (pad) pad.remove(); return; }
  Sound.play('unlock');
  if (pad) pad.remove();
  if (svg) { svg.classList.add('off'); setTimeout(() => { if (!Lock.on) svg.innerHTML = ''; }, 520); }
  await sleep(300);
}

// ---------- 11バック・革命 ----------
const BackSign = { on: false };
function showBackSign() {
  BackSign.on = true;
  $('feed').classList.add('reversed');
  updateChips();
  Sound.play('reverse');
  return sleep(320 * spd());
}
function hideBackSign() { BackSign.on = false; $('feed').classList.remove('reversed'); return Promise.resolve(); }
const UpdatePanel = { on: false };
function showUpdatePanel(on) { UpdatePanel.on = !!on; updateChips(); return Promise.resolve(); }
// ふだんは白地に黒い文字の明るいモード。革命（SYSTEM UPDATE）中だけ、画面全体が黒地に白い文字の暗いモード
// （タイトル・結果などの画面も含めて切り替わるよう、ページのいちばん外側に印を付ける）
const Mood = { dark: false };
function applyMood(dark) {
  Mood.dark = !!dark;
  if (dark) document.documentElement.dataset.mood = 'dark';
  else delete document.documentElement.dataset.mood;
}
function setFeltMood(rev, instant) {
  if (instant || !spd()) { applyMood(rev); return Promise.resolve(); }
  if (Mood.dark === !!rev) return Promise.resolve();
  glitchStage();        // アルゴリズム更新：画面が乱れてから色が反転する
  flashStage();
  return sleep(170).then(() => { applyMood(rev); return sleep(260); });
}

// ---------- 8切り：VIRAL の稲妻がいちばん上の投稿に落ちる ----------
const BOLT_SVG = '<svg viewBox="0 0 60 100"><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset="1" stop-color="#ffd23f"/></linearGradient></defs><path d="M36 2L8 56h18L16 98 54 38H34L46 2z" fill="url(#bg1)" stroke="#ff4fa3" stroke-width="3" stroke-linejoin="round"/></svg>';
async function viralStrike() {
  const p = Feed.posts[0];
  if (!p || !spd()) { if (p) p.el.classList.add('viral'); return; }
  const r = stageRect(p.el);
  const bolt = document.createElement('div');
  bolt.className = 'bolt';
  bolt.innerHTML = BOLT_SVG;
  const bw = clamp(r.h * 0.75, 70, 130);
  bolt.style.width = bw + 'px';
  bolt.style.left = Math.round(r.x + r.w * 0.66 - bw / 2) + 'px';
  bolt.style.top = Math.round(r.y + r.h / 2 - bw * 0.95) + 'px';
  const zap = document.createElement('div');
  zap.className = 'zap';
  zap.style.left = Math.round(r.x) + 'px'; zap.style.top = Math.round(r.y) + 'px';
  zap.style.width = Math.round(r.w) + 'px'; zap.style.height = Math.round(r.h) + 'px';
  Sound.play('viral');
  $('fly').append(bolt);
  await sleep(180);
  $('fly').append(zap);
  p.el.classList.add('viral');
  Sound.play('stamp');
  await sleep(420 * spd());
  setTimeout(() => { bolt.remove(); zap.remove(); }, 400);
}

// ---------- スペ3返し：ジョーカーの投稿に FACT CHECK の判 ----------
async function factCheckStamp() {
  const target = Feed.posts[1] || Feed.posts[0];
  if (!target) return;
  target.el.classList.add('debunked');
  if (!spd()) return;
  const img = document.createElement('img');
  img.className = 'fact';
  img.src = FACT_URL;
  img.alt = 'FACT CHECK';
  const card = target.thumbs[0];
  const pr = target.el.getBoundingClientRect();
  const cr = card ? card.getBoundingClientRect() : pr;
  const size = clamp(cr.height * 0.95, 64, 110);
  img.style.width = img.style.height = size + 'px';
  img.style.left = Math.round(cr.left - pr.left + cr.width * 0.55) + 'px';
  img.style.top = Math.round(cr.top - pr.top + cr.height / 2 - size / 2) + 'px';
  Sound.play('counter');
  await sleep(200);
  target.el.append(img);
  Sound.play('stamp');
  await sleep(600 * spd());
}

// ---------- ジョーカー：タイムラインにノイズ ----------
function glitchStage() {
  if (!spd()) return;
  const fe = $('feed');
  fe.classList.remove('glitch'); void fe.offsetWidth; fe.classList.add('glitch');
  const bars = document.createElement('div');
  bars.className = 'glitch-bars';
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('i');
    b.style.top = Math.round(Math.random() * 92) + '%';
    b.style.height = (2 + Math.random() * 9) + '%';
    b.style.background = ['#ff4fa3', '#3b82ff', '#14c27a', '#ff453a', '#ffffff'][i % 5];
    b.style.animationDelay = Math.round(Math.random() * 180) + 'ms';
    bars.append(b);
  }
  fe.append(bars);
  setTimeout(() => { fe.classList.remove('glitch'); bars.remove(); }, 700);
}
// 画面の白い瞬き（アルゴリズム更新）
function flashStage() {
  if (!Flow.inGame) return;
  const f = document.createElement('div');
  f.className = 'flash';
  $('stage').append(f);
  setTimeout(() => f.remove(), 800);
}
// いちばん上の投稿へのいいね
function popReaction(play, rev, owner) {
  const p = Feed.posts[0];
  if (!spd() || !Flow.inGame || !p) return;
  const buzz = playBuzz(play, !!rev, ownerStage(owner));
  const lk = p.el.querySelector('.p-foot .lk') || p.el;
  const r = stageRect(lk);
  const el = document.createElement('div');
  el.className = 'react' + (buzz >= 1e4 ? ' hot' : '');
  el.innerHTML = `<span class="h">♥</span>${fmtCount(buzz)}`;
  el.style.left = Math.round(clamp(r.cx + 20, 40, Stage.W - 40)) + 'px';
  el.style.top = Math.round(clamp(r.cy - 6, 30, Stage.H - 30)) + 'px';
  $('fly').append(el);
  setTimeout(() => el.remove(), 1700);
}

// ---------- 月末：勢いの増減をチップで、登録者の増減を数字で見せる ----------
function floatPowerLabel(s, delta, note) {
  if (!spd() || !Flow.inGame) return;
  const H = holder(s);
  if (!H) return;
  let r = null;
  for (const el of [H.gauge, H.pnum, H.ava]) { if (!el) continue; const q = stageRect(el); if (q.w) { r = q; break; } }
  if (!r) return;
  const el = document.createElement('div');
  el.className = 'powfloat ' + (delta >= 0 ? 'up' : 'down');
  el.innerHTML = (note ? esc(note) + ' ' : '') + '<small>勢い</small>' + (delta >= 0 ? '+' : '−') + Math.abs(delta);
  el.style.left = Math.round(clamp(r.cx, 30, Stage.W - 30)) + 'px';
  el.style.top = Math.round(clamp(r.y - 6, 20, Stage.H - 20)) + 'px';
  $('fly').append(el);
  setTimeout(() => el.remove(), 1900);
}
// 看板の時代：卒業したメンバーの視聴者が、看板の窓へ流れていく
async function annexViewers(fromS, toS, gain, toPower) {
  const A = holder(fromS), B = holder(toS);
  if (!A || !B) return;
  const pick = H => { for (const el of [H.lv, H.ava]) { if (!el) continue; const q = stageRect(el); if (q.w) return q; } return null; };
  const a = pick(A), b = pick(B);
  const ps = [];
  if (a && b && spd()) {
    const n = Math.min(10, 4 + gain);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'flyview';
      el.innerHTML = ICO.person;
      $('fly').append(el);
      const x0 = a.cx + (Math.random() - 0.5) * 24, y0 = a.cy, x1 = b.cx + (Math.random() - 0.5) * 16, y1 = b.cy;
      ps.push(sleep(i * 60 * spd()).then(() => Tween.add(640 * spd(), e => {
        const x = lerp(x0, x1, e), y = lerp(y0, y1, e) - Math.sin(Math.PI * e) * 60;
        el.style.transform = `translate(${x - 7}px, ${y - 7}px)`;
      }, Ease.inOutCubic)).then(() => { el.remove(); if (i % 3 === 0) Sound.play('clink'); }));
    }
    if (A.view) { A.view.v *= 0.25; liveShow(A); }
    if (B.view) { B.view.v *= 1.4; liveShow(B); }
  }
  setPower(A, 0, true);
  await Promise.all(ps);
  await setPower(B, toPower, true);
}
// 卒業したメンバーの窓は閉じる
function closeWin(s) {
  const W = Wins[s];
  if (!W) return Promise.resolve();
  if (!spd()) { W.el.style.opacity = '0'; return Promise.resolve(); }
  setStamp(s, '卒業', 'bad');
  return sleep(380).then(() => { W.el.classList.add('closing'); return sleep(700); });
}
async function animatePowerChange(report) {
  window.__tokenPhase = true;
  const ps = [];
  for (const row of report.rows) {
    const s = seats.findIndex(h => h.id === row.id);
    if (s < 0) continue;
    floatPowerLabel(s, row.delta);
    ps.push(setPower(holder(s), clamp(row.after, 0, MAX_POWER), true));
    // 登録者：順位で増える（おすすめに載る）・減る（登録解除）
    const f = row.fol;
    if (f) {
      if (f.adj) floatFol(s, f.adj, f.adj > 0 ? 'おすすめ' : '登録解除');
      ps.push(setFolNum(folHolder(s), f.after, true));
      if (s === 0) folMilestone(f.before + f.posts, f.after);
    }
  }
  if (ps.length) Sound.play('chime');
  await Promise.all(ps);
  await sleep(250 * spd());
  const ann = report.events.find(e => e.type === 'annex');
  if (ann) {
    const fs = seats.findIndex(h => h.id === ann.id), ts = seats.findIndex(h => h.id === ann.by);
    const winner = houseById(dyn, ann.by);
    if (fs >= 0 && ts >= 0 && winner) {
      floatPowerLabel(ts, ann.gain, '吸収');
      if (ann.fol) { floatFol(ts, ann.fol, 'ファン流入'); setFolNum(folHolder(ts), winner.followers, true); }
      await annexViewers(fs, ts, ann.gain, clamp(winner.power, 0, MAX_POWER));
    }
  }
  const closes = [];
  for (const e of report.events) {
    if (e.type !== 'extinct' && e.type !== 'annex') continue;
    const s = seats.findIndex(h => h.id === e.id);
    if (s > 0) closes.push(closeWin(s));
  }
  if (closes.length) { Sound.play('thud'); await Promise.all(closes); }
  window.__tokenPhase = false;
}

// 月の始まり：小物をすべて片づける
function resetProps() {
  hideLock(true); hideBackSign(); hideStairs(); showUpdatePanel(false);
  setFeltMood(false, true);
  setHolder(-1);
  for (let s = 1; s < Wins.length; s++) setStamp(s, '');
  $('feed').classList.remove('glitch', 'reversed', 'locked');
}

// ---------- 配る山（タイムラインのまんなか） ----------
function deckPoint() {
  const b = Lay.feed;
  return b ? { x: b.x + b.w / 2, y: b.y + Math.min(b.h * 0.45, 200) } : { x: Stage.W / 2, y: Stage.H / 3 };
}

// ---------- タイトルの飾り：架空のアカウントの窓と、話題のスレッド ----------
const TitleDemo = { k: 0 };
function renderTitleDemo() {
  const owners = [DEMO_OWNERS[0], DEMO_OWNERS[1], DEMO_OWNERS[2], DEMO_OWNERS[3]];
  // 登録者と勢いは別：いちばん登録者の多い人がオワコン、ということもある
  const info = [
    { power: 25, count: 4, lastTitle: '大富豪', expr: 'smug', fol: 128400 },
    { power: 13, count: 9, lastTitle: '富豪', expr: 'curious', fol: 34500 },
    { power: 6, count: 11, lastTitle: '貧民', expr: 'anxious', fol: 8920 },
    { power: 2, count: 13, lastTitle: '大貧民', expr: 'panic', fol: 862000 },
  ];
  TitleDemo.k = 4;
  renderWins(owners.map((h, i) => ({ h: Object.assign({}, h, { lastTitle: info[i].lastTitle, power: info[i].power }), count: info[i].count, power: info[i].power, expr: info[i].expr, fol: info[i].fol })));
  setWinActive(2);
  setHolder(1);
  setStamp(4, 'PASS', 'pass');
  feedReset();
  const pick = (s, r) => CARD_POOL.find(c => c.s === s && c.r === r);
  const demo = [
    [DEMO_OWNERS[3], [pick(3, 12)], 2310],
    [DEMO_OWNERS[0], [pick(1, 13)], 9870],
    [DEMO_OWNERS[1], [pick(0, 14)], 4120],
  ];
  for (const [h, cards, fol] of demo) {
    const play = enumeratePlays(cards, DEFAULT_RULES).find(p => p.n === cards.length);
    feedAddPost(h, play, null, -1, { instant: true, reveal: true, fol });
  }
  feedNote(`${avaImg(DEMO_OWNERS[1], 'curious', 'cp-ava')}<span class="cp-t"><b>${esc(DEMO_OWNERS[1].name)}</b> が返信を入力中</span><span class="dots"><i></i><i></i><i></i></span>`);
  setTopicNo(2);
  // 3期生の Lilia が、駆け出しらしい規模でバズった話題
  const viral = enumeratePlays([pick(2, 8)], DEFAULT_RULES).find(p => p.n === 1);
  addTrendRow(trendOf([{ h: DEMO_OWNERS[2], play: viral, rev: false, eff: { eightCut: true } }], 'eight'), false);
}
