// ================================================================
//  事務所からの圧（運営・マネージャー）
//   ・オワコンが2ヶ月続くと、運営から不穏な連絡が届く
//   ・勢いが2ヶ月続けて下がると、マネージャーから「もっと改善して」と催促が届く
//   ・今月の順位しだいで卒業になる月は「卒業の危機」。月の始めに告げられ、マネージャーが
//     出した投稿・パス・手が止まったこと・ほかのメンバーの上がりに、細かく口を出してくる
//   ・覇権が2ヶ月以上続いている月は「覇権キープ」。褒めながら「絶対に落とさないでください」と圧をかけてくる
//  （人気と関係なく届く。届いたものは受信箱にも残る）
//  文言はこのファイルに集めてある。同じ月に同じ文は二度言わない（数字だけ違う文も同じとみなす）
// ================================================================
const Pressure = {
  on: false, deadPos: -1, line: '', need: '', level: 0, giveUp: false, outcome: null,
  peak: false, top: 0, peakOut: null,
  falling: 0, streak: 0, queue: [], next: 0, nags: 0, passRun: 0, could: true, turnAt: 0, idleN: 0,
  suits: [], safeLeft: -1, posts: 0, companyAt: 0, companyFollow: false, said: new Set(),
};
const PRESSURE_INIT = JSON.parse(JSON.stringify(Object.assign({}, Pressure, { said: null })));
function pressureReset() { Object.assign(Pressure, JSON.parse(JSON.stringify(PRESSURE_INIT)), { said: new Set() }); }

// 同じ月に同じことは言わない（数字だけ違う言い方も同じとみなす。言っていないものから選ぶ）
const sayKey = t => String(t).replace(/[0-9,.万]+/g, '#');
const saidBefore = t => Pressure.said.has(sayKey(t));
const fresh = list => { const f = list.filter(t => !saidBefore(t)); return pickOf(f.length ? f : list); };
// 覇権が何ヶ月続いているか（月の始めなら前の月まで）
function topStreakOf(h) {
  let k = 0;
  for (let j = h.history.length - 1; j >= 0 && h.history[j].title === '大富豪'; j--) k++;
  return k;
}
// 卒業になる順位の言い方
function dangerWords(titles, deadPos) {
  const n = titles.length;
  if (deadPos === 1) return { line: '覇権を取れなければ卒業', need: '1位以外はありません' };
  if (deadPos === n - 1) return { line: 'オワコンなら卒業', need: '最下位だけは避けてください' };
  return { line: `${tl(titles[deadPos])}以下なら卒業`, need: `上位${deadPos}人（${tl(titles[deadPos - 1])}以上）に入ってください` };
}
// 今月の見込み（革命のボーナスを含む）。前の月の覇権が都落ちの対象なら、1位以外はオワコン扱い
function pressureOutlook() {
  const h = playerHouse(dyn);
  const n = seats.length;
  const o = powerOutlook(h, dyn, n, game ? game.revBy[0] : 0);
  let dead = o.deadPos;
  const king = game && game.rules.miyakoOchi && game.prevRanking && game.prevRanking[0] === 0;
  if (king && dead >= 0) dead = 1;      // 1位を逃すと覇権陥落でオワコン → 卒業
  return { dead, titles: o.rows.map(r => r.title) };
}
function setDanger(dead, titles) {
  Pressure.on = dead >= 0;
  Pressure.deadPos = dead;
  if (!Pressure.on) { Pressure.line = ''; Pressure.need = ''; Pressure.level = 0; return; }
  const w = dangerWords(titles, dead);
  Pressure.line = w.line; Pressure.need = w.need;
  const n = titles.length;
  Pressure.level = dead >= n - 1 ? 1 : dead === 1 ? 4 : (n - dead) / n <= 0.5 ? 2 : 3;
}

// ================================================================
//  文言（運営・催促・卒業の危機）
// ================================================================
const COMPANY_LINES = {
  2: ['今後の活動について、一度お時間をいただけますか。', '最近の数字について、上の者から話があるそうです。', '来月以降の配信枠の見直しについて、ご相談があります。',
    '活動状況の確認のため、近日中に面談をお願いします。', '登録者の推移について、報告書の提出をお願いします。', '今期の活動費について、見直しを検討しています。'],
  3: ['活動方針について、正式に面談の場を設けます。日程は追ってご連絡します。', '契約内容の確認をさせてください。配信のあと、会議室までお越しください。',
    '所属メンバーの配置について、社内で協議を始めました。', '今後のスケジュールについて、一度白紙に戻して相談させてください。', '3ヶ月連続の件、役員会で話題に上がりました。'],
  4: ['今後の活動の継続について、大事なお話があります。', '卒業も含めて、今後のことを一度話し合いましょう。',
    '卒業に関する資料を準備しました。ご確認ください。', '最終的な判断は来月の結果で行います。ご承知おきください。', '本件、代表も把握しています。'],
};
const COMPANY_FOLLOW = ['先ほどの件、ご確認いただけましたか。', '（既読がついていないようです。至急ご確認ください）', '返信をお待ちしています。', '先ほどのメッセージ、読まれていないようです。', '確認が取れ次第、ご連絡ください。'];
// 月の始め：卒業の危機（1 = 最下位だけが卒業／2〜4 = 上位に入らないと卒業）
const DANGER_START = {
  1: P => [`今月、${P.line}です。${P.need}。`, '正直に言います。今月最下位なら卒業です。', `上から「今月の結果を見て判断する」と言われています。${P.need}。`,
    '今月、最下位だけは本当にダメです。それ以外は何も言いません。', '数字の話はしません。今月は「最下位にならない」、それだけです。',
    '念のため言っておきます。今月オワコンなら、卒業の手続きに入ります。', '上の人、今月のランキングだけ見るそうです。最下位は避けてください。',
    '今月は守りでいいです。最下位さえ避ければ、来月また攻めましょう。'],
  2: P => [`【至急】今月、${P.line}です。${P.need}。`, `今月の結果しだいで卒業の話が進みます。${P.need}。`, `上から「今月が最後のチャンス」と言われています。${P.need}。`,
    `率直に言います。${P.line}。これは決定事項です。`, `今月の配信、上の人が全部見ます。${P.need}。`, `卒業の書類、机の上にあります。使わせないでください。${P.need}。`,
    `今月は結果だけ見ます。過程は聞きません。${P.need}。`, `${P.need}。これ以外の話は、今月はしません。`],
  4: P => ['覇権以外は卒業です。言い方を変えても同じです。', '今月、1位以外ありません。プレッシャーですか？ それが仕事です。', `上から「${P.line}」と、文字どおりの連絡が来ています。`,
    '今月は覇権を取る月です。取れなければ、ここで終わりです。'],
};
const FAN_WORRY = ['最近ちょっと元気ない？無理しないでね', 'どんなときも応援してます。ずっといてね', '最近TLで見かけなくて寂しいです…待ってます', '卒業とか、しないよね…？',
  '何があっても推し続けます', '今月も配信ありがとう。それだけで嬉しいです', '最近の配信、ちょっと疲れてる？ 休んでもいいからね', 'ずっと見てます。順位なんて関係ないです',
  '箱の中でいちばん好きです。これからも', 'なんか心配なことある？ DMで言ってくれていいからね'];
// 勢いが下がり続けている月の催促
const FALLING_START = {
  2: () => ['ここ2ヶ月、勢いが下がっています。今月は上向きにしていきましょう。', '数字、ちょっと落ちてきていますね。企画の見直し、一緒にやりませんか？', '最近の配信、あと一歩です。今月は結果を出していきましょう。',
    '2ヶ月連続で下がってます。偶然にしたくないです。', '落ち方はまだゆるやかです。今のうちに戻しましょう。', '勢いが2ヶ月下がると、上の人がグラフを見始めます。', '今月、何か1つ変えてみませんか。企画でも時間帯でも。'],
  3: n => [`${n}ヶ月連続で勢いが下がっています。そろそろ本気で立て直しましょう。`, 'このままだと厳しいです。今月中に改善案を見せてください。', `${n}ヶ月続けて数字が落ちています。何か手を打たないとまずいです。`,
    `${n}ヶ月右肩下がり。上の人が名前を覚え始めてます。悪い意味で。`, '改善案、まだもらってません。今月中にお願いします。', '落ちている理由、自分では何だと思います？ 聞かせてください。', 'このペースだと、卒業の話が出るのは時間の問題です。'],
};
const FALLING_WEAK = t => ['もう少し攻めた投稿、お願いします。', `「${t}」…数字、取れそうですか？`, '小ネタばかりだと埋もれますよ。', '守りに入ってません？ 落ちてるときこそ攻めです。', `「${t}」。今の勢いで、それは弱いです。`, '安全な投稿ばかりだと、安全に落ちていきます。'];
const FALLING_STRONG = ['いいですね。この調子で今月は上向きにしましょう。', 'そう、それです。それを続けてください。', '伸びそうですね。今月はこれで押しましょう。', 'いい投稿です。こういうのを待ってました。'];
const FALLING_PASS = ['パスが多いですね。もっと前に出ていきましょう。', '最近、配信の存在感が薄いって声が来ています。', '落ちてるときにパスが続くと、戻れなくなりますよ。', 'パス3回。勢いが落ちてる月に、それは痛いです。', '黙る時間が長いです。何か出しましょう。'];
// 卒業の危機：手が止まっているとき（1回目・2回目）
const IDLE_1 = ['既読ついてますよね？　次、何出します？', '手が止まってますけど、大丈夫ですか？', '考えすぎです。数字は待ってくれませんよ。', 'いま何を迷ってるんですか？ 共有してください。',
  '沈黙が長いです。配信中ですよ？', '悩む時間も、同接は落ちていきます。', '手札の相談なら乗ります。でも早くしてください。', '止まってますよ。上の人も見てます。'];
const IDLE_2 = ['まだですか。', '……。', '返事がないので、こちらから出す札を指定しましょうか？', '決められないなら、いちばん強いのを出してください。', '時間を無駄にしています。'];
// 卒業の危機：投稿へのひとこと
const NAG_FX = {
  eight: ['バズったのはいいです。一発屋で終わらせないでくださいね。', '切り抜き伸びてますね。この勢いのまま次もお願いします。', 'バズりましたね。…で、次は？', 'VIRAL、確認しました。喜ぶのは月末にしてください。', '伸びてます。伸びてるうちに、次を出してください。'],
  rev: ['アルゴリズムをひっくり返すのは賭けですよ…責任、取れます？', '…革命ですか。結果で黙らせてください。', 'アルゴリズム、動かしましたね。戻る前に稼いでください。', '流れを変えるのはいいです。乗り遅れないでくださいね。', '上の人が「何が起きた」と聞いてきてます。説明は任せます。'],
  unrev: ['戻すんですか…まあ、いいですけど。', '元に戻しましたね。…それ、意味ありました？', '革命返し。振り回されるのはこっちです。'],
  spade3: ['ファクトチェックで論破、スカッとしますけど敵は作らないでくださいね。', '論破は気持ちいいでしょうけど、炎上の火種にもなります。', '「ソースあります？」…言い方、もう少し丁寧にできません？', '切り札を潰したのは見事です。相手の顔、見ました？'],
  lock: ['ジャンル縛り…視聴者、ついてこれます？', '縛りに入りましたね。手札、足りてます？', 'ジャンルを固定するなら、その手のネタを切らさないでください。'],
  back: ['流れを逆にするの、本当に今でした？', '逆転、ですか。小ネタが強いうちに回してください。', '11バック。…ちゃんと計算してますよね？'],
  series: ['連番シリーズにして、続きのネタは本当にあるんですか？', 'シリーズ化…次の数字、持ってますよね？', '連番の縛り、自分の首を絞めてません？'],
  joker: ['えっ、もう切り札使うんですか？', '切り札は最後までとっておく約束でしたよね？', '切り札を今…残りのネタ、大丈夫ですか？', 'ジョーカーのタイミング、事前に相談してほしかったです。', 'いちばん強いの、出しちゃいましたね。あとはどうするんですか？'],
  two: t => [`「${t}」をもう出すんですか…あとで後悔しても知りませんよ。`, 'その大ネタ、温存しなくて大丈夫ですか？', '2を序盤に…終盤に泣いても知りませんよ。', '大ネタの放出が早いです。ネタ帳、薄くなりますよ。', '今それを出す意味、説明できます？'],
  leadWeak: t => [`「${t}」…地味じゃないですか？`, 'その小ネタから入るんですか？今月そんな余裕ないですよ。', 'もっと数字の取れるネタ、なかったんですか？', '話題の始まりがそれだと、だれも乗ってきませんよ。',
    '小さく始める戦略ですか？ それとも、ネタがないんですか？', '最初の投稿は顔です。それが顔でいいんですか？', '出だしが弱いです。切り抜き師も反応しませんよ。'],
  followWeak: ['それで上から被せたつもりですか？もう少し強く出ましょう。', '最低限の上書きですね。すぐ抜かれますよ。', 'ぎりぎりで被せるのは、上の人はあまり評価しません。', '一応上回りましたけど…一応、ですね。', '被せるなら、黙らせるくらい強く。'],
  set: n => [`${n}枚まとめ投稿。反応、あとで数字ください。`, 'まとめるのはいいですね。…もっとまとめられません？', `${n}枚いっぺんに。小出しにしたほうが日持ちしたのでは？`, 'まとめ投稿、流れるのも早いですよ。', 'いっぺんに出すのは勇気ですね。結果が伴えば、ですが。'],
  seq: n => [`${n}連投…詰め込みすぎて薄まってません？`, '連投するなら、全部伸ばしてくださいね。', `${n}連投。1本ずつ出せば${n}日持ったのに。`, '連続投稿、TL占拠は嫌われますよ。', 'シリーズ物、途中で飽きられないようにしてください。'],
  sameSuit: ja => [`${ja}の投稿が続いてますね。ほかのジャンルも見せてください。`, `${ja}ばかりですね。ファン、飽きてません？`, `また${ja}ですか。引き出し、それだけですか？`, `${ja}に寄りすぎです。上の人は「幅」を見ますよ。`],
  rivalCards: (name, n) => [`${name}さん、もうネタ残り${n}枚ですよ。`, `${name}さんが残り${n}枚です。見えてます？`, `${name}さん、上がりそうです。間に合います？`, `残り${n}枚の${name}さん、先に行かれますよ。`],
  rivalFol: (name, g) => [`${name}さん、今月は登録者が${g}人も増えてますよ。`, `${name}さんは今月${g}人増。あなたは？`, `同じ箱で${name}さんだけ伸びてます。差、見てますか？`],
  last: left => [`あと${left}枚。ここで決めきってください。`, `残り${left}枚…ここで止まらないでくださいね。`, `あと${left}枚。最後まで気を抜かないでください。`, `残り${left}枚。ここが分かれ目です。`, `あと${left}枚ですね。上の人、画面の前です。`],
  strong: ['その調子です。…と言いたいところですが、まだ安心できません。', 'いい投稿です。でも、1本では足りません。', '伸びてますね。油断した瞬間に落ちますよ。', '悪くないです。…今月は「悪くない」では足りません。', 'さすがです。それを毎回お願いします。'],
};
// ジャンルごとの小言
const SUIT_NAG = {
  0: t => ['トークはいいです。でも、切り抜かれないと意味ないですよ。', `「${t}」…その話、燃えないですよね？`, 'トークの投稿、文字数もう少し削れます？', '語りで数字を取るのは難しいです。わかってますよね？', `「${t}」、質問箱の回答にしては長いです。`, 'そのトーク、切り抜き師に先に送っておいてください。'],
  1: t => ['エモい投稿はもういいので、数字の取れる企画をお願いします。', 'てぇてぇも大事ですけど、今月は結果です。', '写真の投稿、画質は大丈夫ですか？ 上の人、そこ見ます。', `「${t}」…エモさで卒業は回避できませんよ。`, '共感系は伸びても登録につながりにくいんです。知ってますよね？', '日常投稿は週1でいいって、前に言いましたよね。'],
  2: t => ['告知ばかりで中身が見えないって声、来てますよ。', `「${t}」、告知したからには伸ばしてくださいね。`, '告知の投稿、時間帯は確認しました？', '告知に「拡散希望」つけました？ …つけてください。', `「${t}」。告知した以上、延期はなしですよ。`, '告知の文面、誤字ありません？ 一応見ておいてください。'],
  3: t => ['企画は事前に共有してくださいって言いましたよね？', `「${t}」…同接、ちゃんと見てます？`, '企画配信、尺は何分の予定ですか？', 'その企画、権利まわりはクリアしてます？', `「${t}」、サムネの文字が小さいです。`, '配信の枠、告知から何時間空けました？'],
  4: () => ['…その投稿、事前チェック通しました？', 'そういう飛び道具、上の人はあまり好きじゃないですよ。', '何が起きたのかわかりませんが、炎上だけは避けてください。', 'それ、消されませんよね？'],
};
// どの投稿にも付けられる、細かい指摘
const TITLE_NAG = t => [
  `「${t}」…これ、今出す必要ありました？`, `「${t}」の数字、あとで報告ください。`, `「${t}」、サムネもう少し攻められましたよね。`,
  `「${t}」…悪くないです。でも、まだ足りないです。`, `「${t}」、投稿する時間はそこで良かったですか？`, `「${t}」。反応、こまめに見ておいてください。`,
  `「${t}」、タイトルもう少し短くできません？`, `「${t}」にハッシュタグ、付けました？`, `「${t}」の投稿、誤字ありませんでした？ 一応確認してください。`,
  `「${t}」。それ、先週も似たの出してませんでした？`, `「${t}」、上の人が「よくわからない」と言ってます。`, `「${t}」…ファン層、ちゃんと想定してます？`,
  `「${t}」。コメント欄、荒れてませんか？ 見ておいてください。`, `「${t}」、投稿の前にひと声ほしかったです。`, `「${t}」。いいねの伸び、1時間ごとに報告ください。`,
  `「${t}」…これ、来月の企画書に入れておきますね。`, `「${t}」。同期の投稿と比べると、まだ弱いです。`, `「${t}」、通知オンの人にちゃんと届いてます？`,
];
// 卒業の危機：パスへのひとこと
const PASS_NAG = {
  could1: ['今の、出せるネタありましたよね？', '今のところ、なんで黙ったんですか？', '出せたのに出さない。理由、あとで聞きます。', '温存ですか？ 今月にそんな余裕ありましたっけ。', '見送りましたね。上の人、首をかしげてました。'],
  none: ['出せるネタがないなら、作ってください。', '出せるネタがない…？ ネタ帳、あとで見せてください。', 'ネタ切れですか。それ、今月に起きていいことじゃないです。', '手札が弱いのは、交換で取られたからですよね。わかってます。でも。'],
  k2: ['パス続いてますね。もっと存在感出していきましょう。', '黙ってると、忘れられますよ。', '2回続けてパス。TLに名前が出てません。', '存在感、消えてます。何か出してください。', '沈黙は数字になりません。', 'ほかのメンバーは出してますよ。'],
  k3: v => [`何か投稿してください。同接${v}人まで落ちてます。`, '3回連続のパスです。配信、ちゃんとつけてます？', '3連続パス。「休止」と変わらないです。', `同接${v}人。この数字、上に報告したくないです。`, '3回黙りました。ファンがコメント欄で心配してます。'],
  k4: (v, k) => ['今月の結果しだいって言いましたよね？', 'このままだと、本当に卒業ですよ。', `同接${v}人…見ている人、減ってますよ。`, 'まだパスですか。', '正直、見ていてつらいです。', '何も出さない配信は、配信じゃないです。', `パス${k}回目。数えるのやめていいですか？`, '出せないなら、せめて反応してください。'],
};
// 卒業の危機：だれかが上がったとき
const FINISH_NAG = {
  safeTop: ['1位…！やればできるじゃないですか。来月もお願いしますよ。', '1位！ …最初からそれを出してください。', '覇権、取りましたね。危機のときだけ本気を出すの、やめてもらえます？', '上の人に「1位です」と送りました。返事は「来月も」でした。', 'おめでとうございます。はい、来月の話をしましょう。'],
  safeHigh: ['よく粘りました。今月はなんとか回避です。…来月はもっと余裕を持ってください。', '回避、確認しました。…心臓に悪いです。', 'ぎりぎりですね。来月は「ぎりぎり」をなくしましょう。', '上がりました。上の人には「問題なし」と報告しておきます。問題はありましたが。', '今月はセーフ。次の企画書、明日までにお願いします。'],
  safeLow: ['……ひとまず今月は、首の皮一枚つながりました。', '最下位は回避。…それで喜ばないでください。', '生き残りましたね。来月からが本番です。', '卒業の書類、引き出しに戻しておきます。', '最低限はクリアです。最低限、ですが。'],
  doomed: ['……そうですか。', '……わかりました。', '……上に報告します。', '……配信、最後までやりましょう。'],
  doomedMiyako: ['……覇権陥落、ですか。', '……都落ち。上の人の顔、想像できます。', '……そうですか。覇権だったのに。'],
  after: ['配信が終わったら、少しお時間いただけますか。', '配信のあと、会議室に来てください。', 'このあと少し、お話があります。', '終わったら、連絡ください。'],
  rivalMany: (name, left) => [`${name}さんが上がりました。卒業を避けられる枠は、残り${left}つです。`, `${name}さん、上がりました。枠、あと${left}つ。`, `${name}さんが抜けました。残り${left}枠です。急いでください。`, `${name}さんが先に上がりました。あと${left}つの枠、見えてます？`],
  rivalOne: name => [`${name}さんが上がりました。残りの枠は、あと1つだけです。`, `${name}さんが上がりました。次に上がれなければ卒業です。`, `${name}さん、上がり。枠はあと1つ。取ってください。`, `残り1枠。${name}さんの次は、あなたですよね？`, `${name}さんで埋まりかけてます。最後の1枠、絶対に。`],
  filled: name => [`……${name}さんで、枠が埋まりました。`, `……${name}さんが上がりました。枠はもうありません。`, `……${name}さん。これで、決まりました。`, `……枠、埋まりました。${name}さんでした。`],
};

// ================================================================
//  文言（覇権キープ：褒めながら「絶対に落とさないでください」）
// ================================================================
const PEAK_START = (n, miyako) => [
  `覇権${n}ヶ月連続、おめでとうございます。…ただ、今が頑張りどきです。絶対に落とさないでください。`,
  `${n}ヶ月連続の覇権。上の人がすごく喜んでます。だからこそ、今月落としたら目立ちます。`,
  '今が一番いい流れです。この流れ、絶対に切らさないでください。',
  miyako ? '覇権キープ中ですね。さすがです。…今月1位以外は、都落ちでオワコンです。わかってますよね？' : '覇権キープ中ですね。さすがです。…今月も1位以外は、覇権ではありません。',
  '連続覇権、箱の看板になりつつあります。期待は重いです。背負ってください。',
  '今月も覇権で頼みます。「も」です。もう当たり前になってます。',
  `${n}ヶ月連続。ここで落とすと、ずっと言われますよ。「あの月に落ちた」って。`,
  '勢いは資産です。今月でさらに積みましょう。落とす選択肢はありません。',
  miyako ? `${n}ヶ月守ってきた席です。今月1位を逃すと、一気に最下位まで落ちます。守ってください。` : `${n}ヶ月守ってきた席です。今月も守ってください。`,
];
const PEAK_MID = ['今月、上の人がタイムラインを見に来ています。いいところ、見せてください。', '来月の案件、今月の結果しだいで大きくなります。落とせませんね。', '覇権の配信は、箱全体の数字を引っ張ってます。責任、感じてください。', '他のメンバーが「追いつきたい」と言ってます。追いつかせないでください。', '今月の数字、来期の予算に直結します。…気負わず、でも落とさずに。'];
const PEAK_FAN = ['今月も覇権、期待してます！', '連続覇権いけるって信じてる', '覇権キープ、応援してます！', 'ずっと1位ですごい…今月も見てます', '今月落としたら泣く（冗談です。半分）', '箱の看板、今月も頼みます！'];
const PEAK_IDLE = ['覇権が手を止めてどうするんですか。', '迷う覇権は、覇権じゃないです。早く。', '上の人が見ています。手を動かしてください。', '覇権の間（ま）にしては長いです。', '考える時間が長いと、ファンが不安になりますよ。'];
const PEAK_FX = {
  eight: ['バズりましたね。覇権はこれが普通です。', 'さすがのバズです。…今月も落とさないでくださいね。', 'VIRAL。期待どおりです。期待以上をお願いします。'],
  rev: ['アルゴリズムを動かすのは覇権の特権です。乗りこなしてください。', '革命、いいですね。この波で今月も決めましょう。'],
  unrev: ['元に戻しましたね。覇権は安定が命です。正解です。'],
  spade3: ['論破、鮮やかです。でも覇権は敵を作らないでください。', '切り札潰し、見事です。恨まれない程度に。'],
  early: ['切り札をもう使うんですか？ 覇権なら温存しても勝てますよね？', '大ネタ、早いです。余裕があるのはわかります。わかりますが。', '今それを出すんですか。覇権の余裕、ですよね？'],
  leadWeak: ['その小ネタ、覇権の出だしとしては弱いです。', '覇権の投稿がそれだと、箱全体の数字が下がります。', '出だし、もっと派手に。見られてますよ。'],
  followWeak: ['ぎりぎりの上書き、覇権らしくないです。', '黙らせるくらい強く被せてください。覇権でしょう？'],
  multi: n => [`${n}枚まとめて。さすがの手数です。…この勢い、維持してください。`, '連投、覇権の余裕を感じます。油断の裏返しでなければ。'],
  strong: ['いいですね。でも覇権はこれが普通です。', 'さすがです。上も見てますよ。', 'その投稿、伸びてます。手を緩めないでください。', '完璧です。完璧を続けてください。', '覇権らしい投稿です。これを来月も、再来月も。', '伸びてますね。この勢い、絶対に維持してください。'],
  rival: (name, n) => [`${name}さんが残り${n}枚。覇権の座、狙われてますよ。`, `${name}さん、追い上げてます。1位、譲らないでください。`, `${name}さんが${n}枚。先に上がられたら、覇権は終わりです。`],
  last: (left, n) => [`あと${left}枚。覇権、決めてください。`, `残り${left}枚。ここで1位を取れば${n + 1}ヶ月連続です。`, `あと${left}枚。最後まで、覇権らしく。`],
  generic: t => [`「${t}」、覇権の投稿として恥ずかしくない内容ですね。…ですよね？`, `「${t}」。数字、あとで上に見せます。期待してます。`, `「${t}」…いいです。でも今月は、いいだけでは足りません。`,
    `「${t}」。覇権の名に恥じないよう、最後まで。`, `「${t}」、さすがです。この調子で、絶対に落とさないでください。`, `「${t}」。期待は裏切らないでくださいね。`, `「${t}」、いい流れです。今月も1位で締めましょう。`],
};
const PEAK_PASS = {
  k1: ['覇権がパスですか？ …余裕、ですよね？', '今の見送り、計算ですよね。ならいいです。', '出さないんですね。覇権の判断を信じます。信じますが。'],
  k2: ['パスが続いてます。覇権の沈黙は目立ちますよ。', '黙る覇権は、覇権じゃないです。', '2回連続で黙りました。ファンが「どうした？」ってコメントしてます。'],
  k3: v => ['3連続パス。都落ちの文字が頭をよぎります。', `同接${v}人。覇権の数字じゃないです。`, '覇権が3回黙るの、箱の空気が変わりますよ。'],
  k4: (v, k) => ['まだパスですか。1位、取れますか？', 'この沈黙、上の人にどう説明すれば…', '覇権を落としたら、来月は圧の種類が変わりますよ。', `パス${k}回。落とす覚悟、ありますか？`, `同接${v}人。看板の配信とは思えない数字です。`],
};
const PEAK_FINISH = {
  top: n => [`1位！ ${n}ヶ月連続です。…はい、来月の話をしましょう。`, `覇権キープ、お見事です。${n}ヶ月連続。もう「落とせない」理由が増えましたね。`, '1位、確認しました。上の人は「当然」と言ってます。', `${n}ヶ月連続。すごいです。本当にすごいです。だから来月も。`, '落としませんでしたね。次は「落とさないのが普通」です。'],
  lost: n => ['……覇権、落としましたね。', `${n}ヶ月続いた覇権、ここで途切れました。`, '……今月は2位以下ですか。上に報告します。', '落ちましたね。「なぜ」は、あとで聞きます。'],
  miyako: n => ['……覇権陥落。「絶対に落とさないで」と言いましたよね。', `……都落ち。${n}ヶ月の積み上げが、1ヶ月で。`, '……上の人、席を立ちました。', '……そうですか。来月、話をしましょう。'],
  rivalFirst: name => [`${name}さんに先を越されました。……覇権、落ちます。`, `1位、${name}さんです。連続覇権、ここまでです。`, `${name}さんが1位。……わかってましたよね。`],
};

// ================================================================
//  進行
// ================================================================
// 月の始め：見込みを計算して、運営・マネージャーの連絡を時間差で積む
function pressureMonthStart() {
  pressureReset();
  const h = playerHouse(dyn);
  if (!h || !game) return;
  const { dead, titles } = pressureOutlook();
  setDanger(dead, titles);
  Pressure.streak = h.poorStreak || 0;
  let k = 0;
  for (let j = h.history.length - 1; j >= 0 && h.history[j].delta < 0; j--) k++;
  Pressure.falling = k;
  Pressure.top = topStreakOf(h);
  const now = performance.now();
  const later = (ms, kind, text) => queueSay(now + ms, kind, text);
  if (Pressure.streak >= 2) {
    later(2200, 'company', pickOf(COMPANY_LINES[Math.min(4, Pressure.streak)]));
    Pressure.companyFollow = true;
  }
  const P = Pressure;
  if (P.on) {
    const pool = (P.level === 4 ? DANGER_START[4](P).concat(DANGER_START[2](P)) : P.level === 1 ? DANGER_START[1](P) : DANGER_START[2](P));
    later(P.streak >= 2 ? 5200 : 3200, 'micro', pickOf(pool));
    // 不安になったファンからも
    if (P.level >= 2 || P.streak >= 2) later(26000, 'fan', pickOf(FAN_WORRY));
  } else if (P.top >= 2) {
    P.peak = true;
    const miyako = !!(game.rules.miyakoOchi && game.prevRanking && game.prevRanking[0] === 0);
    later(3200, 'peak', pickOf(PEAK_START(P.top, miyako)));
    if (Math.random() < 0.6) later(24000 + Math.random() * 8000, 'peak', pickOf(PEAK_MID));
    later(40000 + Math.random() * 10000, 'fan', pickOf(PEAK_FAN));
  } else if (P.falling >= 2) {
    later(P.streak >= 2 ? 5200 : 3400, 'nag', pickOf(P.falling === 2 ? FALLING_START[2]() : FALLING_START[3](P.falling)));
  }
}
// 月の始めの「卒業の危機」の告知（初配信・時期の告知のあとに）
function pressureProclaim() {
  if (!Pressure.on) return Promise.resolve();
  return proclaim('卒業の危機', 'DANGER', { tone: 'red', sub: `今月、${esc(Pressure.line)}`, hold: 1800, sound: 'ominous' });
}

// 時間差で届く連絡（届く順に並べておく）
function queueSay(at, kind, text) {
  Pressure.queue.push({ at, kind, text });
  Pressure.queue.sort((a, b) => a.at - b.at);
}
function pressureSay(kind, text, force) {
  if (!text) return false;
  const now = performance.now();
  if (saidBefore(text) || (!force && now < Pressure.next)) return false;
  Pressure.said.add(sayKey(text));
  Pressure.next = now + (kind === 'micro' || kind === 'peak' ? 5200 : 9000) * Math.max(0.5, spd() || 1);
  if (kind === 'fan') pushNote(makeNote('dm', { text }));
  else pushNote(makeNote(kind, { text }));
  return true;
}
// 毎フレーム：積んだ連絡を届ける・手が止まっていたら口を出す・既読がつかなければ運営が念押し
function pressureTick(now) {
  if (!Pressure.queue.length && !Pressure.on && !Pressure.peak && !Pressure.companyFollow) return;
  if (!notifyActive()) return;
  if (Pressure.queue.length && now >= Pressure.queue[0].at) {
    const m = Pressure.queue.shift();
    if (m.kind === 'company') Pressure.companyAt = now;
    pressureSay(m.kind, m.text, true);
    return;
  }
  if (Pressure.companyFollow && Pressure.companyAt && now - Pressure.companyAt > 30000) {
    Pressure.companyFollow = false;
    if (!(Notify.seenAt > Pressure.companyAt)) pressureSay('company', pickOf(COMPANY_FOLLOW), true);
    return;
  }
  // 自分の番で長く手が止まっている（卒業の危機・覇権キープ）。2回まで
  const idleMs = [14000, 34000][Pressure.idleN];
  if (idleMs && UI.mode === 'play' && Pressure.turnAt && now - Pressure.turnAt > idleMs) {
    if (Pressure.on && !Pressure.giveUp) { Pressure.idleN++; pressureSay('micro', fresh(Pressure.idleN === 1 ? IDLE_1 : IDLE_2), true); }
    else if (Pressure.peak && !Pressure.peakOut) { Pressure.idleN++; pressureSay('peak', fresh(Pressure.idleN === 1 ? PEAK_IDLE : IDLE_2), true); }
  }
}
function pressureTurnStart(could) { Pressure.turnAt = performance.now(); Pressure.could = could; Pressure.idleN = 0; }
function pressureTurnEnd() { Pressure.turnAt = 0; }

// ---------- 投稿へのひとこと ----------
function pickWeighted2(c) {
  const f = c.filter(([, t]) => !saidBefore(t));
  if (f.length) c = f;
  let x = Math.random() * c.reduce((a, [w]) => a + w, 0);
  for (const [w, t] of c) { x -= w; if (x < 0) return t; }
  return c.length ? c[c.length - 1][1] : '';
}
// 投稿の様子（効果・強さ・残り枚数・ほかのメンバーとの差）
function postSignals(play, rev, eff, owner, lead) {
  const t = playTitle(play, owner);
  const top = playTopCard(play);
  const suit = top ? top.s : 4;
  const s = top ? postStrength(top.r, rev) : 13;
  const left = game.players[0].hand.length;
  const hasJ = play.cards.some(c => c.r === 16), has2 = play.cards.some(c => c.r === 15);
  const rivals = seats.map((h, k) => ({ h, k, n: game.players[k].hand.length })).filter(x => x.k && game.active[x.k]).sort((a, b) => a.n - b.n);
  const mine = Fol.month[owner.id] || 0;
  const best = seats.slice(1).filter(Boolean).map(h => ({ h, g: Fol.month[h.id] || 0 })).sort((a, b) => b.g - a.g)[0];
  return { t, top, suit, s, left, hasJ, has2, rival: rivals[0] || null, mine, best, lead, eff: eff || {} };
}
function microComment(play, rev, eff, owner, lead) {
  const S = postSignals(play, rev, eff, owner, lead);
  const { t, suit, s, left, hasJ, has2 } = S;
  eff = S.eff;
  const c = [];
  const add = (w, txt) => { if (txt) c.push([w, txt]); };
  if (eff.eightCut) add(6, fresh(NAG_FX.eight));
  if (eff.revolution === true) add(6, fresh(NAG_FX.rev));
  if (eff.revolution === false) add(6, fresh(NAG_FX.unrev));
  if (eff.spade3) add(6, fresh(NAG_FX.spade3));
  if (eff.lock) add(3, fresh(NAG_FX.lock));
  if (eff.elevenBack) add(3, fresh(NAG_FX.back));
  if (eff.rankLock) add(2, fresh(NAG_FX.series));
  if ((hasJ || (has2 && !rev)) && left >= 5) add(5, hasJ ? fresh(NAG_FX.joker) : fresh(NAG_FX.two(t)));
  if (lead && s <= 3) add(3, fresh(NAG_FX.leadWeak(t)));
  if (!lead && s <= 4 && !eff.eightCut) add(2, fresh(NAG_FX.followWeak));
  if (play.type === 'set' && play.n >= 2) add(2, fresh(NAG_FX.set(play.n)));
  if (play.type === 'seq') add(2, fresh(NAG_FX.seq(play.n)));
  if (Pressure.suits.length >= 2 && Pressure.suits.slice(-2).every(x => x === suit) && suit !== 4) add(4, fresh(NAG_FX.sameSuit(SNS_SUIT[suit].ja)));
  add(1.5, fresh(SUIT_NAG[suit](t)));
  add(2.5, fresh(TITLE_NAG(t)));
  if (S.rival && S.rival.n <= left - 2) add(2.5, fresh(NAG_FX.rivalCards(S.rival.h.name, S.rival.n)));
  if (S.best && S.best.g > S.mine * 1.5 && S.best.g > 20) add(2, fresh(NAG_FX.rivalFol(S.best.h.name, fmtCount(S.best.g))));
  if (left > 0 && left <= 2) add(3.5, fresh(NAG_FX.last(left)));
  if (s >= 10 && !hasJ && left >= 3) add(1.5, fresh(NAG_FX.strong));
  return pickWeighted2(c);
}
// 覇権キープ中のひとこと（褒めつつ圧）
function peakComment(play, rev, eff, owner, lead) {
  const S = postSignals(play, rev, eff, owner, lead);
  const { t, s, left, hasJ, has2 } = S;
  eff = S.eff;
  const c = [];
  const add = (w, txt) => { if (txt) c.push([w, txt]); };
  if (eff.eightCut) add(6, fresh(PEAK_FX.eight));
  if (eff.revolution === true) add(6, fresh(PEAK_FX.rev));
  if (eff.revolution === false) add(5, fresh(PEAK_FX.unrev));
  if (eff.spade3) add(6, fresh(PEAK_FX.spade3));
  if ((hasJ || (has2 && !rev)) && left >= 5) add(4, fresh(PEAK_FX.early));
  if (lead && s <= 3) add(3, fresh(PEAK_FX.leadWeak));
  if (!lead && s <= 4 && !eff.eightCut) add(2, fresh(PEAK_FX.followWeak));
  if (play.cards.length >= 2) add(2, fresh(PEAK_FX.multi(play.cards.length)));
  if (s >= 10 && !hasJ) add(3, fresh(PEAK_FX.strong));
  if (S.rival && S.rival.n <= Math.min(3, left - 1)) add(4, fresh(PEAK_FX.rival(S.rival.h.name, S.rival.n)));
  if (left > 0 && left <= 2) add(4, fresh(PEAK_FX.last(left, Pressure.top)));
  add(2, fresh(PEAK_FX.generic(t)));
  return pickWeighted2(c);
}
// あなたの投稿のあと（animPlay から）
function pressureOnPost(play, rev, eff, owner, lead) {
  Pressure.passRun = 0;
  Pressure.posts++;
  const top = playTopCard(play);
  if (Pressure.on && !Pressure.giveUp) {
    // 革命のボーナスで卒業ラインが動く
    if (eff.revolution !== undefined && ERA_DEFS[dyn.era.key].revBonus) {
      const was = Pressure.deadPos;
      const o = pressureOutlook();
      if (o.dead !== was) {
        setDanger(o.dead, o.titles);
        updateDangerBadge();
        Pressure.suits.push(top ? top.s : 4);
        pressureSay('micro', Pressure.on ? `革命のボーナスで勢い+${ERA_DEFS[dyn.era.key].revBonus}。卒業ラインが「${Pressure.line}」になりました。` : fresh(['革命のボーナスで、今月の卒業はひとまず回避です。…油断しないでください。', '革命で勢いが足りました。今月の卒業は消えました。…消えただけです。']), true);
        return;
      }
    }
    const P = [0, 0.5, 0.62, 0.72, 0.8][Pressure.level];
    const text = microComment(play, rev, eff, owner, lead);
    if (Pressure.posts === 1 || Math.random() < P) pressureSay('micro', text);
  } else if (Pressure.peak && !Pressure.peakOut) {
    const text = peakComment(play, rev, eff, owner, lead);
    if (Pressure.posts === 1 || Math.random() < 0.42) pressureSay('peak', text);
  } else if (!Pressure.on && Pressure.falling >= 2 && Pressure.nags < 2) {
    const s = top ? postStrength(top.r, rev) : 13;
    const t = playTitle(play, owner);
    let text = null;
    if (s <= 3 && Math.random() < 0.3) text = fresh(FALLING_WEAK(t));
    else if (s >= 10 && Math.random() < 0.25) text = fresh(FALLING_STRONG);
    if (text && pressureSay('nag', text)) Pressure.nags++;
  }
  Pressure.suits.push(top ? top.s : 4);
}
// あなたのパスのあと
function pressureOnPass() {
  Pressure.passRun++;
  const k = Pressure.passRun;
  const v = fmtCount(Math.max(0, Math.round(Me.view ? Me.view.v : 0)));
  if (Pressure.on && !Pressure.giveUp) {
    let opts = null;
    if (k === 1 && Pressure.could && Math.random() < 0.3) opts = PASS_NAG.could1;
    else if (k >= 2 && !Pressure.could && Math.random() < 0.45) opts = PASS_NAG.none;
    else if (k === 2) opts = PASS_NAG.k2;
    else if (k === 3) opts = PASS_NAG.k3(v);
    else if (k >= 4 && k % 2 === 0) opts = PASS_NAG.k4(v, k);
    const left = opts ? opts.filter(t => !saidBefore(t)) : [];
    if (left.length && pressureSay('micro', pickOf(left), k >= 2 && k <= 3) && opts === PASS_NAG.none) opts.forEach(t => Pressure.said.add(sayKey(t)));   // 「ネタがない」の話は月に1回
  } else if (Pressure.peak && !Pressure.peakOut) {
    let opts = null;
    if (k === 1 && Math.random() < 0.35) opts = PEAK_PASS.k1;
    else if (k === 2) opts = PEAK_PASS.k2;
    else if (k === 3) opts = PEAK_PASS.k3(v);
    else if (k >= 4 && k % 2 === 0) opts = PEAK_PASS.k4(v, k);
    if (opts) pressureSay('peak', fresh(opts), k >= 2 && k <= 3);
  } else if (!Pressure.on && Pressure.falling >= 2 && Pressure.nags < 2 && k === 3 && Math.random() < 0.6) {
    if (pressureSay('nag', fresh(FALLING_PASS))) Pressure.nags++;
  }
}
// だれかが上がった（あなた・ほかのメンバー）。都落ちで最下位になったときも
function pressureOnFinish(e, miyako) {
  if (!game) return;
  const P = Pressure;
  if (P.peak && !P.peakOut) {
    const name = seats[e.p] ? seats[e.p].name : '';
    if (e.p === 0) {
      P.peakOut = miyako ? 'miyako' : e.pos === 1 && !e.foul ? 'top' : 'lost';
      pressureSay('peak', fresh(P.peakOut === 'top' ? PEAK_FINISH.top(P.top + 1) : P.peakOut === 'miyako' ? PEAK_FINISH.miyako(P.top) : PEAK_FINISH.lost(P.top)), true);
      if (P.peakOut !== 'top') queueSay(performance.now() + 3600, 'peak', fresh(FINISH_NAG.after));
    } else if (game.active[0] && game.out.length === 1 && !(game.rules.miyakoOchi && game.prevRanking && game.prevRanking[0] === 0)) {
      // 先に1位を取られた（都落ちがあるときは、直後の覇権陥落で言う）
      P.peakOut = 'lost';
      pressureSay('peak', fresh(PEAK_FINISH.rivalFirst(name)), true);
    }
    return;
  }
  if (!P.on) return;
  if (e.p === 0) {
    const pos = e.pos - 1;     // 反則・都落ちは下から数えた順位で届く
    if (pos < P.deadPos) {
      P.outcome = 'safe';
      P.giveUp = false;
      updateDangerBadge();
      pressureSay('micro', fresh(pos === 0 ? FINISH_NAG.safeTop : P.level >= 2 ? FINISH_NAG.safeHigh : FINISH_NAG.safeLow), true);
    } else if (P.outcome !== 'doomed') {
      P.outcome = 'doomed';
      updateDangerBadge();
      pressureSay('micro', fresh(miyako ? FINISH_NAG.doomedMiyako : FINISH_NAG.doomed), true);
      queueSay(performance.now() + 3200, 'micro', fresh(FINISH_NAG.after));
    }
    return;
  }
  if (!game.active[0] || P.outcome) return;
  const left = P.deadPos - game.out.length;
  if (left === P.safeLeft) return;
  P.safeLeft = left;
  const name = seats[e.p] ? seats[e.p].name : '';
  if (left >= 2) { if (Math.random() < 0.6) pressureSay('micro', fresh(FINISH_NAG.rivalMany(name, left))); }
  else if (left === 1) pressureSay('micro', fresh(FINISH_NAG.rivalOne(name)), true);
  else {
    P.giveUp = true;
    P.outcome = 'doomed';
    updateDangerBadge();
    pressureSay('micro', fresh(FINISH_NAG.filled(name)), true);
    queueSay(performance.now() + 4200, 'micro', fresh(FINISH_NAG.after));
  }
}
// 自分の欄の「卒業危機」の印
function dangerBadgeHTML() {
  if (!Pressure.on && Pressure.outcome !== 'safe') return '';
  const t = Pressure.outcome === 'safe' ? 'セーフ' : Pressure.outcome === 'doomed' ? '卒業濃厚' : '卒業危機';
  return `<span class="warn-mark danger${Pressure.outcome === 'safe' ? ' safe' : ''}" id="meDanger" role="button" tabindex="0" title="今月、${esc(Pressure.line)}">${t}</span>`;
}
function updateDangerBadge() {
  const me = $('me');
  if (me) me.classList.toggle('danger', Pressure.on && Pressure.outcome !== 'safe');
  const old = $('meDanger');
  const html = dangerBadgeHTML();
  if (old) { if (html) old.outerHTML = html; else old.remove(); }
  else if (html) { const nm = document.querySelector('#meHouse .me-name'); if (nm) nm.insertAdjacentHTML('beforeend', html); }
}
// 月末の結果画面：来月、何位以下なら卒業か（前の月の覇権は都落ちで1位以外がオワコン）
function nextMonthDanger(me) {
  if (!me) return null;
  const o = powerOutlook(me, dyn, dyn.houses.length, 0);
  let dead = o.deadPos;
  if (dead < 0) return null;
  if (me.lastTitle === '大富豪' && settings.rules.miyakoOchi) dead = 1;
  return dangerWords(o.rows.map(r => r.title), dead);
}
// 月末の結果画面：覇権が続いているときの一言（来月の圧の予告）
function nextMonthPeak(me) {
  if (!me || me.lastTitle !== '大富豪') return null;
  const n = topStreakOf(me);
  if (n < 2) return null;
  return settings.rules.miyakoOchi ? `覇権${n}ヶ月連続。来月も1位でなければ都落ち（オワコン）です。マネージャーも見ています。` : `覇権${n}ヶ月連続。来月も落とさないように。マネージャーも見ています。`;
}
