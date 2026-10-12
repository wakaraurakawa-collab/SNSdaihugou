// ================================================================
//  大富豪 ルールエンジン + CPU思考
//  card: {id, s: 0♠ 1♥ 2♦ 3♣ 4=Joker, r: 3..10, 11=J 12=Q 13=K 14=A 15=2 16=Joker}
// ================================================================
const SUIT_SYM = ['♠', '♥', '♦', '♣', ''];
const RANK_TXT = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: 'JOKER' };
const TITLES = ['大富豪', '富豪', '貧民', '大貧民'];
const TITLE_POINTS = [3, 2, 1, 0];
// 人数ごとの身分（3人：大富豪・平民・大貧民／5人以上は真ん中が平民）
function titlesFor(n) {
  if (n <= 3) return ['大富豪', '平民', '大貧民'].slice(0, Math.max(1, n));
  const t = ['大富豪', '富豪'];
  for (let i = 0; i < n - 4; i++) t.push('平民');
  t.push('貧民', '大貧民');
  return t;
}
// カード交換の組（順位の位置で） [渡す側, 受け取る側, 枚数]
function exchangePairs(n) {
  if (n >= 4) return [[n - 1, 0, 2], [n - 2, 1, 1]];
  if (n === 3) return [[2, 0, 2]];
  return [];
}

const DEFAULT_RULES = {
  jokers: 1,
  seq: true,          // 階段
  eightCut: true,     // 8切り
  revolution: true,   // 革命
  seqRevolution: false, // 階段革命（4枚以上）
  shibari: true,      // 縛り（マーク）
  kaidanShibari: true, // 階段縛り（数字が1つずつ続く）
  elevenBack: true,   // 11バック
  spade3: true,       // スペ3返し
  miyakoOchi: true,   // 都落ち
  foulFinish: true,   // 反則上がり
  exchange: true,     // カード交換
};

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeDeck(jokers) {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 3; r <= 15; r++) deck.push({ id: s * 13 + (r - 3), s, r });
  for (let j = 0; j < jokers; j++) deck.push({ id: 52 + j, s: 4, r: 16 });
  return deck;
}

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 強さ（大きいほど強い）。ジョーカーは常に最強
function ordv(r, rev) { return r === 16 ? 100 : (rev ? 18 - r : r); }
function sortHand(hand, rev) {
  return hand.slice().sort((a, b) => (ordv(a.r, rev) - ordv(b.r, rev)) || (a.s - b.s));
}
function cardName(c) { return c.r === 16 ? 'JOKER' : SUIT_SYM[c.s] + RANK_TXT[c.r]; }

function mkPlay(type, cards, rank, high, jokerAs) {
  const nat = cards.filter(c => c.r !== 16);
  const suits = [...new Set(nat.map(c => c.s))].sort((a, b) => a - b);
  return {
    type, cards, n: cards.length, rank, high,
    jokers: cards.length - nat.length,
    jokerAs: jokerAs || [],
    suits,
    has8: type !== 'seq' && rank === 8,   // 8切りになるのは 8 だけの出し方（階段に 8 が入っても切れない）
    hasJ: nat.some(c => c.r === 11),
  };
}

// 手札から作れる全ての出し方（場は考慮しない）
function enumeratePlays(hand, rules) {
  const out = [];
  const jokers = hand.filter(c => c.r === 16);
  const J = jokers.length;
  const byRank = new Map();
  for (const c of hand) {
    if (c.r === 16) continue;
    if (!byRank.has(c.r)) byRank.set(c.r, []);
    byRank.get(c.r).push(c);
  }
  // single
  for (const c of hand) {
    if (c.r === 16) { if (c === jokers[0]) out.push(mkPlay('single', [c], 16, 16)); }
    else out.push(mkPlay('single', [c], c.r, c.r));
  }
  // set (同じ数字 2枚以上)
  for (const [r, cs] of byRank) {
    const k = cs.length;
    for (let mask = 1; mask < (1 << k); mask++) {
      const sub = cs.filter((_, i) => mask & (1 << i));
      for (let j = 0; j <= J; j++) {
        if (sub.length + j < 2) continue;
        out.push(mkPlay('set', sub.concat(jokers.slice(0, j)), r, r, Array(j).fill(r)));
      }
    }
  }
  if (J >= 2) out.push(mkPlay('set', jokers.slice(0, 2), 16, 16));
  // seq (同じマークで3枚以上の連番)
  if (rules.seq) {
    for (let s = 0; s < 4; s++) {
      const have = {};
      for (const c of hand) if (c.s === s) have[c.r] = c;
      for (let a = 3; a <= 13; a++) {
        for (let L = 3; a + L - 1 <= 15; L++) {
          const cards = [], jAs = [];
          let used = 0, nat = 0, ok = true;
          for (let r = a; r < a + L; r++) {
            if (have[r]) { cards.push(have[r]); nat++; }
            else if (used < J) { cards.push(jokers[used++]); jAs.push(r); }
            else { ok = false; break; }
          }
          if (!ok) break;
          if (nat === 0) continue;
          out.push(mkPlay('seq', cards, a, a + L - 1, jAs));
        }
      }
    }
  }
  return out;
}

function isSpade3Return(play, top, rules) {
  return !!(rules.spade3 && top && top.type === 'single' && top.rank === 16 &&
    play.type === 'single' && play.cards[0].s === 0 && play.cards[0].r === 3);
}

// 階段縛り：次に出せる数字（16 はジョーカーだけ）。続きがなければ 16
function rankLockNext(top, rev) {
  if (!top || top.rank === 16) return null;
  const r = rev ? top.rank - 1 : top.rank + 1;
  return r >= 3 && r <= 15 ? r : 16;
}
function satisfiesRankLock(play, top, rev) {
  if (play.rank === 16) return true;   // ジョーカーはどの数字にもなれる
  return ordv(play.rank, rev) === ordv(top.rank, rev) + 1;
}
function satisfiesLock(play, lock) {
  if (!lock) return true;
  return play.suits.every(s => lock.includes(s));
}

// st: {top, lock, rev(実効の強弱反転), rules}
function isLegal(play, st) {
  const top = st.top;
  if (!top) return true;
  if (isSpade3Return(play, top, st.rules)) return true;
  if (play.type !== top.type || play.n !== top.n) return false;
  if (!(ordv(play.rank, st.rev) > ordv(top.rank, st.rev))) return false;
  if (st.lock && !satisfiesLock(play, st.lock)) return false;
  if (st.rankLock && !satisfiesRankLock(play, top, st.rev)) return false;
  return true;
}

// 出せない理由（UI用）
function illegalReason(play, st) {
  const top = st.top;
  if (!top) return '';
  if (play.type !== top.type || play.n !== top.n) return '場と同じ形・枚数で出してください';
  if (!(ordv(play.rank, st.rev) > ordv(top.rank, st.rev))) return st.rev ? '強さが逆転中です。場より小さい数字を出してください' : '場より強いカードが必要です';
  if (st.lock && !satisfiesLock(play, st.lock)) return '縛り中：' + st.lock.map(s => SUIT_SYM[s]).join('') + ' だけ出せます';
  if (st.rankLock && !satisfiesRankLock(play, top, st.rev)) {
    const nx = rankLockNext(top, st.rev);
    return '階段縛り中：' + (nx === 16 ? 'ジョーカー' : RANK_TXT[nx]) + ' だけ出せます';
  }
  return '';
}

function isRevolutionPlay(play, rules) {
  if (!rules.revolution) return false;
  if (play.type === 'set' && play.n >= 4) return true;
  if (rules.seqRevolution && play.type === 'seq' && play.n >= 4) return true;
  return false;
}

function isFoulFinish(play, revolution, rules, wasSpade3) {
  if (!rules.foulFinish) return false;
  if (play.jokers > 0) return true;
  const strongest = revolution ? 3 : 15;
  if (play.cards.some(c => c.r === strongest)) return true;
  if (rules.eightCut && play.has8) return true;
  if (wasSpade3) return true;
  return false;
}

function playLabel(play) {
  if (play.type === 'single') return play.rank === 16 ? 'ジョーカー' : RANK_TXT[play.rank];
  if (play.type === 'set') {
    const nm = play.rank === 16 ? 'ジョーカー' : RANK_TXT[play.rank];
    return nm + ' の' + ['', '', 'ペア', 'スリーカード', 'フォーカード', '5枚組', '6枚組'][play.n];
  }
  return RANK_TXT[play.rank] + '〜' + RANK_TXT[play.high] + ' の階段';
}

function playCardsText(play) {
  if (play.type === 'seq') {
    const s = play.suits[0];
    const parts = [];
    for (let r = play.rank; r <= play.high; r++) {
      parts.push(play.jokerAs.includes(r) ? 'J(' + RANK_TXT[r] + ')' : RANK_TXT[r]);
    }
    return SUIT_SYM[s] + parts.join('-');
  }
  return play.cards.map(cardName).join(' ');
}

// ================================================================
//  Game
// ================================================================
class Game {
  constructor(opts) {
    this.rules = Object.assign({}, DEFAULT_RULES, opts.rules || {});
    this.rnd = opts.rnd || Math.random;
    this.cardPool = opts.cardPool || null; // 同じカードオブジェクトを使い回す（画面側と共有）
    this.players = opts.players.map((p, i) => Object.assign({ i, hand: [], points: 0, title: null }, p));
    this.n = this.players.length;
    this.round = 0;
    this.prevRanking = opts.prevRanking ? opts.prevRanking.slice() : null;
    this.history = [];
  }

  effRev() { return this.revolution !== this.field.elevenBack; }
  activeList() { return this.players.filter(p => this.active[p.i]).map(p => p.i); }
  activeCount() { return this.active.filter(Boolean).length; }
  nextActive(i) {
    for (let k = 1; k <= this.n; k++) {
      const j = (i + k) % this.n;
      if (this.active[j]) return j;
    }
    return -1;
  }

  newRound() {
    this.round++;
    const base = this.cardPool
      ? this.cardPool.filter(c => c.r !== 16 || c.id - 52 < this.rules.jokers)
      : makeDeck(this.rules.jokers);
    const deck = shuffle(base, this.rnd);
    for (const p of this.players) p.hand = [];
    const lastSeat = this.prevRanking ? this.prevRanking[this.n - 1] : -1;
    const start = lastSeat >= 0 ? lastSeat : Math.floor(this.rnd() * this.n);
    this.dealOrder = [];
    deck.forEach((c, k) => {
      const pi = (start + k) % this.n;
      this.players[pi].hand.push(c);
      this.dealOrder.push({ card: c, p: pi });
    });
    this.revolution = false;
    this.field = { top: null, lock: null, rankLock: false, elevenBack: false, last: null, passed: new Set(), pile: [] };
    this.discard = [];
    this.out = [];
    this.bottom = [];
    this.active = this.players.map(() => true);
    this.revBy = this.players.map(() => 0);
    this.finished = false;
    this.ranking = null;
    this.exchangePending = !!(this.rules.exchange && this.prevRanking);
    this.turn = lastSeat >= 0 ? lastSeat
      : this.players.findIndex(p => p.hand.some(c => c.s === 2 && c.r === 3));
    if (this.turn < 0) this.turn = 0;
  }

  // 貧民側から強いカードを自動で渡す
  tributes() {
    if (!this.exchangePending) return [];
    const R = this.prevRanking;
    const res = [];
    const pairs = exchangePairs(this.n).map(([a, b, k]) => [R[a], R[b], k]);
    for (const [from, to, k] of pairs) {
      const sorted = sortHand(this.players[from].hand, false);
      const give = sorted.slice(-k);
      this.players[from].hand = this.players[from].hand.filter(c => !give.includes(c));
      this.players[to].hand.push(...give);
      res.push({ from, to, cards: give });
    }
    return res;
  }
  // 富豪側が返すカード
  returnsNeeded() {
    if (!this.exchangePending) return [];
    const R = this.prevRanking;
    return exchangePairs(this.n).map(([a, b, k]) => ({ from: R[b], to: R[a], k }));
  }
  giveCards(from, to, cards) {
    this.players[from].hand = this.players[from].hand.filter(c => !cards.includes(c));
    this.players[to].hand.push(...cards);
  }
  endExchange() { this.exchangePending = false; }

  stateFor(pi) {
    return { top: this.field.top, lock: this.field.lock, rankLock: this.field.rankLock, rev: this.effRev(), rules: this.rules };
  }
  legalPlays(pi) {
    const st = this.stateFor(pi);
    return enumeratePlays(this.players[pi].hand, this.rules).filter(p => isLegal(p, st));
  }
  canPass(pi) { return !!this.field.top; }

  // 選んだカードの解釈（全部使う出し方）。合法なもののうち最強を選ぶ
  interpret(pi, cards) {
    if (!cards.length) return { play: null, reason: '' };
    const all = enumeratePlays(cards, this.rules).filter(p => p.n === cards.length);
    if (!all.length) return { play: null, reason: '出せる組み合わせではありません' };
    const st = this.stateFor(pi);
    const legal = all.filter(p => isLegal(p, st));
    if (!legal.length) return { play: null, reason: illegalReason(all[0], st) || '今は出せません' };
    const rev = st.rev;
    legal.sort((a, b) => ordv(b.rank, rev) - ordv(a.rank, rev));
    return { play: legal[0], reason: '' };
  }

  wouldFoul(pi, play) {
    const hand = this.players[pi].hand;
    if (hand.length !== play.n) return false;
    return isFoulFinish(play, this.revolution, this.rules, isSpade3Return(play, this.field.top, this.rules));
  }

  play(pi, play) {
    const f = this.field;
    const rules = this.rules;
    const ev = [];
    const prevTop = f.top;
    const wasSpade3 = isSpade3Return(play, prevTop, rules);
    const p = this.players[pi];
    p.hand = p.hand.filter(c => !play.cards.includes(c));
    const finishing = p.hand.length === 0;
    const foul = finishing && isFoulFinish(play, this.revolution, rules, wasSpade3);
    const revBefore = this.effRev();
    const eff = {};
    if (isRevolutionPlay(play, rules)) { this.revolution = !this.revolution; eff.revolution = this.revolution; this.revBy[pi]++; }
    if (rules.shibari && !f.lock && prevTop && !wasSpade3 && play.jokers === 0 && prevTop.jokers === 0 &&
      play.type === prevTop.type && play.suits.length && play.suits.join() === prevTop.suits.join()) {
      f.lock = play.suits.slice();
      eff.lock = f.lock;
    }
    // 階段縛り：同じ形で、強さがちょうど1つ上の数字が続いた
    if (rules.kaidanShibari && !f.rankLock && prevTop && !wasSpade3 && play.type !== 'seq' && prevTop.type === play.type &&
      play.rank !== 16 && prevTop.rank !== 16 && ordv(play.rank, revBefore) === ordv(prevTop.rank, revBefore) + 1) {
      f.rankLock = true;
      eff.rankLock = { from: prevTop.rank, to: play.rank };
    }
    if (rules.elevenBack && play.hasJ && !f.elevenBack) { f.elevenBack = true; eff.elevenBack = true; }
    const eightCut = rules.eightCut && play.has8;
    if (eightCut) eff.eightCut = true;
    if (wasSpade3) eff.spade3 = true;
    f.top = play; f.last = pi; f.passed = new Set(); f.pile.push({ p: pi, play });
    ev.push({ type: 'play', p: pi, play, eff });
    this.history.push({ round: this.round, p: pi, play });
    if (finishing) this.finishPlayer(pi, foul, ev);
    if (this.activeCount() <= 1) { this.endRound(ev); return ev; }
    if (eightCut || wasSpade3) {
      const leader = this.active[pi] ? pi : this.nextActive(pi);
      this.clearField(ev, leader, eightCut ? 'eight' : 'spade3');
    } else {
      this.turn = this.nextActive(pi);
    }
    return ev;
  }

  pass(pi) {
    const f = this.field;
    const ev = [{ type: 'pass', p: pi }];
    f.passed.add(pi);
    const others = this.activeList().filter(x => x !== f.last);
    if (others.every(x => f.passed.has(x))) {
      const leader = this.active[f.last] ? f.last : this.nextActive(f.last);
      this.clearField(ev, leader, 'pass');
    } else {
      this.turn = this.nextActive(pi);
    }
    return ev;
  }

  clearField(ev, leader, why) {
    const f = this.field;
    const cards = [];
    for (const e of f.pile) cards.push(...e.play.cards);
    this.discard.push(...cards);
    f.top = null; f.lock = null; f.rankLock = false; f.elevenBack = false; f.last = null; f.passed = new Set(); f.pile = [];
    this.turn = leader;
    ev.push({ type: 'clear', leader, cards, why });
  }

  finishPlayer(pi, foul, ev) {
    this.active[pi] = false;
    if (foul) {
      this.bottom.push(pi);
      ev.push({ type: 'finish', p: pi, foul: true, pos: this.n - this.bottom.length + 1 });
      return;
    }
    this.out.push(pi);
    ev.push({ type: 'finish', p: pi, foul: false, pos: this.out.length });
    if (this.rules.miyakoOchi && this.prevRanking && this.out.length === 1) {
      const king = this.prevRanking[0];
      if (king !== pi && this.active[king]) {
        this.active[king] = false;
        this.bottom.push(king);
        const cards = this.players[king].hand;
        this.players[king].hand = [];
        this.discard.push(...cards);
        ev.push({ type: 'miyako', p: king, cards, pos: this.n - this.bottom.length + 1 });
      }
    }
  }

  endRound(ev) {
    const rest = this.activeList();
    for (const pi of rest) {
      this.active[pi] = false;
      this.out.push(pi);
      ev.push({ type: 'finish', p: pi, foul: false, pos: this.out.length, last: true });
    }
    const ranking = this.out.concat(this.bottom.slice().reverse());
    this.ranking = ranking;
    const titles = titlesFor(this.n);
    ranking.forEach((pi, pos) => {
      this.players[pi].title = titles[pos];
      this.players[pi].points += this.n - 1 - pos;
    });
    this.prevRanking = ranking;
    this.finished = true;
    ev.push({ type: 'roundEnd', ranking });
  }

  // CPU用の視点（見えている情報だけ）
  viewFor(pi) {
    const unseen = [];
    for (const p of this.players) if (p.i !== pi) unseen.push(...p.hand);
    const opp = this.players.filter(p => p.i !== pi && this.active[p.i]).map(p => p.hand.length);
    return {
      hand: this.players[pi].hand, top: this.field.top, lock: this.field.lock, rankLock: this.field.rankLock,
      rev: this.effRev(), revolution: this.revolution, elevenBack: this.field.elevenBack,
      rules: this.rules, unseen, opp,
    };
  }
}

// ================================================================
//  CPU 思考
// ================================================================
const AI_LEVELS = {
  easy: { noise: 7, count: false, passRand: 0.25, lookahead: false },
  normal: { noise: 2.2, count: true, passRand: 0.0, lookahead: true },
  hard: { noise: 0.3, count: true, passRand: 0.0, lookahead: true },
};

function groupSets(nat) {
  const by = new Map();
  for (const c of nat) { if (!by.has(c.r)) by.set(c.r, []); by.get(c.r).push(c); }
  const out = [];
  for (const [r, cs] of by) out.push({ type: cs.length > 1 ? 'set' : 'single', rank: r, high: r, n: cs.length, cards: cs, has8: r === 8 });
  return out;
}
function groupRunsThenSets(nat) {
  const used = new Set();
  const groups = [];
  for (let s = 0; s < 4; s++) {
    const rs = nat.filter(c => c.s === s).sort((a, b) => a.r - b.r);
    let i = 0;
    while (i < rs.length) {
      let j = i;
      while (j + 1 < rs.length && rs[j + 1].r === rs[j].r + 1) j++;
      if (j - i + 1 >= 3) {
        const run = rs.slice(i, j + 1);
        run.forEach(c => used.add(c));
        groups.push({ type: 'seq', rank: run[0].r, high: run[run.length - 1].r, n: run.length, cards: run, has8: false });
      }
      i = j + 1;
    }
  }
  return groups.concat(groupSets(nat.filter(c => !used.has(c))));
}
function decompose(cards, rules) {
  const nat = cards.filter(c => c.r !== 16);
  const J = cards.length - nat.length;
  let groups = groupSets(nat);
  if (rules.seq && nat.length >= 3) {
    const g2 = groupRunsThenSets(nat);
    if (g2.length < groups.length) groups = g2;
  }
  return { groups, J };
}
function groupStrength(g, rev) {
  const k = rev ? 18 - g.rank : g.rank;
  let s = (k - 3) / 12;
  if (g.type === 'seq') s = Math.min(1, s + 0.3 + 0.08 * (g.n - 3));
  else if (g.n >= 2) s = Math.min(1, s + 0.13 * (g.n - 1));
  return s;
}
function handScore(cards, rev, rules) {
  if (!cards.length) return 300;
  const { groups, J } = decompose(cards, rules);
  let v = 0;
  for (const g of groups) {
    const s = groupStrength(g, rev);
    let gv = (s - 0.62) * 10;
    if (s >= 0.92) gv += 2.2;                       // 場を取れる札
    if (rules.eightCut && g.has8) gv = Math.max(gv, 3); // 8は場を流せる
    v += gv;
  }
  v += J * 9.5;
  v -= groups.length * 3.2;
  if (rules.foulFinish) {
    const strongest = rev ? 3 : 15;
    const okCards = cards.filter(c => !(c.r === 16 || c.r === strongest || (rules.eightCut && c.r === 8)));
    if (okCards.length === 0) v -= 28;
  }
  return v;
}
function minGroupValue(cards, rev, rules) {
  if (!cards.length) return 0;
  const { groups } = decompose(cards, rules);
  let m = 0;
  for (const g of groups) {
    const gv = (groupStrength(g, rev) - 0.62) * 10 - 3.2;
    if (gv < m) m = gv;
  }
  return m;
}

// unseen の中に play を上回る出し方がいくつあるか
function countBeaters(play, unseen, rev, rules) {
  const jokers = unseen.filter(c => c.r === 16).length;
  const key = ordv(play.rank, rev);
  if (play.type === 'single') {
    if (play.rank === 16) return (rules.spade3 && unseen.some(c => c.s === 0 && c.r === 3)) ? 1 : 0;
    let n = 0;
    for (const c of unseen) if (ordv(c.r, rev) > key) n++;
    return n;
  }
  if (play.type === 'set') {
    const cnt = {};
    for (const c of unseen) if (c.r !== 16) cnt[c.r] = (cnt[c.r] || 0) + 1;
    let n = 0;
    for (const r in cnt) if (cnt[r] + jokers >= play.n && ordv(+r, rev) > key) n++;
    if (jokers >= play.n && key < 100) n++;
    return n;
  }
  // seq
  let n = 0;
  for (let s = 0; s < 4; s++) {
    const have = new Set(unseen.filter(c => c.s === s).map(c => c.r));
    for (let a = 3; a + play.n - 1 <= 15; a++) {
      if (!(ordv(a, rev) > key)) continue;
      let miss = 0;
      for (let r = a; r < a + play.n; r++) if (!have.has(r)) miss++;
      if (miss <= jokers && miss < play.n) n++;
    }
  }
  return n;
}

function aiScorePlay(play, view, lvl) {
  const rules = view.rules;
  const rest = view.hand.filter(c => !play.cards.includes(c));
  const revAfter = view.revolution !== isRevolutionPlay(play, rules);
  const wasSpade3 = isSpade3Return(play, view.top, rules);
  if (!rest.length) {
    return isFoulFinish(play, view.revolution, rules, wasSpade3) ? -400 : 1000;
  }
  let score = handScore(rest, revAfter, rules);
  // 場を取れる確率
  let pWin;
  const eight = rules.eightCut && play.has8;
  if (eight || wasSpade3) pWin = 1;
  else {
    const trickRev = revAfter !== (view.elevenBack || (rules.elevenBack && play.hasJ));
    if (lvl.count) {
      const b = countBeaters(play, view.unseen, trickRev, rules);
      pWin = b === 0 ? 1 : 0.5 * Math.pow(0.6, b - 1);
    } else {
      const s = play.rank === 16 ? 1 : ((trickRev ? 18 - play.rank : play.rank) - 3) / 12;
      pWin = Math.pow(s, 4) * 0.8;
    }
  }
  const minOpp = view.opp.length ? Math.min(...view.opp) : 99;
  let leadValue = Math.min(10, Math.max(1.5, -minGroupValue(rest, revAfter, rules))) * 0.75;
  if (minOpp <= 2) leadValue *= 1.6;
  score += pWin * leadValue;
  // 残りが一手で出し切れて、今の手で場を取れるなら勝ち筋
  if (lvl.lookahead && pWin >= 1) {
    const d = decompose(rest, rules);
    if (d.groups.length + d.J <= 1) {
      const lastPlays = enumeratePlays(rest, rules).filter(p => p.n === rest.length);
      if (lastPlays.some(p => !isFoulFinish(p, revAfter, rules, false))) score += 80;
    }
  }
  // 誰かが残り1枚のとき、弱い単騎リードは危険
  if (!view.top && minOpp === 1 && play.type === 'single' && pWin < 1) score -= 7;
  // 階段・複数枚は相手が出しにくい
  if (!view.top && play.n >= 2) score += 0.6 * (play.n - 1);
  return score;
}

function aiChoose(view, levelName, persona, rnd) {
  rnd = rnd || Math.random;
  persona = persona || {};
  const lvl = AI_LEVELS[levelName] || AI_LEVELS.normal;
  const st = { top: view.top, lock: view.lock, rankLock: view.rankLock, rev: view.rev, rules: view.rules };
  const plays = enumeratePlays(view.hand, view.rules).filter(p => isLegal(p, st));
  if (!plays.length) return null;
  const noise = lvl.noise + (persona.noise || 0);
  const gauss = () => { let u = 0; for (let i = 0; i < 3; i++) u += rnd() - 0.5; return u * 1.4; };
  let best = null, bestScore = -Infinity;
  for (const p of plays) {
    let s = aiScorePlay(p, view, lvl);
    if (s < 900) s += gauss() * noise;
    if (s > bestScore) { bestScore = s; best = p; }
  }
  if (view.top) {
    if (bestScore >= 900) return best;
    if (lvl.passRand && rnd() < lvl.passRand) return null;
    let passScore = handScore(view.hand, view.revolution, view.rules) + (persona.passBias || 0);
    const minOpp = view.opp.length ? Math.min(...view.opp) : 99;
    if (minOpp <= 2) passScore -= (3 - minOpp) * 3.5;
    passScore += gauss() * noise * 0.5;
    if (passScore >= bestScore) return null;
  }
  return best;
}

// 富豪・大富豪が渡すカードを選ぶ
function aiChooseGive(hand, k, rules) {
  let best = null, bestScore = -Infinity;
  const n = hand.length;
  const combos = [];
  if (k === 1) for (let i = 0; i < n; i++) combos.push([hand[i]]);
  else for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) combos.push([hand[i], hand[j]]);
  for (const give of combos) {
    if (give.some(c => c.r === 16)) continue;
    const rest = hand.filter(c => !give.includes(c));
    const s = handScore(rest, false, rules);
    if (s > bestScore) { bestScore = s; best = give; }
  }
  return best || sortHand(hand, false).slice(0, k);
}

// ================================================================
//  モンテカルロ探索（つよい）
//  見えない札を配り直した世界を何通りも作り、候補手ごとに最後まで打ち切って平均点を比べる
// ================================================================
AI_LEVELS.rollout = { noise: 1.2, count: false, passRand: 0, lookahead: false };

function cloneForSim(g) {
  const c = Object.create(Game.prototype);
  c.rules = g.rules; c.rnd = g.rnd; c.n = g.n; c.cardPool = null;
  c.players = g.players.map(p => ({ i: p.i, hand: p.hand.slice(), points: 0, title: null }));
  c.round = g.round; c.prevRanking = g.prevRanking; c.history = [];
  c.revolution = g.revolution;
  const f = g.field;
  c.field = { top: f.top, lock: f.lock, rankLock: !!f.rankLock, elevenBack: f.elevenBack, last: f.last, passed: new Set(f.passed), pile: f.pile.slice() };
  c.discard = [];
  c.out = g.out.slice(); c.bottom = g.bottom.slice(); c.active = g.active.slice(); c.revBy = g.revBy ? g.revBy.slice() : g.players.map(() => 0);
  c.finished = g.finished; c.ranking = null; c.turn = g.turn; c.exchangePending = false;
  return c;
}
function determinize(g, pi, rnd) {
  const c = cloneForSim(g);
  const pool = [];
  for (const p of c.players) if (p.i !== pi) pool.push(...p.hand);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  let k = 0;
  for (const p of c.players) if (p.i !== pi) { const n = p.hand.length; p.hand = pool.slice(k, k + n); k += n; }
  return c;
}
function quickView(g, pi) {
  const opp = [];
  for (const p of g.players) if (p.i !== pi && g.active[p.i]) opp.push(p.hand.length);
  return { hand: g.players[pi].hand, top: g.field.top, lock: g.field.lock, rankLock: g.field.rankLock, rev: g.effRev(), revolution: g.revolution, elevenBack: g.field.elevenBack, rules: g.rules, unseen: [], opp };
}
function rolloutGame(sim, rnd) {
  let steps = 0;
  while (!sim.finished && steps++ < 500) {
    const p = sim.turn;
    const ch = aiChoose(quickView(sim, p), 'rollout', null, rnd);
    if (ch) sim.play(p, ch); else sim.pass(p);
  }
}


// 探索の準備（候補手の絞り込み）。即決できるときは decided を返す
function mcPrepare(game, pi, rnd) {
  const view = game.viewFor(pi);
  const st = game.stateFor(pi);
  const plays = enumeratePlays(view.hand, game.rules).filter(p => isLegal(p, st));
  if (!plays.length) return { decided: true, choice: null };
  const lvl = AI_LEVELS.hard;
  const scored = plays.map(p => ({ p, s: aiScorePlay(p, view, lvl) })).sort((a, b) => b.s - a.s);
  if (scored[0].s >= 900) return { decided: true, choice: scored[0].p };
  const options = scored.slice(0, 6).map(x => x.p);
  if (view.top) options.push(null);
  if (options.length === 1) return { decided: true, choice: options[0] };
  return { decided: false, game, pi, rnd, options, stats: options.map(() => ({ sum: 0, n: 0 })), prior: scored.slice(0, 6).map(x => x.s) };
}
// 一定回数だけ探索を進める
function mcStep(ctx, iterations) {
  for (let it = 0; it < iterations; it++) {
    const det = determinize(ctx.game, ctx.pi, ctx.rnd);
    for (let k = 0; k < ctx.options.length; k++) {
      const sim = cloneForSim(det);
      const opt = ctx.options[k];
      if (opt) sim.play(ctx.pi, opt); else sim.pass(ctx.pi);
      rolloutGame(sim, ctx.rnd);
      const pos = sim.ranking ? sim.ranking.indexOf(ctx.pi) : 3;
      // 最下位を強く嫌う（家の存続がかかっている）
      const n = sim.n;
      ctx.stats[k].sum += pos === n - 1 ? -1.5 : (n - 1 - pos);
      ctx.stats[k].n++;
    }
  }
}
function mcBest(ctx) {
  let best = 0, bestV = -Infinity;
  ctx.stats.forEach((st, k) => {
    const v = st.n ? st.sum / st.n : -1;
    // 同点に近いときは手筋の評価を少しだけ足す
    const tie = k < ctx.prior.length ? ctx.prior[k] * 0.002 : 0;
    if (v + tie > bestV) { bestV = v + tie; best = k; }
  });
  return ctx.options[best];
}
function aiChooseMC(game, pi, rnd, iterations) {
  const ctx = mcPrepare(game, pi, rnd || Math.random);
  if (ctx.decided) return ctx.choice;
  mcStep(ctx, iterations || 30);
  return mcBest(ctx);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUIT_SYM, RANK_TXT, TITLES, TITLE_POINTS, DEFAULT_RULES, mulberry32, makeDeck, shuffle, ordv, sortHand, cardName,
    enumeratePlays, isLegal, illegalReason, isRevolutionPlay, isFoulFinish, isSpade3Return, playLabel, playCardsText, rankLockNext,
    Game, aiChoose, aiChooseGive, handScore, decompose, countBeaters, AI_LEVELS, titlesFor, exchangePairs,
    aiChooseMC, mcPrepare, mcStep, mcBest, cloneForSim, determinize,
  };
}
