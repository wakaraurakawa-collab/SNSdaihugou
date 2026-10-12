// ================================================================
//  起動・タイトル・入力・動きのループ
// ================================================================
// ---------- タイトル：Vtuberとしてデビューする ----------
const Pending = { ava: null, roma: 'me', tail: '' };
const HANDLE_TAILS = ['', '_ch', '_tv', '_live', 'chan', '_official', '_oo'];
function randomUnusedName() {
  const best = store.get('best', null);
  const pool = INFLUENCER_NAMES.filter(n => !best || n[0] !== best.name);
  return pool[Math.floor(Math.random() * pool.length)];
}
function romaFor(name) {
  const hit = INFLUENCER_NAMES.find(n => n[0] === name);
  if (hit) return hit[1];
  const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12);
  return slug || 'me' + (Pending.digits || (Pending.digits = String(100 + Math.floor(Math.random() * 900))));
}
function pendingHandle() { return '@' + Pending.roma + Pending.tail; }
function syncHandle() {
  Pending.roma = romaFor(($('houseName').value || '').trim());
  $('handleLine').textContent = pendingHandle();
}
function rerollAvatar() {
  Pending.ava = makeAvatar(Math.random);
  $('avaPreview').innerHTML = avaImg({ ava: Pending.ava }, 'happy', 'title-ava', null, true);
}
function rerollName() {
  const [base] = randomUnusedName();
  $('houseName').value = base;
  Pending.tail = HANDLE_TAILS[Math.floor(Math.random() * HANDLE_TAILS.length)];
  syncHandle();
}
function validDyn(d) {
  if (!(d && !d.over && Array.isArray(d.houses) && d.houses.some(h => h.isPlayer) && typeof d.gen === 'number' && d.era && ERA_DEFS[d.era.key])) return null;
  // 古い記録（アイコンのない家）は使わない
  if (!d.houses.every(h => h.ava && h.handle)) return null;
  return ensureFollowers(d);      // 登録者・期生のない前の版の記録には、活動の長さに見合う数を入れる
}
let savedDyn = null;
function openTitle(fresh, saved) {
  dyn = null; game = null; seats = [];
  Clock.gen = 1; Clock.era = 'dawn'; Clock.lastKi = 1;
  pressureReset(); $('me').classList.remove('danger');
  if (saved !== undefined) savedDyn = saved;
  else savedDyn = fresh ? null : validDyn(store.get('dynasty', null));
  clearHandLayer();
  $('fly').innerHTML = '';
  $('meHouse').innerHTML = ''; $('logList').innerHTML = '';
  Me.view = null; Me.ln = null; Me.lv = null; Me.gauge = null; Me.pnum = null; Me.fn = null; Me.fol = null;
  toggleInbox(false);
  setAB('—', '', ''); setButtonsForMode(); renderTopbar();
  $('houseList').innerHTML = ''; $('eraCard').innerHTML = ''; $('fallenLine').textContent = '';
  rerollName(); rerollAvatar();
  const rb = $('btnResume');
  rb.hidden = !savedDyn;
  if (savedDyn) {
    const p = savedDyn.houses.find(h => h.isPlayer);
    rb.innerHTML = `続きから：${esc(p.name)}・${savedDyn.gen}ヶ月目（勢い${p.power}・登録者${fmtCount(p.followers || 0)}人）`;
  }
  const best = store.get('best', null);
  $('recordLine').textContent = best ? `これまでの最長：${best.name} ${best.gens}ヶ月（最高の勢い${best.maxPower}${best.followers != null ? `・登録者${fmtCount(best.followers)}人` : ''}）` : '';
  $('app').classList.add('at-title');
  resetProps();
  renderTitleDemo();
  layoutAll();
  openOverlay('titleScreen');
}

function wireUI() {
  $('avaPick').onclick = () => { rerollAvatar(); Sound.resume(); Sound.play('select'); };
  $('nameDice').onclick = () => { rerollName(); rerollAvatar(); Sound.resume(); Sound.play('select'); };
  $('houseName').addEventListener('input', syncHandle);
  $('setupForm').addEventListener('submit', e => {
    e.preventDefault();
    Sound.resume();
    readSetupForm();
    let name = ($('houseName').value || '').trim();
    if (!name) { name = randomUnusedName()[0]; syncHandle(); }
    const state = createDynasty({ houseName: name, roma: Pending.roma, handle: pendingHandle(), ava: Pending.ava });
    store.set('dynasty', null);
    runDynasty(state);
  });
  $('btnResume').onclick = () => {
    Sound.resume();
    readSetupForm();
    if (savedDyn) runDynasty(savedDyn);
  };
  $('btnHelpTitle').onclick = () => openOverlay('helpScreen');
  $('helpClose').onclick = () => closeOverlay('helpScreen');
  $('btnMenu').onclick = () => openOverlay('menuScreen');
  $('mClose').onclick = () => closeOverlay('menuScreen');
  $('mHelp').onclick = () => { closeOverlay('menuScreen'); openOverlay('helpScreen'); };
  $('mTitle').onclick = () => { closeOverlay('menuScreen'); backToTitle(false); };
  $('btnHouses').onclick = () => toggleSide();
  $('btnInbox').onclick = e => { e.stopPropagation(); toggleInbox(); };
  document.addEventListener('pointerdown', e => { if (!$('inbox').hidden && !e.target.closest('#inbox, #btnInbox')) toggleInbox(false); });
  $('sideClose').onclick = () => toggleSide(false);
  $('scrim').onclick = () => toggleSide(false);
  $('eraChip').onclick = () => toggleSide(true);
  // 「卒業危機」の印を押すと、何位以下で卒業かを出す
  $('meHouse').addEventListener('click', e => {
    if (!e.target.closest('#meDanger')) return;
    const P = Pressure;
    banner(P.outcome === 'safe' ? '今月の卒業は回避しました' : P.outcome === 'doomed' ? '卒業を避けられる枠は埋まりました' : `今月、${P.line}（${P.need}）`, 2600);
  });
  const soundBtn = $('btnSound');
  const syncSound = () => { soundBtn.setAttribute('aria-pressed', String(Sound.enabled)); $('soundWave').style.display = Sound.enabled ? '' : 'none'; };
  syncSound();
  soundBtn.onclick = () => { Sound.enabled = !Sound.enabled; store.set('sound', Sound.enabled); Sound.resume(); syncSound(); if (Sound.enabled) Sound.play('select'); };
  document.addEventListener('pointerdown', () => Sound.resume(), { once: true });
  let rT = 0;
  const onResize = () => {
    clearTimeout(rT);
    rT = setTimeout(() => { layoutAll(); setTimeout(layoutAll, 420); }, 80);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
}

// ---------- 入力（手札を選ぶ） ----------
const Input = { pointers: new Map(), mode: null, paintValue: true, painted: null, lastTap: { c: null, t: 0 } };
function cardAt(x, y) {
  if (!Hand.interactive) return null;
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const c = el.closest && el.closest('#hand .card');
    if (c && c._ce && Hand.cards.includes(c._ce)) return c._ce;
  }
  return null;
}
function setHover(c) {
  if (Hand.hover === c) return;
  if (Hand.hover) Hand.hover.el.classList.remove('hover');
  Hand.hover = c;
  if (c) c.el.classList.add('hover');
  relayoutHand(110);
}
function toggleSelect(c, value) {
  if (!c || c.selected === value) return;
  c.selected = value;
  c.setGlow(value);
  Sound.play('select');
  onSelectionChanged();
  relayoutHand(130);
}
function selectRank(c) {
  for (const h of Hand.cards) { const on = h.card.r === c.card.r; if (h.selected !== on) { h.selected = on; h.setGlow(on); } }
  Sound.play('select');
  onSelectionChanged();
  relayoutHand(150);
}
function setupInput() {
  const el = $('hand');
  el.addEventListener('pointerdown', e => {
    Sound.resume();
    if (!(UI.mode === 'play' || UI.mode === 'give')) return;
    const hit = cardAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    Input.pointers.set(e.pointerId, true);
    const now = performance.now();
    if (Input.lastTap.c === hit && now - Input.lastTap.t < 330) { Input.lastTap = { c: null, t: 0 }; Input.mode = null; selectRank(hit); return; }
    Input.lastTap = { c: hit, t: now };
    Input.mode = 'paint';
    Input.paintValue = !hit.selected;
    Input.painted = new Set([hit]);
    toggleSelect(hit, Input.paintValue);
  });
  window.addEventListener('pointermove', e => {
    if (Input.mode === 'paint' && Input.pointers.has(e.pointerId)) {
      const hit = cardAt(e.clientX, e.clientY);
      if (hit && !Input.painted.has(hit)) { Input.painted.add(hit); toggleSelect(hit, Input.paintValue); }
      return;
    }
    if (e.pointerType === 'mouse' && Hand.interactive) setHover(cardAt(e.clientX, e.clientY));
    else if (e.pointerType === 'mouse' && Hand.hover) setHover(null);
  });
  const up = e => {
    Input.pointers.delete(e.pointerId);
    try { el.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    if (!Input.pointers.size) Input.mode = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('contextmenu', e => e.preventDefault());

  $('btnPlay').onclick = () => {
    if (UI.mode === 'play') {
      const r = game.interpret(0, selectedCards());
      if (!r.play) return;
      if (game.wouldFoul(0, r.play) && !UI.foulArmed) {
        UI.foulArmed = true;
        setAB('反則上がりになります', 'もう一度「投稿」を押すと確定（最下位）', 'warn');
        $('btnPlay').classList.add('btn-warn');
        return;
      }
      UI.finish && UI.finish(r.play);
    } else if (UI.mode === 'give') {
      const sel = selectedCards();
      if (sel.length === UI.giveK && UI.finish) UI.finish(sel);
    }
  };
  $('btnPass').onclick = () => { if (UI.mode === 'play' && game.canPass(0) && UI.finish) UI.finish(null); };
  $('btnHint').onclick = showHint;
  $('btnSkip').onclick = () => { Flow.skip = true; Tween.flush(); setButtonsForMode(); };

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('inbox').hidden) { toggleInbox(false); return; }
      for (const id of ['helpScreen', 'menuScreen']) if (!$(id).hidden) { closeOverlay(id); return; }
      if ($('side').classList.contains('open')) { toggleSide(false); return; }
      clearSelection();
      return;
    }
    if (anyOverlayOpen()) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT') return;
    const handActive = (UI.mode === 'play' || UI.mode === 'give') && Hand.cards.length;
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && handActive) {
      e.preventDefault();
      let i = Hand.hover ? Hand.cards.indexOf(Hand.hover) : (e.key === 'ArrowLeft' ? Hand.cards.length : -1);
      i = clamp(i + (e.key === 'ArrowLeft' ? -1 : 1), 0, Hand.cards.length - 1);
      setHover(Hand.cards[i]);
      Sound.play('select');
      announce(cardName(Hand.hover.card) + (Hand.hover.selected ? '（選択中）' : ''));
      return;
    }
    if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && handActive && Hand.hover && tag !== 'BUTTON') {
      e.preventDefault();
      toggleSelect(Hand.hover, e.key === 'ArrowUp' ? true : e.key === 'ArrowDown' ? false : !Hand.hover.selected);
      return;
    }
    if (e.key === 'Enter' && tag !== 'BUTTON' && !$('btnPlay').disabled && !$('btnPlay').hidden) { e.preventDefault(); $('btnPlay').click(); }
    else if ((e.key === 'p' || e.key === 'P') && !$('btnPass').disabled && !$('btnPass').hidden) $('btnPass').click();
    else if ((e.key === 'h' || e.key === 'H') && !$('btnHint').disabled && !$('btnHint').hidden) showHint();
  });
}

// ---------- 動きのループ（補間があるときだけ進める） ----------
function frame(now) {
  requestAnimationFrame(frame);
  Tween.step(now);
  liveTick(now);          // 同接の数字が窓ごとに細かく動く
  notifyTick(now);        // 人気者には DM・コラボのお誘いが届く
  pressureTick(now);      // 卒業の危機には、マネージャーが細かく口を出す
}

const FontState = { okAtPaint: false };
const FONT_CHECKS = ['400 40px "Dela Gothic One"', '800 14px "M PLUS Rounded 1c"'];
async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const glyphs = cardGlyphs() + 'SNS大富豪タイムライン逆転アルゴリズム更新済み強さが逆転中（革命）次はジャンル固定#共感#トーク#告知#企画';
  const jobs = [
    document.fonts.load('400 40px "Dela Gothic One"', 'AJQK0123456789JOKERVIRALREVERSECOUNTERSNS大富豪PASSFACTCHECK11BACK—♠位反則都落ち卒業陥落'),
    document.fonts.load('800 14px "M PLUS Rounded 1c"', glyphs),
    document.fonts.load('700 12px "M PLUS Rounded 1c"', glyphs),
    document.fonts.load('500 10px "M PLUS Rounded 1c"', glyphs),
    document.fonts.load('400 12px "DotGothic16"', 'LIVEERR://SIGNAL_CROSSTALKSYSTEMUPDATEREVERSESERIES重大発表♥99999+●TIMELINEENDED'),
  ];
  await Promise.race([Promise.all(jobs).catch(() => {}), sleep(3500)]);
}
// 字体が遅れて届いたら、札を描き直す
function repaintIfFontsLate() {
  if (!document.fonts || !document.fonts.check) return;
  FontState.okAtPaint = FONT_CHECKS.every(f => document.fonts.check(f));
  if (FontState.okAtPaint) return;
  document.fonts.ready.then(() => {
    if (!FONT_CHECKS.every(f => document.fonts.check(f))) return;
    PaintState.ver++;
    FaceCache.clear();
    paintStaticImages();
    for (const c of Hand.cards) c.repaint();
    if (!Flow.inGame) renderTitleDemo();
  });
}

async function boot(hotData) {
  window.__dynBooted = true;
  measureSafeArea();
  measureStage();
  await loadFonts();
  paintStaticImages();
  buildCards();
  repaintIfFontsLate();
  buildSetupForm();
  wireUI();
  setupInput();
  const hotDyn = validDyn(hotData && hotData.dyn);
  openTitle(false, hotDyn || validDyn(store.get('dynasty', null)));
  requestAnimationFrame(frame);
  setTimeout(() => $('loading').classList.add('done'), 120);
  // テスト用：札の画面上の位置
  const cardScreen = id => {
    const c = CE[id];
    if (!c || !c.el.parentNode) return null;
    const r = c.el.getBoundingClientRect();
    return { x: r.left + r.width * 0.25, y: r.top + r.height * 0.3 };
  };
  window.__dyn = { cardScreen, get dyn() { return dyn; }, get game() { return game; }, get seats() { return seats; }, Flow, UI, Hand, Wins, Feed, Holder, Lock, Stairs, BackSign, UpdatePanel, Lay, Stage, settings, runDynasty, createDynasty, makeHouse, makeAvatar, avatarURL, Faces, CE, Me, Fol, Clock, curFollowers, followerGain, cardTitleFor, trendWordsFor, postInfo, faceURL, layoutAll, fx: { animatePowerChange, showLock, hideLock, showStairs, climbStairs, hideStairs, showBackSign, hideBackSign, showUpdatePanel, setFeltMood, viralStrike, factCheckStamp, glitchStage, faceMood, facePass, proclaim, feedAddPost, setPower, setStamp, feedClear, addTrendRow, bumpFollowers, floatFol, liveKick, liveEnd, viewerBase, pushNote, makeNote, toggleInbox }, Notify, Pressure, powerOutlook, fanIconURL, fanIconKinds: Object.keys(FAN_ICONS) };
}

// 公開ページの更新時にもアカウントの記録を引き継ぐ
if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
  try { window.claude.hot.snapshot(() => ({ dyn: dyn || savedDyn || null })); } catch (e) { /* noop */ }
}
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
