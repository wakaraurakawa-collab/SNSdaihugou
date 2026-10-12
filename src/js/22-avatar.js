// ================================================================
//  ドット絵のアイコン（32×32）：髪型・目・小物・服の組み合わせと表情
//  表情：normal 平常 / curious 気になる / anxious 焦り / panic 狼狽 / smug 勝ち誇り / happy / sleep / cry
// ================================================================
const AV = 32;
const AVA_PAL = {
  skin: [ // 地・影・頬
    ['#ffe6d5', '#f2c3a8', '#ff9db0'],
    ['#fdd6bd', '#e8b192', '#ff92a5'],
    ['#f0c19e', '#d69a74', '#f48896'],
    ['#d8a07a', '#b67a56', '#e27a82'],
    ['#a9714f', '#84533a', '#d06a6c'],
  ],
  hair: [ // 地・影・艶
    ['#f8a9c9', '#d6729d', '#ffd9e9'],
    ['#f5d47c', '#cf9f45', '#fff1bb'],
    ['#383350', '#211d33', '#625c88'],
    ['#dadded', '#a7acc6', '#ffffff'],
    ['#71a4ff', '#4470d8', '#bcd6ff'],
    ['#7fe0c5', '#45b293', '#c8f8ea'],
    ['#ab8dfb', '#7a5bd8', '#dacdff'],
    ['#f3655f', '#c23e3c', '#ffb3aa'],
    ['#8c5b3d', '#613f29', '#bb8965'],
    ['#ffa052', '#d8702a', '#ffd3a3'],
    ['#4152a0', '#2a3670', '#7183cf'],
    ['#f5f3f9', '#cdc8de', '#ffffff'],
  ],
  eye: [ // 瞳・瞳の影
    ['#4f7dff', '#22409e'], ['#e8497f', '#8e1e48'], ['#2fbf80', '#156f49'], ['#9c6cff', '#5532a9'],
    ['#dc9c2c', '#875810'], ['#e34a4a', '#891e1e'], ['#3db5e8', '#1a6b93'], ['#6b5440', '#33271b'],
  ],
  outfit: [ // 地・影
    ['#ff60a9', '#c83c7f'], ['#4e8dff', '#2e5ec4'], ['#2b2f47', '#171a2c'], ['#f3f3f8', '#c8c9d8'],
    ['#38c98c', '#22905f'], ['#ffb449', '#d0852a'], ['#a66cff', '#7243cc'], ['#ff5b5b', '#c3393a'],
    ['#47c8e1', '#2a92a8'], ['#4b3c34', '#2d241e'],
  ],
  theme: ['#ff4fa3', '#4f8bff', '#ff5a4f', '#2fd08a', '#a96bff', '#ffab2e', '#22cde6', '#f2cf37'],
};
const INKC = '#1d1631';           // 輪郭
const AVA_STYLES = ['short', 'bob', 'long', 'twin', 'pony', 'spiky', 'side', 'bun', 'wavy'];
const AVA_ACCS = ['none', 'headphones', 'glasses', 'catears', 'clip', 'cap', 'ribbon', 'halo', 'beanie', 'horns', 'star'];
const AVA_OUTFITS = ['hoodie', 'shirt', 'sailor', 'jacket', 'tee'];
const pal = (arr, i) => arr[((i | 0) % arr.length + arr.length) % arr.length];
const themeColor = a => pal(AVA_PAL.theme, a ? a.th : 0);

// 顔の輪郭（行 → 左右の列）
const FACE_ROWS = { 8: [11, 20], 9: [10, 21], 10: [9, 22], 11: [9, 22], 12: [9, 22], 13: [9, 22], 14: [9, 22], 15: [9, 22], 16: [9, 22], 17: [9, 22], 18: [10, 21], 19: [10, 21], 20: [11, 20], 21: [12, 19], 22: [14, 17] };
const BODY_ROWS = { 24: [10, 21], 25: [7, 24], 26: [6, 25], 27: [5, 26], 28: [4, 27], 29: [4, 27], 30: [4, 27], 31: [4, 27] };
const inFace = (x, y) => { const r = FACE_ROWS[y]; return !!r && x >= r[0] && x <= r[1]; };

class PixGrid {
  constructor() { this.c = new Array(AV * AV).fill(null); this.tag = new Array(AV * AV).fill(''); this.fx = []; this.flushing = false; }
  ok(x, y) { return x >= 0 && y >= 0 && x < AV && y < AV; }
  set(x, y, col, tag) {
    if (!this.ok(x, y)) return;
    if (tag === 'fx' && this.fx && !this.flushing) { this.fx.push([x, y, col]); return; }
    const i = y * AV + x; this.c[i] = col; this.tag[i] = tag || '';
  }
  flushFx() { this.flushing = true; for (const [x, y, col] of this.fx || []) this.set(x, y, col, 'fx'); this.flushing = false; }
  get(x, y) { return this.ok(x, y) ? this.c[y * AV + x] : null; }
  tg(x, y) { return this.ok(x, y) ? this.tag[y * AV + x] : ''; }
  rect(x, y, w, h, col, tag) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col, tag); }
  // 文字列の型（'.' は透かす）を置く。key は文字→色
  stamp(x, y, rows, key, tag) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.' && key[ch]) this.set(x + i, y + j, key[ch], tag); } });
  }
}

// ---------- 髪型：前髪の下端（その列で顔が見え始める行） ----------
function bangsLine(st, x) {
  const zig = [12, 12, 11, 12, 13, 12, 11, 12, 13, 12, 11, 12, 12, 12];   // x=9..22
  const i = clamp(x - 9, 0, 13);
  switch (st) {
    case 'bob': return [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12][i] + (x === 15 || x === 16 ? -1 : 0);
    case 'spiky': return [12, 13, 11, 13, 14, 12, 10, 12, 14, 12, 11, 13, 12, 12][i];
    case 'side': return clamp(Math.round(9.6 + (x - 9) * 0.42), 10, 15) + (x >= 19 ? 1 : 0);
    case 'wavy': return [12, 12, 11, 11, 12, 13, 12, 11, 11, 12, 13, 12, 12, 12][i];
    default: return zig[i];
  }
}
// 髪の形（前・後ろ）を作る
function hairMasks(st) {
  const front = new Uint8Array(AV * AV), back = new Uint8Array(AV * AV);
  const F = (x, y) => { if (x >= 0 && y >= 0 && x < AV && y < AV) front[y * AV + x] = 1; };
  const B = (x, y) => { if (x >= 0 && y >= 0 && x < AV && y < AV) back[y * AV + x] = 1; };
  const cap = { rx: 9.2, ry: 7.9, cy: 11.6 };
  if (st === 'short' || st === 'spiky') { cap.rx = 8.9; cap.ry = 7.7; }
  if (st === 'bob' || st === 'wavy' || st === 'long') { cap.rx = 9.5; }
  for (let y = 0; y < 22; y++) for (let x = 0; x < AV; x++) {
    const inCap = ((x + 0.5 - 16) / cap.rx) ** 2 + ((y + 0.5 - cap.cy) / cap.ry) ** 2 <= 1;
    if (!inCap) continue;
    if (inFace(x, y) && y >= bangsLine(st, x)) continue;
    if (y > 14 && !inFace(x, y)) continue;          // 横は別に描く
    F(x, y);
  }
  // 横の髪（顔の両脇）：列ごとに長さを変えて毛先をとがらせる。cols は外→内、bottoms も同じ順
  const lock = (cols, bottoms, y0 = 11) => cols.forEach((x, i) => { for (let y = y0; y <= bottoms[i]; y++) F(x, y); });
  const pair = (bottoms, wide) => {
    const L = wide ? [7, 8, 9] : [8, 9], R = wide ? [24, 23, 22] : [23, 22];
    lock(L, bottoms); lock(R, bottoms);
  };
  switch (st) {
    case 'short': pair([14, 16]); break;
    case 'spiky': pair([15, 17]); break;
    case 'pony': case 'twin': pair([16, 18]); break;
    case 'bun': pair([17, 21]); break;
    case 'bob': pair([18, 20, 19], true); break;
    case 'side': lock([7, 8, 9], [16, 18, 17]); lock([24, 23, 22], [19, 21, 20]); break;
    case 'wavy': pair([24, 26, 25], true); for (let y = 13; y <= 24; y += 4) { F(6, y); F(6, y + 1); F(25, y + 2); F(25, y + 3); } break;
    default: pair([23, 25, 24], true);
  }
  if (st === 'spiky') {
    for (const [x0, h] of [[8, 3], [11, 5], [15, 6], [19, 5], [22, 3]]) for (let k = 0; k < h; k++) { F(x0 + (k > 1 ? 1 : 0), 6 - k); F(x0 + 1, 6 - k + 1); }
  }
  // 後ろ髪（肩の陰に隠れる。両脇だけ見える）
  const backShape = (y0, y1, wTop, flare, jag) => {
    for (let y = y0; y <= y1; y++) {
      const w = wTop + Math.max(0, y - y0 - 6) * flare;
      for (let x = Math.round(16 - w); x <= Math.round(15 + w); x++) {
        const end = y1 - ((x * 5 + 3) % jag);
        if (y <= end) B(x, y);
      }
    }
  };
  if (st === 'bob') backShape(11, 21, 9, 0.05, 2);
  if (st === 'long') backShape(10, 30, 9.5, 0.12, 3);
  if (st === 'wavy') backShape(10, 30, 9.8, 0.2, 3);
  if (st === 'side') backShape(11, 22, 9.2, 0.05, 2);
  if (st === 'twin') {
    for (const cx of [4, 27]) for (let y = 9; y <= 27; y++) {
      const t = (y - 9) / 18, w = t < 0.25 ? 1.3 + t * 7 : 3 - (t - 0.25) * 3.2;
      for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) B(x, y);
    }
  }
  if (st === 'pony') {
    for (let y = 5; y <= 24; y++) { const w = y < 10 ? 2.5 : 2.4 - (y - 10) * 0.13; const cx = y < 10 ? 25 : 26 + Math.sin((y - 10) / 4) * 0.8; for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) B(x, y); }
  }
  if (st === 'bun') {
    for (const [cx, cy] of [[8, 5], [24, 5]]) for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= 9.5) F(x, y);
  }
  return { front, back };
}

// ---------- 表情：目・眉・口 ----------
function drawFace(G, a, expr, sk, eye, hairC) {
  const K = INKC, I = eye[0], D = eye[1], W = '#ffffff', S = '#f4f6ff', M = '#b8404f', T = '#ff8aa0';
  const brow = hairC[1];
  const eyeAt = (x, rows, key) => G.stamp(x, 13, rows, Object.assign({ K, I, D, W, S, P: K }, key || {}), 'eye');
  const browAt = (pts) => { for (const [x, y] of pts) G.set(x, y, brow, 'brow'); };
  const blush = (n) => { const b = sk[2]; for (let i = 0; i < n; i++) { G.set(10 + i, 17, b, 'blush'); G.set(21 - i, 17, b, 'blush'); } };
  const sweat = (x, y) => { G.set(x, y, '#bfe9ff', 'fx'); G.set(x, y + 1, '#8fd3ff', 'fx'); G.set(x - 1, y + 1, '#d8f3ff', 'fx'); G.set(x, y + 2, '#5fb8f0', 'fx'); };
  const mouth = (rows, x0, y0) => G.stamp(x0, y0, rows, { K: '#6a2232', M, T, W: '#ffffff' }, 'mouth');
  switch (expr) {
    case 'curious':
      // 横目で様子をうかがう。眉が片方上がり、口はへの字、頭に「？」
      eyeAt(11, ['KKK', 'SSW', 'SSI', 'SKD']); eyeAt(18, ['KKK', 'SSW', 'SSI', 'SKD']);
      browAt([[11, 10], [12, 10], [13, 11], [18, 12], [19, 12], [20, 12]]);
      mouth(['.KK.', 'K..K'], 14, 19);
      G.stamp(24, 4, ['.QQ.', 'Q..Q', '...Q', '..Q.', '..Q.', '....', '..Q.'], { Q: '#ffe07a' }, 'fx');
      break;
    case 'anxious':
      eyeAt(11, ['.K.', 'KIK', 'IWI', 'DID']); eyeAt(18, ['.K.', 'KIK', 'IWI', 'DID']);
      browAt([[11, 12], [12, 11], [13, 11], [18, 11], [19, 11], [20, 12]]);
      mouth(['KKKK', 'WWWW', 'KKKK'], 14, 19);
      blush(3);
      sweat(24, 9);
      break;
    case 'panic':
      eyeAt(11, ['KKK', 'SPS', 'SSS', '.K.']); eyeAt(18, ['KKK', 'SPS', 'SSS', '.K.']);
      browAt([[10, 11], [11, 10], [12, 10], [19, 10], [20, 10], [21, 11]]);
      mouth(['.KK.', 'KMMK', 'KTTK', '.KK.'], 14, 18);
      sweat(24, 8); sweat(7, 11);
      // 青ざめる
      for (let y = 11; y <= 13; y++) for (let x = 9; x <= 22; x++) if (G.tg(x, y) === 'skin') G.set(x, y, '#c9d4f2', 'skin');
      break;
    case 'smug':
      eyeAt(11, ['...', '.K.', 'K.K']);
      eyeAt(18, ['...', 'KKK', 'III', 'DDD']);
      browAt([[11, 12], [12, 12], [13, 11], [18, 11], [19, 12], [20, 12]]);
      mouth(['...K', 'KKK.'], 14, 19);
      blush(2);
      // きらり
      G.stamp(24, 5, ['.Y.', 'YWY', '.Y.'], { Y: '#ffd84a', W: '#ffffff' }, 'fx');
      break;
    case 'happy':
      eyeAt(11, ['...', '.K.', 'K.K']); eyeAt(18, ['...', '.K.', 'K.K']);
      browAt([[11, 11], [12, 11], [19, 11], [20, 11]]);
      mouth(['KKKK', 'KMMK', '.KK.'], 14, 19);
      blush(2);
      break;
    case 'sleep':
      eyeAt(11, ['...', '...', 'KKK']); eyeAt(18, ['...', '...', 'KKK']);
      mouth(['K'], 16, 20);
      blush(2);
      G.stamp(23, 8, ['ZZ', '.Z', 'ZZ'], { Z: '#e3ebff' }, 'fx');
      G.stamp(25, 4, ['ZZ', '.Z', 'ZZ'], { Z: '#b8c8f8' }, 'fx');
      break;
    case 'cry':
      eyeAt(11, ['...', '.K.', 'K.K']); eyeAt(18, ['...', '.K.', 'K.K']);
      browAt([[11, 12], [12, 11], [13, 11], [18, 11], [19, 11], [20, 12]]);
      mouth(['KKKK', 'KMMK', '.KK.'], 14, 19);
      for (let y = 16; y <= 19; y++) { G.set(11, y, '#8fd8ff', 'fx'); G.set(20, y, '#8fd8ff', 'fx'); }
      G.set(11, 16, '#ffffff', 'fx'); G.set(20, 16, '#ffffff', 'fx');
      blush(2);
      break;
    default:
      eyeAt(11, ['KKK', 'WII', 'III', 'DID']); eyeAt(18, ['KKK', 'WII', 'III', 'DID']);
      G.set(10, 13, K, 'eye'); G.set(21, 13, K, 'eye');
      browAt([[11, 11], [12, 11], [13, 11], [18, 11], [19, 11], [20, 11]]);
      mouth(['K..K', '.KK.'], 14, 19);
      blush(2);
  }
}

// ---------- 小物 ----------
function drawAccessory(G, acc, a, hair, layer) {
  const th = themeColor(a);
  const dark = '#2a2f48', mid = '#4a5070';
  if (layer === 'back') {
    if (acc === 'catears') {
      for (const [x0, dir] of [[7, 1], [24, -1]]) for (let k = 0; k < 5; k++) for (let j = 0; j <= k; j++) G.set(x0 + dir * j, 2 + k, hair[0], 'hair');
      G.set(8, 5, '#ffb7cf', 'acc'); G.set(8, 6, '#ffb7cf', 'acc'); G.set(9, 6, '#ffb7cf', 'acc');
      G.set(23, 5, '#ffb7cf', 'acc'); G.set(23, 6, '#ffb7cf', 'acc'); G.set(22, 6, '#ffb7cf', 'acc');
    }
    if (acc === 'horns') {
      for (const [x, y] of [[9, 4], [9, 3], [10, 3], [10, 2], [22, 4], [22, 3], [21, 3], [21, 2]]) G.set(x, y, '#5a3d6e', 'acc');
      G.set(10, 2, '#9b7ab8', 'acc'); G.set(21, 2, '#9b7ab8', 'acc');
    }
    return;
  }
  switch (acc) {
    case 'headphones': {
      for (let x = 8; x <= 23; x++) {
        const t = (x + 0.5 - 16) / 9.6;
        const y = Math.round(11.6 - 8.9 * Math.sqrt(Math.max(0, 1 - t * t)));
        G.set(x, y, dark, 'acc');
        if (x > 10 && x < 21) G.set(x, y - 1, mid, 'acc');
      }
      G.rect(5, 12, 3, 7, dark, 'acc'); G.rect(24, 12, 3, 7, dark, 'acc');
      G.rect(6, 13, 1, 5, th, 'acc'); G.rect(25, 13, 1, 5, th, 'acc');
      break;
    }
    case 'glasses': {
      const f = '#2a2340';
      for (const x0 of [10, 17]) { for (let x = x0; x <= x0 + 4; x++) { G.set(x, 12, f, 'acc'); G.set(x, 17, f, 'acc'); } for (let y = 13; y <= 16; y++) { G.set(x0, y, f, 'acc'); G.set(x0 + 4, y, f, 'acc'); } }
      G.set(15, 14, f, 'acc'); G.set(16, 14, f, 'acc');
      G.set(11, 13, 'rgba(255,255,255,0.9)', 'acc'); G.set(18, 13, 'rgba(255,255,255,0.9)', 'acc');
      break;
    }
    case 'clip':
      G.set(20, 9, th, 'acc'); G.set(21, 9, th, 'acc'); G.set(22, 10, th, 'acc'); G.set(21, 8, '#ffffff', 'acc');
      break;
    case 'cap': {
      const sh = shade(th, 0.72);
      for (let y = 3; y <= 9; y++) for (let x = 7; x <= 24; x++) if (((x + 0.5 - 16) / 9.3) ** 2 + ((y + 0.5 - 10.5) / 7.4) ** 2 <= 1) G.set(x, y, y >= 8 ? sh : th, 'acc');
      for (let x = 4; x <= 17; x++) G.set(x, 10, sh, 'acc');
      for (let x = 5; x <= 15; x++) G.set(x, 11, shade(th, 0.5), 'acc');
      G.set(16, 5, '#ffffff', 'acc'); G.set(17, 5, '#ffffff', 'acc'); G.set(16, 6, '#ffffff', 'acc');
      break;
    }
    case 'ribbon': {
      const r = '#ff4f7f', rd = '#c42a5a';
      G.stamp(20, 3, ['RR...RR', 'RRR.RRR', 'RDRKRDR', 'RRR.RRR', 'RR...RR'], { R: r, D: rd, K: rd }, 'acc');
      break;
    }
    case 'halo':
      for (let x = 12; x <= 19; x++) { G.set(x, 0, '#ffe46b', 'acc'); G.set(x, 2, '#ffe46b', 'acc'); }
      G.set(11, 1, '#ffe46b', 'acc'); G.set(20, 1, '#ffe46b', 'acc');
      break;
    case 'beanie': {
      const sh = shade(th, 0.74);
      for (let y = 2; y <= 9; y++) for (let x = 7; x <= 24; x++) if (((x + 0.5 - 16) / 9.4) ** 2 + ((y + 0.5 - 10) / 7.6) ** 2 <= 1) G.set(x, y, (y >= 8) ? ((x % 2) ? sh : th) : th, 'acc');
      G.rect(15, 0, 2, 2, '#ffffff', 'acc');
      break;
    }
    case 'star':
      G.stamp(20, 7, ['.Y.', 'YWY', '.Y.'], { Y: '#ffd23f', W: '#fff8c8' }, 'acc');
      break;
  }
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function tint(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(c + (255 - c) * k);
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------- 服 ----------
function drawOutfit(G, a, sk) {
  const o = pal(AVA_PAL.outfit, a.oc), th = themeColor(a);
  const kind = pal(AVA_OUTFITS, a.of);
  for (const [y, [x0, x1]] of Object.entries(BODY_ROWS)) for (let x = x0; x <= x1; x++) G.set(x, +y, o[0], 'body');
  // 肩の影
  for (let y = 27; y <= 31; y++) { G.set(BODY_ROWS[y][0], y, o[1], 'body'); G.set(BODY_ROWS[y][1], y, o[1], 'body'); }
  // 首
  for (let y = 21; y <= 24; y++) for (let x = 14; x <= 17; x++) G.set(x, y, y <= 22 ? sk[1] : sk[0], 'neck');
  if (kind === 'hoodie') {
    for (const x of [10, 11, 12, 13, 18, 19, 20, 21]) G.set(x, 24, o[1], 'body');
    for (const x of [8, 9, 22, 23]) G.set(x, 25, o[1], 'body');
    for (let y = 25; y <= 28; y++) { G.set(14, y, '#f4f4fa', 'body'); G.set(17, y, '#f4f4fa', 'body'); }
  } else if (kind === 'shirt') {
    G.stamp(11, 24, ['WWW....WWW', '.WWW..WWW.', '..WT..TW..'], { W: '#fbfbff', T: th }, 'body');
    for (let y = 27; y <= 31; y++) { G.set(15, y, th, 'body'); G.set(16, y, th, 'body'); }
  } else if (kind === 'sailor') {
    for (let y = 24; y <= 27; y++) for (let x = BODY_ROWS[y][0] + 1; x <= BODY_ROWS[y][1] - 1; x++) if (x < 14 || x > 17) G.set(x, y, '#2c3768', 'body');
    for (let x = 7; x <= 24; x++) if (x < 14 || x > 17) G.set(x, 27, '#ffffff', 'body');
    G.stamp(13, 26, ['RRRRRR', '.RRRR.', '..RR..'], { R: '#e8384f' }, 'body');
  } else if (kind === 'jacket') {
    for (let y = 24; y <= 31; y++) for (let x = 13; x <= 18; x++) G.set(x, y, '#f2f2f7', 'body');
    for (let y = 25; y <= 31; y++) { G.set(12, y, o[1], 'body'); G.set(19, y, o[1], 'body'); }
    G.set(15, 28, th, 'body'); G.set(16, 28, th, 'body');
  } else {
    G.stamp(14, 27, ['.S.', 'SSS', '.S.'], { S: th === o[0] ? '#ffffff' : th }, 'body');
  }
}

// ---------- 組み立て ----------
function buildAvatarGrid(a, expr) {
  const G = new PixGrid();
  const sk = pal(AVA_PAL.skin, a.sk), hair = pal(AVA_PAL.hair, a.hc), eye = pal(AVA_PAL.eye, a.ey);
  const st = pal(AVA_STYLES, a.st), acc = pal(AVA_ACCS, a.ac);
  const { front, back } = hairMasks(st);
  // 後ろ髪
  for (let i = 0; i < AV * AV; i++) if (back[i]) G.set(i % AV, Math.floor(i / AV), hair[1], 'hairB');
  drawAccessory(G, acc, a, hair, 'back');
  drawOutfit(G, a, sk);
  // 顔
  for (const [y, [x0, x1]] of Object.entries(FACE_ROWS)) for (let x = x0; x <= x1; x++) G.set(x, +y, sk[0], 'skin');
  for (let y = 18; y <= 21; y++) { const r = FACE_ROWS[y]; G.set(r[0], y, sk[1], 'skin'); G.set(r[1], y, sk[1], 'skin'); }
  drawFace(G, a, expr, sk, eye, hair);
  if (acc === 'glasses') drawAccessory(G, acc, a, hair, 'front');
  // 前髪・横の髪
  for (let i = 0; i < AV * AV; i++) if (front[i]) G.set(i % AV, Math.floor(i / AV), hair[0], 'hair');
  // 前髪の下端と横の内側を影色に
  for (let y = 0; y < AV; y++) for (let x = 0; x < AV; x++) {
    if (G.tg(x, y) !== 'hair') continue;
    const below = G.tg(x, y + 1);
    if (below === 'skin' || below === 'eye' || below === 'brow' || below === 'blush') G.set(x, y, hair[1], 'hair');
    else if ((x <= 9 || x >= 22) && y >= 12 && (G.tg(x + (x <= 9 ? 1 : -1), y) === 'skin')) G.set(x, y, hair[1], 'hair');
  }
  // 艶（天使の輪）
  const hl = st === 'spiky' ? [[11, 6], [12, 6], [13, 7], [18, 6], [19, 6]] : [[11, 6], [12, 6], [13, 6], [14, 7], [18, 7], [19, 6], [20, 6]];
  for (const [x, y] of hl) if (G.tg(x, y) === 'hair') G.set(x, y, hair[2], 'hair');
  if (acc !== 'glasses' && acc !== 'none') drawAccessory(G, acc, a, hair, 'front');
  // 輪郭
  const out = [];
  for (let y = 0; y < AV; y++) for (let x = 0; x < AV; x++) {
    if (G.get(x, y)) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const t = G.tg(x + dx, y + dy); return t && t !== 'fx'; });
    if (n) out.push([x, y]);
  }
  for (const [x, y] of out) G.set(x, y, INKC, 'line');
  G.flushFx();
  return G;
}

const AvaCache = new Map();
function avaKey(a, expr) { return [a.st, a.hc, a.sk, a.ey, a.ac, a.of, a.oc, a.th].join('.') + ':' + (expr || 'normal'); }
// 32×32 の透明なキャンバス
// 丸いアイコンは顔に寄せて切り抜く（表情が見えるように）。全身の絵は札の写真などに使う
const FACE_CROP = { x: 5, y: 4, s: 22 };
function avatarCanvas(a, expr, crop) {
  const k = avaKey(a, expr) + (crop ? '#c' : '');
  let c = AvaCache.get(k);
  if (c) return c;
  if (crop) {
    c = document.createElement('canvas'); c.width = c.height = FACE_CROP.s;
    c.getContext('2d').drawImage(avatarCanvas(a, expr), -FACE_CROP.x, -FACE_CROP.y);
    AvaCache.set(k, c);
    return c;
  }
  const G = buildAvatarGrid(a, expr || 'normal');
  c = document.createElement('canvas'); c.width = AV; c.height = AV;
  const ctx = c.getContext('2d');
  for (let y = 0; y < AV; y++) for (let x = 0; x < AV; x++) { const col = G.get(x, y); if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); } }
  AvaCache.set(k, c);
  return c;
}
const AvaURL = new Map();
function avatarURL(a, expr, full) {
  const k = avaKey(a, expr) + (full ? '#f' : '#c');
  let u = AvaURL.get(k);
  if (!u) { u = avatarCanvas(a, expr, !full).toDataURL('image/png'); AvaURL.set(k, u); }
  return u;
}
// 丸いアイコン（背景はテーマ色）を ctx の (x, y) に size で描く
function drawAvatarIcon(ctx, a, expr, x, y, size, o = {}) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.closePath();
  if (o.ring) { ctx.lineWidth = o.ring; ctx.strokeStyle = o.ringColor || '#ffffff'; ctx.stroke(); }
  ctx.clip();
  const th = themeColor(a);
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, tint(th, 0.35)); g.addColorStop(1, th);
  ctx.fillStyle = o.bg || g;
  ctx.fillRect(x, y, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(avatarCanvas(a, expr, true), x, y, size, size);
  ctx.restore();
}
