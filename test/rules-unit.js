// ルールの単体テスト（node test/rules-unit.js）
const E = require('../src/engine.js');
const { Game, enumeratePlays, isLegal, rankLockNext } = E;
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL:', msg); } };

const card = (s, r) => ({ id: s === 4 ? 52 + r : s * 13 + (r - 3), s, r: s === 4 ? 16 : r });
const JK = (k = 0) => ({ id: 52 + k, s: 4, r: 16 });
const names = { 3: '3', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: 'JK' };
const nm = c => c.r === 16 ? 'JOKER' : '♠♥♦♣'[c.s] + (names[c.r] || c.r);

function setup(hands, rules) {
  const g = new Game({ players: hands.map((_, i) => ({ name: 'P' + i })), rules: Object.assign({ jokers: 1 }, rules || {}) });
  g.newRound();
  g.exchangePending = false;
  hands.forEach((h, i) => { g.players[i].hand = h.slice(); });
  g.turn = 0;
  return g;
}
// 手札の中の同じ札（同じオブジェクト）で出し方を作る
const playOf = (g, pi, want) => {
  const hand = g.players[pi].hand;
  const cards = want.map(w => hand.find(c => c.s === w.s && c.r === w.r));
  if (cards.some(c => !c)) return null;
  const all = enumeratePlays(cards, g.rules).filter(p => p.n === cards.length);
  const st = g.stateFor(pi);
  return all.find(p => isLegal(p, st)) || null;
};
const legalNames = (g, pi) => g.legalPlays(pi).map(p => p.cards.map(nm).join('+'));

// ---------- 1. Jバック中の階段縛り：10♠ → J♠ → 次は 10♠（使用済み）→ JOKER しか出せない ----------
{
  const S = 0;
  const g = setup([
    [card(S, 10), card(1, 5), card(2, 6)],                       // P0：10♠
    [card(S, 11), card(1, 7), card(2, 8)],                       // P1：J♠
    [JK(0), card(S, 9), card(S, 12), card(1, 10), card(2, 4)],   // P2：JOKER, 9♠, Q♠, 10♥
    [card(S, 3), card(3, 10), card(S, 13), card(1, 9)],          // P3：♠3, 10♣, K♠
  ]);
  let ev = g.play(0, playOf(g, 0, [card(S, 10)]));
  ok(!g.field.lock && !g.field.rankLock, '10♠ だけでは縛りなし');
  ev = g.play(1, playOf(g, 1, [card(S, 11)]));
  const eff = ev.find(e => e.type === 'play').eff;
  ok(eff.lock && eff.lock.join() === '0', 'J♠ で ♠ 縛り');
  ok(eff.rankLock && eff.rankLock.from === 10 && eff.rankLock.to === 11, 'J♠ で階段縛り 10→11');
  ok(eff.elevenBack === true, 'J♠ で 11バック');
  ok(g.effRev() === true, '11バックで強さ逆転');
  ok(rankLockNext(g.field.top, g.effRev()) === 10, '次に要る数字は 10（下へ続く）');
  const p2 = legalNames(g, 2);
  ok(p2.length === 1 && p2[0] === 'JOKER', 'P2 は JOKER だけ出せる（9♠・Q♠・10♥ は不可）: ' + JSON.stringify(p2));
  ok(legalNames(g, 0).length === 0, 'P0 も出せない（10♠ は場に出て使用済み）');
  const p3 = legalNames(g, 3);
  ok(p3.length === 0, 'P3 は何も出せない（10♣ はマーク違い、♠3・K♠ は数字違い）: ' + JSON.stringify(p3));
  // JOKER のあとは ♠3（スペ3返し）
  g.turn = 2;
  ev = g.play(2, playOf(g, 2, [JK(0)]));
  ok(g.field.top.rank === 16, '場は JOKER');
  const p3b = legalNames(g, 3);
  ok(p3b.length === 1 && p3b[0] === '♠3', 'JOKER のあとは ♠3 だけ: ' + JSON.stringify(p3b));
  ev = g.play(3, playOf(g, 3, [card(S, 3)]));
  ok(ev.some(e => e.type === 'clear' && e.why === 'spade3'), '♠3 で場が流れる');
}

// ---------- 2. ジョーカーがなければ全員パスで流れる ----------
{
  const S = 0;
  const g = setup([
    [card(S, 10), card(1, 5)],
    [card(S, 11), card(1, 7)],
    [card(S, 9), card(S, 12), card(1, 10)],
    [card(3, 10), card(S, 13)],
  ], { jokers: 0 });
  g.play(0, playOf(g, 0, [card(S, 10)]));
  g.play(1, playOf(g, 1, [card(S, 11)]));
  ok(legalNames(g, 2).length === 0 && legalNames(g, 3).length === 0 && legalNames(g, 0).length === 0, 'ジョーカーなしでは誰も出せない');
  g.turn = 2;
  g.pass(2); g.pass(3);
  const ev = g.pass(0);
  ok(ev.some(e => e.type === 'clear' && e.leader === 1), '全員パスで J♠ を出した P1 から');
}

// ---------- 3. ペアでも同じ：10♠10♥ → J♠J♥ → 10♠10♥（使用済み）→ 出せない ----------
{
  const g = setup([
    [card(0, 10), card(1, 10), card(2, 3)],
    [card(0, 11), card(1, 11), card(2, 4)],
    [card(2, 10), card(3, 10), card(0, 9), card(1, 9), card(2, 12), card(3, 12)],
    [card(2, 5), card(3, 5)],
  ], { jokers: 0 });
  g.play(0, playOf(g, 0, [card(0, 10), card(1, 10)]));
  const ev = g.play(1, playOf(g, 1, [card(0, 11), card(1, 11)]));
  const eff = ev.find(e => e.type === 'play').eff;
  ok(eff.lock && eff.lock.join() === '0,1' && eff.rankLock && eff.elevenBack, 'ペアでも縛り＋階段縛り＋11バック');
  ok(legalNames(g, 2).length === 0, '10♦10♣ はマーク違い、9 は数字違いで出せない: ' + JSON.stringify(legalNames(g, 2)));
}

// ---------- 4. 8切りは 8 だけの出し方 ----------
{
  const g = setup([[card(0, 7), card(0, 8), card(0, 9), card(1, 3)], [card(1, 8), card(2, 5)], [card(2, 13)], [card(3, 13)]], { jokers: 0 });
  let ev = g.play(0, playOf(g, 0, [card(0, 7), card(0, 8), card(0, 9)]));
  ok(!ev.some(e => e.type === 'clear'), '7-8-9 の階段では切れない');
  const g2 = setup([[card(0, 8), card(1, 3)], [card(1, 9), card(2, 5)], [card(2, 13)], [card(3, 13)]], { jokers: 0 });
  ev = g2.play(0, playOf(g2, 0, [card(0, 8)]));
  ok(ev.some(e => e.type === 'clear' && e.why === 'eight'), '8 単体で切れる');
}

// ---------- 5. 革命と 11バックが重なると一時的に通常の順 ----------
{
  const g = setup([[card(0, 5), card(1, 5), card(2, 5), card(3, 5), card(0, 3)], [card(0, 11), card(2, 9)], [card(0, 12), card(1, 4)], [card(2, 13)]], { jokers: 0 });
  g.play(0, playOf(g, 0, [card(0, 5), card(1, 5), card(2, 5), card(3, 5)]));
  ok(g.revolution === true && g.effRev() === true, '4枚で革命');
  g.clearField([], 1, 'pass');
  g.play(1, playOf(g, 1, [card(0, 11)]));
  ok(g.effRev() === false, '革命中の 11バックで通常の順');
  ok(legalNames(g, 2).includes('♠Q'), '革命＋11バック中は Q が J より強い');
}

console.log(`rules-unit: ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
