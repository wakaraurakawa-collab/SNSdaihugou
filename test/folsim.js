// フォロワーの伸び方を確かめる：CPU 同士で月を重ね、各アカウントのフォロワーを追う
const E = require('../src/engine.js');
global.titlesFor = E.titlesFor;
const D = require('../src/dynasty.js');
const N = +(process.argv[2] || 4), MONTHS = +(process.argv[3] || 40), SEED = +(process.argv[4] || 1);
const rnd = E.mulberry32(SEED);
const g = new E.Game({ players: Array.from({ length: N }, (_, i) => ({ name: 'P' + i })), rules: { jokers: 1, revolution: true, eightCut: true, spade3: true, elevenBack: true }, rnd });
const F = Array.from({ length: N }, (_, i) => i === 0 ? 0 : D.startFollowers(rnd, 'start'));
const streak = Array(N).fill(0);
const rows = [];
const titleShort = { '大富豪': '覇', '富豪': '人', '平民': '中', '貧民': '過', '大貧民': 'オ' };
const biggest = [];
for (let m = 1; m <= MONTHS; m++) {
  g.newRound();
  for (const nd of g.returnsNeeded()) g.giveCards(nd.from, nd.to, E.aiChooseGive(g.players[nd.from].hand, nd.k, g.rules));
  g.endExchange();
  const gain = Array(N).fill(0);
  let steps = 0;
  while (!g.finished && steps++ < 3000) {
    const p = g.turn;
    const ch = E.aiChoose(g.viewFor(p), 'normal', {}, rnd);
    const rev = g.effRev();
    const ev = ch ? g.play(p, ch) : g.pass(p);
    for (const e of ev) if (e.type === 'play') { const x = D.followerGain(F[e.p] + gain[e.p], e.play, rev, e.eff, rnd); gain[e.p] += x; biggest.push([x, m, E.playLabel(e.play), Math.round(F[e.p])]); }
  }
  const titles = E.titlesFor(N);
  const line = [];
  g.ranking.forEach((pi, pos) => {
    const t = titles[pos];
    streak[pi] = t === '大貧民' ? streak[pi] + 1 : 0;
    const mid = F[pi] + gain[pi];
    const r = D.followerRate(t, streak[pi], D.ERA_DEFS.rivals);
    F[pi] = Math.max(0, Math.round(mid * (1 + r)));
    line[pi] = `${titleShort[t]}${String(Math.round(F[pi])).padStart(9)} (+${Math.round(gain[pi])})`;
  });
  if (m <= 6 || m % 6 === 0) console.log(`m${String(m).padStart(2)} ` + line.join(' | '));
}
biggest.sort((a, b) => b[0] - a[0]);
console.log('biggest single posts:', biggest.slice(0, 5).map(b => `${b[0]} (m${b[1]} ${b[2]} F=${b[3]})`).join(', '));
