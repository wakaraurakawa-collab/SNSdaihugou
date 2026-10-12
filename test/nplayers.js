// 3〜7人・ジョーカー0〜2枚で CPU 同士に打たせ、どの局も最後まで終わるか確かめる
const E = require('../src/engine.js');
let bad = 0;
for (let n = 3; n <= 7; n++) for (let j = 0; j <= 2; j++) {
  const rnd = E.mulberry32(n * 100 + j);
  const g = new E.Game({ players: Array.from({ length: n }, (_, i) => ({ name: 'P' + i })), rules: { jokers: j }, rnd });
  let actions = 0;
  for (let r = 0; r < 60; r++) {
    g.newRound();
    for (const t of g.tributes()) { /* 自動で渡る */ }
    for (const nd of g.returnsNeeded()) g.giveCards(nd.from, nd.to, E.aiChooseGive(g.players[nd.from].hand, nd.k, g.rules));
    g.endExchange();
    let steps = 0;
    while (!g.finished && steps++ < 2000) {
      const p = g.turn;
      const ch = E.aiChoose(g.viewFor(p), 'normal', {}, rnd);
      if (ch) g.play(p, ch); else if (g.canPass(p)) g.pass(p); else { bad++; break; }
      actions++;
    }
    if (!g.finished) { bad++; console.log('stuck', n, j, r); break; }
  }
  console.log(`n=${n} jokers=${j} rounds=60 actions/round=${(actions / 60).toFixed(1)}`);
}
console.log(bad ? `nplayers: ${bad} problems` : 'nplayers: all rounds finished');
process.exit(bad ? 1 : 0);
