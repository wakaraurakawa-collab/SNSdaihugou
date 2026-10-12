// ================================================================
//  描画：SNS の投稿カード・カードの裏・小物の札面（キャンバスで描いて画像にする）
// ================================================================
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rectPath(x, y, w, h, r) {
  const p = new Path2D();
  r = Math.min(r || 0, w / 2, h / 2);
  if (r > 0) {
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r);
    p.closePath();
  } else p.rect(x, y, w, h);
  return p;
}
const FONT_UI = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
const FONT_DISPLAY = '"Dela Gothic One", "M PLUS Rounded 1c", "Hiragino Sans", sans-serif';
const FONT_PIXEL = '"DotGothic16", "M PLUS Rounded 1c", monospace';
const fnt = (w, px, fam) => `${w} ${px}px ${fam || FONT_UI}`;

// ---------- 文字 ----------
const NO_LINE_START = '、。，．！？!?」』）)ー…・ぁぃぅぇぉっゃゅょァィゥェォッャュョ';
function wrapJa(ctx, text, maxW) {
  const lines = [];
  let cur = '';
  for (const ch of [...text]) {
    const t = cur + ch;
    if (cur && ctx.measureText(t).width > maxW && !NO_LINE_START.includes(ch)) { lines.push(cur); cur = ch; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
// 文節で折り返す：助詞や句読点のあとで切り、語の途中や送り仮名の前では切らない
const PARTICLES = 'のをにがはでともへやかよねり';
function charClass(ch) {
  if (/[\u3040-\u309f]/.test(ch)) return 'h';
  if (/[\u30a0-\u30ff]/.test(ch)) return 'k';
  if (/[\u4e00-\u9fff々]/.test(ch)) return 'K';
  if (/[A-Za-z0-9]/.test(ch)) return 'a';
  return 'p';
}
function breakCost(ch, i) {
  const a = ch[i - 1], b = ch[i];
  if (NO_LINE_START.includes(b) || '「『（(【'.includes(a)) return Infinity;
  if ('、。，！？!?」』）)】'.includes(a)) return 0;
  const ca = charClass(a), cb = charClass(b);
  if ((a === 'お' || a === 'ご') && cb === 'K') return 8;
  if (ca === 'a' && cb === 'a') return Infinity;
  if (ca === 'h' && PARTICLES.includes(a) && cb !== 'h') return 1;
  if (ca === 'h' && cb !== 'h') return 2;
  if (ca !== 'h' && cb === 'h') return 7;
  if (ca === cb) return ca === 'h' ? 5 : 9;
  return 3;
}
function bestSplit(ctx, ch, maxW, nLines) {
  const n = ch.length;
  const width = (a, b) => ctx.measureText(ch.slice(a, b).join('')).width;
  let best = null;
  const tryCuts = cuts => {
    const bounds = [0, ...cuts, n];
    let cost = 0, wmax = 0, wmin = Infinity;
    for (let k = 0; k < bounds.length - 1; k++) {
      const w = width(bounds[k], bounds[k + 1]);
      if (w > maxW) return;
      wmax = Math.max(wmax, w); wmin = Math.min(wmin, w);
    }
    for (const c of cuts) cost += breakCost(ch, c);
    if (!isFinite(cost)) return;
    cost += (wmax - wmin) / maxW * 2.5;
    if (!best || cost < best.cost) best = { cost, cuts };
  };
  if (nLines === 2) for (let i = 1; i < n; i++) tryCuts([i]);
  else if (nLines === 3) for (let i = 1; i < n - 1; i++) for (let j = i + 1; j < n; j++) tryCuts([i, j]);
  return best;
}
function fitLines(ctx, text, maxW, maxLines, w, sizes, fam) {
  const ch = [...text];
  let fallback = null;
  for (const px of sizes) {
    ctx.font = fnt(w, px, fam);
    if (ctx.measureText(text).width <= maxW) return { lines: [text], px };
    for (let nl = 2; nl <= maxLines; nl++) {
      const b = bestSplit(ctx, ch, maxW, nl);
      if (!b) continue;
      const bounds = [0, ...b.cuts, ch.length];
      const lines = bounds.slice(0, -1).map((a, k) => ch.slice(a, bounds[k + 1]).join(''));
      if (b.cost <= 3.2 * (nl - 1)) return { lines, px };
      if (!fallback || b.cost < fallback.cost) fallback = { cost: b.cost, lines, px };
      break;
    }
  }
  if (fallback) { ctx.font = fnt(w, fallback.px, fam); return fallback; }
  const px = sizes[sizes.length - 1];
  ctx.font = fnt(w, px, fam);
  const lines = wrapJa(ctx, text, maxW).slice(0, maxLines);
  lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
  return { lines, px };
}
function textFit(ctx, text, x, y, maxW, align) {
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -1);
  if (t !== text) t = t.slice(0, -1) + '…';
  ctx.textAlign = align || 'left';
  ctx.fillText(t, x, y);
  return ctx.measureText(t).width;
}

// ---------- 小さな記号 ----------
const Icon = {
  heart(ctx, x, y, s, fill, stroke) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const p = new Path2D(SUIT_D[1]);
    if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
    if (stroke) { ctx.lineWidth = 0.11; ctx.strokeStyle = stroke; ctx.stroke(p); }
    ctx.restore();
  },
  bubble(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = 0.12; ctx.strokeStyle = col; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-0.38, 0.32); ctx.lineTo(-0.3, 0.12); ctx.arc(0, -0.04, 0.42, Math.PI * 0.82, Math.PI * 2.62); ctx.closePath(); ctx.stroke();
    ctx.restore();
  },
  bookmark(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = 0.12; ctx.strokeStyle = col; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-0.3, -0.45); ctx.lineTo(0.3, -0.45); ctx.lineTo(0.3, 0.45); ctx.lineTo(0, 0.2); ctx.lineTo(-0.3, 0.45); ctx.closePath(); ctx.stroke();
    ctx.restore();
  },
  loop(ctx, x, y, s, col) {          // 共有しなおす（ぐるりと回る矢印）
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = 0.12; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 0.36, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 0.36, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    for (const a of [Math.PI * 1.9, Math.PI * 0.9]) {
      const px = Math.cos(a) * 0.36, py = Math.sin(a) * 0.36, tx = -Math.sin(a), ty = Math.cos(a);
      ctx.beginPath(); ctx.moveTo(px + tx * 0.2, py + ty * 0.2); ctx.lineTo(px + Math.cos(a) * 0.15, py + Math.sin(a) * 0.15); ctx.lineTo(px - Math.cos(a) * 0.15, py - Math.sin(a) * 0.15); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
  share(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineWidth = 0.12; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0.12); ctx.lineTo(0, -0.42); ctx.moveTo(-0.18, -0.24); ctx.lineTo(0, -0.42); ctx.lineTo(0.18, -0.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.3, -0.05); ctx.lineTo(-0.36, -0.05); ctx.lineTo(-0.36, 0.4); ctx.lineTo(0.36, 0.4); ctx.lineTo(0.36, -0.05); ctx.lineTo(0.3, -0.05); ctx.stroke();
    ctx.restore();
  },
  bars(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.fillRect(-0.36, 0.05, 0.16, 0.35); ctx.fillRect(-0.08, -0.2, 0.16, 0.6); ctx.fillRect(0.2, -0.4, 0.16, 0.8);
    ctx.restore();
  },
  bell(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-0.36, 0.25); ctx.quadraticCurveTo(-0.26, 0.1, -0.26, -0.08); ctx.arc(0, -0.08, 0.26, Math.PI, 0); ctx.quadraticCurveTo(0.26, 0.1, 0.36, 0.25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.33, 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  check(ctx, x, y, r, col) {
    ctx.save();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.32; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.35); ctx.stroke();
    ctx.restore();
  },
  person(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -0.2, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0.45, 0.4, Math.PI, 0); ctx.fill();
    ctx.restore();
  },
  sparkle(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.22 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
};
function pill(ctx, x, y, w, h, fill, stroke) {
  const p = rectPath(x, y, w, h, h / 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(p); }
}
function ownerOf(o) { return o && o.ava ? o : NOBODY; }

// ================================================================
//  投稿カード（260×364）
// ================================================================
const TEX_CW = 260, TEX_CH = 364;
const CARD_CORNER = 18;
const TAB = { x: 6, y: 6, w: 52, h: 90 };
// 右下の数字の札がかぶる範囲より左に文字を収める
const SAFE_R = 196, SAFE_Y = 266;

function paintCardFace(card, owner, out) {
  const c = out || mkCanvas(TEX_CW, TEX_CH), ctx = c.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, TEX_CW, TEX_CH);
  ctx.textBaseline = 'alphabetic';
  const o = ownerOf(owner);
  if (card.r === 16) { paintJokerCard(ctx, card, o); return c; }
  const S = SNS_SUIT[card.s];
  const m = faceMeta(card, o);      // 持ち主の段階（規模）と箱の時期で決まる文面・数字
  paintFrame(ctx, S, m.i);
  if (card.s === 1) paintPhotoPost(ctx, card, S, m, o);
  else if (card.s === 0) paintTextPost(ctx, card, S, m, o);
  else if (card.s === 2) paintNewsPost(ctx, card, S, m, o);
  else paintLivePost(ctx, card, S, m, o);
  paintSpecialBadge(ctx, card, S);
  paintIndex(ctx, card, S);
  return c;
}

function paintFrame(ctx, S, i) {
  const W = TEX_CW, H = TEX_CH;
  ctx.fillStyle = '#0c1024';
  ctx.fillRect(0, 0, W, H);
  // ネオンの縁
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, S.c2); g.addColorStop(0.5, S.c); g.addColorStop(1, S.c2);
  ctx.save();
  ctx.shadowColor = S.c; ctx.shadowBlur = 10 + i * 0.8;
  ctx.strokeStyle = g; ctx.lineWidth = 5 + (i >= 9 ? 1.5 : 0);
  ctx.stroke(rectPath(5, 5, W - 10, H - 10, CARD_CORNER - 4));
  ctx.restore();
  ctx.fillStyle = S.bg;
  ctx.fill(rectPath(9, 9, W - 18, H - 18, CARD_CORNER - 7));
  // 大きな話題ほど縁がきらめく
  if (i >= 9) {
    const gold = i >= 11 ? '#ffd84d' : '#ffffff';
    for (const [x, y] of [[W - 14, 14], [14, H - 14], [W - 22, H / 2], [22, H / 2 - 40]]) Icon.sparkle(ctx, x, y, i >= 11 ? 7 : 5, gold);
  }
}

// 左上と右下の数字の札
function paintIndex(ctx, card, S) {
  const draw = () => {
    const { x, y, w, h } = TAB;
    ctx.save();
    ctx.shadowColor = 'rgba(10,14,40,0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fill(rectPath(x, y, w, h, 12));
    ctx.restore();
    ctx.lineWidth = 2.4; ctx.strokeStyle = S.c;
    ctx.stroke(rectPath(x + 1.2, y + 1.2, w - 2.4, h - 2.4, 11));
    const t = RANK_TXT[card.r];
    ctx.fillStyle = S.deep;
    ctx.textAlign = 'center';
    ctx.font = fnt(400, t.length > 1 ? 31 : 40, FONT_DISPLAY);
    if (t.length > 1) { ctx.save(); ctx.translate(x + w / 2, y + 44); ctx.scale(0.86, 1); ctx.fillText(t, 0, 0); ctx.restore(); }
    else ctx.fillText(t, x + w / 2, y + 46);
    drawSuit(ctx, card.s, x + w / 2, y + 69, 30, S.c);
  };
  draw();
  ctx.save();
  ctx.translate(TEX_CW, TEX_CH); ctx.rotate(Math.PI);
  draw();
  ctx.restore();
}

function header(ctx, o, S, m, x, y, o2 = {}) {
  drawAvatarIcon(ctx, o.ava, 'normal', x, y, 30, { ring: 2.2, ringColor: S.c });
  ctx.fillStyle = '#141a33';
  ctx.font = fnt(800, 13.5);
  const nw = textFit(ctx, o.name, x + 37, y + 13, o2.nameW || 104);
  if (o2.verified !== false) Icon.check(ctx, x + 37 + nw + 8, y + 9, 5.6, S.c);
  ctx.fillStyle = '#7a819c';
  ctx.font = fnt(500, 10.5);
  textFit(ctx, o2.sub || o.handle, x + 37, y + 27, o2.subW || 110);
}

// ---------- ♥ 共感：写真の投稿 ----------
function sceneBokeh(ctx, x, y, w, h, colA, colB, rnd, n) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, colA); g.addColorStop(1, colB);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let k = 0; k < n; k++) {
    const r = 6 + rnd() * 16;
    ctx.globalAlpha = 0.14 + rnd() * 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function paintPhotoPost(ctx, card, S, m, o) {
  const rnd = mulberry32(card.id * 31 + 5);
  header(ctx, o, S, m, 64, 15, { sub: m.time });
  ctx.fillStyle = '#9aa0b8'; ctx.font = fnt(800, 14); ctx.textAlign = 'center'; ctx.fillText('…', 238, 30);
  // 写真
  const px = 14, py = 54, pw = 232, ph = 168;
  ctx.save();
  ctx.clip(rectPath(px, py, pw, ph, 10));
  const hues = [['#ffd1e6', '#ffb3c9'], ['#ffe2cc', '#ffc4d8'], ['#e6dcff', '#ffc9e4'], ['#d7f0ff', '#ffd3ec'], ['#fff0c4', '#ffc2dc']];
  const [a, b] = hues[Math.floor(m.hue * hues.length)];
  sceneBokeh(ctx, px, py, pw, ph, a, b, rnd, 9 + m.i);
  // 窓の光
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
  ctx.fillRect(px + pw - 70, py + 16, 46, 60); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(px + pw - 48, py + 16, 3, 60); ctx.fillRect(px + pw - 70, py + 44, 46, 3);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(avatarCanvas(o.ava, m.expr), px + pw / 2 - 64 + 8, py + ph - 128, 128, 128);
  // 大きな話題ほどハートが舞う
  for (let k = 0; k < 2 + Math.floor(m.i / 2); k++) Icon.heart(ctx, px + 20 + rnd() * (pw - 40), py + 20 + rnd() * (ph - 60), 9 + rnd() * 8, 'rgba(255,79,163,0.75)');
  ctx.restore();
  // 反応
  Icon.heart(ctx, 25, 241, 17, S.c);
  ctx.fillStyle = '#141a33'; ctx.font = fnt(800, 12.5); ctx.textAlign = 'left';
  ctx.fillText(fmtCount(m.buzz), 38, 246);
  Icon.bubble(ctx, 108, 240, 16, '#3b4160');
  ctx.fillText(fmtCount(m.buzz * 0.032 + 3), 121, 246);
  Icon.bookmark(ctx, 186, 240, 15, '#3b4160');
  // 本文
  ctx.fillStyle = '#141a33';
  const t = fitLines(ctx, m.title, SAFE_R - 16, 2, 800, [15, 14, 13, 12]);
  t.lines.forEach((l, k) => { ctx.textAlign = 'left'; ctx.fillText(l, 16, 272 + k * (t.px + 4)); });
  ctx.fillStyle = '#2f6fe6'; ctx.font = fnt(700, 11.5);
  textFit(ctx, m.tags.join(' '), 16, 326, SAFE_R - 16);
}

// ---------- ♠ トーク：短文の投稿 ----------
function paintTextPost(ctx, card, S, m, o) {
  header(ctx, o, S, m, 64, 15, { subW: 70 });
  pill(ctx, 192, 32, 54, 18, '#141a33');
  ctx.fillStyle = '#fff'; ctx.font = fnt(800, 9.5); ctx.textAlign = 'center'; ctx.fillText('フォロー', 219, 44.5);
  // 話題の印
  ctx.textAlign = 'left';
  pill(ctx, 64, 60, specialLabel(card) ? 104 : 182, 22, S.soft);
  Icon.bars(ctx, 77, 71, 11, S.deep);
  ctx.fillStyle = S.deep; ctx.font = fnt(800, 11);
  ctx.fillText(textPostLabel(m.i, m.stage), 88, 75.5);
  // 本文
  ctx.fillStyle = '#141a33';
  const t = fitLines(ctx, m.title, 226, 3, 800, [19, 17, 16, 15, 14]);
  t.lines.forEach((l, k) => ctx.fillText(l, 16, 118 + k * (t.px + 6)));
  const yTags = 118 + t.lines.length * (t.px + 6) + 2;
  ctx.fillStyle = '#2f6fe6'; ctx.font = fnt(700, 11.5);
  textFit(ctx, m.tags.join(' '), 16, Math.min(yTags, 198), 226);
  // 引用
  const qy = 208;
  ctx.strokeStyle = '#cfd6ea'; ctx.lineWidth = 1.3;
  ctx.stroke(rectPath(14, qy, 232, 52, 10));
  const q = m.quoteBy;
  drawAvatarIcon(ctx, q.ava, 'normal', 22, qy + 7, 17);
  ctx.fillStyle = '#141a33'; ctx.font = fnt(800, 10.5); ctx.textAlign = 'left';
  const qw = textFit(ctx, q.name, 44, qy + 19, 60);
  ctx.fillStyle = '#7a819c'; ctx.font = fnt(500, 9.5);
  textFit(ctx, q.handle + ' · 1日前', 50 + qw, qy + 19, 140 - qw);
  ctx.fillStyle = '#2a3150'; ctx.font = fnt(700, 11.5);
  textFit(ctx, m.quote, 22, qy + 41, 214);
  // 数
  const sy = 284;
  ctx.font = fnt(700, 10.5); ctx.fillStyle = '#5c637e';
  Icon.bubble(ctx, 21, sy - 4, 12, '#5c637e'); ctx.fillText(fmtCount(m.buzz * 0.05 + 2), 30, sy);
  Icon.loop(ctx, 82, sy - 4, 13, '#18a76a'); ctx.fillStyle = '#18a76a'; ctx.fillText(fmtCount(m.buzz * 0.21 + 1), 91, sy);
  Icon.heart(ctx, 143, sy - 4, 12, '#ff4fa3'); ctx.fillStyle = '#e23b8b'; ctx.fillText(fmtCount(m.buzz), 151, sy);
  ctx.strokeStyle = '#e1e6f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14, 300); ctx.lineTo(SAFE_R, 300); ctx.stroke();
  Icon.bars(ctx, 21, 320, 11, '#8a90a8');
  ctx.fillStyle = '#8a90a8'; ctx.font = fnt(700, 10.5); ctx.fillText(fmtCount(m.buzz * 38) + ' 表示', 30, 324);
  Icon.share(ctx, 150, 319, 13, '#8a90a8');
  Icon.bookmark(ctx, 176, 319, 12, '#8a90a8');
}

// ---------- ♦ 告知：告知画像 ----------
function rays(ctx, cx, cy, n, r, col, rot) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || 0); ctx.fillStyle = col;
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2, d = Math.PI / n * 0.55;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - d) * r, Math.sin(a - d) * r); ctx.lineTo(Math.cos(a + d) * r, Math.sin(a + d) * r); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function paintNewsPost(ctx, card, S, m, o) {
  const rnd = mulberry32(card.id * 17 + 3);
  // 見出しの帯
  const badge = NEWS_BADGE(m.i, m.stage);
  ctx.font = fnt(800, 12);
  const bw = Math.min(128, ctx.measureText(badge).width + 26);
  pill(ctx, 64, 17, bw, 24, S.c);
  Icon.bell(ctx, 76, 29, 12, '#fff');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(badge, 85, 33.5);
  ctx.fillStyle = '#8a90a8'; ctx.font = fnt(600, 10.5); ctx.textAlign = 'right';
  ctx.fillText(m.time, 244, 33);
  // 告知画像
  const px = 14, py = 50, pw = 232, ph = 160;
  ctx.save();
  ctx.clip(rectPath(px, py, pw, ph, 10));
  const big = m.i >= 9;
  const g = ctx.createRadialGradient(px + pw * 0.65, py + ph * 0.55, 10, px + pw * 0.6, py + ph * 0.5, pw * 0.75);
  g.addColorStop(0, big ? '#ffcf5a' : '#ff8a5c'); g.addColorStop(0.5, big ? '#ff4a3a' : '#e8402f'); g.addColorStop(1, '#5b0b1a');
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  rays(ctx, px + pw * 0.66, py + ph * 0.55, 18, pw, big ? 'rgba(255,240,180,0.22)' : 'rgba(255,220,200,0.14)', m.hue);
  // 紙吹雪
  for (let k = 0; k < 10 + m.i * 2; k++) {
    ctx.fillStyle = ['#ffe066', '#ffffff', '#ff9ec8', '#7cc8ff'][k % 4];
    ctx.globalAlpha = 0.7; ctx.fillRect(px + rnd() * pw, py + rnd() * ph, 3 + rnd() * 3, 2 + rnd() * 2);
  }
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(avatarCanvas(o.ava, m.expr), px + pw - 128 + 6, py + ph - 128, 128, 128);
  // 見出し（白抜き・縁取り）
  const t = fitLines(ctx, m.title, 138, 3, 800, [20, 19, 18, 17, 16, 15], FONT_UI);
  const lh = t.px + 5, y0 = py + ph - 14 - (t.lines.length - 1) * lh;
  ctx.textAlign = 'left'; ctx.lineJoin = 'round';
  t.lines.forEach((l, k) => {
    ctx.font = fnt(800, t.px);
    ctx.lineWidth = 5; ctx.strokeStyle = '#4a0612'; ctx.strokeText(l, px + 8, y0 + k * lh);
    ctx.fillStyle = k === t.lines.length - 1 ? '#ffe36b' : '#ffffff'; ctx.fillText(l, px + 8, y0 + k * lh);
  });
  ctx.restore();
  // チャンネル
  drawAvatarIcon(ctx, o.ava, 'normal', 16, 218, 28, { ring: 2, ringColor: S.c });
  ctx.fillStyle = '#141a33'; ctx.font = fnt(800, 12.5); ctx.textAlign = 'left';
  textFit(ctx, o.name, 50, 230, 190);
  ctx.fillStyle = '#7a819c'; ctx.font = fnt(500, 10);
  textFit(ctx, o.handle, 50, 244, 190);      // 登録者数は札に描かない（実際のフォロワーは窓に出る）
  // 予定と通知
  ctx.fillStyle = '#3b4160'; ctx.font = fnt(700, 10.5);
  ctx.fillText(m.date + ' 公開予定', 16, 272);
  pill(ctx, 128, 282, 68, 22, S.c);
  Icon.bell(ctx, 140, 293, 11, '#fff');
  ctx.fillStyle = '#fff'; ctx.font = fnt(800, 10.5); ctx.fillText('通知する', 149, 297);
  ctx.fillStyle = '#2f6fe6'; ctx.font = fnt(700, 11.5);
  textFit(ctx, m.tags.join(' '), 16, 330, SAFE_R - 16);
}

// ---------- ♣ 企画：ライブ配信 ----------
function paintLivePost(ctx, card, S, m, o) {
  const rnd = mulberry32(card.id * 13 + 11);
  // 配信者の行
  drawAvatarIcon(ctx, o.ava, 'normal', 64, 15, 30, { ring: 2.2, ringColor: S.c });
  ctx.fillStyle = '#141a33'; ctx.font = fnt(800, 13.5); ctx.textAlign = 'left';
  textFit(ctx, o.name, 101, 28, 140);
  ctx.fillStyle = '#e8384f'; ctx.beginPath(); ctx.arc(105, 38, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8384f'; ctx.font = fnt(800, 10); ctx.fillText('配信中', 112, 42);
  // サムネ
  const px = 14, py = 52, pw = 232, ph = 156;
  ctx.save();
  ctx.clip(rectPath(px, py, pw, ph, 10));
  const g = ctx.createLinearGradient(px, py, px, py + ph);
  g.addColorStop(0, '#1d1446'); g.addColorStop(1, '#0a0b22');
  ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
  // 部屋のモニターとネオン
  for (let k = 0; k < 3; k++) {
    const mx = px + 96 + k * 46, my = py + 18 + (k % 2) * 10;
    ctx.fillStyle = ['#1fd1ff', '#ff4fa3', '#7c5cff'][k]; ctx.globalAlpha = 0.85;
    ctx.fillRect(mx, my, 38, 26);
    ctx.globalAlpha = 0.25; ctx.fillRect(mx - 6, my - 6, 50, 38);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#14c27a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(px, py + ph - 30); ctx.lineTo(px + pw, py + ph - 30); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(avatarCanvas(o.ava, m.expr), px + pw - 132, py + ph - 128, 128, 128);
  // LIVE と視聴者数
  pill(ctx, px + pw - 52, py + 8, 44, 19, '#ff2d55');
  ctx.fillStyle = '#fff'; ctx.font = fnt(400, 12, FONT_PIXEL); ctx.textAlign = 'center'; ctx.fillText('LIVE', px + pw - 30, py + 22);
  ctx.textAlign = 'left';
  const vtxt = fmtCount(liveViewers(m)) + '人が視聴中';
  ctx.font = fnt(800, 9.5);
  const vw = ctx.measureText(vtxt).width + 22;
  pill(ctx, px + pw - vw - 6, py + ph - 24, vw, 18, 'rgba(0,0,0,0.6)');
  Icon.person(ctx, px + pw - vw + 4, py + ph - 15, 10, '#fff');
  ctx.fillStyle = '#fff'; ctx.fillText(vtxt, px + pw - vw + 12, py + ph - 11);
  // コメント
  m.chat.forEach((line, k) => {
    const cy = py + 54 + k * 24;
    ctx.font = fnt(800, 9.5);
    const w = Math.min(112, ctx.measureText(line).width + 32);
    pill(ctx, px + 6, cy, w, 19, 'rgba(255,255,255,0.88)');
    ctx.fillStyle = ['#ff9ec8', '#7cc8ff', '#ffd166'][k];
    ctx.beginPath(); ctx.arc(px + 15, cy + 9.5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20263f'; textFit(ctx, line, px + 24, cy + 13.5, w - 26);
  });
  ctx.restore();
  // タイトル
  ctx.fillStyle = '#141a33';
  const t = fitLines(ctx, (m.i >= 9 && m.stage >= 3 ? '【神回】' : '【配信】') + m.title, 230, 2, 800, [14, 13, 12, 11.5]);
  t.lines.forEach((l, k) => { ctx.textAlign = 'left'; ctx.fillText(l, 15, 228 + k * (t.px + 4)); });
  // ボタン
  const by = 262;
  pill(ctx, 14, by, 66, 22, S.soft);
  Icon.heart(ctx, 26, by + 11, 11, S.deep);
  ctx.fillStyle = S.deep; ctx.font = fnt(800, 10.5); ctx.fillText(fmtCount(m.buzz * 0.08 + 3), 35, by + 15);
  pill(ctx, 86, by, 52, 22, '#eef1f8');
  Icon.bubble(ctx, 97, by + 10, 11, '#3b4160');
  ctx.fillStyle = '#3b4160'; ctx.fillText(fmtCount(m.buzz * 0.01 + 1), 105, by + 15);
  pill(ctx, 144, by, 52, 22, '#eef1f8');
  Icon.share(ctx, 155, by + 11, 11, '#3b4160');
  ctx.fillStyle = '#3b4160'; ctx.fillText('共有', 163, by + 15);
  ctx.fillStyle = '#2f6fe6'; ctx.font = fnt(700, 11.5);
  textFit(ctx, m.tags.join(' '), 16, 312, SAFE_R - 16);
  textFit(ctx, '#' + (rnd() < 0.5 ? 'アーカイブあり' : '見逃し配信'), 16, 330, SAFE_R - 16);
}

// 特別な札の印（8＝VIRAL、J＝REVERSE、♠3＝COUNTER）
function specialLabel(card) {
  const R = (typeof settings !== 'undefined' && settings && settings.rules) || {};
  if (card.r === 8 && R.eightCut !== false) return { label: 'VIRAL', col: '#ff2d7a' };
  if (card.r === 11 && R.elevenBack) return { label: 'REVERSE', col: '#8b5cff' };
  if (card.r === 3 && card.s === 0 && R.spade3 !== false) return { label: 'COUNTER', col: '#0ea5b7' };
  return null;
}
function paintSpecialBadge(ctx, card, S) {
  const sp = specialLabel(card);
  if (!sp) return;
  const { label, col } = sp;
  ctx.save();
  ctx.translate(card.s === 0 ? 206 : 196, card.s === 0 ? 70 : 76); ctx.rotate(-0.12);
  ctx.font = fnt(400, 13, FONT_DISPLAY);
  const w = ctx.measureText(label).width + 18;
  ctx.shadowColor = col; ctx.shadowBlur = 8;
  pill(ctx, -w / 2, -12, w, 24, col);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke(rectPath(-w / 2 + 2, -10, w - 4, 20, 10));
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(label, 0, 5);
  ctx.restore();
}

// ---------- JOKER：GLITCH ----------
function paintJokerCard(ctx, card, o) {
  const W = TEX_CW, H = TEX_CH, rnd = mulberry32(card.id * 101 + 7);
  ctx.fillStyle = '#05050c'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#ff4fa3'); g.addColorStop(0.33, '#3b82ff'); g.addColorStop(0.66, '#14c27a'); g.addColorStop(1, '#ff453a');
  ctx.save(); ctx.shadowColor = '#b06bff'; ctx.shadowBlur = 12;
  ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.stroke(rectPath(5, 5, W - 10, H - 10, CARD_CORNER - 4));
  ctx.restore();
  ctx.save();
  ctx.clip(rectPath(9, 9, W - 18, H - 18, CARD_CORNER - 7));
  ctx.fillStyle = '#0b0b1c'; ctx.fillRect(0, 0, W, H);
  // 走査線とノイズ
  for (let y = 9; y < H; y += 3) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(0, y, W, 1); }
  for (let k = 0; k < 420; k++) { ctx.fillStyle = ['#ff4fa3', '#3b82ff', '#14c27a', '#ffffff'][k % 4]; ctx.globalAlpha = 0.12 + rnd() * 0.25; ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1); }
  ctx.globalAlpha = 1;
  // ほかの SNS の欠片
  const frag = (x, y, w, h, col, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = 0.85; ctx.fillStyle = col; ctx.fill(rectPath(-w / 2, -h / 2, w, h, 6)); ctx.restore(); };
  frag(190, 34, 80, 22, '#ff4fa3', 0.12); frag(206, 140, 64, 14, '#3b82ff', -0.08); frag(132, 330, 66, 20, '#14c27a', -0.12); frag(52, 316, 80, 18, '#ff453a', 0.1);
  ctx.globalAlpha = 1;
  ctx.font = fnt(400, 11, FONT_PIXEL); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.save(); ctx.translate(190, 38); ctx.rotate(0.12); ctx.fillText('♥ 99999+', 0, 0); ctx.restore();
  ctx.save(); ctx.translate(132, 334); ctx.rotate(-0.12); ctx.fillText('● LIVE', 0, 0); ctx.restore();
  ctx.save(); ctx.translate(52, 320); ctx.rotate(0.1); ctx.fillText('重大発表', 0, 0); ctx.restore();
  // 乱れたアイコン
  const av = avatarCanvas(o.ava, 'smug');
  ctx.imageSmoothingEnabled = false;
  const ax = W / 2 - 64, ay = 136;
  for (let s = 0; s < 32; s++) {
    const off = (rnd() < 0.22 ? (rnd() - 0.5) * 22 : 0);
    ctx.globalAlpha = 0.55; ctx.drawImage(av, 0, s, 32, 1, ax + off - 4, ay + s * 4, 128, 4);
    ctx.globalAlpha = 1; ctx.drawImage(av, 0, s, 32, 1, ax + off, ay + s * 4, 128, 4);
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35; ctx.drawImage(av, ax + 4, ay, 128, 128);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // ずれた JOKER の文字
  ctx.font = fnt(400, 42, FONT_DISPLAY); ctx.textAlign = 'center';
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = '#ff2d7a'; ctx.fillText('JOKER', W / 2 + 22 - 3, 130);
  ctx.fillStyle = '#22d3ee'; ctx.fillText('JOKER', W / 2 + 22 + 3, 132);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ffffff'; ctx.fillText('JOKER', W / 2 + 22, 131);
  for (let k = 0; k < 7; k++) { const y = 100 + rnd() * 200, h = 2 + rnd() * 6; ctx.drawImage(ctx.canvas, 0, y, W, h, (rnd() - 0.5) * 18, y, W, h); }
  ctx.fillStyle = '#ffffff';
  const jt = fitLines(ctx, cardTitleFor(card, o), 172, 2, 800, [14, 13, 12]);
  jt.lines.forEach((l, k) => ctx.fillText(l, 108, 280 + k * (jt.px + 3)));
  ctx.fillStyle = '#9aa3ff'; ctx.font = fnt(400, 10.5, FONT_PIXEL);
  ctx.fillText('ERR://SIGNAL_CROSSTALK', 108, 300 + (jt.lines.length - 1) * 8);
  ctx.restore();
  // 縦書きの JOKER 札
  const tab = () => {
    const { x, y, w, h } = TAB;
    ctx.fillStyle = '#11112a'; ctx.fill(rectPath(x, y, w, h, 12));
    ctx.lineWidth = 2.4; ctx.strokeStyle = g; ctx.stroke(rectPath(x + 1.2, y + 1.2, w - 2.4, h - 2.4, 11));
    ctx.font = fnt(400, 15, FONT_DISPLAY); ctx.textAlign = 'center';
    'JOKER'.split('').forEach((ch, k) => { ctx.fillStyle = ['#ff4fa3', '#3b82ff', '#14c27a', '#ff453a', '#ffd84d'][k]; ctx.fillText(ch, x + w / 2, y + 20 + k * 15.5); });
  };
  tab();
  ctx.save(); ctx.translate(W, H); ctx.rotate(Math.PI); tab(); ctx.restore();
}

// ---------- カードの裏 ----------
function paintLogoMark(ctx, cx, cy, r, colA, colB, lw) {
  // 吹き出しの中の王冠（このゲームの印）
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, colA); g.addColorStop(1, colB);
  ctx.save();
  ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy + r * 0.78);
  ctx.lineTo(cx - r * 0.42, cy + r * 0.5);
  ctx.arc(cx, cy - r * 0.05, r * 0.82, Math.PI * 0.68, Math.PI * 2.32);
  ctx.closePath(); ctx.stroke();
  const k = r * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - k, cy + k * 0.45); ctx.lineTo(cx - k, cy - k * 0.35); ctx.lineTo(cx - k * 0.5, cy + k * 0.05); ctx.lineTo(cx, cy - k * 0.6);
  ctx.lineTo(cx + k * 0.5, cy + k * 0.05); ctx.lineTo(cx + k, cy - k * 0.35); ctx.lineTo(cx + k, cy + k * 0.45); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function paintCardBack() {
  const W = TEX_CW, H = TEX_CH, c = mkCanvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0d1f'; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1048'); bg.addColorStop(1, '#071b33');
  ctx.fillStyle = bg; ctx.fill(rectPath(9, 9, W - 18, H - 18, 11));
  ctx.save(); ctx.clip(rectPath(9, 9, W - 18, H - 18, 11));
  ctx.fillStyle = 'rgba(160,180,255,0.12)';
  for (let y = 20; y < H; y += 14) for (let x = 20 + ((y / 14) % 2) * 7; x < W; x += 14) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill(); }
  // 斜めの光
  const sh = ctx.createLinearGradient(0, 0, W, H);
  sh.addColorStop(0, 'rgba(255,79,163,0.18)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(34,211,238,0.18)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#ff4fa3'); g.addColorStop(1, '#22d3ee');
  ctx.save(); ctx.shadowColor = '#b06bff'; ctx.shadowBlur = 10;
  ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.stroke(rectPath(5, 5, W - 10, H - 10, CARD_CORNER - 4));
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2; ctx.stroke(rectPath(18, 18, W - 36, H - 36, 8));
  ctx.save(); ctx.shadowColor = '#ff4fa3'; ctx.shadowBlur = 14;
  paintLogoMark(ctx, W / 2, H / 2 - 8, 50, '#ff6fb8', '#3fe0ff', 6);
  ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.font = fnt(400, 15, FONT_DISPLAY); ctx.textAlign = 'center';
  ctx.fillText('SNS大富豪', W / 2, H / 2 + 72);
  return c;
}

// ---------- 小物の札面 ----------
// スペ3返し：ファクトチェックの印
function paintFactStamp() {
  const S = 256, c = mkCanvas(S, S), ctx = c.getContext('2d');
  const C = S / 2;
  ctx.fillStyle = '#0ea5b7'; ctx.beginPath(); ctx.arc(C, C, C - 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(C, C, C - 16, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(C, C, C - 26, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(C - 40, C - 12); ctx.lineTo(C - 10, C + 18); ctx.lineTo(C + 44, C - 38); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
  ctx.font = fnt(400, 21, FONT_DISPLAY); ctx.fillText('FACT CHECK', C, C + 60);
  ctx.font = fnt(800, 17); ctx.fillText('ソースあります？', C, C - 54);
  return c;
}
