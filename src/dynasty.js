// ================================================================
//  Vtuber事務所の箱の中：月日・勢い・登録者（followers）・卒業・箱の時期
//  1局 = 1ヶ月（gen が月の番号）。順位で勢い（power）が増減し、0以下で卒業。箱の時期ごとに人数が増減する。
//  登録者は投稿（札を出す）のたびに積み上がる別の数字。登録者が多くても勢いがなければオワコン。
//  同じ月にデビューした人は同じ「期生」（ki）。最初の4人が1期生
// ================================================================
const AGENCY = 'ネオンボックス';     // 架空の事務所
const START_POWER = 10;
const MAX_POWER = 25;
const UPKEEP = 1;            // 毎月、マンネリで落ちる勢い
const MIN_HOUSES = 3;
const MAX_HOUSES = 7;

const ERA_DEFS = {
  dawn: {
    name: '1期生デビュー', en: 'DEBUT', target: [4, 4], entrants: [9, 10], dur: [2, 2], weight: 0, upkeep: 0,
    desc: '事務所の旗揚げ。同期4人が注目を奪い合う、物語のはじまり。マンネリで勢いが落ちることはない。',
  },
  rivals: {
    name: '後輩デビューラッシュ', en: 'RUSH', target: [6, 7], entrants: [6, 8], dur: [3, 4], weight: 3,
    desc: '新しい期生が次々とデビューする。箱は賑わい、先輩と後輩の勢力図が揺れ動く。',
  },
  oligarchy: {
    name: '看板の時代', en: 'ACES', target: [3, 3], entrants: null, dur: [3, 4], weight: 3,
    richBonus: 2, poorPenalty: 1, annex: true,
    desc: '注目は箱の看板に集まり、伸び悩んだメンバーは卒業していく（ファンは看板へ流れる）。新しい期生はデビューしない。',
  },
  peace: {
    name: 'てぇてぇ期', en: 'CHILL', target: [4, 5], entrants: [7, 9], dur: [3, 3], weight: 2, mild: true,
    desc: 'オフコラボやお泊まり会で箱が仲良しな時期。勢いと登録者の増減がゆるやかになる。',
  },
  revolution: {
    name: 'アルゴリズム激変期', en: 'SHAKE-UP', target: [5, 5], entrants: [6, 8], dur: [3, 3], weight: 2,
    revBonus: 2, seqRevolution: true,
    desc: '切り抜きやショート動画で流れが変わる。革命（アルゴリズム更新）を起こすと勢い+2。4枚以上の階段でも革命が起きる。',
  },
  plague: {
    name: 'ブームの冬', en: 'WINTER', target: [3, 4], entrants: null, dur: [2, 2], weight: 1, drain: 1,
    desc: 'Vtuberブームがひと息つく。どのメンバーも毎月勢いを1失い、登録者も減っていく。新しい期生はデビューしない。',
  },
};

// ---------- フォロワー：投稿するたびに積み上がる数字（勢いとは別） ----------
// 1投稿で増える数 ＝ 札の強さで決まる分（新人でも伸びる）＋ いまのフォロワーに比例する分（大きいほど届く）
// 強さは「いまの強さの並び」で数える（革命・11バック中は 3 がいちばん伸びる）
const FOL = { a: 2, ka: 1.55, b: 0.0006, kb: 1.38, sat: 1.5e6 };
const FOL_TITLE = { '大富豪': 0.08, '富豪': 0.04, '平民': 0, '貧民': -0.03, '大貧民': -0.06 };
function startFollowers(rnd, kind) {
  if (kind === 'player') return 0;                                          // はじめてのアカウント
  if (kind === 'entrant') return Math.round(150 * Math.pow(4000 / 150, rnd()));  // 150〜4,000（よそのSNSから来た人も）
  return 20 + Math.floor(rnd() * 480);
}
// 札1枚の強さ：3〜2 が 0〜12、ジョーカーは 13
function postStrength(rank, rev) {
  if (rank === 16) return 13;
  const i = rank - 3;
  return rev ? 12 - i : i;
}
function followerUnit(F, s) {
  return FOL.a * Math.pow(FOL.ka, s) + F / (1 + F / FOL.sat) * FOL.b * Math.pow(FOL.kb, s);
}
// 1つの投稿（出し方）で増えるフォロワー。rev はその投稿を出す前の強さの並び、eff は投稿の効果
function followerGain(F, play, rev, eff, rnd) {
  rnd = rnd || Math.random;
  F = Math.max(0, F || 0);
  eff = eff || {};
  let g = 0;
  play.cards.forEach((c, k) => {
    let s = postStrength(play.type === 'seq' ? play.rank + k : play.rank, rev);
    if (eff.eightCut) s = Math.max(s, 10);      // VIRAL：8切りはバズる
    if (eff.spade3) s = 13.5;                    // ジョーカーを論破した
    g += followerUnit(F, s);
  });
  if (play.cards.length > 1) g *= 1 + 0.15 * (play.cards.length - 1);   // まとめて投稿すると目立つ
  if (eff.revolution !== undefined) g += 2 * followerUnit(F, 12);       // アルゴリズムを動かした
  return Math.max(1, Math.round(g * (0.85 + rnd() * 0.3)));
}
// 月末の順位での増減（割合）。オワコンが続くとフォロー解除が増える
function followerRate(title, streak, E) {
  let r = FOL_TITLE[title] || 0;
  if (title === '大貧民') r = -Math.min(0.2, 0.06 + 0.03 * Math.max(0, streak - 1));
  if (E && E.mild) r /= 2;
  if (E && E.drain) r -= 0.05;
  return r;
}
// ---------- 投稿の規模の段階：本人の活動月数と登録者数の低いほう ----------
// ① 初配信期 ② 駆け出し ③ 中堅 ④ 人気 ⑤ 看板。3期生以降は、箱が大きくなっているぶん1段上から始まる
const STAGE_NAMES = ['', '初配信期', '駆け出し', '中堅', '人気', '看板'];
const STAGE_AGE = [1, 3, 7, 13, 25];          // この活動月数から ①②③④⑤
const STAGE_FOL = [0, 1000, 1e4, 1e5, 5e5];   // この登録者数から ①②③④⑤
function careerStage(age, followers, ki) {
  let a = 1, f = 1;
  for (let k = 1; k < 5; k++) { if (age >= STAGE_AGE[k]) a = k + 1; if (followers >= STAGE_FOL[k]) f = k + 1; }
  if (ki >= 3) a = Math.min(5, a + 1);
  return Math.min(a, f);
}

// 前の版の記録（フォロワーのない家）には、活動の長さに見合う数を入れる
function estimateFollowers(age, rnd, isPlayer) {
  let F = isPlayer ? 0 : 20 + rnd() * 480;
  for (let m = 0; m < age; m++) F = F * 1.16 + 1000;
  return Math.round(F * (0.7 + rnd() * 0.6));
}
function ensureFollowers(state, rnd) {
  rnd = rnd || Math.random;
  if (!state || !Array.isArray(state.houses)) return state;
  const all = state.houses.concat(state.fallen || []);
  for (const h of all) {
    if (typeof h.followers !== 'number' || !isFinite(h.followers)) {
      const age = Math.max(0, (h.fallenGen || state.gen) - (h.founded || state.gen));
      h.followers = estimateFollowers(age, rnd, h.isPlayer);
    }
    if (typeof h.maxFollowers !== 'number' || h.maxFollowers < h.followers) h.maxFollowers = h.followers;
  }
  // 期生のない前の版の記録：デビューした月の順に 1期生, 2期生…
  if (all.some(h => typeof h.ki !== 'number')) {
    const months = [...new Set(all.map(h => h.founded || 1))].sort((a, b) => a - b);
    for (const h of all) if (typeof h.ki !== 'number') h.ki = months.indexOf(h.founded || 1) + 1;
  }
  state.lastKi = Math.max(state.lastKi || 1, ...all.map(h => h.ki || 1));
  return state;
}

// 架空の配信者の名前（表示名のもと, ハンドルのもと）
const INFLUENCER_NAMES = [
  ['ひなた', 'hinata'], ['ルカ', 'luca'], ['みお', 'mio'], ['カイト', 'kaito'], ['ゆず', 'yuzu'], ['ノア', 'noa'],
  ['さくや', 'sakuya'], ['レン', 'ren'], ['はる', 'haru'], ['つむぎ', 'tsumugi'], ['しおん', 'shion'], ['ましろ', 'mashiro'],
  ['あおい', 'aoi'], ['こはく', 'kohaku'], ['リリア', 'lilia'], ['そら', 'sora'], ['もも', 'momo'], ['れい', 'rei'],
  ['ミナト', 'minato'], ['ゆうま', 'yuma'], ['あんず', 'anzu'], ['りく', 'riku'], ['なぎ', 'nagi'], ['ひびき', 'hibiki'],
  ['ちとせ', 'chitose'], ['イオ', 'io'], ['かなで', 'kanade'], ['ゆき', 'yuki'], ['あさひ', 'asahi'], ['みかん', 'mikan'],
  ['ジン', 'jin'], ['くるみ', 'kurumi'], ['ひかる', 'hikaru'], ['セナ', 'sena'], ['らん', 'ran'], ['こころ', 'kokoro'],
  ['ハク', 'haku'], ['すず', 'suzu'], ['ユウ', 'yu'], ['ののか', 'nonoka'], ['エマ', 'ema'], ['ろっか', 'rokka'],
  ['あまね', 'amane'], ['きらら', 'kirara'], ['タク', 'taku'], ['ちひろ', 'chihiro'], ['ミント', 'mint'], ['シュウ', 'shu'],
  ['いぶき', 'ibuki'], ['まひる', 'mahiru'], ['リオ', 'rio'], ['こたろう', 'kotaro'], ['ねむ', 'nemu'], ['あかね', 'akane'],
  ['ソウマ', 'soma'], ['うた', 'uta'], ['ゆいな', 'yuina'], ['ケイ', 'kei'], ['ほのか', 'honoka'], ['ライ', 'rai'],
];
const TEMPERS = [
  { key: 'cautious', label: '慎重派', persona: { passBias: 1.2 } },
  { key: 'bold', label: '強気', persona: { passBias: -0.9 } },
  { key: 'whim', label: '気分屋', persona: { noise: 1.6 } },
  { key: 'shrewd', label: '策士', persona: { noise: -0.4, passBias: 0.3 } },
];

// ---------- アイコン（ドット絵）の組み合わせ：数だけ持ち、絵は画面側で描く ----------
const AVA_N = { st: 9, hc: 12, sk: 5, ey: 8, ac: 11, of: 5, oc: 10, th: 8 };

const pickR = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
const randInt = (range, rnd) => range[0] + Math.floor(rnd() * (range[1] - range[0] + 1));

function makeAvatar(rnd, takenThemes) {
  const a = {};
  for (const k of Object.keys(AVA_N)) a[k] = Math.floor(rnd() * AVA_N[k]);
  if (rnd() < 0.3) a.ac = 0;                       // 小物なしも多め
  if (takenThemes && takenThemes.size < AVA_N.th) {
    const free = [];
    for (let i = 0; i < AVA_N.th; i++) if (!takenThemes.has(i)) free.push(i);
    a.th = pickR(free, rnd);
  }
  return a;
}

const KANJI_DIGITS = '〇一二三四五六七八九';
function kanjiNum(n) {
  if (n < 10) return KANJI_DIGITS[n];
  if (n < 100) return (n >= 20 ? KANJI_DIGITS[Math.floor(n / 10)] : '') + '十' + (n % 10 ? KANJI_DIGITS[n % 10] : '');
  return String(n);
}
function roman(n) {
  const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of m) while (n >= v) { s += r; n -= v; }
  return s;
}

// 表示名とハンドル（@）
function styleName(base, roma, rnd) {
  const r = rnd();
  const cap = roma.charAt(0).toUpperCase() + roma.slice(1);
  if (r < 0.46) return base;
  if (r < 0.64) return base + 'ch.';
  if (r < 0.78) return roma.toUpperCase();
  if (r < 0.88) return base + 'TV';
  return cap + ' Ch.';
}
function makeHandle(roma, rnd) {
  const tails = ['', '_ch', '_tv', '_live', 'chan', '_official', '_oo', '_' + randInt([10, 99], rnd), randInt([1, 9], rnd) + '' + randInt([0, 9], rnd)];
  return '@' + (roma || 'user') + pickR(tails, rnd);
}
function freshName(state, rnd) {
  const used = new Set(state.usedNames);
  const free = INFLUENCER_NAMES.filter(n => !used.has(n[0]));
  let base, roma;
  if (free.length) [base, roma] = pickR(free, rnd);
  else {
    // 名前が尽きたら、引退した配信者の名を継ぐ「二代目」
    const [b0, r0] = pickR(INFLUENCER_NAMES, rnd);
    const k = state.usedNames.filter(n => n.startsWith(b0)).length + 1;
    base = b0 + (k > 1 ? kanjiNum(k) + '代目' : '');
    roma = r0 + (k > 1 ? k : '');
  }
  state.usedNames.push(base);
  return { base, roma };
}

function makeHouse(state, rnd, o) {
  let name, roma, base;
  if (o.name) { name = o.name; base = o.name; roma = o.roma || ''; }
  else { const f = freshName(state, rnd); base = f.base; roma = f.roma; name = styleName(base, roma, rnd); }
  const taken = new Set(state.houses.map(h => h.ava && h.ava.th));
  const h = {
    id: 'h' + (state.nextId++),
    name, base, roma,
    handle: o.handle || makeHandle(roma, rnd),
    ava: o.ava || makeAvatar(rnd, taken),
    isPlayer: !!o.isPlayer,
    power: o.power,
    maxPower: o.power,
    followers: 0,
    maxFollowers: 0,
    ki: o.ki || 1,
    founded: o.gen,
    poorStreak: 0,
    lastTitle: null,
    history: [],
    temper: o.isPlayer ? null : pickR(TEMPERS, rnd).key,
  };
  if (o.name && !state.usedNames.includes(o.name)) state.usedNames.push(o.name);
  h.followers = h.maxFollowers = o.followers != null ? o.followers : startFollowers(rnd, o.isPlayer ? 'player' : o.gen > 1 ? 'entrant' : 'start');
  return h;
}

function createDynasty(o) {
  const rnd = o.rnd || Math.random;
  const state = {
    version: 2,
    gen: 1,
    era: { key: 'dawn', left: ERA_DEFS.dawn.dur[0], num: 1 },
    houses: [],
    fallen: [],
    lastOrder: null,
    nextId: 0,
    usedNames: [],
    playerId: null,
    lastKi: 1,
    eraLog: [{ key: 'dawn', from: 1 }],
    reports: [],
  };
  const player = makeHouse(state, rnd, { name: o.houseName, roma: o.roma, handle: o.handle, ava: o.ava, isPlayer: true, power: START_POWER, gen: 1 });
  state.playerId = player.id;
  state.houses.push(player);
  for (let i = 0; i < 3; i++) state.houses.push(makeHouse(state, rnd, { power: START_POWER, gen: 1 }));
  return state;
}

function houseById(state, id) {
  return state.houses.find(h => h.id === id) || state.fallen.find(h => h.id === id) || null;
}
function playerHouse(state) { return houseById(state, state.playerId); }

// 今月の席順（あなたが席0）。順位（交換の組）を席番号で返す
function seatingFor(state) {
  const p = state.houses.find(h => h.isPlayer);
  const others = state.houses.filter(h => !h.isPlayer);
  const seats = [p, ...others];
  let prev = null;
  if (state.lastOrder) {
    const order = state.lastOrder.filter(id => seats.some(h => h.id === id));
    if (order.length === seats.length) prev = order.map(id => seats.findIndex(h => h.id === id));
  }
  return { seats, prevRanking: prev };
}

function rulesForEra(state, base) {
  const E = ERA_DEFS[state.era.key];
  const r = Object.assign({}, base);
  if (E.seqRevolution) { r.revolution = true; r.seqRevolution = true; }
  return r;
}

function basePowerDelta(title, streak, E) {
  let d;
  if (title === '大富豪') d = 4 + (E.richBonus || 0);
  else if (title === '富豪') d = 2 + (E.richBonus ? 1 : 0);
  else if (title === '平民') d = 0;
  else if (title === '貧民') d = -1 - (E.poorPenalty || 0);
  else d = -(3 + 2 * streak) - (E.poorPenalty || 0);
  if (E.mild) d = d < 0 ? -Math.ceil(-d / 2) : d > 0 ? Math.max(1, Math.round(d * 0.67)) : 0;
  return d;
}

// 今月の順位ごとの、月末の勢いの見込み（rev はこの月にもう起こした革命の回数）。
// deadPos：この順位（0から）より下はすべて卒業（勢いが0以下）。-1 なら、どの順位でも卒業しない
function powerOutlook(h, state, n, rev) {
  const E = ERA_DEFS[state.era.key];
  const upkeep = E.mild ? 0 : (E.upkeep != null ? E.upkeep : UPKEEP);
  const bonus = E.revBonus && rev ? Math.min(4, E.revBonus * rev) : 0;
  const rows = titlesFor(n).map((title, pos) => ({ pos, title, after: Math.min(MAX_POWER, h.power + basePowerDelta(title, h.poorStreak, E) + bonus - upkeep - (E.drain || 0)) }));
  const dead = rows.find(r => r.after <= 0);
  return { rows, deadPos: dead ? dead.pos : -1, deadTitle: dead ? dead.title : null };
}

// 次に大貧民になったときの減り幅（警告表示用）
function nextPoorLoss(h, state) {
  const E = ERA_DEFS[state.era.key];
  return -basePowerDelta('大貧民', h.poorStreak, E) + (E.mild ? 0 : (E.upkeep != null ? E.upkeep : UPKEEP)) + (E.drain || 0);
}

function pickNextEra(cur, rnd) {
  const keys = Object.keys(ERA_DEFS).filter(k => k !== cur && ERA_DEFS[k].weight > 0);
  const total = keys.reduce((a, k) => a + ERA_DEFS[k].weight, 0);
  let x = rnd() * total;
  for (const k of keys) { x -= ERA_DEFS[k].weight; if (x < 0) return k; }
  return keys[0];
}

function extinguish(state, h, cause) {
  state.houses = state.houses.filter(x => x !== h);
  h.fallenGen = state.gen;
  h.cause = cause;
  state.fallen.push(h);
}

// 1ヶ月を締めくくる。result = { ranking: [houseId...], revBy: {houseId: n}, fol: {houseId: 今月の投稿で増えたフォロワー} }
function resolveGeneration(state, result, rnd) {
  rnd = rnd || Math.random;
  const E = ERA_DEFS[state.era.key];
  const n = result.ranking.length;
  const titles = titlesFor(n);
  const report = { gen: state.gen, era: state.era.key, rows: [], events: [], playerDead: false };

  result.ranking.forEach((hid, pos) => {
    const h = houseById(state, hid);
    const title = titles[pos];
    const before = h.power;
    let delta = basePowerDelta(title, h.poorStreak, E);
    let rev = 0;
    if (E.revBonus && result.revBy && result.revBy[hid]) { rev = Math.min(4, E.revBonus * result.revBy[hid]); delta += rev; }
    const upkeep = E.mild ? 0 : (E.upkeep != null ? E.upkeep : UPKEEP);
    delta -= upkeep;
    if (E.drain) delta -= E.drain;
    h.poorStreak = title === '大貧民' ? h.poorStreak + 1 : 0;
    h.power = Math.min(MAX_POWER, before + delta);
    h.maxPower = Math.max(h.maxPower, h.power);
    h.lastTitle = title;
    // フォロワー：今月の投稿で増えた分に、順位での増減（割合）をかける
    const folBefore = Math.max(0, Math.round(h.followers || 0));
    const posts = Math.max(0, Math.round((result.fol && result.fol[hid]) || 0));
    const rate = followerRate(title, h.poorStreak, E);
    const adj = Math.round((folBefore + posts) * rate);
    h.followers = Math.max(0, folBefore + posts + adj);
    h.maxFollowers = Math.max(h.maxFollowers || 0, h.followers);
    h.history.push({ gen: state.gen, title, delta, power: h.power, pos, n, fol: h.followers });
    report.rows.push({ id: hid, pos, title, before, after: h.power, delta, rev, upkeep, streak: h.poorStreak, drain: E.drain || 0,
      fol: { before: folBefore, posts, rate, adj, after: h.followers } });
  });

  // 卒業（勢いが尽きた）
  for (const h of [...state.houses]) {
    if (h.power <= 0) {
      extinguish(state, h, '卒業');
      report.events.push({ type: 'extinct', id: h.id, player: h.isPlayer });
    }
  }
  if (!state.houses.some(h => h.isPlayer)) {
    report.playerDead = true;
    state.reports.push(report);
    state.over = true;
    return report;
  }

  // 看板の時代：伸び悩んだメンバーが卒業し、ファンは看板へ
  if (E.annex && state.houses.length > E.target[1]) {
    const strongest = [...state.houses].sort((a, b) => b.power - a.power)[0];
    const weak = state.houses.filter(h => !h.isPlayer && h !== strongest && h.power <= 6).sort((a, b) => a.power - b.power)[0];
    if (weak) {
      const gain = Math.ceil(weak.power / 2);
      strongest.power = Math.min(MAX_POWER, strongest.power + gain);
      strongest.maxPower = Math.max(strongest.maxPower, strongest.power);
      // ファンの一部も大手へ流れる
      const fol = Math.round((weak.followers || 0) * 0.3);
      strongest.followers = (strongest.followers || 0) + fol;
      strongest.maxFollowers = Math.max(strongest.maxFollowers || 0, strongest.followers);
      extinguish(state, weak, '卒業');
      report.events.push({ type: 'annex', id: weak.id, by: strongest.id, gain, fol });
    }
  }

  // 情勢の移り変わり
  state.era.left--;
  if (state.era.left <= 0) {
    const next = pickNextEra(state.era.key, rnd);
    state.era = { key: next, left: randInt(ERA_DEFS[next].dur, rnd), num: state.era.num + 1 };
    state.eraLog.push({ key: next, from: state.gen + 1 });
    report.events.push({ type: 'era', key: next });
  }

  // 新しい期生のデビュー（同じ月にデビューした人は同期）
  const E2 = ERA_DEFS[state.era.key];
  const target = randInt(E2.target, rnd);
  const newIds = [];
  let tries = 0, ki = 0;
  while (state.houses.length < MAX_HOUSES && tries++ < 6) {
    const need = state.houses.length < MIN_HOUSES;
    const want = E2.entrants && state.houses.length < target && newIds.length < 2;
    if (!need && !want) break;
    if (!ki) ki = state.lastKi = (state.lastKi || 1) + 1;
    const h = makeHouse(state, rnd, { power: randInt(E2.entrants || [7, 8], rnd), gen: state.gen + 1, ki });
    state.houses.push(h);
    newIds.push(h.id);
    report.events.push({ type: 'enter', id: h.id });
  }

  // 次の月の交換順：生き残った順位のまま、新人は真ん中（平民扱い）
  const order = result.ranking.filter(id => state.houses.some(h => h.id === id));
  order.splice(Math.floor(order.length / 2), 0, ...newIds);
  state.lastOrder = order;
  state.reports.push(report);
  if (state.reports.length > 80) state.reports.shift();
  state.gen++;
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ERA_DEFS, START_POWER, MAX_POWER, UPKEEP, MIN_HOUSES, MAX_HOUSES, INFLUENCER_NAMES, TEMPERS, AVA_N,
    makeAvatar, makeHandle, styleName, kanjiNum, roman, createDynasty, houseById, playerHouse, seatingFor,
    rulesForEra, basePowerDelta, nextPoorLoss, powerOutlook, resolveGeneration, pickNextEra,
    FOL, FOL_TITLE, startFollowers, postStrength, followerUnit, followerGain, followerRate, estimateFollowers, ensureFollowers,
    AGENCY, STAGE_NAMES, STAGE_AGE, STAGE_FOL, careerStage,
  };
}
