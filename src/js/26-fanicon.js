// ================================================================
//  ファンのアイコン：風景・猫・どうぶつ・アニメのスクショ風・推し活グッズ・ごはん写真など
//  SNSのVtuberオタクにありがちなアイコンを、その場で描く（SVG・64×64。表示は丸く切り抜く）
//  すべて自前の汎用の絵（実在の作品・キャラクター・ロゴは使わない）
// ================================================================
const fiPick = (rnd, a) => a[Math.floor(rnd() * a.length)];
const f1 = n => (Math.round(n * 10) / 10).toString();
const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${(i / Math.max(1, stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rgd = (id, a, b, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
// 4つ角のきらめき
const sparklePath = (x, y, s) => `M${f1(x)} ${f1(y - s)}Q${f1(x)} ${f1(y)} ${f1(x + s)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + s)}Q${f1(x)} ${f1(y)} ${f1(x - s)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - s)}Z`;
const heartPath = (x, y, s) => `M${f1(x)} ${f1(y + s * 0.9)}C${f1(x - s * 1.25)} ${f1(y + s * 0.1)} ${f1(x - s * 1.05)} ${f1(y - s * 0.95)} ${f1(x - s * 0.45)} ${f1(y - s * 0.95)}C${f1(x - s * 0.15)} ${f1(y - s * 0.95)} ${f1(x)} ${f1(y - s * 0.7)} ${f1(x)} ${f1(y - s * 0.5)}C${f1(x)} ${f1(y - s * 0.7)} ${f1(x + s * 0.15)} ${f1(y - s * 0.95)} ${f1(x + s * 0.45)} ${f1(y - s * 0.95)}C${f1(x + s * 1.05)} ${f1(y - s * 0.95)} ${f1(x + s * 1.25)} ${f1(y + s * 0.1)} ${f1(x)} ${f1(y + s * 0.9)}Z`;
function starPath(x, y, R, r) {
  let d = '';
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R;
    d += (k ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr);
  }
  return d + 'Z';
}
const PASTEL_BG = [['#ffe3ee', '#ffcfe2'], ['#e3f0ff', '#cbe1ff'], ['#fff3d6', '#ffe3a8'], ['#e4fbe8', '#c8f0d0'], ['#efe6ff', '#dacbff'], ['#e0fbfb', '#bff0f2']];
const VIVID = ['#ff4fa3', '#3b82ff', '#ffb02e', '#14c27a', '#a66cff', '#ff5a4f', '#22cde6', '#f2cf37'];
const bgGrad = (rnd, id = 'bg') => { const p = fiPick(rnd, PASTEL_BG); return `<defs>${lg(id, p)}</defs><rect width="64" height="64" fill="url(#${id})"/>`; };

// 猫の毛色
const CAT_COATS = [
  { k: 'tabby', base: '#f3a04b', dark: '#cf7424', muzzle: '#fff1de', eye: '#86c15e', ear: '#ffb3c4', line: '#5a3418' },
  { k: 'black', base: '#2b2a33', dark: '#17161d', muzzle: '#2b2a33', eye: '#f2c33a', ear: '#b9667f', line: '#9d97ad' },
  { k: 'white', base: '#fbfbfd', dark: '#e1e1ea', muzzle: '#ffffff', eye: '#5aa9f0', ear: '#ffb3c4', line: '#6b6577' },
  { k: 'grey', base: '#9ca5b7', dark: '#6e778a', muzzle: '#eef1f6', eye: '#e7b84a', ear: '#f2a7b8', line: '#3d4352' },
  { k: 'calico', base: '#fffaf2', dark: '#e2873a', muzzle: '#ffffff', eye: '#e2a63a', ear: '#ffb3c4', line: '#5a4636', patch: '#2c2a30' },
  { k: 'hachi', base: '#27262d', dark: '#16161d', muzzle: '#ffffff', eye: '#8bcf6b', ear: '#b9667f', line: '#6b6577' },
  { k: 'siamese', base: '#f2e6d2', dark: '#5b4333', muzzle: '#5b4333', eye: '#4f8fe8', ear: '#5b4333', line: '#2e2018' },
];

const FAN_ICONS = {
  // ---------- 風景 ----------
  sunset(r) { // 夕焼けと電線
    const P = fiPick(r, [['#251a52', '#a83f7c', '#ff9a62'], ['#2e2463', '#e2607e', '#ffc477'], ['#1b2a5c', '#6b56b8', '#f59ab5'], ['#3b1f4f', '#d45d5d', '#ffcf7a']]);
    const ink = '#170f2b', sx = 34 + r() * 14;
    return `<defs>${lg('s', P)}</defs><rect width="64" height="64" fill="url(#s)"/><circle cx="${f1(sx)}" cy="47" r="10" fill="#ffe9b0" opacity=".85"/>`
      + `<path d="M0 50C14 47 22 49 34 51S52 52 64 49V64H0Z" fill="${ink}"/>`
      + `<rect x="15" y="7" width="3.2" height="50" fill="${ink}"/><rect x="8" y="13" width="17" height="2.4" fill="${ink}"/><rect x="10" y="19.5" width="13" height="2" fill="${ink}"/>`
      + `<path d="M9 14Q38 30 64 24M24 14Q44 26 64 17M11 20.5Q36 37 64 34" stroke="${ink}" stroke-width="1.1" fill="none"/>`
      + (r() < 0.6 ? `<path d="M40 11l2.6 1.7 2.6-1.7M47.5 7.5l2 1.3 2-1.3" stroke="${ink}" stroke-width="1.1" fill="none" stroke-linecap="round"/>` : '');
  },
  night(r) { // 星空と山
    const P = fiPick(r, [['#070b26', '#1c1d55', '#4b2c7a'], ['#05101f', '#0f2a4f', '#2a5a7a'], ['#0b0820', '#2a1546', '#6b2f6b']]);
    let st = '';
    for (let k = 0; k < 18; k++) st += `<circle cx="${f1(r() * 64)}" cy="${f1(r() * 44)}" r="${(0.4 + r() * 1.1).toFixed(2)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
    return `<defs>${lg('n', P)}</defs><rect width="64" height="64" fill="url(#n)"/>${st}<path d="${sparklePath(18, 16, 4.5)}" fill="#fff"/>`
      + (r() < 0.7 ? `<path d="M51 8L36 17.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>` : '')
      + `<path d="M0 52L12 41L20 47L33 35L46 47L54 42L64 48V64H0Z" fill="#05061a"/>`;
  },
  sea(r) { // 海と空
    const sky = fiPick(r, [['#5fb7ff', '#d9f1ff'], ['#ff9a8b', '#ffe3c2'], ['#8ab6ff', '#f3d9ff']]);
    const water = fiPick(r, [['#2b7bd6', '#123f8a'], ['#3a8fd0', '#1c4f7d'], ['#5a7fd8', '#2a3f8a']]);
    return `<defs>${lg('a', sky)}${lg('b', water)}</defs><rect width="64" height="40" fill="url(#a)"/><rect y="38" width="64" height="26" fill="url(#b)"/>`
      + `<circle cx="43" cy="31" r="7" fill="#fff6d8"/><path d="M36 42h14M38.5 46h9M41 50h5M8 48h9M14 54h11" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`
      + `<ellipse cx="15" cy="17" rx="9" ry="3.6" fill="#fff" opacity=".88"/><ellipse cx="23" cy="15" rx="6" ry="3.2" fill="#fff" opacity=".88"/>`
      + (r() < 0.5 ? `<path d="M22 36l5.5-10v10ZM20.5 37h10l-2 2.4h-6Z" fill="#fff"/>` : '');
  },
  cloud(r) { // 青空と入道雲
    const sky = fiPick(r, [['#1f7cff', '#8fd0ff'], ['#2a6fe0', '#b5e4ff'], ['#3d8bff', '#c6ecff']]);
    const ground = fiPick(r, ['#2f9e5c', '#1f6fd1', '#3aa86a']);
    return `<defs>${lg('c', sky)}${lg('w', ['#ffffff', '#d9e4f3'])}</defs><rect width="64" height="64" fill="url(#c)"/>`
      + `<g fill="url(#w)"><circle cx="32" cy="24" r="11"/><circle cx="21" cy="32" r="9"/><circle cx="43" cy="31" r="10"/><circle cx="31" cy="37" r="11"/><circle cx="13" cy="42" r="7"/><circle cx="52" cy="41" r="8"/></g>`
      + `<rect x="8" y="42" width="50" height="9" fill="#e4ecf6"/><rect y="50" width="64" height="14" fill="${ground}"/>`;
  },
  sakura(r) { // 桜
    const sky = fiPick(r, [['#a8dcff', '#eaf6ff'], ['#ffd6e7', '#fff5fa'], ['#bfe0ff', '#fff0f6']]);
    const pet = fiPick(r, ['#ffc4d8', '#ffd3e2', '#ffb7cf']);
    const flower = (x, y, s) => {
      let p = '';
      for (let k = 0; k < 5; k++) {
        const a = k * 72 * Math.PI / 180 - Math.PI / 2, px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
        p += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(s * 0.62)}" ry="${f1(s * 0.85)}" transform="rotate(${k * 72} ${f1(px)} ${f1(py)})"/>`;
      }
      return `<g fill="${pet}">${p}</g><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.42)}" fill="#e8628e"/>`;
    };
    let fall = '';
    for (let k = 0; k < 6; k++) fall += `<ellipse cx="${f1(6 + r() * 52)}" cy="${f1(38 + r() * 24)}" rx="1.8" ry="1.1" fill="${pet}" transform="rotate(${Math.round(r() * 180)} 32 50)"/>`;
    return `<defs>${lg('k', sky)}</defs><rect width="64" height="64" fill="url(#k)"/>`
      + `<path d="M-2 19C14 23 26 14 40 18S58 11 66 7M26 17C30 24 33 28 37 35" stroke="#5a3a2e" stroke-width="3" fill="none" stroke-linecap="round"/>`
      + flower(10, 22, 4) + flower(22, 15, 3.6) + flower(31, 23, 4.2) + flower(45, 16, 3.8) + flower(56, 11, 3.4) + flower(38, 33, 3.8) + flower(18, 30, 3.2) + fall;
  },
  city(r) { // 夜の街
    const P = fiPick(r, [['#0b0d2a', '#2a1d55', '#7a3b7a'], ['#06122a', '#13305a', '#2f5d8a'], ['#160b26', '#3a1a46', '#a04a6a']]);
    let b = '', x = -2;
    while (x < 64) {
      const w = 7 + Math.floor(r() * 6), h = 18 + Math.floor(r() * 24), top = 64 - h;
      b += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${r() < 0.5 ? '#14163a' : '#1c1f46'}"/>`;
      for (let yy = top + 3; yy < 62; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (r() < 0.32) b += `<rect x="${xx}" y="${yy}" width="1.6" height="1.8" fill="#ffd36b" opacity=".9"/>`;
      x += w + 1;
    }
    return `<defs>${lg('y', P)}</defs><rect width="64" height="64" fill="url(#y)"/><circle cx="48" cy="12" r="4.5" fill="#fff4cf"/><rect x="31" y="6" width="1.4" height="20" fill="#14163a"/><circle cx="31.7" cy="6" r="1.4" fill="#ff4a5a"/>${b}`;
  },
  moon(r) { // 月夜
    const P = fiPick(r, [['#0a1640', '#1d3a7a'], ['#120a33', '#3a2470'], ['#03142a', '#0e3a5c']]);
    let st = '';
    for (let k = 0; k < 10; k++) st += `<circle cx="${f1(r() * 64)}" cy="${f1(r() * 64)}" r="${(0.4 + r() * 0.8).toFixed(2)}" fill="#fff" opacity=".7"/>`;
    return `<defs>${lg('m', P)}</defs><rect width="64" height="64" fill="url(#m)"/>${st}<circle cx="33" cy="28" r="22" fill="#fff2c4" opacity=".12"/>`
      + `<circle cx="33" cy="28" r="15" fill="#fff2c4"/><circle cx="28" cy="24" r="3.2" fill="#ecd99f" opacity=".8"/><circle cx="38" cy="33" r="2.4" fill="#ecd99f" opacity=".8"/><circle cx="36" cy="20" r="1.6" fill="#ecd99f" opacity=".8"/>`
      + `<ellipse cx="18" cy="45" rx="17" ry="4.6" fill="#2b3f7a" opacity=".92"/><ellipse cx="46" cy="50" rx="19" ry="5" fill="#33498a" opacity=".92"/>`;
  },
  crossing(r) { // 夕暮れの踏切
    const P = fiPick(r, [['#3a2a6e', '#ff7a85', '#ffd28a'], ['#24305e', '#b0577f', '#ffb27a']]);
    const ink = '#1a1230';
    let stripes = '';
    for (let y = 26; y < 64; y += 6) stripes += `<rect x="30" y="${y}" width="4" height="3" fill="#ffd400"/>`;
    const bar = a => `<g transform="rotate(${a} 32 15)"><rect x="17" y="12.5" width="30" height="5" fill="#ffd400" stroke="${ink}" stroke-width="1"/><path d="M21 12.5l3 5M27 12.5l3 5M33 12.5l3 5M39 12.5l3 5" stroke="${ink}" stroke-width="2"/></g>`;
    return `<defs>${lg('x', P)}</defs><rect width="64" height="64" fill="url(#x)"/><path d="M0 34Q32 44 64 30" stroke="${ink}" stroke-width="1" fill="none"/>`
      + `<rect x="30" y="18" width="4" height="46" fill="${ink}"/>${stripes}${bar(33)}${bar(-33)}`
      + `<rect x="21" y="25" width="22" height="6" rx="2" fill="${ink}"/><circle cx="25" cy="28" r="4" fill="#ff3b3b"/><circle cx="25" cy="28" r="7" fill="#ff3b3b" opacity=".25"/><circle cx="39" cy="28" r="3.6" fill="#5a1520"/>`;
  },
  sunflower(r) { // ひまわり畑
    const sky = fiPick(r, [['#3b9bff', '#b8e3ff'], ['#58b0ff', '#e2f4ff']]);
    const head = (x, y, s) => {
      let p = '';
      for (let k = 0; k < 12; k++) p += `<ellipse cx="${f1(x)}" cy="${f1(y - s)}" rx="${f1(s * 0.32)}" ry="${f1(s * 0.62)}" transform="rotate(${k * 30} ${f1(x)} ${f1(y)})"/>`;
      return `<g fill="#ffcf1f">${p}</g><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.58)}" fill="#6b3d1e"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.32)}" fill="#8a5428"/>`;
    };
    let field = '';
    for (let k = 0; k < 7; k++) field += head(4 + k * 10 + r() * 3, 44 + r() * 4, 4);
    return `<defs>${lg('h', sky)}</defs><rect width="64" height="64" fill="url(#h)"/><ellipse cx="18" cy="14" rx="8" ry="3.4" fill="#fff" opacity=".85"/>`
      + `<rect y="44" width="64" height="20" fill="#3c9a3c"/>${field}<path d="M40 64V36" stroke="#2f7d2f" stroke-width="3"/><ellipse cx="45" cy="48" rx="5" ry="2.4" fill="#2f7d2f" transform="rotate(-30 45 48)"/>${head(40, 30, 10)}`;
  },

  // ---------- 猫・どうぶつ ----------
  cat(r) { // 猫の顔のアップ
    const C = fiPick(r, CAT_COATS);
    const sleepy = r() < 0.22;
    let fur = '';
    if (C.k === 'tabby' || C.k === 'grey') fur = `<path d="M32 19v6M26 20l1.2 5M38 20l-1.2 5M11 37l6 1M11 42l6-.5M53 37l-6 1M53 42l-6-.5" stroke="${C.dark}" stroke-width="2.2" stroke-linecap="round"/>`;
    if (C.k === 'calico') fur = `<path d="M10 31Q16 15 30 19L28 33Q16 38 10 31Z" fill="${C.dark}"/><path d="M36 17Q49 14 55 29Q46 31 40 26Z" fill="${C.patch}"/>`;
    if (C.k === 'hachi') fur = `<path d="M32 24C27 33 18 39 13 50Q32 62 51 50C46 39 37 33 32 24Z" fill="#fff"/>`;
    if (C.k === 'siamese') fur = `<ellipse cx="32" cy="44" rx="12" ry="10" fill="${C.dark}" opacity=".9"/>`;
    const eyes = sleepy
      ? `<path d="M18.5 37q4.5-3.6 9 0M36.5 37q4.5-3.6 9 0" stroke="${C.line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="23" cy="36" rx="4.3" ry="4.9" fill="${C.eye}"/><ellipse cx="41" cy="36" rx="4.3" ry="4.9" fill="${C.eye}"/><ellipse cx="23" cy="36.3" rx="1.6" ry="3.9" fill="#111"/><ellipse cx="41" cy="36.3" rx="1.6" ry="3.9" fill="#111"/><circle cx="24.5" cy="34" r="1.3" fill="#fff"/><circle cx="42.5" cy="34" r="1.3" fill="#fff"/>`;
    const muzzle = C.k === 'siamese' || C.k === 'black' ? '' : `<ellipse cx="28" cy="45.5" rx="5.6" ry="4.4" fill="${C.muzzle}"/><ellipse cx="36" cy="45.5" rx="5.6" ry="4.4" fill="${C.muzzle}"/>`;
    const earOuter = C.k === 'siamese' ? C.dark : C.base;
    return bgGrad(r)
      + `<path d="M10 31L13 5L30 19Z" fill="${earOuter}"/><path d="M54 31L51 5L34 19Z" fill="${earOuter}"/>`
      + `<path d="M15 24L16.5 11L26 19.5Z" fill="${C.ear}"/><path d="M49 24L47.5 11L38 19.5Z" fill="${C.ear}"/>`
      + `<ellipse cx="32" cy="38" rx="23" ry="20" fill="${C.base}"/>${fur}${muzzle}${eyes}`
      + `<path d="M29.8 41.6h4.4L32 44.2Z" fill="#ff8fab"/><path d="M32 44.2v1.6M32 45.8q-2.6 2.7-5.2.6M32 45.8q2.6 2.7 5.2.6" stroke="${C.line}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
      + `<path d="M20 44.5l-13-2.2M20 47l-13 1.6M44 44.5l13-2.2M44 47l13 1.6" stroke="${C.line}" stroke-width=".9" opacity=".7"/>`;
  },
  loaf(r) { // 香箱座りで寝ている猫
    const C = fiPick(r, CAT_COATS);
    const cushion = fiPick(r, ['#ff9fbf', '#8fb8ff', '#ffd27a', '#9fe0b8', '#c3a6ff']);
    const ear = C.k === 'siamese' ? C.dark : C.base;
    const patch = C.k === 'calico' ? `<path d="M14 40Q20 30 30 33L27 46Q18 48 14 40Z" fill="${C.dark}"/><circle cx="38" cy="25" r="5" fill="${C.patch}"/>` : C.k === 'tabby' || C.k === 'grey' ? `<path d="M22 36l2 8M29 34l1 9M45 37l-2 8M32 21v4M28 22l1 3.5M36 22l-1 3.5" stroke="${C.dark}" stroke-width="2" stroke-linecap="round"/>` : '';
    return bgGrad(r) + `<ellipse cx="32" cy="54" rx="29" ry="10" fill="${cushion}"/><ellipse cx="32" cy="52" rx="26" ry="7" fill="#fff" opacity=".25"/>`
      + `<path d="M50 50Q60 46 56 38" stroke="${C.base}" stroke-width="5" fill="none" stroke-linecap="round"/>`
      + `<ellipse cx="32" cy="43" rx="21" ry="12" fill="${C.base}"/><path d="M21 23L23 9L31 18ZM43 23L41 9L33 18Z" fill="${ear}"/>`
      + `<circle cx="32" cy="30" r="12" fill="${C.base}"/>${patch}`
      + `<path d="M25 31q3-2.6 6 0M33 31q3-2.6 6 0" stroke="${C.line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      + `<path d="M30.4 34.4h3.2L32 36.2Z" fill="#ff8fab"/><ellipse cx="26" cy="53" rx="4.4" ry="2.8" fill="${C.muzzle === C.base ? C.base : '#fff'}"/><ellipse cx="38" cy="53" rx="4.4" ry="2.8" fill="${C.muzzle === C.base ? C.base : '#fff'}"/>`
      + `<text x="44" y="18" font-size="8" font-weight="700" fill="${C.line}" font-family="sans-serif" opacity=".7">z</text><text x="49" y="12" font-size="6" font-weight="700" fill="${C.line}" font-family="sans-serif" opacity=".5">z</text>`;
  },
  paw(r) { // 肉球
    const fur = fiPick(r, ['#fbfbfd', '#f3a04b', '#9ca5b7', '#2b2a33', '#f2e6d2']);
    const pad = fur === '#2b2a33' ? '#5b3b48' : fiPick(r, ['#ff9fb6', '#ffb0c2', '#f78ca8']);
    return `<rect width="64" height="64" fill="${fur}"/><path d="M8 10q6 4 4 10M54 8q-5 5-2 10M50 56q4-3 8-2M6 54q5-1 8 2" stroke="#000" stroke-width="1.2" opacity=".08" fill="none"/>`
      + `<path d="M32 33C23 33 17 41 19 47C21 53 27 52 32 52C37 52 43 53 45 47C47 41 41 33 32 33Z" fill="${pad}"/>`
      + `<ellipse cx="17.5" cy="30" rx="4.6" ry="5.6" fill="${pad}" transform="rotate(-22 17.5 30)"/><ellipse cx="26.5" cy="22.5" rx="4.6" ry="5.9" fill="${pad}" transform="rotate(-8 26.5 22.5)"/>`
      + `<ellipse cx="37.5" cy="22.5" rx="4.6" ry="5.9" fill="${pad}" transform="rotate(8 37.5 22.5)"/><ellipse cx="46.5" cy="30" rx="4.6" ry="5.6" fill="${pad}" transform="rotate(22 46.5 30)"/>`
      + `<ellipse cx="28" cy="40" rx="4" ry="2" fill="#fff" opacity=".35"/>`;
  },
  shiba(r) { // 柴犬
    const black = r() < 0.3;
    const base = black ? '#3a3036' : '#e39a4f', inner = black ? '#2a2026' : '#b8692c', spot = black ? '#e3a35f' : '#fff6e8';
    return bgGrad(r) + `<path d="M11 28L14 5L29 16ZM53 28L50 5L35 16Z" fill="${base}"/><path d="M15 22L16 11L24 16.5ZM49 22L48 11L40 16.5Z" fill="${inner}"/>`
      + `<path d="M9 34C9 19 19 13 32 13C45 13 55 19 55 34C55 48 45 57 32 57C19 57 9 48 9 34Z" fill="${base}"/>`
      + `<path d="M13 38C15 50 23 57 32 57C41 57 49 50 51 38C45 44 39 42 32 40C25 42 19 44 13 38Z" fill="#fff6e8"/>`
      + `<ellipse cx="23.5" cy="27.5" rx="3" ry="2" fill="${spot}"/><ellipse cx="40.5" cy="27.5" rx="3" ry="2" fill="${spot}"/>`
      + `<circle cx="24" cy="33" r="2.6" fill="#1d1416"/><circle cx="40" cy="33" r="2.6" fill="#1d1416"/><circle cx="24.8" cy="32.2" r=".8" fill="#fff"/><circle cx="40.8" cy="32.2" r=".8" fill="#fff"/>`
      + `<ellipse cx="32" cy="42" rx="3.6" ry="2.6" fill="#2b2220"/><path d="M32 44.6v2.2M32 46.8q-3 3-6 .4M32 46.8q3 3 6 .4" stroke="#2b2220" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
      + (r() < 0.5 ? `<path d="M30 48.5q2 4 4 0Z" fill="#ff7f8f"/>` : '');
  },
  penguin(r) { // ペンギン
    const bg = fiPick(r, [['#cdeeff', '#9fd2ff'], ['#e8f3ff', '#c4defc'], ['#d9f7ff', '#a9e6f5']]);
    return `<defs>${lg('p', bg)}</defs><rect width="64" height="64" fill="url(#p)"/><ellipse cx="32" cy="42" rx="23" ry="27" fill="#23283c"/>`
      + `<path d="M32 27C26 18 13 23 17 36C19 46 27 53 32 58C37 53 45 46 47 36C51 23 38 18 32 27Z" fill="#fff"/>`
      + `<circle cx="25" cy="36" r="2.8" fill="#1a1d2b"/><circle cx="39" cy="36" r="2.8" fill="#1a1d2b"/><circle cx="25.9" cy="35" r=".9" fill="#fff"/><circle cx="39.9" cy="35" r=".9" fill="#fff"/>`
      + `<path d="M28.5 41Q32 46.5 35.5 41Q32 39 28.5 41Z" fill="#ffad33"/><ellipse cx="21" cy="42" rx="3" ry="1.8" fill="#ffb3c4" opacity=".7"/><ellipse cx="43" cy="42" rx="3" ry="1.8" fill="#ffb3c4" opacity=".7"/>`;
  },
  buncho(r) { // 文鳥
    const white = r() < 0.35;
    const body = white ? '#fbfbfd' : '#8f97a6', cap = white ? '#fbfbfd' : '#25252b';
    return bgGrad(r) + `<path d="M6 60Q32 52 62 58" stroke="#7a5a44" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      + `<path d="M14 44Q8 54 4 58L12 56Q16 50 20 48Z" fill="${white ? '#e6e6ee' : '#3a3a44'}"/><ellipse cx="30" cy="42" rx="19" ry="15" fill="${body}"/>`
      + (white ? '' : `<ellipse cx="32" cy="50" rx="12" ry="5" fill="#d9c9cf" opacity=".7"/>`)
      + `<circle cx="34" cy="27" r="13" fill="${cap}"/>` + (white ? '' : `<ellipse cx="31" cy="31" rx="8" ry="6.4" fill="#fff"/>`)
      + `<path d="M43 22C51 22 55 26 53 31C49 33 45 32 42 29Z" fill="#ff5f73"/><circle cx="38.5" cy="23.5" r="2.4" fill="#111"/><circle cx="38.5" cy="23.5" r="3.4" fill="none" stroke="#ff5f73" stroke-width="1.3"/><circle cx="39.2" cy="22.8" r=".7" fill="#fff"/>`;
  },
  shimaenaga(r) { // シマエナガ
    const bg = fiPick(r, [['#e9f6ff', '#cfe9ff'], ['#f2fbff', '#d8f0e8'], ['#fff6fb', '#e8e6ff']]);
    return `<defs>${lg('g', bg)}${rgd('b', '#ffffff', '#e2e8f2', 0.45, 0.35, 0.65)}</defs><rect width="64" height="64" fill="url(#g)"/>`
      + `<path d="M0 57Q32 50 64 58" stroke="#7a5a44" stroke-width="3" fill="none"/><path d="M44 45L60 62L55.5 63L41 49Z" fill="#2b2b33"/>`
      + `<circle cx="31" cy="33" r="20" fill="url(#b)"/><path d="M13 35C13 46 19 52 25 53C20 46 17 40 17 33Z" fill="#3a3a44"/><path d="M49 35C49 46 43 52 37 53C42 46 45 40 45 33Z" fill="#3a3a44"/>`
      + `<circle cx="25" cy="30" r="1.8" fill="#111"/><circle cx="37" cy="30" r="1.8" fill="#111"/><path d="M29.6 33h2.8L31 35.2Z" fill="#111"/>`;
  },
  hamster(r) { // ハムスター
    const fur = fiPick(r, ['#f2c27a', '#d9b48c', '#e8e2da', '#c9a07a']);
    return bgGrad(r) + `<circle cx="16" cy="20" r="6.5" fill="${fur}"/><circle cx="48" cy="20" r="6.5" fill="${fur}"/><circle cx="16" cy="20" r="3.6" fill="#f7a8b8"/><circle cx="48" cy="20" r="3.6" fill="#f7a8b8"/>`
      + `<ellipse cx="32" cy="38" rx="23" ry="21" fill="${fur}"/><ellipse cx="32" cy="46" rx="15" ry="12" fill="#fffaf3"/>`
      + `<circle cx="24" cy="33" r="2.7" fill="#1d1416"/><circle cx="40" cy="33" r="2.7" fill="#1d1416"/><circle cx="24.8" cy="32.2" r=".9" fill="#fff"/><circle cx="40.8" cy="32.2" r=".9" fill="#fff"/>`
      + `<ellipse cx="32" cy="37.5" rx="1.6" ry="1.1" fill="#ff8fab"/><ellipse cx="19" cy="39" rx="3.2" ry="2" fill="#ffb3c4" opacity=".75"/><ellipse cx="45" cy="39" rx="3.2" ry="2" fill="#ffb3c4" opacity=".75"/>`
      + `<ellipse cx="32" cy="47" rx="4" ry="5.4" fill="#5a4a3a"/><path d="M30.5 44v6M33.5 44v6" stroke="#e8dcc8" stroke-width=".9"/><ellipse cx="27.5" cy="47" rx="2.6" ry="2" fill="#ffd0d8"/><ellipse cx="36.5" cy="47" rx="2.6" ry="2" fill="#ffd0d8"/>`;
  },

  // ---------- アニメのスクショ風 ----------
  animeEye(r) { // 大きな瞳のアップ
    const skin = fiPick(r, ['#ffe3d3', '#fbd9c4', '#f6cdb6']);
    const [li, dk] = fiPick(r, [['#8fd2ff', '#2b5fcf'], ['#ff9ccb', '#b8236a'], ['#c3a0ff', '#5a2fc0'], ['#8ff0c0', '#1f8f62'], ['#ffd27a', '#c2701a'], ['#ff8a8a', '#a31f2e']]);
    const hair = fiPick(r, ['#2a2340', '#f3c7d9', '#e8d08a', '#6a8fe0', '#5a3a2e', '#c9c6d9']);
    const eye = 'M8 38C16 26 44 22 58 34C50 46 22 52 8 38Z';
    return `<defs>${rgd('ir', li, dk, 0.5, 0.78, 0.75)}<clipPath id="e"><path d="${eye}"/></clipPath></defs><rect width="64" height="64" fill="${skin}"/>`
      + `<path d="M0 0H64V9C55 13 50 21 47 29C45 20 39 14 31 12C27 19 21 23 13 25C15 17 11 12 0 14Z" fill="${hair}"/>`
      + `<path d="${eye}" fill="#fff"/><g clip-path="url(#e)"><ellipse cx="33" cy="37" rx="11.5" ry="13.5" fill="url(#ir)"/><ellipse cx="33" cy="39" rx="5" ry="6.8" fill="${dk}"/><ellipse cx="33" cy="27" rx="16" ry="5" fill="#000" opacity=".22"/></g>`
      + `<ellipse cx="28.5" cy="32" rx="3.6" ry="4.4" fill="#fff"/><circle cx="38.5" cy="43" r="1.9" fill="#fff" opacity=".9"/>`
      + `<path d="M6 37C14 24 44 18 60 32" stroke="#2a1a2a" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M56 29.5l6.5-4.5" stroke="#2a1a2a" stroke-width="2.4" stroke-linecap="round"/>`
      + `<path d="M15 43C25 49 41 48 52 40" stroke="#2a1a2a" stroke-width="1.1" opacity=".55" fill="none"/>`
      + `<path d="M44 55l3-3M48.5 56l3-3M53 57l3-3" stroke="#ff8fa3" stroke-width="1.3" stroke-linecap="round"/>`;
  },
  girlBack(r) { // 空を見上げる後ろ姿（アニメの1シーン風）
    const sky = fiPick(r, [['#3d8bff', '#bfe6ff'], ['#5a4fd0', '#ff9fb2', '#ffd6a0'], ['#2f6fe0', '#9fd8ff']]);
    const hair = fiPick(r, ['#2a2340', '#5a3a2e', '#e8b6c8', '#3a4a8a', '#d9a35a']);
    const uni = fiPick(r, ['#26304f', '#3a2f4f', '#2c3a3a']);
    return `<defs>${lg('s', sky)}</defs><rect width="64" height="64" fill="url(#s)"/>`
      + `<g fill="#fff" opacity=".9"><ellipse cx="14" cy="14" rx="10" ry="4"/><ellipse cx="22" cy="11" rx="7" ry="3.6"/><ellipse cx="50" cy="22" rx="11" ry="4"/></g>`
      + `<path d="M8 64C10 53 19 48 32 48C45 48 54 53 56 64Z" fill="${uni}"/><path d="M20 50H44L42 60H22Z" fill="${uni}" stroke="#fff" stroke-width="1.2"/><path d="M23 52.5H41" stroke="#fff" stroke-width=".9"/>`
      + `<path d="M21 34C19 46 21 55 24 61H40C43 55 45 46 43 34Z" fill="${hair}"/><ellipse cx="32" cy="33" rx="11.5" ry="12.5" fill="${hair}"/>`
      + `<path d="M24 26q8-5 16 0" stroke="#fff" stroke-width="1" opacity=".35" fill="none"/>`
      + (r() < 0.6 ? `<path d="M32 22l-6-4v8ZM32 22l6-4v8Z" fill="#ff4f6d"/><circle cx="32" cy="22" r="1.6" fill="#c8243f"/>` : '')
      + `<path d="M43 40q6 2 10-2M44 46q5 3 9 0" stroke="${hair}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  },
  rooftop(r) { // 屋上のフェンスと空
    const sky = fiPick(r, [['#2f7dff', '#a9dcff'], ['#ff8f7a', '#ffd9a8'], ['#5a6fe0', '#c9b8ff']]);
    let fence = '';
    for (let x = -36; x < 64; x += 6) fence += `M${x} 30L${x + 34} 64M${x + 34} 30L${x} 64`;
    return `<defs>${lg('s', sky)}</defs><rect width="64" height="64" fill="url(#s)"/>`
      + `<g fill="#fff" opacity=".92"><circle cx="40" cy="14" r="7"/><circle cx="48" cy="17" r="6"/><circle cx="33" cy="18" r="5"/><rect x="33" y="17" width="16" height="6"/></g>`
      + `<path d="${fence}" stroke="#6f7c93" stroke-width="1" opacity=".9" fill="none"/><rect y="27.5" width="64" height="3.2" fill="#55627a"/><rect x="9" y="27.5" width="3" height="37" fill="#55627a"/><rect x="45" y="27.5" width="3" height="37" fill="#55627a"/>`;
  },
  kira(r) { // きらきら（魔法少女っぽい）
    const P = fiPick(r, [['#ffb3e1', '#c9b3ff', '#9fd8ff'], ['#ffd1a8', '#ffb3d9', '#c7a8ff'], ['#a8f0e0', '#b3c9ff', '#f0b3ff']]);
    let dots = '';
    for (let k = 0; k < 9; k++) dots += `<circle cx="${f1(r() * 64)}" cy="${f1(r() * 64)}" r="${(0.6 + r() * 1.2).toFixed(2)}" fill="#fff" opacity=".8"/>`;
    return `<defs>${lg('k', P, 1, 1)}</defs><rect width="64" height="64" fill="url(#k)"/>${dots}`
      + `<path d="${sparklePath(32, 30, 17)}" fill="#fff"/><path d="${sparklePath(32, 30, 8)}" fill="${fiPick(r, ['#ffe36b', '#ff9ccb', '#9fe7ff'])}"/>`
      + `<path d="${sparklePath(13, 14, 5)}" fill="#fff"/><path d="${sparklePath(51, 49, 6)}" fill="#fff"/><path d="${heartPath(50, 15, 4.5)}" fill="#ff6fae"/><path d="${heartPath(14, 50, 3.5)}" fill="#fff"/>`;
  },

  // ---------- 推し活グッズ・ゲーム ----------
  penlight(r) { // ペンライト
    const cols = [...VIVID, '#3cff9e'].sort(() => r() - 0.5).slice(0, 3);
    const stick = (bx, a, c) => `<g transform="rotate(${a} ${bx} 60)"><rect x="${bx - 8}" y="16" width="16" height="40" rx="8" fill="${c}" opacity=".2"/><rect x="${bx - 3.2}" y="20" width="6.4" height="32" rx="3.2" fill="${c}"/><rect x="${bx - 1.2}" y="22" width="2.4" height="27" rx="1.2" fill="#fff" opacity=".8"/><rect x="${bx - 3.6}" y="51" width="7.2" height="11" rx="1.6" fill="#3a3a4a"/></g>`;
    return `<defs>${lg('d', ['#120d26', '#24124a'])}</defs><rect width="64" height="64" fill="url(#d)"/>`
      + stick(22, -24, cols[0]) + stick(42, 24, cols[1]) + stick(32, 0, cols[2])
      + `<path d="${sparklePath(10, 12, 3.5)}" fill="#fff"/><path d="${sparklePath(54, 10, 3)}" fill="#fff"/><circle cx="50" cy="26" r="1" fill="#fff"/>`;
  },
  plush(r) { // ぬい撮り（ぬいぐるみ）
    const c = fiPick(r, ['#f7c9a8', '#d9c2ff', '#ffd1e1', '#cfe8ff', '#fff2b8', '#c8f0d8']);
    const bg = fiPick(r, ['#fff7fb', '#f5f9ff', '#fffaf0']);
    let dots = '';
    for (let y = 4; y < 64; y += 10) for (let x = (y / 10 % 2) * 5 + 3; x < 64; x += 10) dots += `<circle cx="${x}" cy="${y}" r="1.4"/>`;
    return `<rect width="64" height="64" fill="${bg}"/><g fill="${fiPick(r, ['#ffc4dc', '#bcd4ff', '#ffe09a'])}" opacity=".7">${dots}</g>`
      + `<ellipse cx="32" cy="58" rx="17" ry="11" fill="${c}"/><circle cx="17" cy="19" r="7.5" fill="${c}"/><circle cx="47" cy="19" r="7.5" fill="${c}"/><circle cx="17" cy="19" r="4" fill="#fff" opacity=".55"/><circle cx="47" cy="19" r="4" fill="#fff" opacity=".55"/>`
      + `<ellipse cx="32" cy="33" rx="20" ry="17" fill="${c}"/><ellipse cx="32" cy="38" rx="7" ry="5" fill="#fff" opacity=".6"/>`
      + `<circle cx="24.5" cy="31" r="2.2" fill="#2b2230"/><circle cx="39.5" cy="31" r="2.2" fill="#2b2230"/><ellipse cx="32" cy="36" rx="1.8" ry="1.3" fill="#2b2230"/><path d="M32 37.4v1.4M32 38.8q-1.8 1.6-3.4.2M32 38.8q1.8 1.6 3.4.2" stroke="#2b2230" stroke-width="1" fill="none"/>`
      + `<ellipse cx="20" cy="37" rx="3" ry="1.8" fill="#ff9fb6" opacity=".7"/><ellipse cx="44" cy="37" rx="3" ry="1.8" fill="#ff9fb6" opacity=".7"/>`
      + (r() < 0.5 ? `<path d="M45 13l6-3v7ZM45 13l-6-3v7Z" fill="#ff4f6d"/>` : '');
  },
  itabag(r) { // 痛バ（缶バッジをたくさん付けたバッグ）
    const bag = fiPick(r, ['#ff8fc0', '#9fb8ff', '#b99cff', '#ffcf6b', '#7fd8c0']);
    const cols = VIVID.slice().sort(() => r() - 0.5);
    let badges = '';
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const x = 20 + i * 12, y = 29 + j * 10, c = cols[(i + j * 3) % cols.length];
      badges += `<circle cx="${x}" cy="${y}" r="5.2" fill="#fff"/><circle cx="${x}" cy="${y}" r="4.4" fill="${c}"/><circle cx="${x - 1}" cy="${y - 1}" r="1.8" fill="#fff" opacity=".55"/>`;
    }
    return bgGrad(r) + `<path d="M20 20Q20 8 32 8Q44 8 44 20" stroke="${bag}" stroke-width="3.4" fill="none"/>`
      + `<rect x="9" y="18" width="46" height="42" rx="7" fill="${bag}"/><rect x="13" y="22" width="38" height="33" rx="4" fill="#fff" opacity=".5"/>${badges}`;
  },
  controller(r) { // ゲームのコントローラー
    const P = fiPick(r, [['#7a5cff', '#ff5fae'], ['#1fb6ff', '#5a6cff'], ['#14c27a', '#1fb6ff'], ['#ff8a3d', '#ff4f6d']]);
    const body = fiPick(r, ['#f5f6fb', '#2b2f45']);
    const mark = body === '#2b2f45' ? '#c9cde0' : '#3a3f5a';
    return `<defs>${lg('g', P, 1, 1)}</defs><rect width="64" height="64" fill="url(#g)"/>`
      + `<path d="M15 23H49C57 23 62 36 61 46C60 53 53 55 49 49L45 42H19L15 49C11 55 4 53 3 46C2 36 7 23 15 23Z" fill="${body}"/>`
      + `<rect x="13" y="30.5" width="11" height="3.6" rx="1" fill="${mark}"/><rect x="16.7" y="26.8" width="3.6" height="11" rx="1" fill="${mark}"/>`
      + `<circle cx="47" cy="27.5" r="2.4" fill="#ffcf2e"/><circle cx="52" cy="32" r="2.4" fill="#ff4f6d"/><circle cx="42" cy="32" r="2.4" fill="#3b82ff"/><circle cx="47" cy="36.5" r="2.4" fill="#14c27a"/>`
      + `<rect x="28" y="30" width="3" height="1.8" rx=".9" fill="${mark}"/><rect x="33" y="30" width="3" height="1.8" rx=".9" fill="${mark}"/>`;
  },
  mark(r) { // 推しの色と推しマーク
    const a = fiPick(r, VIVID), b = fiPick(r, VIVID);
    const shapes = [
      () => `<path d="${starPath(32, 33, 19, 8.5)}" fill="#fff"/>`,
      () => `<path d="${heartPath(32, 33, 17)}" fill="#fff"/>`,
      () => `<path d="M40 12A20 20 0 1 0 50 44A16 16 0 1 1 40 12Z" fill="#fff"/>`,
      () => `<path d="M32 32L14 21V43ZM32 32L50 21V43Z" fill="#fff"/><circle cx="32" cy="32" r="5" fill="#fff"/><path d="M29 36l-5 14 5-3 3 4ZM35 36l5 14-5-3-3 4Z" fill="#fff"/>`,
      () => `<path d="M12 44L15 20L24 31L32 15L40 31L49 20L52 44Z" fill="#fff"/><rect x="12" y="46" width="40" height="5" rx="1.5" fill="#fff"/>`,
      () => `<circle cx="25" cy="26" r="8" fill="#fff"/><circle cx="39" cy="26" r="8" fill="#fff"/><circle cx="25" cy="40" r="8" fill="#fff"/><circle cx="39" cy="40" r="8" fill="#fff"/><path d="M32 33Q36 46 44 54" stroke="#fff" stroke-width="3" fill="none"/>`,
      () => `<path d="M26 44V16L46 12V40" stroke="#fff" stroke-width="4" fill="none" stroke-linejoin="round"/><ellipse cx="21" cy="45" rx="6.5" ry="5" fill="#fff"/><ellipse cx="41" cy="41" rx="6.5" ry="5" fill="#fff"/>`,
    ];
    return `<defs>${lg('o', [a, b], 1, 1)}</defs><rect width="64" height="64" fill="url(#o)"/>${fiPick(r, shapes)()}`
      + `<path d="${sparklePath(53, 12, 4)}" fill="#fff" opacity=".85"/><circle cx="10" cy="54" r="1.6" fill="#fff" opacity=".8"/>`;
  },

  // ---------- ごはん写真 ----------
  ramen(r) { // ラーメン（真上から）
    const soup = fiPick(r, ['#e8b56a', '#f3dcb0', '#d98a4a', '#c9542e']);
    let nd = '';
    for (let k = 0; k < 5; k++) nd += `M${14 + k * 2} ${36 + k * 3}q6-4 12 0t12 0t10 -2`;
    return `<rect width="64" height="64" fill="#b9814f"/><path d="M0 12h64M0 30h64M0 50h64" stroke="#9c6a3e" stroke-width="1.4" opacity=".6"/>`
      + `<circle cx="32" cy="32" r="29" fill="#fff"/><circle cx="32" cy="32" r="29" fill="none" stroke="#d23b3b" stroke-width="3" stroke-dasharray="5 3"/><circle cx="32" cy="32" r="24" fill="${soup}"/>`
      + `<path d="${nd}" stroke="#fff1b8" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      + `<circle cx="41" cy="23" r="7.5" fill="#a8643a"/><circle cx="41" cy="23" r="5" fill="#d79a6a"/>`
      + `<ellipse cx="22" cy="22" rx="6.5" ry="5.6" fill="#fff"/><circle cx="22" cy="22.5" r="3.2" fill="#ffad1f"/>`
      + `<circle cx="42" cy="42" r="5.6" fill="#fff"/><path d="M42 42m-1.5 0a1.5 1.5 0 1 1 3 0a3 3 0 1 1-6 0a4.5 4.5 0 1 1 9 0" stroke="#ff6fa0" stroke-width="1.1" fill="none"/>`
      + `<rect x="13" y="33" width="9" height="14" rx="1" fill="#1f3a2a" transform="rotate(-12 17 40)"/>`
      + `<g fill="#6fcf6f"><circle cx="30" cy="44" r="1.6"/><circle cx="33" cy="47" r="1.6"/><circle cx="28" cy="48" r="1.6"/><circle cx="34" cy="43" r="1.4"/></g>`;
  },
  latte(r) { // カフェラテ
    const coffee = fiPick(r, ['#8a5a3a', '#7a4a2e', '#9a6a46']);
    const art = r() < 0.5
      ? `<path d="${heartPath(30, 30, 9)}" fill="#f6e6d0"/>`
      : `<circle cx="30" cy="31" r="9" fill="#f6e6d0"/><circle cx="23" cy="23.5" r="3.6" fill="#f6e6d0"/><circle cx="37" cy="23.5" r="3.6" fill="#f6e6d0"/><circle cx="27" cy="30" r="1.2" fill="${coffee}"/><circle cx="33" cy="30" r="1.2" fill="${coffee}"/><ellipse cx="30" cy="34" rx="1.6" ry="1.1" fill="${coffee}"/>`;
    return `<rect width="64" height="64" fill="#c99a6a"/><path d="M0 20h64M0 44h64" stroke="#b07f50" stroke-width="1.4" opacity=".6"/>`
      + `<circle cx="32" cy="32" r="28" fill="#f4f1ec"/><rect x="48" y="27" width="12" height="9" rx="4.5" fill="#fff"/><circle cx="30" cy="31" r="21" fill="#fff"/><circle cx="30" cy="31" r="17.5" fill="${coffee}"/>${art}`;
  },
  // 初期アイコン（ROM専っぽい）
  egg() {
    return `<rect width="64" height="64" fill="#c9d2e3"/><circle cx="32" cy="25" r="11" fill="#8f9bb3"/><path d="M10 64C12 46 22 40 32 40C42 40 52 46 54 64Z" fill="#8f9bb3"/>`;
  },
};
// 出やすさ（猫がいちばん多い）
const FAN_ICON_W = {
  cat: 4, loaf: 1.5, paw: 1, shiba: 1.2, penguin: 0.8, buncho: 1, shimaenaga: 1.2, hamster: 0.8,
  sunset: 1.5, night: 1.2, sea: 1, cloud: 1, sakura: 1, city: 1, moon: 1, crossing: 0.8, sunflower: 0.6,
  animeEye: 1.5, girlBack: 1, rooftop: 0.8, kira: 1,
  penlight: 1.2, plush: 1.2, itabag: 1, controller: 0.8, mark: 1.2,
  ramen: 0.7, latte: 0.7, egg: 0.4,
};
// 絵を描く人のアイコンは絵っぽいものに寄せる
const ARTIST_ICONS = ['animeEye', 'kira', 'girlBack', 'sakura', 'mark', 'rooftop'];
function pickFanIcon(rnd, artist) {
  if (artist && rnd() < 0.75) return fiPick(rnd, ARTIST_ICONS);
  const keys = Object.keys(FAN_ICON_W);
  let x = rnd() * keys.reduce((a, k) => a + FAN_ICON_W[k], 0);
  for (const k of keys) { x -= FAN_ICON_W[k]; if (x < 0) return k; }
  return keys[0];
}
const FanIconCache = new Map();
// icon = { kind, seed } → data URL（同じ人はいつも同じ絵）
function fanIconURL(icon) {
  const key = icon.kind + ':' + icon.seed;
  let u = FanIconCache.get(key);
  if (!u) {
    const draw = FAN_ICONS[icon.kind] || FAN_ICONS.egg;
    const body = draw(mulberry32(icon.seed));
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${body}</svg>`);
    FanIconCache.set(key, u);
  }
  return u;
}
const fanImg = (acc, cls) => `<img class="ava fan${cls ? ' ' + cls : ''}" src="${fanIconURL(acc.icon)}" alt="">`;
