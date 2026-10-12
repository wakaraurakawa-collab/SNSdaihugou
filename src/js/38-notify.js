// ================================================================
//  通知：人気者・覇権になると、DM・コラボのお誘い・案件の相談などが画面の端に届く
//  コラボは箱のメンバー（同期・先輩・後輩）から、案件や出演の話はマネージャー経由で。中身はあなたの段階（規模）に合わせる
//  （登場する事務所・会社・番組・ファンはすべて架空）。上部のベルで受信箱を見返せる
// ================================================================
const NOTE_KIND = {
  dm: { label: 'DM', c: '#3b82ff' },
  collab: { label: 'コラボのお誘い', c: '#ff4fa3' },
  pr: { label: '案件のご相談', c: '#ff9d3c' },
  art: { label: 'ファンアート', c: '#a77bff' },
  tip: { label: '投げ銭', c: '#f5b301' },
  offer: { label: '出演依頼', c: '#ff453a' },
  press: { label: '取材依頼', c: '#12b8c9' },
  staff: { label: 'マネージャー', c: '#2fd88a' },
  // 事務所からの圧（39-pressure.js）
  nag: { label: 'マネージャー', c: '#ffb02e', snd: 'mgr' },
  micro: { label: 'マネージャー', c: '#ff6a3d', snd: 'mgr', dur: 4800, cls: 'micro' },
  company: { label: '運営', c: '#9a8fb8', snd: 'ominous', dur: 8500, cls: 'ominous' },
  peak: { label: 'マネージャー', c: '#d99a00', snd: 'mgr', dur: 5200, cls: 'micro' },
};
// 人気者（1）と覇権（2）で届く種類の重み
const NOTE_WEIGHTS = {
  1: { dm: 40, collab: 25, art: 12, tip: 13, pr: 6, staff: 4 },
  2: { dm: 24, collab: 18, pr: 14, art: 9, tip: 12, offer: 8, press: 8, staff: 7 },
};
// DMをくれるファン：ニックネーム＋SNSっぽい添え書き（@低浮上 など）。アイコンは顔ではなく、猫・風景・推し活グッズなど（26-fanicon.js）
const FAN_BASES = [
  ['ねこまる', 'nekomaru'], ['よふかし民', 'yofukashi'], ['ぽてと', 'potato'], ['みかん箱', 'mikanbako'], ['夜ふけのペンギン', 'yofuke_pen'], ['ゆるり', 'yururi'],
  ['たぬき寝入り', 'tanuki_neiri'], ['えびふらい', 'ebifry'], ['しろくま', 'shirokuma'], ['こんぶ', 'konbu'], ['ぴよ', 'piyo'], ['ねこじた', 'nekojita'],
  ['もちこ', 'mochiko'], ['とうふ', 'tofu'], ['ラムネ', 'ramune'], ['ほたて', 'hotate'], ['すあま', 'suama'], ['ちくわ', 'chikuwa'], ['かもめ', 'kamome'],
  ['しまえなが', 'shimaenaga'], ['こはく', 'kohaku'], ['あんこ', 'anko'], ['きなこ', 'kinako'], ['つくね', 'tsukune'], ['はんぺん', 'hanpen'], ['むぎちゃ', 'mugicha'],
  ['ほうじ茶', 'houjicha'], ['めろんぱん', 'melonpan'], ['からあげ', 'karaage'], ['おもち', 'omochi'], ['くるみ', 'kurumi'], ['ぷりん', 'purin'],
  ['わらびもち', 'warabimochi'], ['だいふく', 'daifuku'], ['おにぎり', 'onigiri'], ['ゆでたまご', 'yudetamago'], ['しめじ', 'shimeji'], ['なめこ', 'nameko'],
  ['こたつ', 'kotatsu'], ['ふとん', 'futon'], ['あくび', 'akubi'], ['ねむねむ', 'nemunemu'], ['ごろごろ', 'gorogoro'], ['ぽかぽか', 'pokapoka'], ['しずく', 'shizuku'],
  ['こもれび', 'komorebi'], ['ゆうやけ', 'yuuyake'], ['ほしくず', 'hoshikuzu'], ['つきみ', 'tsukimi'], ['はるかぜ', 'harukaze'], ['なつぞら', 'natsuzora'],
  ['あきさめ', 'akisame'], ['ゆきみ', 'yukimi'], ['あおば', 'aoba'], ['からす', 'karasu'], ['すずめ', 'suzume'], ['いるか', 'iruka'], ['くらげ', 'kurage'],
  ['うみうし', 'umiushi'], ['カピバラ', 'capybara'], ['ハリネズミ', 'harinezumi'], ['ぶんちょう', 'buncho'], ['しばいぬ', 'shibainu'], ['みけ', 'mike'],
  ['くろねこ', 'kuroneko'], ['さばとら', 'sabatora'], ['はちわれ', 'hachiware'], ['レモンティー', 'lemontea'], ['ソーダ', 'soda'], ['マカロン', 'macaron'],
  ['たこさん', 'takosan'], ['ゆず', 'yuzu'], ['みるく', 'milk'], ['あめだま', 'amedama'], ['mint', 'mint'], ['nana', 'nana'], ['Ao', 'ao'],
];
// 名前だけで通っている人
const FAN_SOLO = [
  ['切り抜き職人', 'kirinuki_shokunin'], ['アーカイブ勢', 'archive_zei'], ['社畜リスナー', 'shachiku_listener'], ['古参のうさぎ', 'kosan_usagi'],
  ['箱推しの民', 'hakooshi'], ['在宅ペンギン', 'zaitaku_pen'], ['定時で帰りたい', 'teiji_kaeritai'], ['コメント欄の住人', 'comment_juunin'],
  ['朝活リスナー', 'asakatsu'], ['通りすがりの初見', 'toorisugari'], ['ROM専のねこ', 'rom_neko'], ['夜勤明けのたぬき', 'yakin_tanuki'],
  ['作業用BGM勢', 'sagyou_bgm'], ['布教担当', 'fukyou_tantou'], ['同時視聴の民', 'doujishichou'], ['寝落ち常習犯', 'neochi'],
  ['ペンライト係', 'penlight_gakari'], ['歌枠しか勝たん', 'utawaku_only'], ['推し活貯金中', 'oshikatsu_chokin'], ['てぇてぇ見守り隊', 'teetee_mimamori'],
  ['深夜のコンビニ', 'shinya_conbini'], ['二次元に住みたい', 'nijigen_sumitai'], ['絵描きのかもめ', 'ekaki_kamome', 1], ['ファンアート描く人', 'fanart_kaku', 1],
];
const FAN_SUFFIX = ['@低浮上', '@ゆる浮上', '@推し活垢', '@アーカイブ勢', '@社会人リスナー', '@リプ不要', '@箱推し', '｜同時視聴勢', '@夜更かし', '@ROM専', '☆', '♪', '♡'];
const ARTIST_SUFFIX = ['@絵描き', '@お絵描き垢', '@イラスト練習中'];
const FAN_TAIL = ['_oshi', '_listen', '_v', '_sub', '_ch', '_rom', '_art'];
function buildFans(seed) {
  const rnd = mulberry32(seed);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const all = FAN_BASES.map(b => ({ b, solo: false })).concat(FAN_SOLO.map(b => ({ b, solo: true })));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, 90).map(({ b: [base, roma, art], solo }) => {
    let name = base, artist = !!art, oshi = false;
    if (!solo) {
      const x = rnd();
      if (x < 0.1) { name += pick(ARTIST_SUFFIX); artist = true; }
      else if (x < 0.5) name += pick(FAN_SUFFIX);
      else if (x < 0.64) oshi = true;                      // 「〇〇推し」：届いた先の名前を入れる
    }
    const t = rnd();
    const tail = t < 0.55 ? '' : t < 0.75 ? '_' + String(10 + Math.floor(rnd() * 90)) : t < 0.85 ? '_' + String(1 + Math.floor(rnd() * 12)).padStart(2, '0') + String(1 + Math.floor(rnd() * 28)).padStart(2, '0') : artist ? '_art' : pick(FAN_TAIL);
    return { name, base, handle: '@' + roma + tail, artist, oshi, icon: { kind: pickFanIcon(rnd, artist), seed: Math.floor(rnd() * 2147483647) } };
  });
}
const FANS = buildFans((Math.random() * 2147483647) >>> 0);
const Fans = { recent: [] };
// ほかの事務所の架空のVtuber（外部コラボ）
const OUTSIDE_VTUBERS = [['しぐれ', 'shigure_v'], ['あまつ', 'amatsu_v'], ['ルナ', 'luna_vt'], ['ほむら', 'homura_v'], ['こがね', 'kogane_v']];
const NOTE_PR = [['ぽかぽか製菓', '新作スナック'], ['ミライ文具', '新しいボールペン'], ['ネオンゲームス', '新作スマホゲーム'], ['かもめトラベル', '温泉ツアー'],
  ['もちもちベーカリー', '季節の新作パン'], ['ほしぞらレコード', '新曲'], ['まるまる書房', '新刊'], ['ひかり家電', 'ワイヤレスイヤホン'], ['くるくる寝具', 'ふわふわ枕'], ['あおぞら飲料', 'エナジードリンク']];
// 段階ごとの「出演依頼・取材・マネージャーからの連絡」（新人に地上波の話は来ない）
const NOTE_OFFER = [null, '箱の公式番組', '箱の公式番組', 'ネット番組「深夜のタイムライン」', '大型イベント「TL FES」', '年末特番「ネットの祭典」'];
const NOTE_PRESS = [null, 'ネットの森ニュース', 'ネットの森ニュース', '配信者タイムズ', 'まいにちエンタメ', 'ウェブマガジン「ひとこと」'];
const NOTE_STAFF = [null, '配信おつかれさまでした！次の企画、一緒に考えましょう', '公式チャンネルの企画に出てもらえませんか？', '新衣装の制作が決まりました！',
  '3Dお披露目の日程が決まりました', 'ソロライブの会場が押さえられました'];
const NOTE_DM_STAGE = [null,
  ['初配信から見てます！', 'デビューおめでとうございます！', 'ファンネーム決まって嬉しい！'],
  ['切り抜きから来ました！', '歌枠、最高でした！', 'メン限入りました！'],
  ['新衣装かわいすぎます！', 'オリ曲ずっと聴いてます！', 'グッズ届きました！'],
  ['3D最高でした！', 'ライブ行きます！', 'コラボカフェ行ってきました！'],
  ['ライブで泣きました…', '地上波見ました！', '海外からも応援してます！'],
];
const NOTE_DM = ['いつも配信見てます！元気もらってます', '毎日の楽しみです。無理せずがんばってください', 'アーカイブ3回見ました', 'さっきの投稿、友達にも教えました！'];
const NOTE_TIP_MSG = ['いつもありがとう！', '応援してます！', 'さっきのナイスでした', '神回でした', '明日もがんばって！'];
// ファンが投稿を引いて送ってくる感想（投稿の種類に合わせる。4 はジョーカー）
const NOTE_QUOTE = {
  0: ['わかりすぎる…', 'の話、もっと聞きたいです'],
  1: ['てぇてぇ…', 'で元気出ました'],
  2: ['楽しみにしてます！', '待ってました！'],
  3: ['最高でした！', 'アーカイブでも見ます！'],
  4: ['すごかった…！', 'で鳥肌立ちました'],
};
const quoteDM = q => `「${q.title}」${pickOf(NOTE_QUOTE[q.suit] || NOTE_QUOTE[4])}`;

const Notify = { items: [], unread: 0, tier: 0, next: 0, first: null, lastTitle: '', quote: null };
const pickOf = arr => arr[Math.floor(Math.random() * arr.length)];
function pickWeighted(w) {
  const keys = Object.keys(w);
  let x = Math.random() * keys.reduce((a, k) => a + w[k], 0);
  for (const k of keys) { x -= w[k]; if (x < 0) return k; }
  return keys[0];
}
// 架空のアカウント（名前ごとにいつも同じアイコン）
function stableAccount([name, roma]) {
  let hsh = 7;
  for (const ch of roma) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  return { name, handle: '@' + roma, ava: makeAvatar(mulberry32(hsh)) };
}
// ファンを1人（続けて同じ人にならないように）。「〇〇推し」の人は届いた先（あなた）の名前を入れる
function fanAccount(role, myName) {
  const pool = role === 'art' ? FANS.filter(f => f.artist) : FANS;
  let f = pickOf(pool);
  for (let k = 0; k < 6 && Fans.recent.includes(f); k++) f = pickOf(pool);
  Fans.recent = [f, ...Fans.recent].slice(0, 8);
  return f.oshi && myName ? Object.assign({}, f, { name: `${f.base}｜${myName}推し` }) : f;
}
// 箱の中の関係（あなたから見て）
function kiRelation(h, me) {
  const a = (h && h.ki) || 1, b = (me && me.ki) || 1;
  return a === b ? '同期' : a < b ? '先輩' : '後輩';
}
// コラボのお誘い：ふだんは同じ箱のメンバーから、ときどき他事務所から
function collabFrom(me) {
  const others = seats.slice(1).filter(Boolean);
  if (!others.length || Math.random() < 0.2) return { acc: stableAccount(pickOf(OUTSIDE_VTUBERS)), rel: '他事務所' };
  const h = pickOf(others);
  return { acc: h, rel: kiRelation(h, me) };
}
function makeNote(kind, o = {}) {
  const me = dyn ? playerHouse(dyn) : null;
  const myName = me ? me.name : 'あなた';
  const stage = ownerStage(me);
  const n = { kind, gen: dyn ? dyn.gen : 1, from: null, rel: '', logo: null, mark: '', text: '' };
  const fromStaff = () => { n.logo = `${AGENCY} マネージャー`; n.mark = 'マ'; };
  if (kind === 'dm') {
    n.from = fanAccount('dm', myName);
    const pool = NOTE_DM.concat(NOTE_DM_STAGE[stage], NOTE_DM_STAGE[stage]);
    const q = !o.text && Notify.quote && Math.random() < 0.35 ? Notify.quote : null;
    if (q) Notify.quote = null;   // 同じ投稿への感想は一度だけ
    n.text = o.text || (q ? quoteDM(q) : pickOf(pool));
  } else if (kind === 'collab') {
    const c = collabFrom(me);
    n.from = c.acc; n.rel = c.rel;
    const lines = c.rel === '他事務所' ? [`${AGENCY}さんとのコラボ、ぜひお願いしたいです！`, '事務所の垣根を越えてコラボしませんか？']
      : c.rel === '先輩' ? ['今度コラボしない？企画考えてるんだ', '先輩として、一緒に配信やりたいな']
        : c.rel === '後輩' ? [`${myName}先輩、コラボしてください！`, '先輩、ゲーム教えてもらえませんか？']
          : ['同期コラボ、またやろう！', '同期でオフコラボしない？'];
    if (stage >= 4) lines.push('大型コラボのメンバーに入ってもらえませんか？');
    n.text = pickOf(lines);
  } else if (kind === 'pr') {
    const [co, item] = pickOf(NOTE_PR);
    fromStaff(); n.text = `${co}から「${item}」のPR案件のご相談が来ています`;
  } else if (kind === 'art') {
    n.from = fanAccount('art', myName);
    n.text = pickOf(['ファンアートを描きました！見てもらえたら嬉しいです', `${myName}さんの絵、描きました！`, 'この前の配信の名場面を描きました！']);
  } else if (kind === 'tip') {
    n.from = fanAccount('tip', myName);
    const yen = pickOf(stage >= 4 ? [1000, 2000, 5000, 10000] : stage >= 2 ? [300, 500, 1000, 2000] : [100, 300, 500]);
    n.text = `¥${yen.toLocaleString('ja-JP')}「${pickOf(NOTE_TIP_MSG)}」`;
  } else if (kind === 'offer') {
    fromStaff(); n.text = `${NOTE_OFFER[stage]}から出演のご依頼が来ています`;
  } else if (kind === 'press') {
    const m = NOTE_PRESS[stage];
    n.logo = m; n.mark = m.charAt(0); n.text = `${m}です。インタビューのお願いです`;
  } else if (kind === 'staff') {
    fromStaff(); n.text = NOTE_STAFF[stage];
  } else if (kind === 'nag' || kind === 'micro' || kind === 'peak') {
    fromStaff();
  } else if (kind === 'company') {
    n.logo = `${AGENCY} 運営`; n.mark = '運';
  }
  if (o.text && kind !== 'dm') n.text = o.text;
  return n;
}
function noteHTML(n, when) {
  const K = NOTE_KIND[n.kind];
  const pic = n.from ? (n.from.icon ? fanImg(n.from, 'nt-ava') : avaImg(n.from, 'happy', 'nt-ava')) : `<span class="nt-logo">${esc(n.mark || (n.logo || '?').replace(/^.*「/, '').charAt(0))}</span>`;
  const who = n.from ? `${esc(n.from.name)}<small>${esc(n.from.handle)}${n.rel ? '・' + esc(n.rel) : ''}</small>` : esc(n.logo || '');
  return `<div class="nt-head"><span class="nt-kind">${K.label}</span><span class="nt-time">${when || 'たった今'}</span></div>`
    + `<div class="nt-body">${pic}<div class="nt-txt"><b>${who}</b><span>${esc(n.text)}</span></div></div>`;
}
// 画面の端に出す（数秒で消える。押すと消える）
function showToast(n) {
  const box = $('notes');
  if (!box || !spd()) return;
  const K = NOTE_KIND[n.kind];
  const el = document.createElement('div');
  el.className = 'note' + (K.cls ? ' ' + K.cls : '');
  el.style.setProperty('--nc', K.c);
  el.innerHTML = noteHTML(n);
  el.addEventListener('click', () => { Notify.seenAt = performance.now(); dismissToast(el); });
  box.prepend(el);
  while (box.children.length > 2) box.lastChild.remove();
  setTimeout(() => dismissToast(el), K.dur || 5600);
}
function dismissToast(el) {
  if (!el.isConnected || el.classList.contains('out')) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 320);
}
function pushNote(n) {
  Notify.items.unshift(n);
  if (Notify.items.length > 40) Notify.items.length = 40;
  const open = $('inbox') && !$('inbox').hidden;
  Notify.unread = open ? 0 : Notify.unread + 1;      // 受信箱を開いていれば既読
  updateBell();
  showToast(n);
  Sound.play(NOTE_KIND[n.kind].snd || 'dm');
  if (open) renderInbox();
}
function updateBell() {
  const b = $('bellN');
  if (!b) return;
  b.textContent = Notify.unread > 99 ? '99+' : Notify.unread;
  b.hidden = !Notify.unread;
  $('btnInbox').classList.toggle('has', Notify.unread > 0);
}
// 受信箱（ベルを押すと開く）
function renderInbox() {
  const list = $('inboxList');
  if (!Notify.items.length) {
    list.innerHTML = `<li class="nt-empty">まだ通知はありません。<br>人気者になると、DMやコラボのお誘いが届くようになります。</li>`;
    return;
  }
  list.innerHTML = Notify.items.map(n => `<li class="note in${NOTE_KIND[n.kind].cls ? ' ' + NOTE_KIND[n.kind].cls : ''}" style="--nc:${NOTE_KIND[n.kind].c}">${noteHTML(n, `${n.gen}ヶ月目`)}</li>`).join('');
}
function toggleInbox(open) {
  const p = $('inbox');
  const want = open == null ? p.hidden : open;
  p.hidden = !want;
  $('btnInbox').setAttribute('aria-expanded', String(want));
  if (want) { renderInbox(); Notify.unread = 0; updateBell(); Notify.seenAt = performance.now(); }
}
// 人気度：前の月の順位（覇権 2・人気者 1・それ以外 0）
function notifyTier() {
  const h = dyn && playerHouse(dyn);
  return h && h.lastTitle === '大富豪' ? 2 : h && h.lastTitle === '富豪' ? 1 : 0;
}
function notifyReset() { Notify.items = []; Notify.unread = 0; Notify.lastTitle = ''; Notify.quote = null; updateBell(); const b = $('notes'); if (b) b.innerHTML = ''; }
// 月の始まり：人気者・覇権なら、ほどなく最初の通知が届く
function notifyMonthStart() {
  Notify.tier = notifyTier();
  Notify.quote = null;
  Notify.first = Notify.tier === 2 ? pickOf(['offer', 'press', 'pr', 'staff']) : Notify.tier === 1 ? pickOf(['collab', 'dm']) : null;
  Notify.next = performance.now() + (Notify.tier === 2 ? 5000 : 9000) + Math.random() * 4000;
  const b = $('notes');
  if (b) b.innerHTML = '';
}
function notifyActive() {
  return Flow.inGame && game && !game.finished && !Flow.paused && !Flow.skip && !window.__ff && !anyOverlayOpen();
}
// 毎フレーム：人気者は20〜30秒に1件くらい、覇権は10〜20秒に1件くらい
function notifyTick(now) {
  if (!Notify.tier || !notifyActive() || now < Notify.next) return;
  Notify.next = now + (Notify.tier === 2 ? 9000 + Math.random() * 10000 : 18000 + Math.random() * 14000);
  let kind = Notify.first || pickWeighted(NOTE_WEIGHTS[Notify.tier]);
  if (kind === 'staff' && Pressure.on) kind = 'dm';     // 卒業の危機の月に、マネージャーの明るい連絡は来ない
  Notify.first = null;
  pushNote(makeNote(kind));
}
// あなたの投稿：大きな投稿には反応が届きやすい
function notifyOnPost(play, rev, eff, owner) {
  Notify.lastTitle = playTitle(play, owner);
  const top = playTopCard(play);
  // 感想が届くのは、ある程度の大きさの投稿だけ（「配信お休みします」に「最高でした」は来ない）
  if (!top || top.r - 3 >= 5) Notify.quote = { title: Notify.lastTitle, suit: top ? top.s : 4 };
  if (!Notify.tier || !notifyActive()) return;
  const big = !top || postStrength(top.r, rev) >= 10 || (eff && (eff.eightCut || eff.revolution !== undefined || eff.spade3));
  if (!big || Math.random() > 0.45) return;
  const kind = Math.random() < 0.7 ? 'dm' : 'tip';
  setTimeout(() => { if (notifyActive()) pushNote(makeNote(kind, kind === 'dm' ? { text: `「${Notify.lastTitle}」バズってますね！` } : {})); }, 1400);
  Notify.next = Math.max(Notify.next, performance.now() + 6000);
}
// 1位であがった・登録者の節目：人気に関係なくお祝いが届く
function notifyCongrats(text) {
  if (!Flow.inGame || Flow.skip || window.__ff) return;
  setTimeout(() => { if (Flow.inGame) pushNote(makeNote('dm', { text })); }, 1500);
}
// 1位であがった月：ファンから（順位やゲームのことではなく、配信者としての今月の活躍を）
const NOTE_TOP_SMALL = ['今月の配信、ぜんぶ見ました！', '最近TLでよく流れてきます！', '今月も楽しかった！来月も楽しみにしてます', '切り抜きで今月の名場面まとめ見ました！', '今月、友達にも布教しました！'];
const NOTE_TOP_BIG = ['今月もたくさんトレンド入りしてましたね！', '最近どこを見ても名前を見かけます！', '今月の配信、神回ばっかりでした！', '今月のTL、ほぼ話題さらってましたね', '今月も楽しかった！来月も楽しみにしてます'];
function notifyTopMonth() {
  const me = dyn && playerHouse(dyn);
  notifyCongrats(pickOf(ownerStage(me) >= 3 ? NOTE_TOP_BIG : NOTE_TOP_SMALL));
}
