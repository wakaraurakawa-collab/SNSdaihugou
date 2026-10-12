// ================================================================
//  進行：Vtuberとしてデビュー → 月を重ねる（1局＝1ヶ月）→ 卒業。成績は配信を続けた月数
// ================================================================
const Flow = { token: 0, skip: false, paused: false, waiters: [], inGame: false };
class Abort extends Error {}
function spd() { return Flow.skip || window.__ff ? 0 : ({ slow: 1.45, normal: 1, fast: 0.58 }[settings.speed] || 1) * (window.__slowmo || 1); }
function alive(tok) { if (tok !== Flow.token) throw new Abort(); }
function setPaused(p) {
  Flow.paused = p;
  if (!p) { const w = Flow.waiters; Flow.waiters = []; w.forEach(f => f()); }
}
async function pauseGate() { while (Flow.paused) await new Promise(r => Flow.waiters.push(r)); }
function saveDynasty() { if (dyn && !dyn.over) store.set('dynasty', dyn); }

async function runDynasty(state) {
  const tok = ++Flow.token;
  dyn = ensureFollowers(state);
  Fol.month = {};
  notifyReset();
  Flow.inGame = true;
  closeOverlay('titleScreen');
  $('app').classList.remove('at-title');
  saveDynasty();
  try {
    for (;;) {
      const result = await playGeneration(tok);
      alive(tok);
      const report = resolveGeneration(dyn, result);
      Fol.month = {};            // 今月の投稿で増えた分は、家の数字に入った
      if (!report.playerDead) saveDynasty();
      renderSide(); renderTopbar();
      await sleep(350 * spd());
      alive(tok);
      // 勢いの増減をチップで、登録者の増減を数字で見せてから、月末の結果を開く
      await animatePowerChange(report);
      alive(tok);
      await sleep(650 * spd());
      await showChronicle(report);
      alive(tok);
      if (report.playerDead) {
        await showGameOver();
        alive(tok);
        backToTitle(true);
        return;
      }
    }
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); throw e; }
  }
}

function backToTitle(fresh) {
  Flow.token++;
  Flow.inGame = false;
  if (UI.finish) { const f = UI.finish; UI.finish = null; f(null); }
  UI.mode = null; Hand.interactive = false; Hand.hover = null;
  setPaused(false);
  for (const id of ['chronicle', 'gameover', 'menuScreen', 'helpScreen']) $(id).hidden = true;
  $('proclaim').innerHTML = '';
  Flow.skip = true; Tween.flush(); Flow.skip = false;
  openTitle(fresh);
}

// 名前の字体（日本語は文字ごとに分けて届く）を先に読み込む
async function ensureGlyphs(text) {
  if (!document.fonts || !document.fonts.load || !text) return;
  const jobs = ['800 14px "M PLUS Rounded 1c"', '700 12px "M PLUS Rounded 1c"'].map(f => document.fonts.load(f, text).catch(() => {}));
  await Promise.race([Promise.all(jobs), sleep(1500)]);
}

// ---------- 1ヶ月（1局。全員の順位が決まると1ヶ月が経つ） ----------
async function playGeneration(tok) {
  const st = seatingFor(dyn);
  seats = st.seats;
  Clock.gen = dyn.gen;          // 札の文面（活動○ヶ月・規模の段階）の基準
  Clock.era = dyn.era.key;      // 箱の時期の色
  Clock.lastKi = Math.max(1, ...dyn.houses.map(h => h.ki || 1));   // いま箱にいるいちばん新しい期生（「後輩」の文面）
  Fol.month = {};
  statsReset();
  notifyMonthStart();
  const rules = rulesForEra(dyn, settings.rules);
  game = new Game({ players: seats.map(h => ({ name: h.name })), rules, prevRanking: st.prevRanking, cardPool: CARD_POOL });
  game.newRound();
  pressureMonthStart();          // 卒業の危機・運営やマネージャーからの連絡
  Flow.skip = false;
  UI.mode = null;
  $('logList').innerHTML = '';
  clearHandLayer();
  Hand.keepN = 0;
  resetProps(true);
  feedReset();
  renderTopbar(); renderDesk(); resetFaces(); renderMe(); renderSide(); setActive(-1); setButtonsForMode();
  layoutAll();
  updateChips();
  const E = ERA_DEFS[dyn.era.key];
  addLog(`${dyn.gen}ヶ月目・${E.name}・${AGENCY}の${seats.length}人`, 'sys');
  setAB(`${dyn.gen}ヶ月目`, `${seats.length}人で話題と注目を奪い合います（手番は時計回り）`, '');
  feedNote(`<span class="cp-t"><b>${dyn.gen}ヶ月目</b>　${esc(E.name)}・箱の${seats.length}人がタイムラインに集まった</span>`);
  const eraStart = dyn.eraLog.length && dyn.eraLog[dyn.eraLog.length - 1].from === dyn.gen;
  let intro = Promise.resolve();
  const me = playerHouse(dyn);
  if (dyn.gen === 1) intro = proclaim('初配信', 'DEBUT', { gold: true, sub: `${esc(me.name)}（${esc(me.handle)}）、${AGENCY}${me.ki || 1}期生としてデビュー`, sound: 'chime' });
  else if (eraStart) intro = proclaim(E.name, 'PHASE ' + E.en, { tone: 'violet', sub: E.desc, hold: 1700, sound: 'update' });
  intro = intro.then(() => stageUpProclaim(me));   // 投稿の規模が1段上がった月は、そのことを告げる
  intro = intro.then(pressureProclaim);     // 今月の順位しだいで卒業なら、そのことを告げる
  // 自分の札は先に描いておく（配る途中で止まらないように）
  for (const c of game.players[0].hand) CE[c.id].setOwner(seats[0]);
  await Promise.all([intro, ensureGlyphs(seats.map(h => h.name + h.handle).join(''))]);
  alive(tok);
  await dealAnim();
  alive(tok);
  if (game.exchangePending) { await exchangePhase(tok); alive(tok); }
  sortHandCards();
  await relayoutHand(420);
  alive(tok);
  const first = game.turn;
  const why = game.prevRanking ? `${tl('大貧民')}の${seatName(first)}から` : `♦︎3を持つ${seatName(first)}から`;
  banner(why + '・時計回り', 1800);
  addLog(why + 'はじめる', 'sys');
  await sleep(400 * spd());

  while (!game.finished) {
    await pauseGate(); alive(tok);
    const pi = game.turn;
    setActive(pi);
    feedTyping(pi);
    const play = pi === 0 ? await humanTurn() : await cpuTurn(pi);
    alive(tok);
    await pauseGate(); alive(tok);
    const rev = game.effRev();     // 出す前の強さの並び（いいね・登録者の伸びに効く）
    const ev = play ? game.play(pi, play) : game.pass(pi);
    for (const x of ev) if (x.type === 'play') x.rev = rev;
    await runEvents(ev);
    alive(tok);
  }
  setActive(-1);
  // 月が終わるとアルゴリズムも元どおり（革命中の暗い画面から、ふだんの白い画面へ）
  if (Mood.dark) { showUpdatePanel(false); await setFeltMood(false); }
  feedNote(`<span class="cp-t"><b>${dyn.gen}ヶ月目 おわり</b>　全員の順位が決まった。勢いと登録者を集計中…</span>`);
  updateChips();
  Flow.skip = false;
  setButtonsForMode();
  addLog(`— 1ヶ月経過（${dyn.gen}ヶ月目おわり） —`, 'sys');
  await proclaim('1ヶ月経過', 'ONE MONTH LATER', { tone: 'violet', sub: `${dyn.gen}ヶ月目が終わった。${esc(playerHouse(dyn).name)}は活動${dyn.gen - playerHouse(dyn).founded + 1}ヶ月`, hold: 1300, sound: 'notify' });
  alive(tok);
  const revBy = {};
  game.revBy.forEach((v, i) => { if (v) revBy[seats[i].id] = v; });
  return { ranking: game.ranking.map(i => seats[i].id), revBy, fol: Object.assign({}, Fol.month) };
}

// ---------- 配る ----------
async function dealAnim() {
  const n = seats.length;
  const counts = seats.map(() => 0);
  for (let s = 1; s < n; s++) setBacks(Wins[s], 0);
  Hand.cards = [];
  Hand.keepN = game.players[0].hand.length;
  layoutAll();
  const slots = handSlots(Hand.keepN);
  const deck = deckPoint();
  const m = handMetrics(Hand.keepN, Lay.hand.w);
  const small = { w: m.cardW * 0.62, h: m.cardH * 0.62 };
  Sound.play('shuffle');
  const ps = [];
  game.dealOrder.forEach((d, k) => {
    const c = CE[d.card.id];
    const idx = counts[d.p]++;
    const delay = 80 + k * 20;
    detach(c);
    c.selected = false; c.setGlow(false); c.setDim(false);
    c.set({ x: deck.x + (k % 3) - 1, y: deck.y - k * 0.12, w: small.w, h: small.h, rot: (k % 5 - 2) * 2, ry: 180, o: 1 });
    toFly(c);
    if (d.p === 0) {
      Hand.cards.push(c);
      c.setOwner(seats[0]);
      const sl = slots[idx];
      ps.push(moveCE(c, { x: sl.x, y: sl.y, w: sl.w, h: sl.h, rot: sl.rot, ry: 0 }, { delay, duration: 460, lift: 40, sound: 'deal' }).then(ok => {
        if (ok) { toHandLayer(c); c.el.style.zIndex = sl.z; }
      }));
    } else {
      const p = winPoint(d.p);
      const s = d.p;
      ps.push(moveCE(c, { x: p.x, y: p.y, w: 16, h: 22, rot: 8, ry: 180, o: 0.2 }, { delay, duration: 400, lift: 24, sound: k % 2 ? null : 'deal' }).then(() => {
        detach(c);
        const W = Wins[s];
        if (W) setBacks(W, W.n + 1);
      }));
    }
  });
  await Promise.all(ps);
  for (const c of Hand.cards) toHandLayer(c);
  updateCounts(); renderMe();
}

// ---------- カード交換 ----------
async function transfer(from, to, cards) {
  const cs = cards.map(c => CE[c.id]);
  const ps = [];
  const m = handMetrics(Math.max(1, Hand.cards.length), Lay.hand.w);
  // 出ていく札
  if (from === 0) {
    for (const c of cs) {
      Hand.cards.splice(Hand.cards.indexOf(c), 1);
      c.selected = false; c.setGlow(false); c.setDim(false);
      toFly(c);
    }
    relayoutHand(300);
  } else {
    const p = winPoint(from);
    cs.forEach((c, j) => { detach(c); c.set({ x: p.x, y: p.y, w: 16, h: 22, rot: 0, ry: 180, o: 1 }); toFly(c); });
    setBacks(Wins[from], game.players[from].hand.length);
  }
  // 入ってくる札
  if (to === 0) {
    for (const c of cs) c.setOwner(seats[0]);
    Hand.cards.push(...cs);
    sortHandCards();
    if (ensureHandBand()) Hand.keepN = Hand.cards.length;
    const slots = handSlots(Hand.cards.length);
    cs.forEach((c, j) => {
      const sl = slots[Hand.cards.indexOf(c)];
      ps.push(moveCE(c, { x: sl.x, y: sl.y, w: sl.w, h: sl.h, rot: sl.rot, ry: 0, o: 1 }, { delay: j * 110, duration: 680, lift: 50, sound: 'flick' }).then(ok => { if (ok) { toHandLayer(c); c.el.style.zIndex = sl.z; } }));
    });
    ps.push(relayoutHand(480));
  } else {
    const q = winPoint(to);
    cs.forEach((c, j) => {
      if (from === 0) c.set({ w: m.cardW, h: m.cardH });
      ps.push(moveCE(c, { x: q.x, y: q.y, w: 16, h: 22, rot: 6, ry: 180, o: 0.3 }, { delay: j * 110, duration: 640, lift: 46, sound: j ? null : 'flick' }).then(() => detach(c)));
    });
  }
  await Promise.all(ps);
  for (const c of cs) if (to !== 0) detach(c);
  updateCounts();
  if (to === 0) { for (const c of Hand.cards) toHandLayer(c); await relayoutHand(220); }
  renderMe();
}

async function exchangePhase(tok) {
  const pairs = game.returnsNeeded();
  setAB('カード交換', pairs.length > 1 ? 'オワコン→覇権に2枚、過疎→人気者に1枚' : 'オワコン→覇権に2枚', '');
  feedNote('<span class="cp-t"><b>ネタの献上</b>　下位の人が強い札を上位へ差し出します</span>');
  addLog('カード交換', 'sys');
  await proclaim('ネタの献上', 'TRADE', { tone: 'blue', sub: '下位の人が強い札（投稿ネタ）を上位へ差し出す', hold: 900 });
  alive(tok);
  for (const t of game.tributes()) {
    alive(tok);
    const show = t.from === 0 || t.to === 0;
    addLog(`<b>${esc(seatName(t.from))}</b> → <b>${esc(seatName(t.to))}</b>${show ? '：' + t.cards.map(cardHtml).join(' ') : `（${t.cards.length}枚）`}`);
    if (t.to === 0) banner(`${seatName(t.from)}から ${t.cards.map(cardName).join(' ')} を受け取った`, 2200);
    if (t.from === 0) banner(`${t.cards.map(cardName).join(' ')} を${seatName(t.to)}へ差し出した`, 2200);
    await transfer(t.from, t.to, t.cards);
  }
  for (const nd of pairs) {
    alive(tok);
    let give;
    if (nd.from === 0) give = await humanChooseGive(nd);
    else {
      setTyping(nd.from, true);
      await sleep(600 * spd());
      setTyping(nd.from, false);
      give = aiChooseGive(game.players[nd.from].hand, nd.k, game.rules);
    }
    alive(tok);
    game.giveCards(nd.from, nd.to, give);
    const show = nd.from === 0 || nd.to === 0;
    addLog(`<b>${esc(seatName(nd.from))}</b> → <b>${esc(seatName(nd.to))}</b>${show ? '：' + give.map(cardHtml).join(' ') : `（${give.length}枚）`}`);
    if (nd.to === 0) banner(`${seatName(nd.from)}から ${give.map(cardName).join(' ')} が返された`, 2200);
    await transfer(nd.from, nd.to, give);
  }
  game.endExchange();
  feedNote('');
}

function humanChooseGive(nd) {
  ensureHandBand();
  return new Promise(resolve => {
    UI.mode = 'give';
    UI.giveK = nd.k;
    UI.giveTitle = `${seatName(nd.to)}に返す札を${nd.k}枚選んでください`;
    Hand.interactive = true;
    for (const c of Hand.cards) c.setDim(false);
    setButtonsForMode();
    $('me').classList.add('myturn');
    feedNote(`${avaImg(seats[0], exprFor(0), 'cp-ava')}<span class="cp-t"><b>あなたの番</b>　${esc(seatName(nd.to))}に返す札を${nd.k}枚選ぼう</span>`, true);
    onSelectionChanged();
    Sound.play('turn');
    UI.finish = cards => {
      UI.finish = null; UI.mode = null; Hand.interactive = false; Hand.hover = null;
      pressureTurnEnd();
      $('me').classList.remove('myturn');
      for (const c of Hand.cards) { c.selected = false; c.setGlow(false); c.el.classList.remove('hover'); }
      setButtonsForMode();
      const given = cards || sortHand(game.players[0].hand, false).slice(0, nd.k);
      setAB('札を返しました', '', '', given.map(cardHtml).join(' ') + ` → ${esc(seatName(nd.to))}`);
      resolve(given);
    };
    if (window.__autoHuman) { const f = UI.finish; setTimeout(() => { if (UI.finish === f) f(aiChooseGive(game.players[0].hand, nd.k, game.rules)); }, 30); }
  });
}

// ---------- 手番 ----------
function humanTurn() {
  ensureHandBand();
  return new Promise(resolve => {
    UI.mode = 'play';
    const legal = game.legalPlays(0);
    pressureTurnStart(legal.length > 0);
    const playable = new Set();
    for (const p of legal) for (const c of p.cards) playable.add(c.id);
    for (const c of Hand.cards) c.setDim(!playable.has(c.card.id));
    Hand.interactive = true;
    setButtonsForMode();
    onSelectionChanged();
    Sound.play('turn');
    announce('あなたの番です。' + fieldText());
    UI.finish = play => {
      UI.finish = null; UI.mode = null; Hand.interactive = false; Hand.hover = null;
      for (const c of Hand.cards) { c.setDim(false); c.el.classList.remove('hover'); if (!play || !play.cards.includes(c.card)) { c.selected = false; c.setGlow(false); } }
      setButtonsForMode();
      $('btnPlay').classList.remove('btn-warn');
      $('btnPlay').textContent = '投稿';
      if (play) { setAB('投稿しました', '', '', playHtml(play) + ` <span class="pt">「${esc(playTitle(play, seats[0]))}」</span>`); if (!UI.taught && !window.__autoHuman) { UI.taught = true; store.set('taught', true); } }
      else setAB('パスしました', fieldText(), '');
      relayoutHand(160);
      resolve(play);
    };
    if (window.__autoHuman) { const f = UI.finish; const ch = aiChoose(game.viewFor(0), 'normal', {}); setTimeout(() => { if (UI.finish === f) f(ch); }, 20); return; }
    if (!legal.length) {
      setAB('出せるカードがありません', fieldText() + ' → パスします', 'warn');
      $('btnPlay').disabled = true; $('btnHint').disabled = true;
      const f = UI.finish;
      setTimeout(() => { if (UI.finish === f) f(null); }, 1100 * Math.max(0.6, spd()));
    }
  });
}

async function thinkMC(pi, budgetMs) {
  const ctx = mcPrepare(game, pi, Math.random);
  if (ctx.decided) return ctx.choice;
  const t0 = performance.now();
  let iters = 0;
  while (iters < 120 && (iters < 5 || performance.now() - t0 < budgetMs)) {
    const s = performance.now();
    do { mcStep(ctx, 1); iters++; } while (performance.now() - s < 10 && iters < 120);
    await sleep(0);
  }
  return mcBest(ctx);
}
async function cpuTurn(pi) {
  setStatus(pi, '入力中', 'thinking');
  const t0 = performance.now();
  const view = game.viewFor(pi);
  const wait = (340 + Math.random() * 520) * spd() * (view.top ? 1 : 1.15);
  const persona = temperPersona(seats[pi]);
  let choice;
  if (settings.level === 'hard' && !Flow.skip) choice = await thinkMC(pi, Math.max(200, Math.min(520, wait)));
  else choice = aiChoose(view, settings.level === 'hard' ? 'normal' : settings.level, persona);
  await sleep(wait - (performance.now() - t0));
  setTyping(pi, false);
  return choice;
}

// ---------- 出来事の演出 ----------
async function runEvents(ev) {
  const tok = Flow.token;
  for (const e of ev) {
    if (tok !== Flow.token) return;
    if (e.type === 'play') await animPlay(e);
    else if (e.type === 'pass') await animPass(e);
    else if (e.type === 'clear') await animClear(e);
    else if (e.type === 'finish') await animFinish(e);
    else if (e.type === 'miyako') await animMiyako(e);
  }
  updateCounts(); updateChips();
}

async function animPlay(e) {
  const tok = Flow.token;
  const h = seats[e.p];
  const cards = e.play.cards.map(c => CE[c.id]);
  for (const c of cards) c.setOwner(h);
  facePlay(e.p);
  feedNote('');
  clearPassMarks();
  setHolder(e.p);
  // 投稿で登録者が増える（強い札ほど、いまの登録者が多いほど）
  const lead = !Feed.posts.length;      // 場が空のところへの投稿（話題の始まり）
  const gain = followerGain(curFollowers(h), e.play, !!e.rev, e.eff);
  Fol.month[h.id] = (Fol.month[h.id] || 0) + gain;
  // タイムラインのいちばん上に投稿が入り、札がそこへ飛んでいく
  const { post, rects } = feedAddPost(h, e.play, e.eff, e.p, { rev: !!e.rev, fol: gain });
  logPost(e.p, e.play);
  const ps = [];
  if (e.p === 0) {
    for (const c of cards) {
      Hand.cards.splice(Hand.cards.indexOf(c), 1);
      c.selected = false; c.setGlow(false); c.setDim(false);
      toFly(c);
    }
    relayoutHand(320);
  } else {
    const p = winPoint(e.p);
    for (const c of cards) { detach(c); c.set({ x: p.x, y: p.y, w: 18, h: 25, rot: 0, ry: 180, o: 1 }); toFly(c); }
    setBacks(Wins[e.p], game.players[e.p].hand.length);
  }
  cards.forEach((c, i) => {
    const r = rects[i];
    ps.push(moveCE(c, { x: r.cx, y: r.cy, w: r.w, h: r.h, rot: 0, ry: 0 }, { delay: i * 70, duration: 520, lift: e.p === 0 ? 30 : 46, sound: i === 0 ? 'flick' : null, land: 'place' })
      .then(() => { revealThumb(post, i); detach(c); }));
  });
  await Promise.all(ps);
  if (tok !== Flow.token) return;
  updateCounts();
  popReaction(e.play, !!e.rev, h);
  bumpFollowers(e.p, h, gain);
  liveKickForPlay(e.p, e.play, !!e.rev, e.eff);      // 同接が跳ねる
  if (e.p === 0) { notifyOnPost(e.play, !!e.rev, e.eff, h); pressureOnPost(e.play, !!e.rev, e.eff, h, lead); }
  if (e.play.cards.some(c => c.r === 16)) { glitchStage(); Sound.play('glitch'); }
  if (e.play.type === 'seq') banner(`連続投稿 THREAD・${e.play.n}連投`, 1300);
  const eff = e.eff;
  if (eff.revolution !== undefined) {
    Sound.play('update');
    setFeltMood(eff.revolution);
    showUpdatePanel(eff.revolution);
    addLog(eff.revolution ? '革命！ アルゴリズム更新で強さが逆転' : '革命返し！ 強さが元に戻った', 'fx');
    const E = ERA_DEFS[dyn.era.key];
    await proclaim(eff.revolution ? '革命' : '革命返し', eff.revolution ? 'SYSTEM UPDATE' : 'ROLLBACK', { big: true, tone: 'blue', progress: true, sub: (eff.revolution ? 'アルゴリズム更新：強さが逆転した' : 'アルゴリズムが元に戻った') + (E.revBonus ? `・${esc(seatName(e.p))}は勢い+${E.revBonus}` : ''), hold: 1400, sound: null });
    if (Hand.cards.length) { sortHandCards(); relayoutHand(460); }
  }
  if (eff.lock) {
    updateChips();
    const lk = eff.lock.map(s => suitHtml(s) + SNS_SUIT[s].ja).join(' ');
    addLog('縛り（ジャンル固定）：' + lk, 'fx');
    await Promise.all([showLock(eff.lock), proclaim('縛り', 'GENRE LOCK', { small: true, tone: 's' + eff.lock[0], sub: lk + ' しか出せない（ジャンル固定）', hold: 900 })]);
  }
  const clearsNow = eff.eightCut || eff.spade3;
  if (eff.rankLock && !clearsNow) {
    const nx = stairsNext();
    addLog(`階段縛り（連番シリーズ）：次は${esc(rankWord(nx))}`, 'fx');
    await Promise.all([showStairs(eff.rankLock.from, eff.rankLock.to, nx), proclaim('階段縛り', 'SERIES', { small: true, tone: 'pink', sub: `次は ${rankWord(nx)} だけ出せる（連番投稿）`, hold: 900 })]);
  } else if (!eff.rankLock && !clearsNow && game.field.rankLock && Stairs.on && Stairs.ranks) {
    await climbStairs(Stairs.ranks.cur, e.play.rank, stairsNext());
  }
  if (eff.elevenBack) {
    addLog('11バック：タイムライン逆転', 'fx');
    await Promise.all([showBackSign(), proclaim('11バック', 'REVERSE', { small: true, tone: 'violet', sub: 'タイムライン逆転：場が流れるまで強さが逆転', hold: 900, sound: null })]);
  }
  if (eff.spade3) { addLog('スペ3返し：ファクトチェック', 'fx'); await Promise.all([factCheckStamp(), proclaim('スペ3返し', 'FACT CHECK', { tone: 'teal', sub: '「ソースあります？」ジョーカーを論破した', sound: null })]); }
  if (eff.eightCut) { addLog('8切り：バズって話題をかっさらった', 'fx'); await Promise.all([viralStrike(), proclaim('8切り', 'VIRAL', { tone: 'pink', sub: 'TREND TAKEOVER：話題をかっさらった', sound: null, hold: 850 })]); }
  updateChips();
}

async function animPass(e) {
  if (e.p !== 0) setStamp(e.p, 'PASS', 'pass');
  Sound.play('pass');
  facePass(e.p);
  statsPass(seats[e.p]);
  if (e.p === 0) pressureOnPass();
  liveKick(e.p, -(0.04 + 0.035 * Math.min(4, Faces.streak[e.p] || 0)));   // パスが続くと見ている人が離れていく
  logPass(e.p);
  await sleep(300 * spd());
}

async function animClear(e) {
  // 最後に出した人が話題をさらった（勝ち誇り）
  const winner = Holder.seat;
  if (winner >= 0 && game.active[winner]) faceMood(winner, 'smug');
  if (e.why === 'pass') addLog('— 話題終了 —', 'sys');
  await sleep((e.why === 'pass' ? 380 : 140) * spd());
  clearPassMarks();
  setHolder(-1);
  const ps = [hideLock(), hideBackSign(), hideStairs()];
  if (Feed.posts.length) Sound.play('sweep');
  ps.push(feedClear(e.why));
  await Promise.all(ps);
  updateChips();
  if (game.active[e.leader] && !game.finished) addLog(`次の話題は ${esc(seatName(e.leader))} から`, 'sys');
}

async function animFinish(e) {
  const label = seatName(e.p);
  if (e.p !== 0) { setStamp(e.p, e.foul ? '反則' : `${e.pos}位`, e.foul ? 'bad' : 'rank'); if (Wins[e.p]) Wins[e.p].el.classList.add('out'); }
  addLog(e.foul ? `<b>${esc(label)}</b>：反則上がり（最下位）` : `<b>${esc(label)}</b>：${e.pos}位${e.last ? '' : 'であがり'}`, 'fx');
  faceMood(e.p, e.foul || e.last ? 'panic' : e.pos === 1 ? 'smug' : 'happy');
  // ネタを出し切ったら配信終了（1位は最後にひと盛り上がり）
  if (e.last) liveEnd(e.p);
  else liveEndAfter(e.p, e.foul ? -0.5 : e.pos === 1 ? 0.8 : 0.35, 1600);
  if (e.p === 0 && e.pos === 1 && !e.foul) notifyTopMonth();
  pressureOnFinish(e);
  if (e.last) return;
  if (e.foul) { Sound.play('thud'); await proclaim('反則上がり', 'VIOLATION', { tone: 'red', sub: `${esc(label)}は規約違反で最下位` }); }
  else { Sound.play('chime'); await proclaim('あがり', 'ALL POSTED', { gold: e.pos === 1, sub: `${esc(label)}　${e.pos}位（ネタを出し切った）`, sound: null }); }
  if (e.p === 0) { setAB(e.foul ? '反則上がり…' : `${e.pos}位であがり`, 'ほかの人の勝負を見届けましょう', e.foul ? 'warn' : 'good'); setButtonsForMode(); }
}

async function animMiyako(e) {
  const label = seatName(e.p);
  if (e.p !== 0) { setStamp(e.p, '陥落', 'bad'); if (Wins[e.p]) Wins[e.p].el.classList.add('out'); }
  addLog(`<b>${esc(label)}</b>：覇権陥落（オワコン）`, 'fx');
  pressureOnFinish(e, true);
  faceMood(e.p, 'panic');
  liveEndAfter(e.p, -0.65, 1400);
  await proclaim('覇権陥落', 'DOWNFALL', { tone: 'red', sub: `前の月の覇権 ${esc(label)} が1位を逃してオワコンに` });
  const cs = e.cards.map(c => CE[c.id]);
  if (e.p === 0) {
    Hand.cards = [];
    await Promise.all(cs.map((c, i) => { toFly(c); c.selected = false; c.setGlow(false); c.setDim(false); return moveCE(c, { y: Stage.H + 120, rot: c.st.rot + (i % 2 ? 14 : -14), o: 0 }, { delay: i * 35, duration: 560 }).then(() => detach(c)); }));
    setAB('覇権陥落…', 'ほかの人の勝負を見届けましょう', 'warn'); setButtonsForMode();
  } else setBacks(Wins[e.p], 0);
  updateCounts();
}

// ---------- 規模の段階が上がった（初配信期 → 駆け出し → 中堅 → 人気 → 看板） ----------
const STAGE_UP = {
  2: { en: 'STAGE UP', sub: '初配信期を抜けた。投稿の規模が少し大きくなり、いいねも伸びやすくなる', staff: '初配信期、おつかれさまでした。ここからが本番です。企画、どんどん出していきましょう。' },
  3: { en: 'STAGE UP', sub: '箱の中堅に。新衣装やオリ曲の話が投稿に出てくるようになる', staff: '中堅入りですね。新衣装の話、そろそろ進めましょう。' },
  4: { en: 'STAGE UP', sub: '箱の人気メンバーに。3Dお披露目やライブが現実味を帯びてくる', staff: '箱の人気メンバーになりました。3Dお披露目の準備に入ります。' },
  5: { en: 'STAGE UP', sub: 'ついに箱の看板に。投稿ひとつで世界規模の話題になる', staff: 'ついに看板です。ライブの会場、押さえにいきます。' },
};
function stageUpProclaim(me) {
  if (!me) return Promise.resolve();
  const st = ownerStage(me);
  const seen = me.stageSeen || 1;
  if (st <= seen) { me.stageSeen = Math.max(seen, st); return Promise.resolve(); }
  me.stageSeen = st;
  const S = STAGE_UP[st];
  if (!S) return Promise.resolve();
  addLog(`投稿の規模が「${STAGE_NAMES[st]}」に上がった`, 'fx');
  // 卒業の危機の月は、お祝いどころではない
  const text = Pressure.on ? pickOf(['段階は上がりました。…ただ今月は、それどころではありません。', '規模が上がったのはいいことです。今月を乗り切れたら、ちゃんと喜びましょう。']) : S.staff;
  setTimeout(() => { if (Flow.inGame && dyn && !dyn.over) pushNote(makeNote('staff', { text })); }, 2600);
  return proclaim(`${STAGE_NAMES[st]}入り`, S.en, { gold: st >= 4, tone: st >= 4 ? 'gold' : 'teal', sub: S.sub, hold: 1700, sound: 'chime' });
}
