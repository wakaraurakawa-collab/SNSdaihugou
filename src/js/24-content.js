// ================================================================
//  札の中身：4種の投稿（♠トーク・♥共感・♦告知・♣企画）と、持ち主の段階（規模）で変わる文面・数字
//  文面の一覧は 23-posts.js
// ================================================================
const SNS_SUIT = {
  0: { key: 'talk', ja: 'トーク', en: 'TALK', tag: '#トーク', c: '#3b82ff', c2: '#7cc8ff', deep: '#1747b8', bg: '#f3f7ff', soft: '#dce8ff' },
  1: { key: 'emotion', ja: '共感', en: 'EMOTION', tag: '#共感', c: '#ff4fa3', c2: '#ffa3cf', deep: '#c0186d', bg: '#fff4f9', soft: '#ffdcec' },
  2: { key: 'news', ja: '告知', en: 'NEWS', tag: '#告知', c: '#ff453a', c2: '#ff9d6c', deep: '#bf1f16', bg: '#fff5f2', soft: '#ffe0d8' },
  3: { key: 'stream', ja: '企画', en: 'STREAM', tag: '#企画', c: '#14c27a', c2: '#74ecb8', deep: '#0b8a54', bg: '#f1fff8', soft: '#d3f7e6' },
};
const suitNeon = s => (SNS_SUIT[s] || SNS_SUIT[0]).c;

// いまが何ヶ月目か・箱の時期・いちばん新しい期生（画面側が月の始まりに合わせる）
const Clock = { gen: 1, era: 'dawn', lastKi: 1 };
function ownerAge(o) {
  if (o && typeof o.age === 'number') return Math.max(1, o.age);
  if (o && typeof o.founded === 'number') return Math.max(1, Clock.gen - o.founded + 1);
  return 1;
}
// 1年を過ぎたら「周年」、半年ごとに「.5周年」
const careerSpan = age => age >= 12 ? `${Math.floor(age / 12)}年` : `${age}ヶ月`;
const anniversary = age => age >= 12 ? `${Math.floor(age / 6) / 2}周年` : `${age}ヶ月`;
// 登録者の節目（記念配信の数字）
const FOL_MARKS = [100, 300, 500, 1000, 2000, 3000, 5000, 1e4, 2e4, 3e4, 5e4, 1e5, 2e5, 3e5, 5e5, 1e6, 2e6, 3e6, 5e6, 1e7];
function followerMark(F) {
  const m = FOL_MARKS.filter(x => x <= F).pop();
  if (!m) return { ms: '', msTag: '' };
  return { ms: fmtCount(m), msTag: m >= 1e4 ? fmtCount(m) : String(m) };
}
// 規模の段階（①〜⑤）：活動月数と登録者数の低いほう。登録者は月の始まりの数で数える（月の途中で文面が変わらないように）
function ownerStage(o) {
  if (!o) return 1;
  if (typeof o.stage === 'number') return o.stage;
  return careerStage(ownerAge(o), o.followers || 0, o.ki || 1);
}
// 箱の中の立場：前の月の覇権（看板）／いちばん新しい期生
function ownerRole(o) {
  if (!o) return null;
  if (o.lastTitle === '大富豪') return 'top';
  if ((o.ki || 1) > 1 && o.ki === Clock.lastKi) return 'junior';
  return null;
}
function stageCell(entry, stage) {
  if (!Array.isArray(entry)) return entry;
  let c = null;
  for (let k = 0; k < stage && k < entry.length; k++) if (entry[k]) c = entry[k];
  return c || entry.find(Boolean);
}
const resolveText = (v, x) => typeof v === 'function' ? v(x) : v;
// 札1枚の文面 { title, tag, noun, stage }：持ち主の段階と、箱の時期・立場で決まる
function postInfo(card, owner) {
  const o = owner || NOBODY;
  const stage = ownerStage(o);
  const age = ownerAge(o);
  const x = Object.assign({ age, ann: anniversary(age), span: careerSpan(age), stage }, followerMark(o.followers || 0));
  let c;
  if (card.r === 16) c = JOKER_POSTS[stage - 1];
  else {
    const i = card.r - 3;
    const era = ERA_POSTS[Clock.era];
    let ov = era && era[i] && era[i][card.s];
    if (ov && !ov.t) ov = ov[ownerRole(o)] || ov.d;
    c = ov || stageCell(POSTS[card.s][i], stage);
  }
  return { title: resolveText(c.t, x), tag: resolveText(c.tag, x), noun: resolveText(c.n, x), stage };
}

// 写真・サムネに写る表情
const CARD_EXPR = {
  1: ['happy', 'anxious', 'happy', 'smug', 'smug', 'sleep', 'panic', 'happy', 'curious', 'happy', 'cry', 'cry', 'normal'],
  2: ['normal', 'anxious', 'normal', 'happy', 'smug', 'happy', 'panic', 'smug', 'curious', 'happy', 'smug', 'happy', 'smug'],
  3: ['happy', 'normal', 'happy', 'smug', 'smug', 'happy', 'panic', 'happy', 'curious', 'happy', 'happy', 'smug', 'cry'],
  0: Array(13).fill('normal'),
};
const CARD_TAGS = {
  1: ['#Vtuber', '#おはようVtuber', '#てぇてぇ', '#同期', '#感謝', '#ねこ', '#記念日', '#ファンアート', '#おやすみVtuber'],
  0: ['#質問箱', '#雑談', '#考察', '#ファクトチェック', '#語り', '#凸待ち', '#お悩み相談', '#トーク'],
  2: ['#告知', '#お知らせ', '#コラボ', '#解禁', '#グッズ', '#イベント', '#配信予定', '#拡散希望'],
  3: ['#配信', '#参加型', '#ゲーム実況', '#初見歓迎', '#コラボ配信', '#歌枠', '#耐久配信', '#神回'],
};
const QUOTE_LINES = ['それ、どこ情報？', 'ちょっと冷静になろう', 'もう聞き飽きた…', 'わかる、それな', 'その人の話も聞きたい', '一言で燃えてて草', 'えっ逆だったの！？', '保存して読みます', 'それ本当に正しい？', '詳しくて助かる', 'これは事件', '常識が変わった', '歴史が動いた瞬間'];
const QUOTE_SMALL = ['神回だった', 'ファンになりました', '泣いた'];       // 駆け出しまでは大げさにしない
const quoteFor = (i, stage) => i >= 10 && stage <= 2 ? QUOTE_SMALL[i - 10] : QUOTE_LINES[i];
const CHAT_LINES = ['こんばんは！', 'ないす！！', 'きたー！', 'ほんと上手い…', 'この展開やばい！', 'がんばれー', '初見です！', 'てぇてぇ', '草', 'かわいい', '888888', 'きたあああ', '伝説見届けた'];
// 告知の帯と、短文の投稿の印も段階に合わせる（新人の「超重大発表」「トレンド1位」は大げさ）
const NEWS_BADGES = [null, ['お知らせ', 'お知らせ', 'ご報告', '大事なお知らせ'], ['お知らせ', '告知', 'ご報告', '重大発表'], ['お知らせ', '告知', '重大発表', '重大発表'],
  ['お知らせ', '告知', '重大発表', '超重大発表'], ['お知らせ', '告知', '重大発表', '超重大発表']];
const NEWS_BADGE = (i, stage) => NEWS_BADGES[stage || 5][i <= 2 ? 0 : i <= 6 ? 1 : i <= 10 ? 2 : 3];
const textPostLabel = (i, stage) => i >= 9 && stage >= 4 ? `トレンド ${13 - i}位` : i >= 9 && stage === 3 ? '急上昇のポスト' : i >= 5 ? '話題のポスト' : '最新のポスト';
const TIME_AGO = ['たった今', '1分前', '3分前', '12分前', '28分前', '1時間前', '2時間前', '5時間前'];
const QUOTE_ACCOUNTS = [
  { name: 'みなと', handle: '@minato_oo', ava: { st: 0, hc: 8, sk: 1, ey: 7, ac: 2, of: 1, oc: 3, th: 6 } },
  { name: 'ゆいな', handle: '@yuina_77', ava: { st: 2, hc: 4, sk: 0, ey: 3, ac: 0, of: 4, oc: 6, th: 4 } },
  { name: 'ケイ', handle: '@kei_tv', ava: { st: 5, hc: 2, sk: 2, ey: 0, ac: 0, of: 0, oc: 2, th: 1 } },
];

// 数字の表し方
function fmtCount(n) {
  if (!isFinite(n)) return '∞';
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '億';
  if (n >= 1e6) return Math.round(n / 1e4) + '万';
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
  return Math.round(n).toLocaleString('ja-JP');
}
// いいねの規模：段階ごとの幅の中で、強い札ほど大きい（8 はバズで跳ねる）
const BUZZ_RANGE = [null, [4, 2500], [15, 2e4], [60, 1.5e5], [200, 5e5], [600, 1.5e6]];
function buzzOf(s, stage, jit, viral) {
  const [lo, hi] = BUZZ_RANGE[clamp(stage || 5, 1, 5)];
  return lo * Math.pow(hi / lo, clamp(s, 0, 12) / 12) * (jit || 1) * (viral ? 3 : 1);
}
// 配信の札のサムネの「〇人が視聴中」：窓の同接と同じくらいの規模（段階ごとの目安 × 札の大きさ）
const VIEW_BASE = [0, 20, 80, 400, 3000, 20000];
const liveViewers = m => VIEW_BASE[clamp(m.stage || 5, 1, 5)] * (0.6 + 2.4 * Math.pow(clamp(m.i, 0, 12) / 12, 1.5)) * (m.jit || 1);
// 札ごとに決まっている揺らぎ・#タグ・表情など（文面と数字は持ち主で変わるので faceMeta で）
const MetaCache = new Map();
function cardMeta(card) {
  let m = MetaCache.get(card.id);
  if (m) return m;
  const rnd = mulberry32(card.id * 7919 + 13);
  if (card.r === 16) {
    m = { i: 13, jit: 1, tags: ['#全SNS', '#同時多発', '#GLITCH'], expr: 'smug', time: 'NaN分前' };
  } else {
    const i = card.r - 3;
    const pick = (arr, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };
    m = {
      i, jit: 0.85 + rnd() * 0.3,
      tags: pick(CARD_TAGS[card.s], 2),
      expr: CARD_EXPR[card.s][i],
      time: TIME_AGO[Math.floor(rnd() * TIME_AGO.length)],
      quoteBy: QUOTE_ACCOUNTS[Math.floor(rnd() * QUOTE_ACCOUNTS.length)],
      chat: pick(CHAT_LINES, 3),
      date: `${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}/${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')} ${['19:00', '20:00', '21:00', '22:00'][Math.floor(rnd() * 4)]}`,
      hue: rnd(),
    };
  }
  MetaCache.set(card.id, m);
  return m;
}
// 札の表に描く中身（持ち主の段階の文面と数字）
function faceMeta(card, owner) {
  const m = cardMeta(card);
  const p = postInfo(card, owner);
  return Object.assign({}, m, { title: p.title, stage: p.stage, buzz: card.r === 16 ? Infinity : buzzOf(m.i, p.stage, m.jit, card.r === 8), quote: card.r === 16 ? '' : quoteFor(m.i, p.stage) });
}
// 札の表の描き分けの印（文面と段階が同じなら同じ絵）
function faceSig(card, owner) { const p = postInfo(card, owner); return p.stage + '|' + p.title; }
const cardTitleFor = (card, owner) => postInfo(card, owner).title;

// 順位の呼び名：中身は大富豪の順位のまま、画面では配信者らしい呼び名で出す
const TITLE_NAME = { '大富豪': '覇権', '富豪': '人気者', '平民': '中堅', '貧民': '過疎', '大貧民': 'オワコン' };
const TITLE_SHORT = { '大富豪': '覇権', '富豪': '人気', '平民': '中堅', '貧民': '過疎', '大貧民': 'オワコン' };
const tl = t => TITLE_NAME[t] || t;
// 出し方の代表の札（いちばん数字の大きい札。ジョーカーだけならジョーカー）
function playTopCard(play) {
  const nat = play.cards.filter(c => c.r !== 16);
  if (!nat.length) return null;
  return play.type === 'seq' ? nat.reduce((a, b) => (b.r > a.r ? b : a)) : nat[0];
}
const playLeadCard = play => playTopCard(play) || play.cards[0];
// 出し方のタイトル（代表の札の投稿）
function playTitle(play, owner) { return cardTitleFor(playLeadCard(play), owner); }
// トレンドの言葉 [#タグ, 注目の言葉, 段階]
function trendWordsFor(play, owner) {
  const p = postInfo(playLeadCard(play), owner);
  return [p.tag, p.noun, p.stage];
}
// 投稿のいいね数：いまの強さの並びで決まる（革命・11バック中は数字の小さい札ほど伸びる）。ジョーカー単体は ∞
function cardBuzz(card, rev, asRank, stage) {
  const r = asRank || card.r;
  if (r === 16) return Infinity;
  return buzzOf(rev ? 15 - r : r - 3, stage, cardMeta(card).jit, r === 8);
}
function playBuzz(play, rev, stage) {
  let sum = 0;
  play.cards.forEach((c, k) => { sum += cardBuzz(c, rev, c.r !== 16 ? c.r : play.type === 'seq' ? play.rank + k : play.rank, stage); });
  return sum;
}

// タイトル画面の飾りに使う架空のVtuber（活動の長さと登録者で、投稿の規模が変わる）
const DEMO_OWNERS = [
  { id: 'demo0', name: 'momo_chan', handle: '@momo_chan', age: 30, followers: 128400, ki: 1, ava: { st: 2, hc: 0, sk: 0, ey: 1, ac: 6, of: 0, oc: 3, th: 0 } },
  { id: 'demo1', name: 'REI', handle: '@rei_2434', age: 14, followers: 34500, ki: 2, ava: { st: 0, hc: 2, sk: 1, ey: 6, ac: 2, of: 1, oc: 2, th: 1 } },
  { id: 'demo2', name: 'Lilia Ch.', handle: '@lilia_ch', age: 8, followers: 8920, ki: 3, ava: { st: 8, hc: 3, sk: 0, ey: 3, ac: 7, of: 2, oc: 2, th: 2 } },
  { id: 'demo3', name: 'sora_ch', handle: '@sora_ch', age: 40, followers: 862000, ki: 1, ava: { st: 5, hc: 10, sk: 1, ey: 6, ac: 1, of: 0, oc: 2, th: 3 } },
  { id: 'demo4', name: '???', handle: '@glitch', ava: { st: 6, hc: 6, sk: 3, ey: 5, ac: 9, of: 3, oc: 2, th: 4 } },
];
const NOBODY = { id: 'nobody', name: 'メンバー', handle: '@member', ava: { st: 1, hc: 2, sk: 1, ey: 0, ac: 0, of: 4, oc: 2, th: 6 } };

// 字体を先に読み込むための、札に使う文字（どの段階・時期の文面も）
function cardGlyphs() {
  const xs = [1, 5, 14, 30].map(age => ({ age, ann: anniversary(age), span: careerSpan(age), ms: '1,000', msTag: '1000', stage: 3 }));
  const out = [];
  const add = c => { if (!c) return; for (const x of xs) out.push(resolveText(c.t, x), resolveText(c.tag, x), resolveText(c.n, x)); };
  for (const suit of Object.values(POSTS)) for (const e of suit) (Array.isArray(e) ? e : [e]).forEach(add);
  JOKER_POSTS.forEach(add);
  for (const era of Object.values(ERA_POSTS)) for (const row of Object.values(era)) for (const v of Object.values(row)) { if (v.t) add(v); else Object.values(v).forEach(add); }
  return [...out, ...Object.values(CARD_TAGS).flat(), ...QUOTE_LINES, ...QUOTE_SMALL, ...CHAT_LINES, ...NEWS_BADGES.flat().filter(Boolean),
    '公開予定通知するフォロー登録者人が視聴中共有コメント最新の話題のポスト急上昇トレンド位入りいいね件分前時間前たった今万億',
    ...QUOTE_ACCOUNTS.map(a => a.name), ...DEMO_OWNERS.map(a => a.name), '@_0123456789'].join('');
}
