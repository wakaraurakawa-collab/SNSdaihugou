// フォロワーの単体テスト（node test/followers-unit.js）
const E = require('../src/engine.js');
global.titlesFor = E.titlesFor;
const D = require('../src/dynasty.js');
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL:', msg); } };
const fixed = () => 0.5;   // 揺らぎなし

const card = (s, r) => ({ id: s * 13 + (r - 3), s, r });
const JK = { id: 52, s: 4, r: 16 };
const single = c => E.enumeratePlays([c], E.DEFAULT_RULES).find(p => p.type === 'single');
const setOf = cs => E.enumeratePlays(cs, E.DEFAULT_RULES).find(p => p.type === 'set' && p.n === cs.length);
const seqOf = cs => E.enumeratePlays(cs, Object.assign({}, E.DEFAULT_RULES, { seq: true })).find(p => p.type === 'seq' && p.n === cs.length);
const gain = (play, F = 0, rev = false, eff = {}) => D.followerGain(F, play, rev, eff, fixed);

// 強い札ほど増える（ふつうの並び）
const g3 = gain(single(card(0, 3))), g9 = gain(single(card(0, 9))), gK = gain(single(card(0, 13))), g2 = gain(single(card(0, 15))), gJ = gain(single(JK));
ok(g3 < g9 && g9 < gK && gK < g2 && g2 < gJ, `strength order 3<9<K<2<JK: ${g3},${g9},${gK},${g2},${gJ}`);
ok(g3 >= 1, 'every post gains at least 1');
// 革命・11バック中は逆（3 がいちばん伸びる）。ジョーカーは最強のまま
ok(gain(single(card(0, 3)), 0, true) === g2, 'rev: 3 grows like 2');
ok(gain(single(card(0, 15)), 0, true) === g3, 'rev: 2 grows like 3');
ok(gain(single(JK), 0, true) === gJ, 'rev: joker stays top');
// フォロワーが多いほど届く
ok(gain(single(card(0, 14)), 1e5) > gain(single(card(0, 14)), 1e3) * 5, 'bigger accounts gain more');
// 大きくなるほど伸びは鈍る（割合）
ok(gain(single(card(0, 14)), 5e6) / 5e6 < gain(single(card(0, 14)), 5e4) / 5e4, 'growth rate saturates');
// 8切り（VIRAL）・スペ3返し・革命はとくに伸びる
const p8 = single(card(1, 8));
ok(gain(p8, 0, false, { eightCut: true }) >= gK && gain(p8, 0, false, { eightCut: true }) > gain(p8) * 5, 'eight cut boosts to K level');
ok(gain(single(card(0, 3)), 0, false, { spade3: true }) > gJ, 'spade3 beats joker gain');
const four = setOf([card(0, 6), card(1, 6), card(2, 6), card(3, 6)]);
ok(gain(four, 0, false, { revolution: true }) > gain(four) + 2 * g2 * 0.9, 'revolution adds a big bonus');
// ペアは1枚より多い（枚数ぶん＋目立つ分）
const pairQ = setOf([card(0, 12), card(1, 12)]);
ok(gain(pairQ) > 2 * gain(single(card(0, 12))), 'pair > 2 singles');
// 階段は札ごとの数字で数える
const s345 = seqOf([card(2, 3), card(2, 4), card(2, 5)]), sQKA = seqOf([card(2, 12), card(2, 13), card(2, 14)]);
ok(s345 && sQKA && gain(sQKA) > gain(s345) * 20, 'seq counts each rank');
// ジョーカー入りのペアは、その数字として数える（ジョーカー単体ほどは伸びない）
const pair5j = setOf([card(0, 5), JK]);
ok(pair5j && gain(pair5j) < gJ, 'joker inside a set counts as that rank');

// 月末：順位での増減
ok(D.followerRate('大富豪', 0, {}) > 0 && D.followerRate('大貧民', 1, {}) < 0, 'title rates sign');
ok(D.followerRate('大貧民', 3, {}) < D.followerRate('大貧民', 1, {}), 'owakon streak deepens unfollows');
ok(D.followerRate('大貧民', 99, {}) >= -0.2, 'unfollow capped');
ok(Math.abs(D.followerRate('大富豪', 0, { mild: true }) - 0.04) < 1e-9, 'mild era halves');
ok(D.followerRate('平民', 0, { drain: 1 }) < 0, 'exodus era drains');

// resolveGeneration：投稿で増えた分＋順位の割合
const st = D.createDynasty({ houseName: 'テスト', roma: 'test', handle: '@test', rnd: E.mulberry32(3) });
ok(st.houses[0].followers === 0, 'player starts at 0');
ok(st.houses.slice(1).every(h => h.followers >= 20 && h.followers < 500), 'cpu starts 20..499');
st.houses.forEach((h, i) => { h.followers = 10000; });
const ids = st.houses.map(h => h.id);
const rep = D.resolveGeneration(st, { ranking: ids, revBy: {}, fol: { [ids[0]]: 500, [ids[3]]: 200 } }, E.mulberry32(5));
const row0 = rep.rows.find(r => r.id === ids[0]), row3 = rep.rows.find(r => r.id === ids[3]);
ok(row0.fol.before === 10000 && row0.fol.posts === 500 && row0.fol.after === Math.round(10500 * 1.08), `top: ${JSON.stringify(row0.fol)}`);
ok(row3.fol.after === 10200 + Math.round(10200 * -0.06), `bottom: ${JSON.stringify(row3.fol)}`);
ok(st.houses[0].history[0].fol === row0.fol.after, 'history keeps followers');
ok(st.houses[0].maxFollowers === row0.fol.after, 'max followers tracked');

// 前の版の記録：フォロワーを補う
const old = D.createDynasty({ houseName: 'old', roma: 'old', handle: '@old' });
old.gen = 7;
old.houses.forEach(h => { delete h.followers; delete h.maxFollowers; });
D.ensureFollowers(old, E.mulberry32(9));
ok(old.houses.every(h => typeof h.followers === 'number' && h.followers > 1000 && h.maxFollowers === h.followers), 'old save gets followers by age');

// 規模の段階：活動月数と登録者数の低いほう（3期生より後は1段上から）
const cs = D.careerStage;
ok(cs(1, 0, 1) === 1 && cs(1, 1e6, 1) === 1, 'month 1 is stage 1 even with many subscribers');
ok(cs(30, 500, 1) === 1, 'long career but few subscribers stays stage 1');
ok(cs(3, 1000, 1) === 2 && cs(3, 999, 1) === 1 && cs(2, 5000, 1) === 1, 'stage 2 needs month 3 and 1,000');
ok(cs(7, 1e4, 1) === 3 && cs(13, 1e5, 1) === 4 && cs(25, 5e5, 1) === 5 && cs(99, 1e8, 1) === 5, 'stages 3..5');
ok(cs(1, 2000, 3) === 2 && cs(1, 2000, 2) === 1, '3rd gen starts one stage up');
ok(cs(1, 0, 3) === 1, 'the head start still needs subscribers');
ok(cs(25, 1e6, 4) === 5, 'never above 5');
// 期生：月ごとに新しい期、同じ月のデビューは同期
const kst = D.createDynasty({ houseName: 'ki', roma: 'ki', handle: '@ki' });
ok(kst.lastKi === 1 && kst.houses.every(h => h.ki === 1), 'founders are 1st gen');
let kis = [], seen = new Set(kst.houses.map(h => h.id));
for (let g = 0; g < 18; g++) {
  const ids2 = kst.houses.map(h => h.id);
  D.resolveGeneration(kst, { ranking: ids2, revBy: {}, fol: {} }, E.mulberry32(100 + g));
  const fresh = kst.houses.filter(h => !seen.has(h.id));
  fresh.forEach(h => seen.add(h.id));
  if (fresh.length) kis.push(fresh.map(h => h.ki));
}
ok(kis.length > 0, 'someone debuted in 18 months');
ok(kis.every(b => b.every(k => k === b[0])), `same-month debuts share a gen: ${JSON.stringify(kis)}`);
ok(kis.every((b, i) => b[0] === i + 2), `gens count up by month of debut: ${JSON.stringify(kis)}`);
ok(kst.lastKi === kis.length + 1, 'lastKi tracks the newest gen');
// 前の版の記録：デビューした月の順に期を振る
const oldk = D.createDynasty({ houseName: 'ok', roma: 'ok', handle: '@ok' });
oldk.gen = 9;
oldk.houses.forEach(h => { delete h.ki; });
delete oldk.lastKi;
oldk.houses[1].founded = 4; oldk.houses[2].founded = 4; oldk.houses[3].founded = 7;
D.ensureFollowers(oldk, E.mulberry32(3));
ok(oldk.houses.map(h => h.ki).join() === '1,2,2,3' && oldk.lastKi === 3, `old save ki: ${oldk.houses.map(h => h.ki)} last ${oldk.lastKi}`);

// 卒業の危機：今月の順位ごとの勢いの見込み
const po = (power, era, n, streak = 0, rev = 0) => {
  const st = D.createDynasty({ houseName: 'po', roma: 'po', handle: '@po' });
  st.era = { key: era, left: 2, num: 2 };
  const h = st.houses[0]; h.power = power; h.poorStreak = streak;
  return D.powerOutlook(h, st, n, rev);
};
let o = po(2, 'rivals', 4);
ok(o.deadPos === 2 && o.deadTitle === '貧民' && o.rows.map(r => r.after).join() === '5,3,0,-2', `rivals p2 n4: ${JSON.stringify(o.rows)}`);
o = po(2, 'dawn', 4);
ok(o.deadPos === 3 && o.deadTitle === '大貧民', 'dawn has no upkeep: only the bottom graduates');
ok(po(10, 'rivals', 4).deadPos === -1, 'healthy: nobody graduates');
o = po(2, 'revolution', 5);
ok(o.deadPos === 3, `revolution p2 n5 dead at 貧民: ${o.deadPos}`);
ok(po(2, 'revolution', 5, 0, 1).deadPos === 4, 'a revolution bonus moves the line down');
ok(po(6, 'rivals', 4, 2).deadPos === 3, 'streak makes オワコン deadly');
ok(po(1, 'plague', 3).deadPos === 1, 'winter drains: only the top survives');
// 見込みと実際の月末がそろう
let agree = 0, total = 0;
for (const era of Object.keys(D.ERA_DEFS)) for (const p of [1, 2, 3, 5, 8]) for (const sk of [0, 1, 2]) for (let pos = 0; pos < 4; pos++) {
  const st = D.createDynasty({ houseName: 'x', roma: 'x', handle: '@x' });
  st.era = { key: era, left: 3, num: 2 };
  const me = st.houses[0]; me.power = p; me.poorStreak = sk;
  const view = D.powerOutlook(me, st, 4, 0);
  const others = st.houses.slice(1).map(h => h.id);
  const ranking = others.slice(); ranking.splice(pos, 0, me.id);
  const rep = D.resolveGeneration(st, { ranking, revBy: {}, fol: {} }, E.mulberry32(pos + p));
  if (rep.events.some(e => e.type === 'annex' && e.by === me.id)) continue;   // 看板の時代：ほかのメンバーの卒業で後から増える分は見込みに入れない
  total++;
  if (view.rows[pos].after === me.power) agree++;
}
ok(agree === total, `outlook matches resolveGeneration (${agree}/${total})`);

console.log(`followers-unit: ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
