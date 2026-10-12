// ================================================================
//  画面：窓の中身・操作パネル・宣言・記録・月末の結果
// ================================================================
const RULE_LIST = [
  ['eightCut', '8切り'], ['revolution', '革命'], ['shibari', '縛り'], ['kaidanShibari', '階段縛り'], ['elevenBack', '11バック'],
  ['spade3', 'スペ3返し'], ['seq', '階段'], ['seqRevolution', '階段革命'], ['miyakoOchi', '覇権陥落'],
  ['foulFinish', '反則上がり'], ['exchange', 'カード交換'],
];
function loadSettings() {
  const s = store.get('settings', null) || {};
  const rules = Object.assign({}, DEFAULT_RULES, s.rules || {});
  rules.jokers = [0, 1, 2].includes(rules.jokers) ? rules.jokers : 1;
  return {
    level: ['easy', 'normal', 'hard'].includes(s.level) ? s.level : 'normal',
    speed: ['slow', 'normal', 'fast'].includes(s.speed) ? s.speed : 'normal',
    rules,
  };
}
const settings = loadSettings();
Sound.enabled = store.get('sound', true);

const CARD_POOL = makeDeck(2);
const UI = { mode: null, finish: null, giveK: 0, giveTitle: '', foulArmed: false, taught: store.get('taught', false) };
let dyn = null;      // 箱（事務所）のメンバーたちの状態
let game = null;     // 今月の対局（1局＝1ヶ月）
let seats = [];      // 席番号 → メンバー（0 があなた。手番の順に時計回り）

const suitHtml = s => `<span class="s${s}">${SUIT_SYM[s]}︎</span>`;
const cardHtml = c => c.r === 16 ? '<span class="jk">JOKER</span>' : suitHtml(c.s) + RANK_TXT[c.r];
function playHtml(play) {
  if (play.type === 'seq') {
    const parts = [];
    for (let r = play.rank; r <= play.high; r++) parts.push(play.jokerAs.includes(r) ? `J(${RANK_TXT[r]})` : RANK_TXT[r]);
    return suitHtml(play.suits[0]) + parts.join('-');
  }
  return play.cards.map(cardHtml).join(' ');
}
const houseLabel = h => h.name;
const seatName = i => seats[i] ? houseLabel(seats[i]) : '';
const temperLabel = h => { const t = TEMPERS.find(x => x.key === h.temper); return t ? t.label : ''; };
const temperPersona = h => { const t = TEMPERS.find(x => x.key === h.temper); return t ? t.persona : {}; };
function titleClass(t) { return t === '大富豪' ? 't-top' : t === '大貧民' ? 't-bottom' : ''; }
function announce(t) { $('live').textContent = t; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function avaImg(h, expr, cls, id, full) {
  const a = (h && h.ava) || NOBODY.ava;
  const e = expr || 'normal';
  return `<img class="ava${cls ? ' ' + cls : ''}"${id ? ` id="${id}"` : ''} src="${avatarURL(a, e, full)}" data-e="${e}" style="--th:${themeColor(a)}" alt="">`;
}

// ---------- 表情：連続でパスすると焦っていく ----------
const Faces = { streak: [], mood: [] };
function resetFaces() { Faces.streak = seats.map(() => 0); Faces.mood = seats.map(() => null); refreshFaces(); }
function exprFor(s) {
  if (Faces.mood[s]) return Faces.mood[s];
  const k = Faces.streak[s] || 0;
  return k >= 3 ? 'panic' : k === 2 ? 'anxious' : k === 1 ? 'curious' : 'normal';
}
function setAvaImg(img, h, e) {
  if (!img || !h || img.dataset.e === e) return;
  img.src = avatarURL(h.ava, e); img.dataset.e = e;
  const wrap = img.parentElement;
  if (wrap && wrap.classList.contains('pava')) wrap.dataset.e = e;
  img.classList.remove('pop'); void img.offsetWidth; img.classList.add('pop');
}
// 表情の小さな印つきのアイコン（名札・操作パネル用）
function moodAva(h, e, cls, id) { return `<span class="pava" data-e="${e}">${avaImg(h, e, cls, id)}</span>`; }
function refreshFace(s) {
  const h = seats[s], e = exprFor(s);
  if (!h) return;
  if (s === 0) setAvaImg($('meAva'), h, e);
  else if (Wins[s]) setAvaImg(Wins[s].ava, h, e);
}
function refreshFaces() { for (let s = 0; s < seats.length; s++) refreshFace(s); }
function facePass(s) { Faces.streak[s] = (Faces.streak[s] || 0) + 1; Faces.mood[s] = null; refreshFace(s); }
function facePlay(s) { Faces.streak[s] = 0; Faces.mood[s] = null; refreshFace(s); }
function faceMood(s, mood) { if (s < 0 || !seats[s]) return; Faces.mood[s] = mood; refreshFace(s); }
const RESULT_EXPR = { '大富豪': 'smug', '富豪': 'happy', '平民': 'normal', '貧民': 'anxious', '大貧民': 'panic' };

// ---------- 上部・サイド ----------
function powerHtml(h) {
  const pct = clamp(h.power / MAX_POWER * 100, 0, 100);
  const low = h.power <= 5, top = h.power >= MAX_POWER;
  return `<span class="power${low ? ' low' : ''}${top ? ' top' : ''}"><span class="bar"><i style="width:${pct}%"></i></span><b>${h.power}</b></span>`;
}
function renderTopbar() {
  if (!dyn) { $('genLabel').textContent = 'SNS大富豪'; $('genLatin').textContent = 'TOPIC BATTLE'; $('eraChip').hidden = true; return; }
  const E = ERA_DEFS[dyn.era.key];
  $('genLatin').textContent = 'MONTH ' + dyn.gen;
  $('genLabel').textContent = `${dyn.gen}ヶ月目`;
  $('eraChip').hidden = false;
  $('eraChip').innerHTML = `<span class="era-nm">${E.name}</span><small>${E.en}</small>`;
  $('eraChip').title = E.name;
}
function renderSide() {
  if (!dyn) return;
  const E = ERA_DEFS[dyn.era.key];
  $('eraCard').innerHTML = `<h2>${AGENCY}の時期 <small>PHASE</small></h2><div class="era-name">${E.name}</div><div class="era-latin">${E.en}</div><p>${E.desc}</p><div class="era-left">この時期はあと${dyn.era.left}ヶ月（${dyn.era.num}つ目の時期）・${dyn.lastKi || 1}期生まで</div>`;
  const list = [...dyn.houses].sort((a, b) => b.power - a.power);
  $('houseList').innerHTML = list.map((h, i) => {
    const streak = h.poorStreak ? `<span class="warn-mark">オワコン×${h.poorStreak}</span>` : '';
    const age = dyn.gen - h.founded + 1;
    return `<li class="${h.isPlayer ? 'me' : ''}"><span class="rk">${i + 1}</span>${avaImg(h, 'normal')}<div class="seat-main"><div class="hl-name"><span class="nm">${esc(h.name)}</span>${h.lastTitle ? `<span class="badge ${titleClass(h.lastTitle)}">${tl(h.lastTitle)}</span>` : ''}${h.isPlayer ? '<span class="badge you">あなた</span>' : ''}</div><div class="hl-sub"><span class="hl-fol">${ICO.person}<b>${fmtCount(curFollowers(h))}</b></span>・${h.ki || 1}期生・${esc(h.handle)}${h.isPlayer ? '' : '・' + temperLabel(h)}・活動${age}ヶ月目 ${streak}</div>${powerHtml(h)}</div></li>`;
  }).join('');
  const recent = dyn.fallen.slice(-3).reverse().map(h => esc(h.name)).join('、');
  $('fallenLine').innerHTML = dyn.fallen.length ? `卒業したメンバー <b>${dyn.fallen.length}</b>　${recent}` : '卒業したメンバーはまだいない';
}
function renderMe() {
  if (!dyn) { $('meHouse').innerHTML = ''; return; }
  const h = dyn.houses.find(x => x.isPlayer) || playerHouse(dyn);
  const n = game ? game.players[0].hand.length : 0;
  const streak = h.poorStreak ? `<span class="warn-mark">オワコン×${h.poorStreak}</span>` : '';
  const badge = h.lastTitle ? `<span class="badge ${titleClass(h.lastTitle)}">${tl(h.lastTitle)}</span>` : '';
  const e = seats[0] === h ? exprFor(0) : 'normal';
  const mark = Pressure.on || Pressure.outcome ? dangerBadgeHTML() : streak;     // 卒業の危機の月は「卒業危機」の印
  $('meHouse').innerHTML = `${moodAva(h, e, 'me-ava', 'meAva')}<div class="me-main"><div class="me-name"><span class="nm">${esc(h.name)}</span>${badge}${mark}</div><div class="me-sub"><span class="me-live">${liveHTML()}</span><span class="me-pw" title="勢い"><small>勢い</small><b class="w-pnum"></b>${GAUGE_HTML}</span></div><div class="me-sub me-sub2"><span class="me-fol" title="チャンネル登録者">${ICO.person}<b class="w-fn">0</b></span><span class="me-count"><span class="lbl">ネタ </span><b id="myCount">${n}</b>枚</span></div></div>`;
  $('me').style.setProperty('--th', themeColor(h.ava));
  $('me').classList.toggle('danger', Pressure.on && Pressure.outcome !== 'safe');
  const q = sel => $('meHouse').querySelector(sel);
  Me.hid = h.id; Me.ava = $('meAva');
  Me.gauge = q('.pow-gauge'); Me.pnum = q('.w-pnum'); Me.powN = null;
  setPower(Me, h.power, false);
  Me.fol = q('.me-fol'); Me.fn = Me.fol.querySelector('.w-fn'); Me.folN = 0;
  setFolNum(Me, curFollowers(h), false);
  Me.lv = q('.me-live'); Me.ln = q('.lv-n');
  liveStart(Me);
}

// ---------- 窓（席の順に時計回り） ----------
function renderDesk() {
  const isNew = h => dyn.gen > 1 && h.founded === dyn.gen;
  const meta = h => {
    const age = dyn.gen - h.founded + 1;
    const streak = h.poorStreak ? `<span class="warn-mark">オワコン×${h.poorStreak}</span>` : '';
    return `<span>${h.ki || 1}期生</span><span>${esc(temperLabel(h))}</span><span>活動${age}ヶ月目</span>${streak}`;
  };
  renderWins(seats.slice(1).map(h => ({ h, count: 0, power: h.power, isNew: isNew(h), animate: true, meta: meta(h) })));
}
function updateCounts() {
  if (!game) return;
  for (let s = 1; s < seats.length; s++) {
    const W = Wins[s];
    if (!W) continue;
    if (W.n !== game.players[s].hand.length) setBacks(W, game.players[s].hand.length);
    W.el.classList.toggle('out', !game.active[s] && !game.finished);
  }
  const mc = $('myCount');
  if (mc) mc.textContent = game.players[0].hand.length;
}
function setActive(pi) {
  setWinActive(pi);
  $('me').classList.toggle('myturn', pi === 0);
  if (pi > 0) setAB(`${seatName(pi)}の番`, fieldText(), '');
}
// 入力中：窓のタブが読み込み中になり、タイムラインの入力欄に出る
function setStatus(s, text, cls) {
  setTyping(s, cls === 'thinking');
  if (cls === 'thinking') feedTyping(s);
}
function clearPassMarks() {
  for (let s = 1; s < Wins.length; s++) if (Wins[s] && Wins[s].stampText === 'PASS') setStamp(s, '');
}
// 階段縛りで次に出せる数字（場がジョーカーなら ♠3 だけ）
function stairsNext() {
  const f = game && game.field;
  if (!f || !f.top) return null;
  if (f.top.rank === 16) return 'S3';
  return rankLockNext(f.top, game.effRev());
}
function rankWord(nx) { return nx === 'S3' ? (game && game.rules.spade3 ? '♠3' : '—') : nx === 16 ? 'ジョーカー' : nx == null ? '—' : RANK_TXT[nx]; }
function banner(text, ms) {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove('show'), ms || 1600);
}
// タイムライン
function addLog(html, cls) {
  const ul = $('logList');
  const li = document.createElement('li');
  li.innerHTML = html;
  if (cls) li.className = cls;
  ul.append(li);
  while (ul.children.length > 200) ul.firstChild.remove();
  ul.scrollTop = ul.scrollHeight;
}
function logPost(s, play) {
  const h = seats[s];
  if (!h) return;
  addLog(`${avaImg(h, 'normal', 'tl-ava')}<div class="tl-main"><div class="tl-head"><b>${esc(h.name)}</b><span class="tl-h">${esc(h.handle)}</span></div><div class="tl-body">${esc(playTitle(play, h))}</div><div class="tl-cards">${playHtml(play)}<span class="tl-kind">${esc(playLabel(play))}</span></div></div>`, 'post');
}
function logPass(s) {
  const h = seats[s];
  if (!h) return;
  addLog(`${avaImg(h, exprFor(s), 'tl-ava sm')}<span><b>${esc(h.name)}</b> パス</span>`, 'pass');
}
function setAB(title, sub, cls, subHtml) {
  $('abTitle').textContent = title;
  const s = $('abSub');
  if (subHtml) s.innerHTML = subHtml; else s.textContent = sub || '';
  s.className = cls || '';
}
function fieldText() {
  if (!game || !game.field || !game.field.top) return '場は空です';
  let t = '場：' + playLabel(game.field.top);
  if (game.field.last != null && game.field.last !== 0) t += `（${seatName(game.field.last)}）`;
  if (game.field.lock) t += '・縛り ' + game.field.lock.map(s => SUIT_SYM[s] + '︎' + SNS_SUIT[s].ja).join('');
  if (game.field.rankLock) t += '・階段縛り 次は' + rankWord(stairsNext());
  return t;
}

// ---------- 宣言（通知のポップアップ） ----------
function proclaim(ja, en, o = {}) {
  if (!spd()) return Promise.resolve();
  const layer = $('proclaim');
  const el = document.createElement('div');
  el.className = 'decree' + (o.big ? ' big' : '') + (o.small ? ' small' : '') + (o.tone ? ' t-' + o.tone : '') + (o.gold ? ' t-gold' : '');
  el.innerHTML = `<div class="ribbon"><span class="en">${en}</span><span class="ja">${ja}</span>${o.progress ? '<span class="prog"><i></i></span>' : ''}</div>${o.sub ? `<div class="sub">${o.sub}</div>` : ''}`;
  layer.append(el);
  if (o.sound !== null) Sound.play(o.sound || 'stamp');
  const hold = (o.hold || 1050) * Math.max(0.6, spd());
  el.style.animationDuration = (hold + 380) + 'ms';
  const bar = el.querySelector('.prog i');
  if (bar) bar.style.animationDuration = Math.round(hold * 0.55) + 'ms';
  setTimeout(() => el.remove(), hold + 480);
  announce(ja + (o.sub ? '。' + o.sub.replace(/<[^>]+>/g, '') : ''));
  return sleep(hold * 0.9);
}
// ---------- 操作パネル ----------
function selectedCards() { return Hand.cards.filter(c => c.selected).map(c => c.card); }
function clearSelection(silent) {
  let any = false;
  for (const c of Hand.cards) if (c.selected) { c.selected = false; c.setGlow(false); any = true; }
  if (any && !silent) { onSelectionChanged(); relayoutHand(160); }
  return any;
}
function onSelectionChanged() {
  const btn = $('btnPlay');
  btn.classList.remove('btn-warn');
  UI.foulArmed = false;
  const sel = selectedCards();
  if (UI.mode === 'play') {
    btn.textContent = '投稿';
    if (!sel.length) {
      const tip = UI.taught ? '' : '手前の札（投稿ネタ）をタップして選び「投稿」。';
      setAB('あなたの番', tip + (game.field.top ? fieldText() + ' → 同じ形でより強く' : '場は空です。好きな出し方で出せます'), '');
      btn.disabled = true; return;
    }
    const r = game.interpret(0, sel);
    if (r.play) {
      if (game.wouldFoul(0, r.play)) setAB(playLabel(r.play), 'このまま上がると反則上がり（最下位）です', 'warn');
      else setAB(playLabel(r.play), '', 'good', '出せます：' + playHtml(r.play) + ` <span class="pt">「${esc(playTitle(r.play, seats[0]))}」</span>`);
      btn.disabled = false;
    } else {
      setAB(sel.map(cardName).join(' '), r.reason, 'warn');
      btn.disabled = true;
    }
  } else if (UI.mode === 'give') {
    btn.textContent = '渡す';
    const n = sel.length;
    btn.disabled = n !== UI.giveK;
    if (n === UI.giveK) setAB(UI.giveTitle, '', 'good', '渡す札：' + sel.map(cardHtml).join(' '));
    else setAB(UI.giveTitle, n > UI.giveK ? `${n - UI.giveK}枚多いです` : `あと${UI.giveK - n}枚選んでください`, n > UI.giveK ? 'warn' : '');
  }
}
function setButtonsForMode() {
  const playing = UI.mode === 'play', giving = UI.mode === 'give';
  const out = !!(game && !game.active[0] && !game.finished);
  $('btnHint').hidden = giving || out;
  $('btnPass').hidden = giving || out;
  $('btnPlay').hidden = out;
  $('btnSkip').hidden = !out || Flow.skip;
  $('btnHint').disabled = !playing;
  $('btnPass').disabled = !(playing && game.canPass(0));
  if (!playing && !giving) { $('btnPlay').disabled = true; $('btnPlay').textContent = '投稿'; }
}
function showHint() {
  if (UI.mode !== 'play') return;
  const choice = aiChoose(game.viewFor(0), 'hard', {});
  clearSelection(true);
  if (!choice) { setAB('ヒント', 'ここはパスがおすすめです', ''); relayoutHand(160); return; }
  for (const c of Hand.cards) if (choice.cards.includes(c.card)) { c.selected = true; c.setGlow(true); }
  onSelectionChanged();
  relayoutHand(180);
}

// ---------- 月末の結果（全員の順位が決まると1ヶ月が経つ） ----------
function powerReason(row) {
  const parts = [];
  const base = row.delta - row.rev + row.upkeep + row.drain;
  parts.push(`${tl(row.title)} ${base >= 0 ? '+' : ''}${base}`);
  if (row.upkeep) parts.push(`マンネリ −${row.upkeep}`);
  if (row.drain) parts.push(`ブーム離れ −${row.drain}`);
  if (row.rev) parts.push(`革命 +${row.rev}`);
  return parts.join('・');
}
const signed = n => (n >= 0 ? '+' : '−') + fmtCount(Math.abs(n));
// 登録者の増減の内訳（投稿で増えた分と、順位での増減）
function folReason(f) {
  const parts = [`投稿 ${signed(f.posts)}`];
  if (f.adj) parts.push(`${f.adj > 0 ? 'おすすめ' : '登録解除'} ${f.rate > 0 ? '+' : '−'}${Math.round(Math.abs(f.rate) * 100)}%`);
  return parts.join('・');
}
function showChronicle(report) {
  return new Promise(resolve => {
    const E = ERA_DEFS[report.era];
    $('chronLatin').textContent = `MONTH ${report.gen} RESULT`;
    $('chronTitle').textContent = `${report.gen}ヶ月目の結果`;
    $('chronEra').textContent = E.name;
    const deadIds = new Set(report.events.filter(e => e.type === 'extinct' || e.type === 'annex').map(e => e.id));
    $('chronRows').innerHTML = report.rows.map(row => {
      const h = houseById(dyn, row.id);
      const pctB = clamp(row.before / MAX_POWER * 100, 0, 100);
      const dead = deadIds.has(row.id);
      const low = row.after <= 5;
      const e = dead ? 'cry' : RESULT_EXPR[row.title] || 'normal';
      const f = row.fol;
      const fd = f ? f.after - f.before : 0;
      const folLine = f ? `<small class="c-fol">${ICO.person}<b>${fmtCount(f.after)}</b><span class="${fd >= 0 ? 'up' : 'down'}">${signed(fd)}</span><span class="c-fwhy">${folReason(f)}</span></small>` : '';
      return `<li class="${h.isPlayer ? 'me' : ''}${dead ? ' dead' : ''}"><span class="c-pos">${row.pos + 1}</span>${avaImg(h, e)}<span class="c-name"><b>${esc(h.name)}${h.isPlayer ? '（あなた）' : ''}${dead ? '（卒業）' : ''}</b><small class="c-sub"><span class="c-h">${esc(h.handle)}・${h.ki || 1}期生</span><span class="c-title ${titleClass(row.title)}">${tl(row.title)}</span></small>${folLine}</span><span class="c-power"><span class="nums"><small>勢い</small> ${row.before} → ${Math.max(0, row.after)} <span class="delta ${row.delta >= 0 ? 'up' : 'down'}">(${row.delta >= 0 ? '+' : ''}${row.delta})</span></span><span class="c-bar${low ? ' low' : ''}"><i style="width:${pctB}%" data-to="${clamp(row.after / MAX_POWER * 100, 0, 100)}"></i></span><span class="c-why">${powerReason(row)}</span></span></li>`;
    }).join('');
    const ev = [];
    for (const e of report.events) {
      const h = houseById(dyn, e.id);
      if (e.type === 'extinct') ev.push(`<li class="ev-extinct">${avaImg(h, 'cry', 'ev-ava')}<span><b>${esc(h.name)}</b>（${h.ki || 1}期生）、卒業。${h.history.length}ヶ月の活動に幕を下ろした（登録者${fmtCount(h.followers || 0)}人）。</span></li>`);
      if (e.type === 'annex') { const by = houseById(dyn, e.by); ev.push(`<li class="ev-extinct">${avaImg(h, 'cry', 'ev-ava')}<span><b>${esc(h.name)}</b>が卒業し、ファンは看板の<b>${esc(by.name)}</b>へ流れた（勢い+${e.gain}${e.fol ? `・登録者+${fmtCount(e.fol)}人` : ''}）。</span></li>`); }
      if (e.type === 'enter') ev.push(`<li class="ev-enter">${avaImg(h, 'happy', 'ev-ava')}<span>${h.ki || 2}期生<b>${esc(h.name)}</b>（${esc(h.handle)}）がデビュー（勢い${h.power}・登録者${fmtCount(h.followers || 0)}人）。</span></li>`);
      if (e.type === 'era') { const E2 = ERA_DEFS[e.key]; ev.push(`<li class="ev-era"><span class="glyph">◆</span><span>箱の時期が変わる。<b>${E2.name}</b><small>${E2.desc}</small></span></li>`); }
    }
    $('chronEvents').innerHTML = ev.join('');
    // 今月のハイライト
    const hi = monthHighlights();
    $('chronHi').hidden = !hi.length;
    $('chronHi').innerHTML = hi.length ? `<div class="hi-h">今月のハイライト <small>HIGHLIGHTS</small></div>` + hi.map(x => `<div class="hi-row ${x.suit >= 0 ? 's' + x.suit : ''}${x.h && x.h.isPlayer ? ' me' : ''}"><span class="hi-l">${x.label}</span>${avaImg(x.h, x.kind === 'quiet' ? 'anxious' : 'smug', 'hi-ava')}<span class="hi-who">${esc(x.h ? x.h.name : '')}${x.h && x.h.isPlayer ? '<small>あなた</small>' : ''}</span><span class="hi-t">${esc(x.text)}</span><span class="hi-n">${x.num}</span></div>`).join('') : '';
    const me = dyn.houses.find(h => h.isPlayer);
    const warn = $('chronWarn');
    if (report.playerDead) { warn.hidden = false; warn.textContent = 'あなたの勢いが尽きました。'; }
    else if (me && nextMonthDanger(me)) { warn.hidden = false; warn.textContent = `来月、${nextMonthDanger(me).line}です（いま勢い${me.power}）。`; }
    else if (me && me.poorStreak) { warn.hidden = false; warn.textContent = `オワコンが${me.poorStreak}ヶ月続いています。次もオワコンなら勢い−${nextPoorLoss(me, dyn)}（いま${me.power}）。`; }
    else if (me && me.power <= 5) { warn.hidden = false; warn.textContent = `勢いが残り${me.power}。上位に入らなければ失速します。`; }
    else if (me && nextMonthPeak(me)) { warn.hidden = false; warn.textContent = nextMonthPeak(me); }
    else warn.hidden = true;
    warn.classList.toggle('gold', !!(me && !report.playerDead && !nextMonthDanger(me) && !me.poorStreak && me.power > 5 && nextMonthPeak(me)));
    const btn = $('btnNextGen');
    btn.textContent = report.playerDead ? '最後を見届ける' : `${dyn.gen}ヶ月目へ`;
    openOverlay('chronicle');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const i of $('chronRows').querySelectorAll('.c-bar i')) i.style.width = i.dataset.to + '%';
    }));
    btn.onclick = () => { closeOverlay('chronicle'); resolve(); };
  });
}

function showGameOver() {
  return new Promise(resolve => {
    const h = playerHouse(dyn);
    const gens = h.history.length;
    const tops = h.history.filter(x => x.title === '大富豪').length;
    const best = store.get('best', null);
    const isBest = !best || gens > best.gens;
    $('goAva').innerHTML = avaImg(h, 'cry', 'go-ava');
    $('goTitle').textContent = `${h.name} 卒業`;
    $('goScore').innerHTML = `<span class="gs-l">配信を続けた期間</span><span class="gs-n"><b>${gens}</b>ヶ月</span>${isBest ? '<span class="gs-best">自己ベスト更新</span>' : best ? `<span class="gs-prev">これまでの最長 ${best.gens}ヶ月</span>` : ''}`;
    const fol = h.followers || 0, maxFol = Math.max(h.maxFollowers || 0, fol);
    $('goSub').textContent = `${AGENCY}${h.ki || 1}期生・${h.handle}・${h.founded}ヶ月目〜${h.fallenGen}ヶ月目` + (maxFol > fol ? `・登録者は最大${fmtCount(maxFol)}人` : '');
    $('goStats').innerHTML = `<div><b>${gens}</b><span>活動した月数</span></div><div><b>${fmtCount(fol)}</b><span>卒業時の登録者</span></div><div><b>${h.maxPower}</b><span>最高の勢い</span></div><div><b>${tops}</b><span>覇権の回数</span></div>`;
    $('goLineage').innerHTML = h.history.map(x => `<li><span class="g">${x.gen}ヶ月目</span><span class="hd">${x.pos + 1}位／${x.n}人</span><span class="c-title ${titleClass(x.title)}">${tl(x.title)}</span><span class="ln-pw">勢い ${Math.max(0, x.power)}${x.fol != null ? `<small>・${fmtCount(x.fol)}人</small>` : ''}</span></li>`).join('');
    if (isBest) store.set('best', { gens, name: h.name, maxPower: h.maxPower, followers: fol });
    store.set('dynasty', null);
    openOverlay('gameover');
    $('btnRefound').onclick = () => { closeOverlay('gameover'); resolve(); };
  });
}

// ---------- 画面の開け閉め ----------
const OVERLAYS = ['titleScreen', 'chronicle', 'gameover', 'menuScreen', 'helpScreen'];
function openOverlay(id) {
  $(id).hidden = false;
  if (id === 'menuScreen' || id === 'helpScreen') setPaused(true);
  const f = $(id).querySelector('.btn-primary');
  if (f && id !== 'titleScreen') setTimeout(() => f.focus({ preventScroll: true }), 40);
}
function closeOverlay(id) {
  $(id).hidden = true;
  if (!['menuScreen', 'helpScreen'].some(o => !$(o).hidden)) setPaused(false);
}
function anyOverlayOpen() { return OVERLAYS.some(id => !$(id).hidden); }
function toggleSide(open) {
  const s = $('side');
  const want = open == null ? !s.classList.contains('open') : open;
  if (want && dyn) renderSide();            // 登録者は月の途中でも増えるので、開くたびに描き直す
  s.classList.toggle('open', want);
  $('scrim').hidden = !want;
}

// ---------- 設定フォーム ----------
function buildSetupForm() {
  const box = $('ruleToggles');
  box.innerHTML = '';
  for (const [key, label] of RULE_LIST) {
    const l = document.createElement('label');
    l.innerHTML = `<input type="checkbox" id="rule-${key}" name="rule-${key}"><span>${label}</span>`;
    box.append(l);
  }
  $('lv-' + settings.level).checked = true;
  $('sp-' + settings.speed).checked = true;
  $('jk-' + settings.rules.jokers).checked = true;
  for (const [key] of RULE_LIST) $('rule-' + key).checked = !!settings.rules[key];
  $('eraHelp').innerHTML = Object.keys(ERA_DEFS).map(k => `<dt>${ERA_DEFS[k].name}</dt><dd>${ERA_DEFS[k].desc}${ERA_DEFS[k].target ? `（${ERA_DEFS[k].target[0]}${ERA_DEFS[k].target[1] !== ERA_DEFS[k].target[0] ? '〜' + ERA_DEFS[k].target[1] : ''}人ほど）` : ''}</dd>`).join('');
  $('propLegend').innerHTML = LEGEND.map(([icon, text]) => `<dt>${typeof icon === 'function' ? icon() : icon}</dt><dd>${text}</dd>`).join('');
  $('suitTable').innerHTML = [1, 0, 2, 3].map(s => { const S = SNS_SUIT[s]; return `<tr><th>${suitSvg(s, S.c, 18)}</th><td><b style="color:${S.c}">${S.ja}</b><small>${S.en}</small></td><td>${['写真の投稿（日常・てぇてぇ）', '短文の投稿（質問箱・語り・凸待ち）', '告知（記念配信・新衣装・ライブ）', 'ライブ配信（ゲーム・歌枠・耐久・コラボ）'][[1, 0, 2, 3].indexOf(s)]}</td></tr>`; }).join('');
}
function readSetupForm() {
  const f = $('setupForm');
  settings.level = f.elements.level.value || 'normal';
  settings.speed = f.elements.speed.value || 'normal';
  settings.rules.jokers = parseInt(f.elements.jokers.value || '1', 10);
  for (const [key] of RULE_LIST) settings.rules[key] = $('rule-' + key).checked;
  store.set('settings', settings);
  PaintState.ver++;           // 特別な札の印（VIRAL など）を描き直す
}
// 遊び方に載せる画面の凡例
const LEGEND = [
  [() => `<span class="lg-win"><i></i><i></i><i></i></span>`, '<strong>ブラウザの窓</strong>：同じ箱のほかのメンバー（Vtuber）。手番の人の窓が光り、上のボタンに色が付いて、タブが読み込み中になります。'],
  [() => `<span class="lg-backs"><i></i><i></i><i></i><i></i><i></i></span>`, '<strong>裏向きの札</strong>：その人の残りの札。並んだ数で、あと何枚かが目で分かります。'],
  [() => `<span class="live-pill"><i></i><span class="lp-t">LIVE</span></span>`, '<strong>同接</strong>：いま配信を見ている人の数。勢いと登録者で水準が決まり、1〜2秒ごとに細かく増えたり減ったりします。投稿すると強い札ほど跳ね上がり、パスが続くと減っていき、ネタを出し切る（上がる）と「終了」になります。'],
  [() => `<span class="pow-gauge lg-gauge" style="--p:48%;--th:#3b82ff"><i></i></span>`, '<strong>勢いのゲージ</strong>：同接の横の小さな数字と、その下の細いゲージが勢い（最大25）。25で満タンの金色、5以下は赤くなります。月末（全員の順位が決まったとき）に増減し、0になると卒業です。'],
  [`<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M8 20.5V14a7 7 0 0 1 14 0v6.5l1.8 2.3H6.2z"/><path d="M12.6 25.2a2.6 2.6 0 0 0 4.8 0"/><circle cx="22.5" cy="8.5" r="4.5" fill="#ff2d55" stroke="none"/></svg>`, '<strong>通知</strong>：前の月に人気者・覇権だと、DM・コラボのお誘い・案件の相談・投げ銭などが画面の端に届きます（覇権は出演依頼や取材も）。調子が落ちると、運営やマネージャーからの連絡も届きます。上のベルで見返せます。'],
  [() => `<span class="warn-mark danger lg-danger">卒業危機</span>`, '<strong>卒業危機</strong>：今月の順位しだいで卒業になる月に、あなたの名前の横に付く印（欄も赤く光ります）。何位以下で卒業かは月の始めに告げられ、印を押すと確かめられます。マネージャーが投稿やパスに口を出してきます。'],
  [`<svg viewBox="0 0 30 30"><rect x="1" y="8" width="28" height="14" rx="7" fill="rgba(62,224,143,0.16)" stroke="#3ee08f" stroke-width="1.4"/><circle cx="8" cy="13.2" r="2.3" fill="#3ee08f"/><path d="M3.8 19.4c.4-2.6 2.2-4 4.2-4s3.8 1.4 4.2 4z" fill="#3ee08f"/><text x="20.5" y="18.2" text-anchor="middle" font-size="8.5" font-weight="800" fill="#3ee08f">+12</text></svg>`, '<strong>登録者</strong>：窓と操作パネルの人の形の印の数字（チャンネル登録者）。札を出す（投稿する）たびに増え、強い札ほど大きく増えます。月末には覇権・人気者が「おすすめ」で増え、過疎・オワコンは「登録解除」で減ります。勢いとは別の数字なので、登録者が多くてもオワコンになることがあります。'],
  [`<svg viewBox="0 0 30 30"><g transform="rotate(-9 15 15)"><rect x="3" y="8" width="24" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><text x="15" y="18.4" text-anchor="middle" font-size="8" fill="currentColor" font-family="'Dela Gothic One', sans-serif">PASS</text></g></svg>`, '<strong>PASS の判</strong>：その人はいまの話題に返せなかった（パス）。誰かが投稿すると消えます。'],
  [`<svg viewBox="0 0 30 30"><defs><linearGradient id="lgHot"><stop offset="0" stop-color="#ff4fa3"/><stop offset="1" stop-color="#ffb02e"/></linearGradient></defs><rect x="2" y="9" width="26" height="12" rx="6" fill="url(#lgHot)"/><text x="15" y="17.6" text-anchor="middle" font-size="7" font-weight="800" fill="#fff">話題中</text></svg>`, '<strong>話題中</strong>：タイムラインのいちばん上の投稿をした人。ほかの全員がパスすると、この人から次の話題が始まります。'],
  [`<svg viewBox="0 0 30 30"><g fill="none" stroke="#ff4fa3" stroke-width="2.2" stroke-linejoin="round"><path d="M8 17.5c-2.6-2-4.5-3.6-4.5-5.6 0-1.6 1.2-2.6 2.5-2.6 1 0 1.6.6 2 1.3.4-.7 1-1.3 2-1.3 1.3 0 2.5 1 2.5 2.6 0 2-1.9 3.6-4.5 5.6z"/><path d="M19 13.5c-2.6-2-4.5-3.6-4.5-5.6 0-1.6 1.2-2.6 2.5-2.6 1 0 1.6.6 2 1.3.4-.7 1-1.3 2-1.3 1.3 0 2.5 1 2.5 2.6 0 2-1.9 3.6-4.5 5.6z"/></g><path d="M18 22v-2a3.2 3.2 0 0 1 6.4 0v2" fill="none" stroke="#c3cae6" stroke-width="1.8"/><rect x="16.5" y="21" width="9.4" height="7" rx="1.6" fill="#151a33" stroke="#ff4fa3" stroke-width="1"/></svg>`, '<strong>マークの形の鎖と錠前</strong>：縛り（ジャンル固定）。タイムラインを囲む鎖の輪の形と色が、出せるマーク＝ジャンルです（♥縛りならハートのピンクの鎖）。場が流れると外れます。'],
  [() => `<span class="stairs"><span>5</span><span>6</span><span class="nx">7</span></span>`, '<strong>連番の階段</strong>：階段縛り（連番シリーズ）。前の数字と、次に出せる数字（いちばん高い段）が出ます。'],
  [`<svg viewBox="0 0 30 30"><rect x="2" y="8" width="26" height="14" rx="7" fill="none" stroke="#a77bff" stroke-width="2"/><path d="M10 11v8M10 11l-2 2M10 11l2 2M20 19v-8M20 19l-2-2M20 19l2-2" stroke="#d9c7ff" stroke-width="1.6" fill="none"/></svg>`, '<strong>REVERSE</strong>：11バック。J が出て、場が流れるまで強さが逆転しています（タイムライン逆転）。タイムラインの縁が紫に光ります。'],
  [`<svg viewBox="0 0 30 30"><rect x="3" y="5" width="24" height="17" rx="2" fill="#0d1124" stroke="#8b5cff" stroke-width="1.5"/><rect x="3" y="5" width="24" height="4" fill="#2a2f55"/><path d="M12 15a3.5 3.5 0 1 0 1-2.5" fill="none" stroke="#22d3ee" stroke-width="1.6"/><path d="M8 19h6" stroke="#eef1ff" stroke-width="1.2"/></svg>`, '<strong>UPDATE・暗い画面</strong>：革命中（アルゴリズム更新）。その月のあいだ強さが逆転し、画面が黒地に白い文字の暗いモードに変わります（革命返しで、ふだんの白い画面に戻る）。'],
];
