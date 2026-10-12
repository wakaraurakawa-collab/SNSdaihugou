// ================================================================
//  マークの形（♠♥♦♣）：札・鎖・凡例で共通に使う
// ================================================================
const SUIT_D = {
  0: 'M0,-0.5 C0.13,-0.33 0.5,-0.12 0.5,0.12 C0.5,0.35 0.24,0.43 0.05,0.26 Q0.08,0.42 0.2,0.5 L-0.2,0.5 Q-0.08,0.42 -0.05,0.26 C-0.24,0.43 -0.5,0.35 -0.5,0.12 C-0.5,-0.12 -0.13,-0.33 0,-0.5 Z',
  1: 'M0,0.47 C-0.13,0.33 -0.5,0.09 -0.5,-0.16 C-0.5,-0.41 -0.2,-0.53 0,-0.27 C0.2,-0.53 0.5,-0.41 0.5,-0.16 C0.5,0.09 0.13,0.33 0,0.47 Z',
  2: 'M0,-0.5 Q0.13,-0.17 0.39,0 Q0.13,0.17 0,0.5 Q-0.13,0.17 -0.39,0 Q-0.13,-0.17 0,-0.5 Z',
};
const CLUB_CIRCLES = [[0, -0.25, 0.215], [-0.255, 0.075, 0.215], [0.255, 0.075, 0.215], [0, 0.03, 0.13]];
const CLUB_STEM = 'M0.045,0.05 Q0.06,0.38 0.2,0.5 L-0.2,0.5 Q-0.06,0.38 -0.045,0.05 Z';
// 単位の大きさ（-0.5〜0.5）のマークを (x, y) に size で塗る
function drawSuit(ctx, s, x, y, size, fill) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size, size);
  ctx.fillStyle = fill;
  if (s === 3) {
    for (const [cx, cy, r] of CLUB_CIRCLES) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fill(new Path2D(CLUB_STEM));
  } else ctx.fill(new Path2D(SUIT_D[s]));
  ctx.restore();
}
// HTML 用（凡例など）の SVG マーク
function suitSvg(s, color, size) {
  const inner = s === 3
    ? CLUB_CIRCLES.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('') + `<path d="${CLUB_STEM}"/>`
    : `<path d="${SUIT_D[s]}"/>`;
  return `<svg viewBox="-0.55 -0.55 1.1 1.1" width="${size || 14}" height="${size || 14}" fill="${color}" aria-hidden="true">${inner}</svg>`;
}
