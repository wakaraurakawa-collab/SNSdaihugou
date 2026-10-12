// バランス確認：あなたを「ふつう」の AI に任せて何ヶ月続くか、たくさんのシードで数える（node test/survival-sim.js [runs] [level]）
//   勢いの増減・卒業・期生のデビューは dynasty.js、札の勝負は engine.js。画面は使わない
const E = require('../src/engine.js');
global.titlesFor = E.titlesFor;
const D = require('../src/dynasty.js');
const runs = +(process.argv[2] || 200), level = process.argv[3] || 'normal';
const months = [], tops = [], reasons = {};
for (let seed = 1; seed <= runs; seed++) {
  const rnd = E.mulberry32(seed * 7919);
  const st = D.createDynasty({ houseName: 'sim', roma: 'sim', handle: '@sim' });
  let m = 0, top = 0;
  while (!st.over && m < 120) {
    const { seats, prevRanking } = D.seatingFor(st);
    const rules = D.rulesForEra(st, E.DEFAULT_RULES);
    const g = new E.Game({ players: seats.map(h => ({ name: h.name })), rules, prevRanking, rnd });
    g.newRound();
    if (g.exchangePending) {
      for (const t of g.tributes()) { /* 自動 */ }
      for (const nd of g.returnsNeeded()) g.giveCards(nd.from, nd.to, E.aiChooseGive(g.players[nd.from].hand, nd.k, g.rules));
      g.endExchange();
    }
    let steps = 0;
    const fol = {};
    while (!g.finished && steps++ < 3000) {
      const p = g.turn;
      const h = seats[p];
      const rev = g.effRev();
      const ch = E.aiChoose(g.viewFor(p), p === 0 ? level : 'normal', p === 0 ? {} : D.TEMPERS.find(t => t.key === h.temper).persona, rnd);
      if (ch) {
        const ev = g.play(p, ch);
        const pe = ev.find(x => x.type === 'play');
        fol[h.id] = (fol[h.id] || 0) + D.followerGain((h.followers || 0) + (fol[h.id] || 0), ch, rev, pe ? pe.eff : {}, rnd);
      } else if (g.canPass(p)) g.pass(p);
      else break;
    }
    if (!g.finished) { console.log('stuck at seed', seed); break; }
    const revBy = {};
    g.revBy.forEach((v, i) => { if (v) revBy[seats[i].id] = v; });
    const rep = D.resolveGeneration(st, { ranking: g.ranking.map(i => seats[i].id), revBy, fol }, rnd);
    const me = rep.rows.find(r => D.houseById(st, r.id) && D.houseById(st, r.id).isPlayer);
    if (me && me.title === '大富豪') top++;
    m++;
  }
  months.push(m); tops.push(top);
}
months.sort((a, b) => a - b);
const q = p => months[Math.min(months.length - 1, Math.floor(p * months.length))];
console.log(`runs=${runs} level=${level}`);
console.log(`months: min ${months[0]} p25 ${q(0.25)} median ${q(0.5)} p75 ${q(0.75)} max ${months[months.length - 1]} mean ${(months.reduce((a, b) => a + b, 0) / runs).toFixed(1)}`);
console.log(`reached 120 (cap): ${months.filter(x => x >= 120).length}, under 4 months: ${months.filter(x => x < 4).length}, top-month share ${(tops.reduce((a, b) => a + b, 0) / months.reduce((a, b) => a + b, 0) * 100).toFixed(0)}%`);
