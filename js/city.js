// GRID: HIERARCH — city generation, pre-rendered pixel map, traffic and K9 units.
'use strict';

const TILE = 16, PER = 10, NB = 9, WT = NB * PER + 2, WPX = WT * TILE;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const rc = k => (k * PER + 1) * TILE;                       // pixel centre of road k
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function nearRoad(v) { return rc(clamp(Math.round((v / TILE - 1) / PER), 0, NB)); }
const zoneIdx = v => v < rc(3) ? 0 : v < rc(6) ? 1 : 2;
const zoneKey = (x, y) => zoneIdx(x) + ',' + zoneIdx(y);
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const City = { b: [], blocks: [], lm: {}, map: null, mini: null };

function genCity() {
  const rnd = mulberry(7741);
  City.b = []; City.blocks = []; City.lm = {};
  const LMK = Object.keys(LM);
  for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
    const zk = Math.floor(bx / 3) + ',' + Math.floor(by / 3), Z = ZONES[zk];
    const ax = (bx * PER + 3) * TILE, ay = (by * PER + 3) * TILE;
    const lms = LMK.filter(k => LM[k].block[0] === bx && LM[k].block[1] === by);
    const big = lms.find(k => typeof LM[k].lot === 'string');
    let lay;
    if (big) lay = LM[big].lot; else if (lms.length) lay = 'A';
    else { const r = rnd(), m = Z.mix; lay = r < m[0] ? 'A' : r < m[0] + m[1] ? 'B' : r < m[0] + m[1] + m[2] ? 'C' : 'P'; }
    const list = [];
    const add = (x, y, w, h, type, dx, dy, top, n, lmk) => {
      const b = { id: City.b.length, x, y, w, h, type, zk, dx, dy, top, lm: lmk || null, solid: type !== 'park',
        col: Z.pal[Math.floor(rnd() * Z.pal.length)], seed: Math.floor(rnd() * 1e6),
        addr: ((bx + 1) * 100 + 10 + n * 2) + ' ' + STS[top ? by : by + 1] };
      b.name = lmk ? LM[lmk].name : (type === 'res' ? 'Residence' : type === 'biz' ? 'Business' : type === 'corp' ? ZONES[zk].name + ' tower' : 'Park');
      if (lmk) City.lm[lmk] = b;
      City.b.push(b); list.push(b);
    };
    if (lay === 'A') for (let i = 0; i < 4; i++) {
      const lx = ax + (i % 2) * 48, ly = ay + (i >> 1) * 48, top = i < 2, lmk = lms.find(k => LM[k].lot === i);
      const type = lmk ? LM[lmk].type : (Z.res || rnd() < .5 ? 'res' : 'biz');
      if (type === 'util') add(lx + 12, ly + 14, 24, 20, type, lx + 24, top ? ay - 6 : ay + 102, top, i, lmk);
      else add(lx + 3, ly + 3, 42, 42, type, lx + 24, top ? ay - 6 : ay + 102, top, i, lmk);
    } else if (lay === 'B') for (let i = 0; i < 2; i++) add(ax + 3, ay + i * 48 + 3, 90, 42, 'biz', ax + 48, i ? ay + 102 : ay - 6, !i, i);
    else if (lay === 'C') add(ax + 4, ay + 4, 88, 88, 'corp', ax + 48, ay + 102, false, 0, big);
    else add(ax, ay, 96, 96, 'park', ax + 48, ay + 48, true, 0, big);
    City.blocks.push(list);
  }
  renderMap();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => clamp(Math.round(v * f), 0, 255);
  return 'rgb(' + c(n >> 16) + ',' + c(n >> 8 & 255) + ',' + c(n & 255) + ')';
}

function renderMap() {
  const c = document.createElement('canvas'); c.width = c.height = WPX;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1d24'; g.fillRect(0, 0, WPX, WPX);
  // lane dashes
  g.fillStyle = '#4a4d58';
  for (let k = 0; k <= NB; k++) for (let p = 0; p < WPX; p += 16) {
    const m = (p / TILE) % PER; if (m < 2) continue;
    g.fillRect(p + 4, rc(k), 8, 1); g.fillRect(rc(k), p + 4, 1, 8);
  }
  for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
    const Z = ZONES[Math.floor(bx / 3) + ',' + Math.floor(by / 3)];
    const sx = (bx * PER + 2) * TILE, sy = (by * PER + 2) * TILE;
    g.fillStyle = '#343742'; g.fillRect(sx, sy, 128, 128);
    g.fillStyle = '#3d404c'; for (let i = 0; i < 128; i += 16) { g.fillRect(sx + i, sy, 1, 128); g.fillRect(sx, sy + i, 128, 1); }
    g.fillStyle = Z.ground; g.fillRect(sx + 16, sy + 16, 96, 96);
  }
  for (const b of City.b) drawBuilding(g, b);
  City.map = c;
  const m = document.createElement('canvas'); m.width = m.height = WT;
  const mg = m.getContext('2d'); mg.imageSmoothingEnabled = true; mg.drawImage(c, 0, 0, WT, WT);
  City.mini = m;
}

function drawBuilding(g, b) {
  const r = mulberry(b.seed), { x, y, w, h } = b;
  if (b.type === 'park') {
    g.fillStyle = '#2c4a2a'; g.fillRect(x, y, w, h);
    g.fillStyle = '#3a5a34'; g.fillRect(x + 44, y, 8, h); g.fillRect(x, y + 44, w, 8);
    for (let i = 0; i < 14; i++) {
      const tx = x + 4 + Math.floor(r() * 84), ty = y + 4 + Math.floor(r() * 84);
      if (Math.abs(tx - x - 46) < 10 || Math.abs(ty - y - 46) < 10) continue;
      g.fillStyle = '#1f3a22'; g.fillRect(tx, ty, 7, 7); g.fillStyle = '#3f7a3f'; g.fillRect(tx + 1, ty + 1, 4, 4); g.fillStyle = '#5fa055'; g.fillRect(tx + 2, ty + 1, 2, 2);
    }
    if (b.lm) { g.fillStyle = '#8a6a4a'; g.fillRect(x + 43, y + 50, 10, 3); g.fillStyle = '#5a4030'; g.fillRect(x + 44, y + 53, 1, 2); g.fillRect(x + 51, y + 53, 1, 2); }
    return;
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 2, y + 2, w, h);   // shadow
  if (b.type === 'util') {
    g.fillStyle = '#7a7f8a'; g.fillRect(x, y, w, h);
    g.fillStyle = '#9aa0ad'; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
    g.fillStyle = '#e8c33c'; for (let i = 0; i < w; i += 6) g.fillRect(x + i, y + h - 3, 3, 3);
    g.fillStyle = '#ff3d6e'; g.fillRect(x + w / 2 - 1, y + 4, 3, 3);
    g.fillStyle = '#c8ccd6'; g.fillRect(x + w - 5, y - 6, 1, 7); g.fillRect(x + w - 6, y - 6, 3, 1);
    return;
  }
  let col = b.col;
  if (b.type === 'pizza') col = '#c8402f';
  g.fillStyle = col; g.fillRect(x, y, w, h);
  g.fillStyle = shade(col, 1.25); g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
  g.fillStyle = shade(col, .65); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
  if (b.type === 'res') {
    g.fillStyle = shade(col, .82); g.fillRect(x + 1, y + (h >> 1), w - 3, (h >> 1) - 2);
    g.fillStyle = shade(col, .5); g.fillRect(x + 1, y + (h >> 1), w - 3, 1);
    g.fillStyle = '#5a4a44'; g.fillRect(x + 6 + Math.floor(r() * (w - 16)), y + 5, 4, 4);
  } else if (b.type === 'pizza') {
    g.fillStyle = '#f2e6c8'; for (let i = 0; i < w - 4; i += 8) g.fillRect(x + 2 + i, y + 2, 4, 5);
    g.fillStyle = '#ffb347'; g.fillRect(x + w / 2 - 6, y + h / 2 - 6, 12, 12);
    g.fillStyle = '#c8402f'; g.fillRect(x + w / 2 - 3, y + h / 2 - 3, 2, 2); g.fillRect(x + w / 2 + 2, y + h / 2, 2, 2); g.fillRect(x + w / 2 - 2, y + h / 2 + 3, 2, 2);
  } else {
    const step = b.type === 'corp' ? 6 : 7;
    for (let wy = y + 5; wy < y + h - 6; wy += step) for (let wx = x + 5; wx < x + w - 6; wx += step) {
      g.fillStyle = r() < .28 ? '#ffd97a' : shade(col, .55); g.fillRect(wx, wy, 2, 2);
    }
    if (b.type === 'corp') {
      g.fillStyle = shade(col, 1.5); g.fillRect(x + 6, y + 6, w - 12, 1); g.fillRect(x + 6, y + h - 8, w - 12, 1);
      if (b.lm) { g.fillStyle = '#ff3d6e'; g.fillRect(x + w / 2 - 1, y + h / 2 - 1, 3, 3); g.fillStyle = '#c8ccd6'; g.fillRect(x + w / 2, y + h / 2 - 9, 1, 8); }
    }
  }
  // door
  g.fillStyle = '#16171c';
  if (b.type !== 'corp' || true) g.fillRect(clamp(b.dx - 2, x + 1, x + w - 5), b.top ? y : y + h - 3, 4, 3);
}

// ---------- collisions
function hitBuilding(x, y, r) {
  const bx = clamp(Math.floor((x / TILE - 2) / PER), 0, NB - 1), by = clamp(Math.floor((y / TILE - 2) / PER), 0, NB - 1);
  for (const b of City.blocks[by * NB + bx]) if (b.solid && x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  return null;
}
function moveEnt(e, dx, dy, r) {
  let hit = false;
  e.x = clamp(e.x + dx, 4, WPX - 4);
  let b = hitBuilding(e.x, e.y, r);
  if (b) { e.x = dx > 0 ? b.x - r : b.x + b.w + r; hit = true; if ('vx' in e) e.vx = 0; }
  e.y = clamp(e.y + dy, 4, WPX - 4);
  b = hitBuilding(e.x, e.y, r);
  if (b) { e.y = dy > 0 ? b.y - r : b.y + b.h + r; hit = true; if ('vy' in e) e.vy = 0; }
  return hit;
}

// ---------- traffic
const CAR_TYPES = [
  { sp: 55, w: 18, col: ['#d9b23c', '#c8ccd6'] },          // bus
  { sp: 75, w: 14, col: ['#6a8fb5', '#8a6ab5', '#b56a6a'] }, // van
  { sp: 95, w: 13, col: ['#4a9a6a', '#c8ccd6', '#3f6f9a', '#9a7a3f'] },
  { sp: 120, w: 13, col: ['#d94f4f', '#e8e8f0', '#2f2f3a'] },
  { sp: 150, w: 12, col: ['#ff3d6e', '#ffd23c', '#4de2ff'] }, // sports
];
function carOptions(i, j, d) {
  const o = [];
  for (let n = 0; n < 4; n++) {
    if (n === (d + 2) % 4) continue;
    const ni = i + DIRS[n][0], nj = j + DIRS[n][1];
    if (ni >= 0 && ni <= NB && nj >= 0 && nj <= NB) o.push(n);
  }
  return o.length ? o : [(d + 2) % 4];
}
function carPlan(c) {
  const o = carOptions(c.ti, c.tj, c.d);
  c.nd = (o.includes(c.d) && Math.random() < .55) ? c.d : o[Math.floor(Math.random() * o.length)];
  const [dx, dy] = DIRS[c.d], [nx, ny] = DIRS[c.nd];
  c.tx = rc(c.ti) - dy * 8 + (c.nd !== c.d ? -ny * 8 : 0);
  c.ty = rc(c.tj) + dx * 8 + (c.nd !== c.d ? nx * 8 : 0);
}
function mkCar() {
  const i = Math.floor(Math.random() * (NB + 1)), j = Math.floor(Math.random() * (NB + 1));
  const opts = [0, 1, 2, 3].filter(n => { const a = i + DIRS[n][0], b = j + DIRS[n][1]; return a >= 0 && a <= NB && b >= 0 && b <= NB; });
  const d = opts[Math.floor(Math.random() * opts.length)];
  const r = Math.random(), T = CAR_TYPES[r < .1 ? 0 : r < .3 ? 1 : r < .65 ? 2 : r < .88 ? 3 : 4];
  const c = { d, ti: i + DIRS[d][0], tj: j + DIRS[d][1], x: rc(i) - DIRS[d][1] * 8, y: rc(j) + DIRS[d][0] * 8, sp: T.sp * (.9 + Math.random() * .2), w: T.w, col: T.col[Math.floor(Math.random() * T.col.length)] };
  carPlan(c);
  // start somewhere along the segment
  const f = Math.random() * .8; c.x += (c.tx - c.x) * f; c.y += (c.ty - c.y) * f;
  return c;
}
function stepCar(c, dt) {
  let step = c.sp * dt;
  const dist = Math.abs(c.tx - c.x) + Math.abs(c.ty - c.y);
  if (dist <= step) {
    c.x = c.tx; c.y = c.ty; c.d = c.nd;
    c.ti += DIRS[c.d][0]; c.tj += DIRS[c.d][1];
    carPlan(c);
  } else { c.x += DIRS[c.d][0] * step; c.y += DIRS[c.d][1] * step; }
}

// ---------- K9 units: move only along the road grid
function roadStep(e, tx, ty, sp, dt) {
  const dx = tx - e.x, dy = ty - e.y;
  if (Math.abs(dx) + Math.abs(dy) < 26) { const d = Math.hypot(dx, dy) || 1; e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; return; }
  const onV = Math.abs(e.x - nearRoad(e.x)) < 12, onH = Math.abs(e.y - nearRoad(e.y)) < 12;
  let mx = 0, my = 0;
  if (Math.abs(dy) > Math.abs(dx)) {
    if (onV) my = Math.sign(dy); else mx = Math.sign(nearRoad(tx) - e.x) || Math.sign(dx) || 1;
  } else {
    if (onH) mx = Math.sign(dx); else my = Math.sign(nearRoad(ty) - e.y) || Math.sign(dy) || 1;
  }
  e.x += mx * sp * dt; e.y += my * sp * dt;
  // drift back to lane centre
  if (mx && onH) e.y += (nearRoad(e.y) - e.y) * Math.min(1, 4 * dt);
  if (my && onV) e.x += (nearRoad(e.x) - e.x) * Math.min(1, 4 * dt);
}
function zoneRect(zk) {
  const [zx, zy] = zk.split(',').map(Number);
  const a = z => z === 0 ? 0 : rc(z * 3) + 16, b = z => z === 2 ? WPX : rc(z * 3 + 3) - 16;
  return { x: a(zx), y: a(zy), w: b(zx) - a(zx), h: b(zy) - a(zy) };
}
function mkDog(zk) {
  const [zx, zy] = zk.split(',').map(Number);
  const pick = z => rc(z * 3 + 1 + Math.floor(Math.random() * 2));
  return { zk, x: pick(zx), y: pick(zy), tx: pick(zx), ty: pick(zy), chase: false, hunter: false, life: 0 };
}
