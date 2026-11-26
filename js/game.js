// GRID: HIERARCH — state, skating, deliveries, HUD, main loop.
'use strict';

const $ = id => document.getElementById(id);
const DAY_LEN = 420, LAST_DAY = 14, SAVE = 'gridhierarch.v3', VW = 480, VH = 270;
let S = null, mode = 'title', cv, ctx, lastT = 0, hudT = 0;
const K = {};
const R = { cars: [], dogs: [], parts: [], inRange: [], P: null, t: 0, mk: 0, hunterCd: 0, near: null };

// ---------- state
function newState() {
  const s = {
    day: 1, t: 0, cash: 60, strikes: 0, delivered: 0, total: 0, heat: 0, px: 0, py: 0,
    rig: { cpu: 1, gpu: 1, ram: 1, cool: 1, nic: 1 }, skates: { wheels: 1, bearings: 1, grapple: 1, rack: 1 }, soft: { dendrite: 0, scrub: 0, onion: 0 },
    bots: [{ name: 'TOPSY', ring: 1, core: 1, tip: 1 }], hosts: {}, chain: [], tor: false, read: {}, profile: {}, locked: {}, own: {}, tips: {}, ev: {},
    keys: ['apt', 'locker'], pickups: {}, stocks: {}, flags: { tap: 1 }, phone: [], sent: {}, done: {}, doneDay: {}, orders: [], stats: { owned: {} },
  };
  for (const id in HOSTS) s.hosts[id] = { known: false, scanned: false, users: {}, creds: {}, backdoor: false, exposed: false, alert: 0, lockDay: 0 };
  s.hosts.hotslice.users.staff = 1;
  for (const zk in ZONES) s.locked[zk] = zk !== '1,1';
  for (const c of CORPS) { const h = []; let p = c.p; for (let i = 0; i < 40; i++) { h.push(p); p *= 1 + (Math.random() - .5) * .03; } s.stocks[c.id] = { p, hist: h, sh: 0 }; }
  return s;
}
function save() { if (!S || mode === 'over') return; S.px = R.P.x; S.py = R.P.y; try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { } }
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch (e) { return null; } }

function startGame(cont) {
  const old = cont && loadSave();
  S = old || newState();
  const hs = City.lm.hotslice;
  R.P = { x: old ? S.px : hs.dx, y: old ? S.py : hs.dy - 4, vx: 0, vy: 0, latch: null, face: 1 };
  R.cars = []; for (let i = 0; i < 460; i++) R.cars.push(mkCar());
  resetDogs(); R.parts = [];
  if (!old) ['intro1', 'intro2', 'intro3', 'intro4'].forEach(msg);
  $('screen').classList.add('hidden'); mode = 'play';
}
function resetDogs() {
  R.dogs = R.dogs.filter(d => d.hunter);
  for (const zk in ZONES) if (S.locked[zk]) for (let i = 0; i < ZONES[zk].dogs * 4; i++) R.dogs.push(mkDog(zk));
}

// ---------- helpers used by the deck
let actx = null;
function beep(f, d, v) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = v || .05; g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
  } catch (e) { }
}
function toast(t) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 6500);
  while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
}
function msg(id) { const [from, body] = TEXTS[id]; S.phone.unshift({ from, body, day: S.day, unread: true }); S.sent[id] = 1; toast('✉ ' + from + ': ' + body); beep(1200, .06); }
function msgOnce(id) { if (!S.sent[id]) msg(id); }
const hasKey = k => S.keys.includes(k);
function addKey(k) { if (!hasKey(k)) { S.keys.push(k); toast('KEYCHAIN + ' + Deck.keyInfo(k).name); } }
const quota = () => S.flags.freezeQ || Math.min(2 + S.day, 8);
const wifiRange = () => 80 + 22 * S.rig.nic;
function hostInRange(id) { const b = City.lm[HOSTS[id].lm]; if (!b || HOSTS[id].kind !== 'wifi') return false; return Math.hypot(b.x + b.w / 2 - R.P.x, b.y + b.h / 2 - R.P.y) < wifiRange() + (b.w > 60 ? 20 : 0); }
const hostsInRange = () => Object.keys(HOSTS).filter(hostInRange);
function applyFx(list) {
  for (const f of list || []) {
    const p = f.split(':');
    if (p[0] === 'host') { if (!S.hosts[p[1]].known) { S.hosts[p[1]].known = true; toast('NEW HOST: ' + HOSTS[p[1]].name); } }
    else if (p[0] === 'user') { if (!S.hosts[p[1]].users[p[2]]) { S.hosts[p[1]].users[p[2]] = 1; toast('USERNAME learned: ' + p[2] + ' @ ' + HOSTS[p[1]].name); } }
    else if (p[0] === 'own') S.own[p[1]] = 1;
    else if (p[0] === 'tip') { if (!S.tips[p[1]]) { S.tips[p[1]] = 1; toast('INSIDE INFORMATION — see MARKET'); } }
    else if (p[0] === 'pickup') { if (!S.pickups[p[1]]) { S.pickups[p[1]] = 1; toast('A physical key is waiting at ' + LM[PICKUPS[p[1]].lm].name + '.'); } }
    else if (p[0] === 'flag') { if (!S.flags[p[1]]) { S.flags[p[1]] = 1; if (p[1] === 'knowsTap') msg('tap'); if (p[1] === 'nullsaint') msg('nullsaint'); } }
    else if (p[0] === 'ev') { if (!S.ev[p[1]]) { S.ev[p[1]] = 1; toast('EVIDENCE secured (' + Object.keys(S.ev).length + '/6)'); } }
    else if (p[0] === 'key') addKey(p[1]);
  }
}
function unlockZone(zk, quiet) {
  if (!S.locked[zk]) return;
  S.locked[zk] = false; R.dogs = R.dogs.filter(d => d.zk !== zk || d.hunter);
  const c = ZONES[zk].corp; if (S.stocks[c]) S.stocks[c].p *= .93;
  S.stocks.ARG.p *= .96;
  if (!quiet) toast(ZONES[zk].name + ': K9 perimeter DOWN. New streets, bigger tips.');
  msgOnce('gate1'); beep(980, .3);
}

// ---------- clock, market, days
function advanceClock(dt) {
  S.t += dt;
  for (const o of S.orders) o.t -= dt;
  const late = S.orders.filter(o => o.t <= 0);
  if (late.length) { S.orders = S.orders.filter(o => o.t > 0); toast('Order went cold. No pay.'); beep(160, .2); }
  R.mk += dt;
  if (R.mk > 5) { R.mk = 0; for (const c of CORPS) { const st = S.stocks[c.id]; st.p = Math.max(1, st.p * (1 + (Math.random() - .5) * .035 + .0008)); st.hist.push(st.p); if (st.hist.length > 50) st.hist.shift(); } }
  if (S.t >= DAY_LEN) endDay();
}
function endDay() {
  if (S.delivered < quota()) { S.strikes++; msg('strike'); if (S.strikes >= 3) return endGame('liquidated'); }
  else toast('Quota met. Day ' + S.day + ' survived.');
  S.day++; S.t = 0; S.delivered = 0; S.doneDay = {}; S.heat = Math.max(0, S.heat - 8);
  if (S.day > LAST_DAY) return endGame('lethe');
  for (const id in S.hosts) { const h = S.hosts[id]; if (h.exposed) { h.exposed = false; h.backdoor = false; S.chain = S.chain.filter(c => c !== id); S.keys = S.keys.filter(k => k !== 'bd:' + id); toast('Your backdoor on ' + HOSTS[id].name + ' was found and removed.'); } }
  for (const e of EVENTS) if (e.day === S.day) { const st = S.stocks[e.t]; st.p *= e.mult; st.hist.push(st.p); toast('NEWS: ' + e.news); }
  if (S.day === 10) msgOnce('day10');
  toast('DAY ' + S.day + ' — quota ' + quota() + '. HIERARCH goes live in ' + (LAST_DAY - S.day + 1) + ' days.');
  save();
  if (mode === 'deck') Deck.render();
}
function endGame(kind) {
  if (Deck.sess) Deck.sess = null;
  $('deck').classList.add('hidden'); Deck.closeReader();
  mode = 'over'; try { localStorage.removeItem(SAVE); } catch (e) { }
  const ev = Object.keys(S.ev).length;
  const T = {
    liquidated: ['LIQUIDATED', 'Three missed quotas. Mozza Legal closes indenture #7741. The dogs were already outside.'],
    lethe: ['DAY 15', 'HIERARCH went live on schedule. LETHE followed. The pizza still gets delivered. There is nobody left to order it.'],
    win: ev >= 4 ? ['HIERARCH PURGED', `The weights are gone. ${ev} documents hit every screen in the city at once: the cap table, the manifests, LETHE. By morning F Inc. is a letter nobody will say out loud. Your debt was owed to a company that no longer exists.\n\nDeliveries made: ${S.total}. You skate home.`]
      : ['HIERARCH PURGED', `The weights are gone — but you leaked only ${ev} document${ev === 1 ? '' : 's'}, and nobody quite believes a pizza courier. F Inc. calls it an "outage" and starts retraining. You bought the city time. Maybe a year.\n\nDeliveries made: ${S.total}.`],
  }[kind];
  $('screen').innerHTML = `<div class="card"><h1 class="${kind === 'win' ? 'ok' : 'bad'}">${T[0]}</h1><pre>${esc(T[1])}</pre><button onclick="startGame(false)">NEW GAME</button></div>`;
  $('screen').classList.remove('hidden');
}

// ---------- world update
function trespassing(x, y) {
  for (const [ox, oy] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) if (!S.locked[zoneKey(clamp(x + ox, 0, WPX - 1), clamp(y + oy, 0, WPX - 1))]) return false;
  return true;
}
function die() {
  const P = R.P, hs = City.lm.hotslice, fee = Math.min(S.cash, 60);
  S.cash -= fee; S.orders = []; P.x = hs.dx; P.y = hs.dy - 4; P.vx = P.vy = 0; P.latch = null;
  R.dogs = R.dogs.filter(d => !d.hunter); for (const d of R.dogs) d.chase = false;
  S.heat = Math.max(0, S.heat - 15);
  toast('A K9 unit caught you. Mozza MedEvac scraped you up: -$' + Math.floor(fee) + ', orders lost, time lost.');
  beep(80, .6); advanceClock(20);
}
function newOrder() {
  const hs = City.lm.hotslice;
  const pool = City.b.filter(b => (b.type === 'res' || b.type === 'biz') && !b.lm && !S.locked[b.zk] && Math.abs(b.dx - hs.dx) + Math.abs(b.dy - hs.dy) > 110 && Math.abs(b.dx - hs.dx) + Math.abs(b.dy - hs.dy) < 1900 && !S.orders.some(o => o.b === b.id));
  const b = pool[Math.floor(Math.random() * pool.length)], man = Math.abs(b.dx - hs.dx) + Math.abs(b.dy - hs.dy);
  const t = man / 50 + 22;
  S.orders.push({ b: b.id, t, max: t, pay: Math.round((18 + man / 22) * (b.zk === '1,1' ? 1 : 1.5)) });
}
function interact() {
  const P = R.P, hs = City.lm.hotslice;
  for (const id in PICKUPS) if (S.pickups[id] === 1) { const b = City.lm[PICKUPS[id].lm]; if (Math.hypot(b.dx - P.x, b.dy - P.y) < 22) { S.pickups[id] = 2; addKey(PICKUPS[id].key); beep(900, .1); return; } }
  if (Math.hypot(hs.dx - P.x, hs.dy - P.y) < 24) {
    const cap = Math.min(3, S.skates.rack);
    if (S.orders.length < cap) { while (S.orders.length < cap) newOrder(); beep(500, .08); toast(S.orders.length > 1 ? S.orders.length + ' pizzas loaded.' : 'Pizza loaded. Go.'); }
  }
}
function clockOut() {
  const hs = City.lm.hotslice;
  if (Math.hypot(hs.dx - R.P.x, hs.dy - R.P.y) < 24 && S.delivered >= quota()) { S.orders = []; endDay(); }
}
function toggleLatch() {
  const P = R.P;
  if (P.latch) { const c = P.latch, w = 1.1 + .06 * S.skates.grapple; P.vx = DIRS[c.d][0] * c.sp * w; P.vy = DIRS[c.d][1] * c.sp * w; P.latch = null; beep(300, .05); return; }
  let best = null, bd = 24 + 7 * S.skates.grapple;
  for (const c of R.cars) { const d = Math.hypot(c.x - P.x, c.y - P.y); if (d < bd) { bd = d; best = c; } }
  if (best) { P.latch = best; beep(700, .04); }
}

function update(dt) {
  const P = R.P; R.t += dt;
  advanceClock(dt); if (mode !== 'play') return;
  for (const c of R.cars) stepCar(c, dt);
  // --- player
  let ix = (K.ArrowRight || K.KeyD ? 1 : 0) - (K.ArrowLeft || K.KeyA ? 1 : 0), iy = (K.ArrowDown || K.KeyS ? 1 : 0) - (K.ArrowUp || K.KeyW ? 1 : 0);
  if (ix && iy) { ix *= .7071; iy *= .7071; }
  const max = 62 + S.skates.wheels * 9;
  if (P.latch) {
    const c = P.latch, tx = c.x - DIRS[c.d][0] * 13, ty = c.y - DIRS[c.d][1] * 13, k = Math.min(1, 9 * dt);
    moveEnt(P, (tx - P.x) * k, (ty - P.y) * k, 3);
    P.vx = DIRS[c.d][0] * c.sp; P.vy = DIRS[c.d][1] * c.sp;
    if (Math.hypot(tx - P.x, ty - P.y) > 40) P.latch = null;
  } else {
    let sp = Math.hypot(P.vx, P.vy);
    if (ix || iy) {
      if (sp <= max + 1) { P.vx += ix * 240 * dt; P.vy += iy * 240 * dt; const s2 = Math.hypot(P.vx, P.vy); if (s2 > max) { P.vx *= max / s2; P.vy *= max / s2; } }
      else { const k = Math.min(1, 4.5 * dt); P.vx += (ix * sp - P.vx) * k; P.vy += (iy * sp - P.vy) * k; const s2 = Math.hypot(P.vx, P.vy) || 1; P.vx *= sp / s2; P.vy *= sp / s2; }
    }
    sp = Math.hypot(P.vx, P.vy);
    const coast = 1 + .5 * (S.skates.bearings - 1);
    let dec = sp > max ? 13 / coast : (ix || iy) ? 0 : 34 / coast;
    if (K.ShiftLeft || K.ShiftRight) dec = 280;
    if (sp > 0) { const ns = Math.max(0, sp - dec * dt); P.vx *= ns / sp; P.vy *= ns / sp; }
    moveEnt(P, P.vx * dt, P.vy * dt, 3);
  }
  const sp = Math.hypot(P.vx, P.vy);
  if (Math.abs(P.vx) > 5) P.face = Math.sign(P.vx);
  if (sp > max + 8 && Math.random() < .6) R.parts.push({ x: P.x, y: P.y + 3, l: .35, c: '#4de2ff' });
  for (const p of R.parts) p.l -= dt; R.parts = R.parts.filter(p => p.l > 0);
  // --- deliveries
  for (const o of S.orders) {
    const b = City.b[o.b];
    if (Math.hypot(b.dx - P.x, b.dy - P.y) < 15) {
      const tip = Math.round(o.t / o.max * 22); S.cash += o.pay + tip; S.delivered++; S.total++; o.done = 1;
      toast('Delivered to ' + b.addr + ': $' + o.pay + ' + $' + tip + ' tip.'); beep(880, .08); setTimeout(() => beep(1320, .1), 90);
    }
  }
  S.orders = S.orders.filter(o => !o.done);
  // --- dogs
  const tres = trespassing(P.x, P.y), pz = zoneKey(P.x, P.y);
  for (const d of R.dogs) {
    if (d.hunter) { d.life -= dt; roadStep(d, P.x, P.y, 96, dt); }
    else if (tres && d.zk === pz) { d.chase = true; roadStep(d, P.x, P.y, 88, dt); }
    else { d.chase = false; if (Math.abs(d.x - d.tx) + Math.abs(d.y - d.ty) < 6) { const n = mkDog(d.zk); d.tx = n.x; d.ty = n.y; } roadStep(d, d.tx, d.ty, 34, dt); }
    if (Math.hypot(d.x - P.x, d.y - P.y) < 8) { die(); break; }
  }
  R.dogs = R.dogs.filter(d => !d.hunter || d.life > 0);
  // --- heat
  R.hunterCd -= dt;
  if (S.heat >= 60 && !S.flags.retask && R.hunterCd <= 0 && !R.dogs.some(d => d.hunter)) {
    const n = S.heat >= 100 ? 3 : 1;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; R.dogs.push({ zk: 'h', hunter: true, life: 32, x: nearRoad(clamp(P.x + Math.cos(a) * 300, 20, WPX - 20)), y: nearRoad(clamp(P.y + Math.sin(a) * 300, 20, WPX - 20)), chase: true }); }
    if (S.heat >= 100) { S.cash = Math.floor(S.cash / 2); toast('HEAT MAXED. Argus raid — accounts seized: half your cash is gone. RUN.'); }
    else toast('HEAT ' + Math.round(S.heat) + ': Argus has sent a hunter after you. Outrun it — grab a car.');
    msgOnce('heat'); S.heat = Math.max(40, S.heat - 20); R.hunterCd = 45; beep(100, .4);
  }
  S.heat = Math.min(S.heat, 120);
  if ((hudT -= dt) <= 0) { hudT = .12; R.inRange = hostsInRange(); drawHud(); }
}

// ---------- rendering
function draw() {
  const P = R.P, g = ctx;
  const cx = Math.round(clamp(P.x - VW / 2, 0, WPX - VW)), cy = Math.round(clamp(P.y - VH / 2, 0, WPX - VH));
  g.drawImage(City.map, cx, cy, VW, VH, 0, 0, VW, VH);
  g.save(); g.translate(-cx, -cy);
  const blink = Math.floor(R.t * 4) % 2;
  // locked zones
  for (const zk in ZONES) if (S.locked[zk]) {
    const z = zoneRect(zk); if (z.x > cx + VW || z.x + z.w < cx || z.y > cy + VH || z.y + z.h < cy) continue;
    g.fillStyle = 'rgba(255,40,80,.11)'; g.fillRect(z.x, z.y, z.w, z.h);
    g.fillStyle = 'rgba(255,61,110,.7)';
    const off = Math.floor(R.t * 12) % 8;
    for (let p = -off; p < z.w; p += 8) { g.fillRect(z.x + p, z.y, 4, 1); g.fillRect(z.x + p, z.y + z.h - 1, 4, 1); }
    for (let p = -off; p < z.h; p += 8) { g.fillRect(z.x, z.y + p, 1, 4); g.fillRect(z.x + z.w - 1, z.y + p, 1, 4); }
  }
  // host antennas
  for (const id of R.inRange) { const b = City.lm[HOSTS[id].lm], hs = S.hosts[id], x = Math.round(b.x + b.w / 2), y = b.y - 10;
    g.fillStyle = hs.backdoor ? '#7dffb0' : hs.scanned ? '#4de2ff' : '#ffc857'; g.fillRect(x, y + 4, 1, 3); if (blink) { g.fillRect(x - 2, y + 2, 5, 1); g.fillRect(x - 4, y, 9, 1); } }
  // markers
  const hsb = City.lm.hotslice;
  g.fillStyle = '#ff9f1c'; if (S.orders.length < Math.min(3, S.skates.rack)) { g.fillRect(hsb.dx - 2, hsb.dy - 2 - blink, 4, 4); }
  for (const o of S.orders) { const b = City.b[o.b]; g.fillStyle = o.t < 10 ? '#ff3d6e' : '#ffc857'; g.fillRect(b.dx - 2, b.dy - 8 - blink * 2, 5, 5); g.fillStyle = '#16171c'; g.fillRect(b.dx - 1, b.dy - 7 - blink * 2, 3, 3); g.fillStyle = '#ffc857'; g.fillRect(b.dx, b.dy - 2, 1, 2); }
  for (const id in PICKUPS) if (S.pickups[id] === 1) { const b = City.lm[PICKUPS[id].lm]; g.fillStyle = blink ? '#ffe680' : '#e8c33c'; g.fillRect(b.dx - 2, b.dy - 3, 3, 3); g.fillRect(b.dx + 1, b.dy - 2, 4, 1); g.fillRect(b.dx + 3, b.dy - 1, 1, 1); }
  // cars
  for (const c of R.cars) {
    if (c.x < cx - 20 || c.x > cx + VW + 20 || c.y < cy - 20 || c.y > cy + VH + 20) continue;
    const h = c.d % 2 === 0, w = h ? c.w : 8, ht = h ? 8 : c.w, x = Math.round(c.x - w / 2), y = Math.round(c.y - ht / 2), [dx, dy] = DIRS[c.d];
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 1, y + 1, w, ht);
    g.fillStyle = c.col; g.fillRect(x, y, w, ht);
    g.fillStyle = '#1b2430'; if (h) g.fillRect(x + (dx > 0 ? w - 6 : 3), y + 1, 3, ht - 2); else g.fillRect(x + 1, y + (dy > 0 ? ht - 6 : 3), w - 2, 3);
    g.fillStyle = '#fff3b0'; if (h) { g.fillRect(dx > 0 ? x + w - 1 : x, y, 1, 2); g.fillRect(dx > 0 ? x + w - 1 : x, y + ht - 2, 1, 2); } else { g.fillRect(x, dy > 0 ? y + ht - 1 : y, 2, 1); g.fillRect(x + w - 2, dy > 0 ? y + ht - 1 : y, 2, 1); }
    g.fillStyle = '#ff2a2a'; if (h) { g.fillRect(dx > 0 ? x : x + w - 1, y, 1, 2); g.fillRect(dx > 0 ? x : x + w - 1, y + ht - 2, 1, 2); } else { g.fillRect(x, dy > 0 ? y : y + ht - 1, 2, 1); g.fillRect(x + w - 2, dy > 0 ? y : y + ht - 1, 2, 1); }
  }
  // dogs
  for (const d of R.dogs) { const x = Math.round(d.x), y = Math.round(d.y), hot = d.chase || d.hunter;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 3, y + 3, 8, 1);
    g.fillStyle = hot ? '#ff3d6e' : '#aeb4c2'; g.fillRect(x - 4, y - 2, 8, 4);
    g.fillStyle = '#16171c'; g.fillRect(x - 4 + (blink ? 1 : 0), y + 2, 1, 2); g.fillRect(x + 2 + (blink ? 0 : 1), y + 2, 1, 2);
    g.fillStyle = hot ? '#fff' : '#ff3d6e'; g.fillRect(x + 2, y - 1, 1, 1);
    if (d.hunter && blink) { g.fillStyle = '#ff3d6e'; g.fillRect(x - 1, y - 6, 2, 2); } }
  // particles + tether + player
  for (const p of R.parts) { g.fillStyle = p.l > .2 ? '#4de2ff' : '#2a6f8a'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  if (P.latch) { g.strokeStyle = '#ffc857'; g.lineWidth = 1; g.beginPath(); g.moveTo(P.x, P.y - 1); g.lineTo(P.latch.x, P.latch.y); g.stroke(); }
  const px = Math.round(P.x), py = Math.round(P.y), moving = Math.hypot(P.vx, P.vy) > 8, step = moving && Math.floor(R.t * 8) % 2;
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(px - 3, py + 3, 6, 1);
  if (S.orders.length) { g.fillStyle = '#ff9f1c'; g.fillRect(px - 3 * P.face - 2, py - 3, 4, 3); g.fillStyle = '#c8402f'; g.fillRect(px - 3 * P.face - 2, py - 2, 4, 1); }
  g.fillStyle = '#4de2ff'; g.fillRect(px - 2, py - 2, 4, 4);
  g.fillStyle = '#f0c8a0'; g.fillRect(px - 1, py - 5, 3, 3); g.fillStyle = '#2a2f3a'; g.fillRect(px - 1, py - 5, 3, 1);
  g.fillStyle = '#e8e8f0'; g.fillRect(px - 2 + (step ? 1 : 0), py + 2, 2, 1); g.fillRect(px + (step ? 0 : 1), py + 2, 2, 1);
  g.restore();
  // offscreen pointers
  const ptr = (wx, wy, col) => { const sx = wx - cx, sy = wy - cy; if (sx > 4 && sx < VW - 4 && sy > 4 && sy < VH - 4) return; const x = clamp(sx, 5, VW - 6), y = clamp(sy, 5, VH - 6); g.fillStyle = '#16171c'; g.fillRect(x - 3, y - 3, 7, 7); g.fillStyle = col; g.fillRect(x - 2, y - 2, 5, 5); if (blink) { g.fillStyle = '#16171c'; g.fillRect(x - 1, y - 1, 3, 3); } };
  for (const o of S.orders) { const b = City.b[o.b]; ptr(b.dx, b.dy, o.t < 10 ? '#ff3d6e' : '#ffc857'); }
  if (S.orders.length < Math.min(3, S.skates.rack)) ptr(hsb.dx, hsb.dy, '#ff9f1c');
  if (trespassing(P.x, P.y) && blink) { g.fillStyle = 'rgba(255,40,80,.25)'; g.fillRect(0, 0, VW, 3); g.fillRect(0, VH - 3, VW, 3); g.fillRect(0, 0, 3, VH); g.fillRect(VW - 3, 0, 3, VH); }
}

function drawHud() {
  const P = R.P, q = quota(), m = Math.floor((DAY_LEN - S.t)), tres = trespassing(P.x, P.y);
  $('h-top').innerHTML = `<b>DAY ${S.day}</b><span class="dim">/${LAST_DAY}</span> <span class="${m < 60 ? 'bad' : ''}">${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}</span>
    · QUOTA <b class="${S.delivered >= q ? 'ok' : 'amber'}">${S.delivered}/${q}</b> · STRIKES <span class="bad">${'✕'.repeat(S.strikes)}</span><span class="dim">${'·'.repeat(Math.max(0, 3 - S.strikes))}</span>
    · <b class="amber">$${Math.floor(S.cash)}</b> · HEAT <span class="${S.heat >= 60 ? 'bad' : S.heat >= 30 ? 'amber' : 'ok'}">${Math.round(S.heat)}</span>${S.flags.knowsTap && S.flags.tap ? ' <span class="bad">[MIRRORED]</span>' : ''}`;
  $('h-orders').innerHTML = S.orders.map(o => `<div class="${o.t < 10 ? 'bad' : ''}">🍕 ${esc(City.b[o.b].addr)} <b>${Math.ceil(o.t)}s</b> $${o.pay}</div>`).join('') || '<div class="dim">no orders — back to HOT SLICE</div>';
  // context prompt
  const hs = City.lm.hotslice, atShop = Math.hypot(hs.dx - P.x, hs.dy - P.y) < 24;
  let near = null, nd = 30; for (const b of City.b) { const d = Math.hypot(b.dx - P.x, b.dy - P.y); if (d < nd) { nd = d; near = b; } }
  let c = [];
  if (tres) c.push('<span class="bad">!! COVENANT ZONE — K9 UNITS HUNTING !!</span>');
  if (atShop && S.orders.length < Math.min(3, S.skates.rack)) c.push('[E] load pizza');
  if (atShop && S.delivered >= q) c.push('[C] clock out early');
  for (const id in PICKUPS) if (S.pickups[id] === 1) { const b = City.lm[PICKUPS[id].lm]; if (Math.hypot(b.dx - P.x, b.dy - P.y) < 22) c.push('[E] take key'); }
  if (P.latch) c.push('[SPACE] release'); else if (R.cars.some(k => Math.hypot(k.x - P.x, k.y - P.y) < 24 + 7 * S.skates.grapple)) c.push('[SPACE] latch');
  if (R.inRange.length) c.push(`<span class="cyan">[TAB] deck — ${R.inRange.map(id => esc(HOSTS[id].name)).join(', ')} in range</span>`);
  $('h-ctx').innerHTML = c.join(' &nbsp; ');
  $('h-loc').innerHTML = `${ZONES[zoneKey(P.x, P.y)].name}${near ? ' · ' + esc(near.lm ? near.name : near.addr) : ''} · <span class="${Math.hypot(P.vx, P.vy) > 62 + S.skates.wheels * 9 + 5 ? 'cyan' : 'dim'}">${Math.round(Math.hypot(P.vx, P.vy))} px/s</span>`;
  // minimap
  const mg = $('mini').getContext('2d'); mg.drawImage(City.mini, 0, 0);
  for (const zk in ZONES) if (S.locked[zk]) { const z = zoneRect(zk); mg.fillStyle = 'rgba(255,30,70,.2)'; mg.fillRect(z.x / 16, z.y / 16, z.w / 16, z.h / 16); }
  mg.fillStyle = '#ff9f1c'; mg.fillRect(hs.dx / 16 - 1, hs.dy / 16 - 4, 9, 9);
  for (const id in PICKUPS) if (S.pickups[id] === 1) { const b = City.lm[PICKUPS[id].lm]; mg.fillStyle = '#ffe680'; mg.fillRect(b.dx / 16 - 1, b.dy / 16 - 3, 6, 6); }
  for (const id in HOSTS) { const H = HOSTS[id], b = City.lm[H.lm]; if (!b || H.kind !== 'wifi') continue; const st = S.hosts[id]; if (!(st.scanned || st.known || H.gate)) continue; mg.fillStyle = st.backdoor ? '#7dffb0' : '#4de2ff'; mg.fillRect((b.x + b.w / 2) / 16, (b.y + b.h / 2) / 16 - 1, 3, 3); }
  for (const o of S.orders) { const b = City.b[o.b]; mg.fillStyle = '#ffc857'; mg.fillRect(b.dx / 16 - 1, b.dy / 16 - 3, 6, 6); }
  for (const d of R.dogs) if (d.chase || d.hunter) { mg.fillStyle = '#ff3d6e'; mg.fillRect(d.x / 16, d.y / 16 - 1, 3, 3); }
  mg.fillStyle = '#fff'; mg.fillRect(P.x / 16 - 1, P.y / 16 - 3, 6, 6);
}

// ---------- loop & input
function frame(t) {
  const dt = Math.min(.05, (t - lastT) / 1000 || 0); lastT = t;
  if (mode === 'play') { update(dt); if (mode !== 'title' && S) draw(); }
  else if (mode === 'deck') { Deck.update(dt); if ((hudT -= dt) <= 0) { hudT = .25; drawHud(); } }
  requestAnimationFrame(frame);
}
function fit() {
  const s = Math.min(innerWidth / VW, innerHeight / VH), sc = s >= 2 ? Math.floor(s) : s;
  const w = $('wrap'); w.style.width = VW * sc + 'px'; w.style.height = VH * sc + 'px'; w.style.setProperty('--s', sc);
}
addEventListener('keydown', e => {
  const typing = e.target.tagName === 'INPUT';
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'play') { R.P.vx = R.P.vy = 0; R.P.latch = null; Deck.open(); } else if (mode === 'deck') Deck.close(); return; }
  if (e.code === 'Escape') { if (Deck.readerOpen) Deck.closeReader(); else if (mode === 'deck') Deck.close(); return; }
  if (typing) return;
  if (mode === 'deck' && Deck.readerOpen && (e.code === 'Enter' || e.code === 'Space')) { Deck.closeReader(); e.preventDefault(); return; }
  if (mode !== 'play') return;
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  K[e.code] = 1;
  if (e.code === 'Space') toggleLatch();
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyC') clockOut();
});
addEventListener('keyup', e => { K[e.code] = 0; });
addEventListener('blur', () => { for (const k in K) K[k] = 0; });
addEventListener('resize', fit);
addEventListener('beforeunload', () => { if (mode === 'play' || mode === 'deck') save(); });
addEventListener('load', () => {
  cv = $('cv'); ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  genCity(); fit(); $('mini').width = $('mini').height = WT;
  if (loadSave()) $('btn-cont').classList.remove('hidden');
  requestAnimationFrame(frame);
});
