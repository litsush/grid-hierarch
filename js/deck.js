// GRID: HIERARCH — the deck: network sessions, password tree, bot arena, mail, market, shops, keychain.
'use strict';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

function botStats(b) {
  const r = S.rig;
  return { hp: (70 + b.core * 35) * (1 + .08 * (r.cool - 1)), atk: (7 + b.ring * 4) * (1 + .1 * (r.cpu - 1)), acc: 150 + b.tip * 45, r: 10 + b.core * 1.5, decay: 1.5 / (1 + .25 * (r.cool - 1)), blades: 2 + b.ring };
}
function iceStats(L) { return { hp: 55 + L * 36, atk: 5 + L * 4.2, acc: 140 + L * 40, r: 10 + L * 1.5, decay: 1.2, blades: 3 + L }; }
const maxBots = () => 1 + S.rig.ram * 2;
const partCost = t => 60 * t * t;
const botCost = () => 120 + 60 * S.bots.length;

function chainMult(target) {
  let m = 1;
  for (const h of S.chain) if (h !== target && S.hosts[h].backdoor) m += .5;
  if (S.tor && S.soft.onion && !S.flags.tap) m *= 2.5;
  return m;
}
function reachable(id) {
  const H = HOSTS[id], hs = S.hosts[id];
  if (H.kind === 'tor') return hs.known && S.soft.onion > 0;
  return hostInRange(id) || hs.backdoor || (H.kind === 'pub' && hs.known);
}

const ACTIONS = [
  { id: 'gate', gate: true, lvl: 2, per: 'ever', label: 'DISABLE K9 PERIMETER', fn(id) { unlockZone(HOSTS[id].gate); } },
  { id: 'padlog', host: 'mozza-hr', lvl: 1, per: 'day', label: 'Pad delivery log (+1 delivery today)', fn() { S.delivered++; toast('Delivery log padded.'); } },
  { id: 'void', host: 'mozza-hr', lvl: 2, per: 'ever', label: 'Void all strikes on indenture 7741', fn() { S.strikes = 0; toast('Strikes voided.'); } },
  { id: 'freeze', host: 'mozza-hr', lvl: 2, per: 'ever', label: 'Freeze quota escalation', fn() { S.flags.freezeQ = quota(); toast('Quota frozen at ' + S.flags.freezeQ + '.'); } },
  { id: 'untap', host: 'noc', lvl: 1, per: 'ever', label: 'Subscriber 7741: switch MIRROR off', fn() { S.flags.tap = 0; msg('untap'); } },
  { id: 'lease', host: 'noc', lvl: 1, per: 'day', label: 'Purge retained flow records (-25 heat)', fn() { S.heat = Math.max(0, S.heat - 25); toast('Records purged.'); } },
  { id: 'correlate', host: 'noc', lvl: 1, per: 'ever', label: 'Run "correlate" on forum user nullsaint', cond: () => S.flags.nullsaint, why: 'no target', fn() { S.hosts.castellanos.known = true; S.hosts.castellanos.users.wren = 1; S.profile.wren = S.profile.wren || []; msg('found'); } },
  { id: 'skim', host: 'vanta-desk', lvl: 1, per: 'day', label: 'Skim rounding errors (+$300, +8 heat)', fn() { S.cash += 300; S.heat += 8; toast('+$300'); } },
  { id: 'override', host: 'argus-core', lvl: 2, per: 'ever', label: 'MASTER OVERRIDE: stand down all K9 perimeters', fn() { for (const zk in ZONES) if (S.locked[zk]) unlockZone(zk, true); toast('Every perimeter in the city is down.'); } },
  { id: 'retask', host: 'argus-core', lvl: 2, per: 'ever', label: 'Cancel hunter dispatch on tag 7741', fn() { S.flags.retask = 1; toast('Hunters will no longer be sent after you.'); } },
  { id: 'end', host: 'hierarch', lvl: 2, per: 'ever', label: 'LEAK EVERYTHING · PURGE HIERARCH', fn() { endGame('win'); } },
];

const Deck = {
  tab: 'net', sess: null, readerOpen: false, t: 0,

  open() { mode = 'deck'; $('deck').classList.remove('hidden'); R.inRange = hostsInRange(); this.render(); },
  close() { if (this.sess) this.disconnect(true); this.closeReader(); if (mode === 'deck') mode = 'play'; $('deck').classList.add('hidden'); save(); },
  setTab(t) { this.tab = t; this.render(); },

  render() {
    const unread = S.phone.filter(m => m.unread).length;
    const tabs = [['net', 'NET'], ['mail', 'MAIL' + (unread ? ' (' + unread + ')' : '')], ['hier', 'HIERARCHY'], ['market', 'MARKET'], ['bots', 'BOTS'], ['rig', 'RIG + SHOP'], ['keys', 'KEYCHAIN']];
    $('tabs').innerHTML = tabs.map(([k, n]) => `<button class="tab ${this.tab === k ? 'on' : ''}" onclick="Deck.setTab('${k}')">${n}</button>`).join('') +
      `<span class="sp"></span><span class="amber">$${Math.floor(S.cash)}</span><span>HEAT ${Math.round(S.heat)}</span><button class="tab" onclick="Deck.close()">CLOSE [TAB]</button>`;
    $('dbody').innerHTML = this['r_' + this.tab]();
    if (this.tab === 'market') this.drawSparks();
    if (this.tab === 'keys') this.drawKeys();
  },

  // ================= NET =================
  hostRow(id) {
    const H = HOSTS[id], hs = S.hosts[id], on = this.sess && this.sess.id === id;
    const st = hs.backdoor ? '<span class="ok">BACKDOOR</span>' : hs.lockDay === S.day ? '<span class="bad">LOCKED OUT</span>' : hs.scanned ? 'fw x' + (H.fw.length + (hs.alert || 0)) : 'unscanned';
    return `<div class="row host ${on ? 'on' : ''}" onclick="Deck.connect('${id}')"><b>${esc(H.name)}</b><span>${H.corp} · ${st}</span></div>`;
  },
  r_net() {
    const inr = R.inRange, rem = Object.keys(HOSTS).filter(id => !inr.includes(id) && reachable(id));
    const hops = Object.keys(HOSTS).filter(id => S.hosts[id].backdoor);
    const tgt = this.sess ? this.sess.id : null;
    let h = `<div class="cols"><div class="col L">
      <h3>IN WIFI RANGE</h3>${inr.length ? inr.map(id => this.hostRow(id)).join('') : '<p class="dim">Nothing. Skate closer to an antenna.</p>'}
      <h3>REMOTE</h3>${rem.length ? rem.map(id => this.hostRow(id)).join('') : '<p class="dim">No known remote hosts.</p>'}
      <h3>PROXY CHAIN</h3>
      <p class="dim">Route through machines you own. Each hop slows a trace.</p>
      ${hops.map(id => `<label class="row"><input type="checkbox" ${S.chain.includes(id) ? 'checked' : ''} onchange="Deck.toggleHop('${id}')"> ${esc(HOSTS[id].name)}</label>`).join('') || '<p class="dim">No backdoors yet. Root a host and install one.</p>'}
      ${S.soft.onion ? `<label class="row"><input type="checkbox" ${S.tor ? 'checked' : ''} onchange="S.tor=!S.tor;Deck.render()"> ONION circuit</label>` : ''}
      <p>YOU ${S.chain.filter(c => S.hosts[c].backdoor && c !== tgt).map(c => '→ <span class="cyan">' + esc(HOSTS[c].name) + '</span> ').join('')}${S.tor && S.soft.onion ? '→ <span class="cyan">onion</span> ' : ''}→ TARGET</p>
      <p>trace time <b class="amber">x${chainMult(tgt).toFixed(1)}</b></p>
      ${S.flags.knowsTap && S.flags.tap ? '<p class="bad">! YOUR LINE IS MIRRORED: +heat on every connection, ONION has no effect.</p>' : ''}
    </div><div class="col R" id="sess">${this.r_sess()}</div></div>`;
    return h;
  },
  r_sess() {
    const s = this.sess;
    if (!s) return `<p class="dim">No session.<br><br>Pick a host. Guess a password if you know the person. Grow a DENDRITE tree if you know a little. BREACH with bots if you know nothing.<br><br>The trace clock only runs while you are intruding — and so does the delivery clock. Wipe logs before you leave.</p>`;
    const H = HOSTS[s.id], hs = S.hosts[s.id];
    let h = `<div class="shead"><b>${esc(H.name)}</b> <span class="dim">${H.addr} · ${esc(H.os)}</span>
      <span class="badge ${s.access ? 'ok' : ''}">${s.access === 2 ? 'ROOT' : s.access === 1 ? 'USER: ' + esc(s.user) : 'NO ACCESS'}</span>${s.hard ? '<span class="badge ok">HARDLINE</span>' : ''}</div>
      <div class="bar" title="trace"><i id="trb" style="width:${s.trace * 100}%"></i><span id="trt">TRACE ${Math.floor(s.trace * 100)}%</span></div>
      <div class="log">${s.log.slice(-6).map(l => `<div class="${l[1] || ''}">&gt; ${esc(l[0])}</div>`).join('')}</div>`;
    if (s.phase === 'crack' || s.phase === 'battle') {
      h += `<canvas id="viz" width="560" height="330" ${s.phase === 'battle' ? 'onmousedown="Deck.surge(event)"' : ''}></canvas>
        <div class="btns"><span class="dim">${s.phase === 'battle' ? 'Click the arena to SURGE your bots toward a point.' : 'Each leaf is a guess built from what you know about them.'}</span><button onclick="Deck.abort()">ABORT</button></div>`;
    } else if (s.phase === 'wipe' || s.phase === 'bd') {
      h += `<p>${s.phase === 'wipe' ? 'Wiping logs' : 'Installing backdoor'}…</p><div class="bar"><i id="pgb" class="g" style="width:0%"></i></div>`;
    } else if (!s.access) {
      const users = Object.keys(hs.users);
      h += `<h3>ACCOUNTS</h3>`;
      h += users.length ? users.map(u => `<div class="row"><b style="min-width:9em">${esc(u)}</b>
        <input id="pw_${u}" placeholder="${hs.creds[u] ? '(saved)' : 'password'}" autocomplete="off" spellcheck="false" onkeydown="if(event.key==='Enter')Deck.login('${u}')">
        <button onclick="Deck.login('${u}')">LOGIN</button>
        ${S.soft.dendrite ? `<button onclick="Deck.crack('${u}')">DENDRITE</button>` : ''}</div>`).join('') : '<p class="dim">You don\'t know any usernames here. Read more mail — or go through the firewall.</p>';
      const n = H.fw.length + (hs.alert || 0);
      h += `<h3>FIREWALL</h3><div class="btns"><button onclick="Deck.breach()" ${S.bots.length ? '' : 'disabled'}>BREACH — ${n} ICE bot${n === 1 ? '' : 's'} (lvl ${Math.max(0, ...H.fw)}) vs your ${S.bots.length}</button>
        <button onclick="Deck.disconnect()">DISCONNECT</button></div>`;
    } else {
      const files = FILES.filter(f => f.host === s.id && (s.access === 2 || f.user === '*' || f.user === s.user));
      h += `<h3>FILES</h3>` + (files.map(f => `<div class="row file ${S.read[f.id] ? 'dim' : ''}" onclick="Deck.read('${f.id}')">${S.read[f.id] ? '·' : '<span class="amber">●</span>'} <b>${esc(f.subj)}</b><span>${esc(f.from)}</span></div>`).join('') || '<p class="dim">Nothing of interest.</p>');
      const acts = ACTIONS.filter(a => (a.gate && H.gate) || a.host === s.id);
      if (acts.length) h += `<h3>CONTROLS</h3>` + acts.map(a => {
        const key = a.id + ':' + s.id, done = a.per === 'ever' ? S.done[key] : S.doneDay[key];
        const no = s.access < a.lvl ? 'needs root' : done ? (a.per === 'day' ? 'done today' : 'done') : (a.cond && !a.cond()) ? a.why : '';
        return `<div class="row"><button ${no ? 'disabled' : ''} onclick="Deck.act('${a.id}')">${esc(a.label)}</button><span class="dim">${no}</span></div>`;
      }).join('');
      h += `<h3>SESSION</h3><div class="btns">
        <button onclick="Deck.wipe()" ${s.dirty ? '' : 'disabled'}>WIPE LOGS${s.dirty ? '' : ' (clean)'}</button>
        ${s.access === 2 && !hs.backdoor && !H.open ? '<button onclick="Deck.backdoor()">INSTALL BACKDOOR</button>' : ''}
        <button onclick="Deck.disconnect()">DISCONNECT${s.dirty ? ' (logs dirty!)' : ''}</button></div>`;
    }
    return h;
  },
  slog(t, c) { if (this.sess) this.sess.log.push([t, c]); },
  toggleHop(id) { const i = S.chain.indexOf(id); if (i >= 0) S.chain.splice(i, 1); else S.chain.push(id); this.render(); },

  connect(id) {
    const H = HOSTS[id], hs = S.hosts[id];
    if (this.sess && this.sess.id === id) return;
    if (this.sess) this.disconnect(true);
    if (!reachable(id)) { toast('Out of range.'); return; }
    if (hs.lockDay === S.day) { toast(H.name + ' has locked you out until tomorrow.'); return; }
    if (H.needKey && !hasKey(H.needKey)) { toast(H.name + ' refuses the handshake. It wants a maintenance token.'); beep(110, .2); return; }
    const hard = !!(H.hardKey && hasKey(H.hardKey) && hostInRange(id));
    this.sess = { id, phase: 'idle', trace: 0, tracing: false, log: [], user: null, access: 0, dirty: false, hard, pt: 0, pd: 1 };
    hs.scanned = true;
    if (S.flags.tap && H.kind !== 'tor') S.heat += 3;
    this.slog(`connected to ${H.name} [${H.addr}]`);
    this.slog(`${H.os} · firewall: ${H.fw.length + (hs.alert || 0)} ICE · trace window ${Math.round(H.trace * chainMult(id))}s`);
    if (hard) this.slog('physical key used — hardline. nothing to trace.', 'ok');
    if (hs.backdoor) { this.sess.access = 2; this.sess.user = 'root'; this.slog('backdoor key accepted. root shell.', 'ok'); }
    else if (H.open) { this.sess.access = 1; this.sess.user = 'guest'; this.slog('public board. reading as guest.', 'ok'); }
    beep(660, .05); this.render();
  },
  grant(user, root) {
    const s = this.sess; s.access = root ? 2 : 1; s.user = user; s.dirty = true; s.phase = 'idle';
    this.slog(root ? 'ROOT ACCESS.' : 'logged in as ' + user + '.', 'ok');
    R.rooted = (R.rooted || 0) + 1; S.stats.owned[s.id] = 1;
    if (Object.keys(S.stats.owned).length >= 3 && !S.flags.knowsTap) msgOnce('loud');
    beep(880, .12); this.render();
  },
  login(u) {
    const s = this.sess, H = HOSTS[s.id], hs = S.hosts[s.id], U = H.users[u], inp = $('pw_' + u);
    const guess = (inp ? inp.value : '').trim().toLowerCase();
    s.tracing = true;
    if (hs.creds[u] && !guess || guess === U.pw) { hs.creds[u] = 1; this.slog('password accepted for ' + u); this.grant(u, U.root); }
    else if (!guess) { toast('Type a password.'); }
    else { s.trace = Math.min(1, s.trace + .1); this.slog(`"${guess}" rejected. failed logins get noticed.`, 'bad'); beep(140, .15); this.render(); const i2 = $('pw_' + u); if (i2) i2.focus(); }
  },

  // ---- DENDRITE: a tree whose leaves are guesses
  crack(u) {
    const s = this.sess, U = HOSTS[s.id].users[u];
    const toks = [...new Set([...(S.profile[U.person] || []), ...COMMON])];
    const n = Math.pow(toks.length, Math.min(2, U.parts.length)) * U.parts.length + toks.length;
    const can = U.parts.every(p => toks.includes(p));
    s.crack = { u, toks, n, can, target: can ? Math.floor(n * (.3 + .5 * hashStr(U.pw))) : -1, tested: 0, el: 0, rate: 8 * Math.pow(2, S.rig.gpu - 1) * (1 + .6 * (S.soft.dendrite - 1)), found: 0 };
    s.phase = 'crack'; s.tracing = true;
    this.slog(`DENDRITE: ${toks.length} seeds, ${n} leaves, ${s.crack.rate.toFixed(0)}/s`);
    this.render();
  },
  cand(c, i) {
    if (i === c.target) return HOSTS[this.sess.id].users[c.u].pw;
    const k = (i * 7919 + 13) % c.n, L = c.toks.length;
    return k < L ? c.toks[k] : c.toks[k % L] + c.toks[Math.floor(k / L) % L];
  },
  drawTree(g, W, H) {
    const c = this.sess.crack, t = this.t, depth = 5, leaves = [];
    g.fillStyle = '#070a0e'; g.fillRect(0, 0, W, H);
    const grow = Math.min(1, c.el / 1.2);
    const br = (x, y, a, len, d, idx) => {
      const x2 = x + Math.cos(a) * len * grow, y2 = y + Math.sin(a) * len * grow;
      g.strokeStyle = d > 2 ? '#6b4a2e' : '#4f6b3a'; g.lineWidth = Math.max(1, d * 1.3);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      if (!d) { leaves.push([x2, y2, idx]); return; }
      const sw = Math.sin(t * 1.4 + d * 1.7 + idx) * .04, sp = .33 + d * .035;
      br(x2, y2, a - sp + sw, len * .78, d - 1, idx * 2); br(x2, y2, a + sp + sw, len * .78, d - 1, idx * 2 + 1);
    };
    br(W / 2, H - 6, -Math.PI / 2, H * .25, depth, 0);
    const base = Math.floor(Math.min(c.tested, c.n - 1) / 32) * 32;
    g.font = '10px monospace'; g.textAlign = 'center';
    for (const [x, y, k] of leaves) {
      const ci = base + k; if (ci >= c.n) continue;
      const hit = c.found && ci === c.target, done = ci < Math.floor(c.tested);
      g.fillStyle = hit ? '#7dffb0' : done ? '#5a3b2a' : ci === Math.floor(c.tested) ? '#ffc857' : '#2e9a5a';
      g.fillRect(x - 2, y - 2, 4, 4);
      if (hit) { g.font = 'bold 15px monospace'; g.fillText(this.cand(c, ci), x, y - 8); g.font = '10px monospace'; }
      else if (!c.found) g.fillText(this.cand(c, ci), x, y - 5 - (k % 3) * 9 + (done ? (this.t * 20 + k * 7) % 14 : 0));
    }
    g.textAlign = 'left'; g.fillStyle = '#9fe8c5';
    g.fillText(`leaves ${Math.floor(c.tested)}/${c.n}`, 8, 14);
    if (!c.can) { g.fillStyle = '#ff3d6e'; g.fillText('thin seed set — you may not know this person well enough', 8, 28); }
  },

  // ---- BREACH: bots vs ICE
  breach() {
    const s = this.sess, H = HOSTS[s.id], hs = S.hosts[s.id];
    const lv = [...H.fw]; for (let i = 0; i < (hs.alert || 0); i++) lv.push(Math.max(1, ...H.fw));
    if (!lv.length) { this.grant('root', true); return; }
    const bots = [], cx = 280, cy = 165;
    S.bots.forEach((b, i) => { const st = botStats(b), a = Math.PI + (i - (S.bots.length - 1) / 2) * .42; bots.push({ team: 0, name: b.name, ...st, max: st.hp, x: cx + Math.cos(a) * 110, y: cy + Math.sin(a) * 110, vx: 0, vy: 0, ang: 0, orb: i % 2 ? 1 : -1 }); });
    lv.forEach((L, i) => { const st = iceStats(L), a = (i - (lv.length - 1) / 2) * .42; bots.push({ team: 1, name: 'ICE' + L, ...st, max: st.hp, x: cx + Math.cos(a) * 110, y: cy + Math.sin(a) * 110, vx: 0, vy: 0, ang: 0, orb: i % 2 ? 1 : -1 }); });
    s.battle = { bots, sparks: [], cd: 0, over: 0 };
    s.phase = 'battle'; s.tracing = true;
    this.slog(`BREACH: ${S.bots.length} bot(s) vs ${lv.length} ICE`);
    this.render();
  },
  surge(ev) {
    const B = this.sess && this.sess.battle; if (!B || B.cd > 0) return;
    const r = ev.target.getBoundingClientRect(), x = (ev.clientX - r.left) * 560 / r.width, y = (ev.clientY - r.top) * 330 / r.height;
    for (const b of B.bots) if (!b.team && b.hp > 0) { const d = Math.hypot(x - b.x, y - b.y) || 1; b.vx += (x - b.x) / d * 240; b.vy += (y - b.y) / d * 240; }
    B.cd = 1.2; B.ping = [x, y, .4]; beep(520, .04);
  },
  stepBattle(dt) {
    const B = this.sess.battle, cx = 280, cy = 165, RAD = 155, live = B.bots.filter(b => b.hp > 0);
    B.cd -= dt; if (B.ping) { B.ping[2] -= dt; if (B.ping[2] <= 0) B.ping = null; }
    for (const b of live) {
      let e = null, bd = 1e9;
      for (const o of live) if (o.team !== b.team) { const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; e = o; } }
      if (e) { const dx = (e.x - b.x) / bd, dy = (e.y - b.y) / bd; b.vx += (dx - dy * .12 * b.orb) * b.acc * dt; b.vy += (dy + dx * .12 * b.orb) * b.acc * dt; }
      b.vx *= 1 - .9 * dt; b.vy *= 1 - .9 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      const d = Math.hypot(b.x - cx, b.y - cy);
      if (d > RAD - b.r) { const nx = (b.x - cx) / d, ny = (b.y - cy) / d, vn = b.vx * nx + b.vy * ny; b.x = cx + nx * (RAD - b.r); b.y = cy + ny * (RAD - b.r); if (vn > 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; b.hp -= 1.5; } }
      b.hp -= b.decay * dt; b.ang += (6 + 22 * Math.max(0, b.hp) / b.max) * dt * b.orb;
    }
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ov = a.r + b.r - d;
      if (ov <= 0) continue;
      const nx = dx / d, ny = dy / d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rel <= 0) continue;
      const ma = a.r * a.r, mb = b.r * b.r, imp = 1.9 * rel / (1 / ma + 1 / mb);
      a.vx -= imp / ma * nx; a.vy -= imp / ma * ny; b.vx += imp / mb * nx; b.vy += imp / mb * ny;
      if (a.team !== b.team) {
        const k = .4 + rel / 160; a.hp -= b.atk * k; b.hp -= a.atk * k;
        for (let n = 0; n < 6; n++) B.sparks.push({ x: a.x + nx * a.r, y: a.y + ny * a.r, vx: (Math.random() - .5) * 220, vy: (Math.random() - .5) * 220, l: .3 });
        beep(200 + Math.random() * 300, .02, .03);
      }
    }
    for (const p of B.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; }
    B.sparks = B.sparks.filter(p => p.l > 0);
    const mine = B.bots.some(b => !b.team && b.hp > 0), ice = B.bots.some(b => b.team && b.hp > 0);
    if (!ice) { this.slog('firewall shredded.', 'ok'); this.grant('root', true); }
    else if (!mine) { this.slog('all bots down. the firewall holds.', 'bad'); S.heat += 5; this.sess.phase = 'idle'; beep(110, .3); this.render(); }
  },
  drawBattle(g, W, H) {
    const B = this.sess.battle, cx = 280, cy = 165;
    g.fillStyle = '#070a0e'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1f3a34'; g.lineWidth = 1;
    for (let r = 35; r <= 155; r += 40) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
    g.strokeStyle = '#9fe8c5'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 157, 0, 7); g.stroke();
    if (B.ping) { g.strokeStyle = '#4de2ff'; g.beginPath(); g.arc(B.ping[0], B.ping[1], (0.4 - B.ping[2]) * 60, 0, 7); g.stroke(); }
    for (const b of B.bots) {
      if (b.hp <= 0) { g.fillStyle = '#22262e'; g.fillRect(b.x - 2, b.y - 2, 4, 4); continue; }
      const col = b.team ? '#ff3d6e' : '#4de2ff';
      g.save(); g.translate(b.x, b.y); g.rotate(b.ang);
      g.strokeStyle = col; g.lineWidth = 3;
      for (let k = 0; k < b.blades; k++) { const a = k / b.blades * 6.283; g.beginPath(); g.moveTo(Math.cos(a) * b.r * .4, Math.sin(a) * b.r * .4); g.lineTo(Math.cos(a + .5) * (b.r + 2), Math.sin(a + .5) * (b.r + 2)); g.stroke(); }
      g.fillStyle = '#10141a'; g.beginPath();
      if (b.team) { for (let k = 0; k < 6; k++) g.lineTo(Math.cos(k * 1.047) * b.r * .8, Math.sin(k * 1.047) * b.r * .8); } else g.arc(0, 0, b.r * .8, 0, 7);
      g.closePath(); g.fill(); g.lineWidth = 2; g.stroke();
      g.fillStyle = col; g.fillRect(-2, -2, 4, 4);
      g.restore();
      g.strokeStyle = b.team ? '#ffb0c4' : '#b8f4ff'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r + 5, -1.57, -1.57 + 6.283 * b.hp / b.max); g.stroke();
    }
    g.fillStyle = '#ffd97a'; for (const p of B.sparks) g.fillRect(p.x, p.y, 2, 2);
    g.font = '11px monospace'; g.fillStyle = '#4de2ff'; g.textAlign = 'left'; g.fillText('YOURS ' + B.bots.filter(b => !b.team && b.hp > 0).length, 8, 14);
    g.fillStyle = '#ff3d6e'; g.textAlign = 'right'; g.fillText('ICE ' + B.bots.filter(b => b.team && b.hp > 0).length, W - 8, 14);
    g.textAlign = 'left'; g.fillStyle = B.cd > 0 ? '#444' : '#9fe8c5'; g.fillText(B.cd > 0 ? 'surge recharging' : 'SURGE READY', 8, H - 8);
  },

  abort() { const s = this.sess; s.phase = 'idle'; this.slog('aborted.'); this.render(); },
  read(fid) {
    const f = FILES.find(x => x.id === fid);
    if (this.sess && this.sess.id === f.host && !HOSTS[f.host].open) this.sess.dirty = true;
    if (!S.read[fid]) {
      S.read[fid] = 1;
      for (const p in f.tok || {}) { const a = S.profile[p] = S.profile[p] || []; for (const t of f.tok[p]) if (!a.includes(t)) a.push(t); }
      applyFx(f.fx);
    }
    $('reader').innerHTML = `<div class="paper"><div class="dim">${f.kind === 'doc' ? 'DOCUMENT' : f.kind === 'post' ? 'FORUM POST' : 'EMAIL'} · ${esc(HOSTS[f.host].name)}</div>
      <div><span class="dim">from</span> ${esc(f.from)}${f.to ? ' <span class="dim">to</span> ' + esc(f.to) : ''}</div><h2>${esc(f.subj)}</h2><pre>${esc(f.body)}</pre>
      <div class="btns"><button onclick="Deck.closeReader()">CLOSE [ESC]</button></div></div>`;
    $('reader').classList.remove('hidden'); this.readerOpen = true;
    this.render();
  },
  closeReader() { $('reader').classList.add('hidden'); this.readerOpen = false; },
  act(aid) {
    const a = ACTIONS.find(x => x.id === aid), s = this.sess, key = aid + ':' + s.id;
    if (a.per === 'ever') S.done[key] = 1; else S.doneDay[key] = 1;
    s.dirty = true; this.slog('executed: ' + a.label, 'ok'); beep(740, .1);
    a.fn(s.id);
    if (mode === 'deck') this.render();
  },
  wipe() { const s = this.sess; s.phase = 'wipe'; s.pt = 0; s.pd = 5 / (1 + .4 * (S.rig.cpu - 1)) / (1 + 1.2 * S.soft.scrub); this.render(); },
  backdoor() { const s = this.sess; s.phase = 'bd'; s.pt = 0; s.pd = 3; s.dirty = true; this.render(); },
  disconnect(quiet) {
    const s = this.sess; if (!s) return;
    const hs = S.hosts[s.id];
    if (s.dirty) { S.heat += 12; if (hs.backdoor) hs.exposed = true; toast('You left dirty logs on ' + HOSTS[s.id].name + '. +12 heat' + (hs.backdoor ? ' — and they will find your backdoor by morning.' : '.')); }
    this.sess = null; if (!quiet) this.render();
  },
  burned() {
    const s = this.sess, hs = S.hosts[s.id];
    S.heat += 25; hs.alert = (hs.alert || 0) + 1; hs.lockDay = S.day;
    let extra = '';
    const hop = [...S.chain].reverse().find(h => h !== s.id && S.hosts[h].backdoor);
    if (hop) { S.hosts[hop].backdoor = false; S.chain = S.chain.filter(h => h !== hop); S.keys = S.keys.filter(k => k !== 'bd:' + hop); extra = ' Proxy ' + HOSTS[hop].name + ' burned.'; }
    this.sess = null; beep(90, .5);
    toast('TRACED. +25 heat. ' + HOSTS[s.id].name + ' hardens its firewall and locks you out for the day.' + extra);
    this.render();
  },

  update(dt) {
    this.t += dt;
    const s = this.sess;
    if (s) {
      const H = HOSTS[s.id], busy = s.phase !== 'idle';
      if (s.tracing || busy) advanceClock(dt);
      if (mode !== 'deck' || this.sess !== s) return;
      if (s.tracing && !s.hard && !H.open) {
        let rate = 1 / (H.trace * chainMult(s.id));
        if (!busy) rate *= s.access ? .3 : .5;
        s.trace += rate * dt;
        if (s.trace >= 1) { this.burned(); return; }
      }
      const tb = $('trb'); if (tb) { tb.style.width = (s.trace * 100) + '%'; $('trt').textContent = (s.hard ? 'HARDLINE — NO TRACE ' : 'TRACE ') + Math.floor(s.trace * 100) + '%'; }
      const cv = $('viz');
      if (s.phase === 'crack') {
        const c = s.crack; c.el += dt;
        if (!c.found) {
          c.tested += c.rate * dt;
          if (c.can && c.tested > c.target) { c.found = 1.2; c.tested = c.target; beep(990, .2); }
          else if (c.tested >= c.n) { this.slog('tree exhausted. you need to know more about this person.', 'bad'); s.phase = 'idle'; this.render(); return; }
        } else { c.found -= dt; if (c.found <= 0) { const U = HOSTS[s.id].users[c.u]; S.hosts[s.id].creds[c.u] = 1; this.slog('DENDRITE found it: ' + U.pw, 'ok'); this.grant(c.u, U.root); return; } }
        if (cv) this.drawTree(cv.getContext('2d'), 560, 330);
      } else if (s.phase === 'battle') {
        this.stepBattle(Math.min(dt, .033));
        if (this.sess === s && s.phase === 'battle' && cv) this.drawBattle(cv.getContext('2d'), 560, 330);
      } else if (s.phase === 'wipe' || s.phase === 'bd') {
        s.pt += dt; const pb = $('pgb'); if (pb) pb.style.width = Math.min(100, s.pt / s.pd * 100) + '%';
        if (s.pt >= s.pd) {
          if (s.phase === 'wipe') { s.dirty = false; s.tracing = false; s.trace = 0; this.slog('logs clean. trace lost.', 'ok'); }
          else { const hs = S.hosts[s.id]; hs.backdoor = true; hs.exposed = false; if (!S.chain.includes(s.id)) S.chain.push(s.id); addKey('bd:' + s.id); this.slog('backdoor installed. key added to your keychain; host added to proxy chain.', 'ok'); }
          s.phase = 'idle'; beep(700, .08); this.render();
        }
      }
    }
    if (this.tab === 'bots') this.drawBots();
  },

  // ================= MAIL =================
  r_mail() {
    for (const m of S.phone) m.unread = false;
    const texts = S.phone.map(m => `<div class="txt"><b class="${m.from === 'DALE' ? 'bad' : 'cyan'}">${esc(m.from)}</b> <span class="dim">day ${m.day}</span><br>${esc(m.body)}</div>`).join('');
    const read = FILES.filter(f => S.read[f.id]);
    return `<div class="cols"><div class="col L wide"><h3>PHONE</h3>${texts}</div><div class="col R"><h3>ARCHIVE — everything you've read</h3>
      ${read.map(f => `<div class="row file" onclick="Deck.read('${f.id}')"><b>${esc(f.subj)}</b><span>${esc(HOSTS[f.host].name)}</span></div>`).join('') || '<p class="dim">Nothing yet. Mail you read on hacked hosts is kept here.</p>'}</div></div>`;
  },

  // ================= HIERARCHY =================
  r_hier() {
    const o = S.own;
    const corp = c => {
      const ppl = Object.keys(PEOPLE).filter(p => PEOPLE[p].corp === c.id && S.profile[p]);
      const hosts = Object.keys(HOSTS).filter(h => HOSTS[h].corp === c.id && (S.hosts[h].scanned || S.hosts[h].known));
      return `<div class="node"><b>${esc(c.name)}</b> <span class="dim">${c.id}${c.own && o[c.own] ? ' · ' + OWN_NOTE[c.own] : ''}</span>
        ${ppl.map(p => `<div class="leaf"><span class="cyan">${esc(PEOPLE[p].name)}</span> <span class="dim">${esc(PEOPLE[p].role)}</span><br>known: ${S.profile[p].length ? S.profile[p].map(t => `<code>${esc(t)}</code>`).join(' ') : '<span class="dim">nothing useful yet</span>'}</div>`).join('')}
        ${hosts.map(h => `<div class="leaf dim">⌂ ${esc(HOSTS[h].name)} ${S.hosts[h].backdoor ? '<span class="ok">owned</span>' : ''}</div>`).join('')}</div>`;
    };
    const kids = CORPS.filter(c => c.own), under = kids.filter(c => o[c.own]), free = kids.filter(c => !o[c.own]);
    const f = CORPS[0];
    let h = `<div class="cols"><div class="col R"><h3>WHO OWNS WHOM</h3>`;
    if (under.length || o.fennel) h += `<div class="node top">${o.fennel ? corp(f) : '<b>???</b> <span class="dim">someone is above Fennel</span>'}<div class="node"><b>Fennel Holdings</b> <span class="dim">shell</span>${under.map(corp).join('')}</div></div>`;
    if (!o.fennel) h += `<h3>NO KNOWN PARENT</h3>${corp(f)}`;
    if (free.length) h += `${o.fennel ? '<h3>NO KNOWN PARENT</h3>' : ''}${free.map(corp).join('')}`;
    const ev = Object.keys(S.ev).length;
    h += `</div><div class="col L wide"><h3>EVIDENCE ${ev}/6</h3><p class="dim">Documents that would make people believe you.</p>
      ${[['covenant', 'Why couriers are caged'], ['captable', 'The cap table'], ['lethe', 'Project LETHE'], ['manifest', 'Kestrel manifests'], ['chassis', 'Argus retooling memo'], ['directive', "HIERARCH's own directive"]].map(([k, n]) => `<div class="${S.ev[k] ? 'ok' : 'dim'}">${S.ev[k] ? '■' : '□'} ${S.ev[k] ? n : '???'}</div>`).join('')}
      <h3>DISTRICTS</h3>${Object.keys(ZONES).map(zk => `<div>${S.locked[zk] ? '<span class="bad">LOCKED</span>' : '<span class="ok">OPEN  </span>'} ${ZONES[zk].name}</div>`).join('')}
      <h3>COUNTDOWN</h3><p>HIERARCH go-live: <b class="bad">day ${LAST_DAY}</b>. Today is day ${S.day}.</p></div></div>`;
    return h;
  },

  // ================= MARKET =================
  r_market() {
    let worth = S.cash;
    const rows = CORPS.map(c => {
      const st = S.stocks[c.id], h = st.hist, ch = h.length > 1 ? (st.p / h[0] - 1) * 100 : 0; worth += st.sh * st.p;
      return `<tr><td><b>${c.id}</b></td><td class="dim">${esc(c.name)}</td><td class="amber">$${st.p.toFixed(2)}</td><td class="${ch >= 0 ? 'ok' : 'bad'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</td>
        <td><canvas id="sp_${c.id}" width="110" height="22"></canvas></td><td>${st.sh}</td>
        <td><button onclick="Deck.trade('${c.id}',1)">+1</button><button onclick="Deck.trade('${c.id}',10)">+10</button><button onclick="Deck.trade('${c.id}',1e9)">MAX</button>
        <button onclick="Deck.trade('${c.id}',-1)">-1</button><button onclick="Deck.trade('${c.id}',-10)">-10</button><button onclick="Deck.trade('${c.id}',0)">FLAT</button></td></tr>`;
    }).join('');
    const tips = EVENTS.filter(e => S.tips[e.id]).map(e => `<div class="${e.day <= S.day ? 'dim' : ''}"><b>${e.t}</b> day ${e.day}: expect ${e.mult > 1 ? '+' : ''}${Math.round((e.mult - 1) * 100)}% ${e.day <= S.day ? '(played out)' : ''}</div>`).join('');
    return `<h3>VANTA RETAIL — cash $${Math.floor(S.cash)} · net worth $${Math.floor(worth)}</h3>
      <table class="mk"><tr><th></th><th></th><th>price</th><th>session</th><th></th><th>held</th><th>buy / sell (selling below zero = short)</th></tr>${rows}</table>
      <h3>INSIDE INFORMATION</h3>${tips || '<p class="dim">None. Analysts and executives write things down. Find where.</p>'}
      <p class="dim">Prices move while the clock runs. News lands at the start of the day it is scheduled for.</p>`;
  },
  trade(t, n) {
    const st = S.stocks[t];
    if (n === 0) n = -st.sh;
    if (n > 0) { n = Math.min(n, Math.floor(S.cash / st.p)); }
    else { const maxShort = Math.floor(S.cash / st.p); n = -Math.min(-n, st.sh + maxShort); if (st.sh <= 0 && -st.sh >= maxShort) n = 0; }
    if (!n) { toast('Not enough cash.'); return; }
    S.cash -= n * st.p; st.sh += n; beep(n > 0 ? 600 : 400, .04); this.render();
  },
  drawSparks() {
    for (const c of CORPS) {
      const cv = $('sp_' + c.id); if (!cv) continue; const g = cv.getContext('2d'), h = S.stocks[c.id].hist;
      const lo = Math.min(...h), hi = Math.max(...h), rg = hi - lo || 1;
      g.strokeStyle = h[h.length - 1] >= h[0] ? '#7dffb0' : '#ff3d6e'; g.beginPath();
      h.forEach((v, i) => { const x = i / (h.length - 1 || 1) * 108 + 1, y = 20 - (v - lo) / rg * 18; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    }
  },

  // ================= BOTS =================
  r_bots() {
    const rows = S.bots.map((b, i) => `<div class="bot"><canvas id="bot_${i}" width="64" height="64"></canvas><div><b class="cyan">${esc(b.name)}</b>
      ${[['ring', 'RING', 'damage'], ['core', 'CORE', 'stamina'], ['tip', 'TIP', 'speed']].map(([k, n, d]) => `<div class="row"><span style="min-width:11em">${n} <span class="dim">${d}</span></span><span class="pips">${'■'.repeat(b[k])}${'□'.repeat(5 - b[k])}</span>
        ${b[k] < 5 ? `<button onclick="Deck.upPart(${i},'${k}')" ${S.cash >= partCost(b[k]) ? '' : 'disabled'}>+ $${partCost(b[k])}</button>` : '<span class="dim">max</span>'}</div>`).join('')}</div></div>`).join('');
    return `<h3>BOT FOUNDRY — ${S.bots.length}/${maxBots()} slots (more RAM = more bots)</h3>
      <p class="dim">Firewalls are bots. Yours spin into theirs until one side stops. CPU hits harder, cooling spins longer.</p>
      <div class="botgrid">${rows}</div>
      <div class="btns"><button onclick="Deck.newBot()" ${S.bots.length < maxBots() && S.cash >= botCost() ? '' : 'disabled'}>COMPILE NEW BOT — $${botCost()}</button></div>`;
  },
  upPart(i, k) { const b = S.bots[i], c = partCost(b[k]); if (S.cash < c) return; S.cash -= c; b[k]++; beep(800, .05); this.render(); },
  newBot() { if (S.bots.length >= maxBots() || S.cash < botCost()) return; S.cash -= botCost(); S.bots.push({ name: BOT_NAMES[S.bots.length % BOT_NAMES.length], ring: 1, core: 1, tip: 1 }); beep(800, .05); this.render(); },
  drawBots() {
    S.bots.forEach((b, i) => {
      const cv = $('bot_' + i); if (!cv) return; const g = cv.getContext('2d'), r = 12 + b.core * 2;
      g.fillStyle = '#070a0e'; g.fillRect(0, 0, 64, 64); g.save(); g.translate(32, 32); g.rotate(this.t * (4 + b.tip * 2));
      g.strokeStyle = '#4de2ff'; g.lineWidth = 3;
      for (let k = 0; k < 2 + b.ring; k++) { const a = k / (2 + b.ring) * 6.283; g.beginPath(); g.moveTo(Math.cos(a) * r * .4, Math.sin(a) * r * .4); g.lineTo(Math.cos(a + .5) * (r + 3), Math.sin(a + .5) * (r + 3)); g.stroke(); }
      g.fillStyle = '#10141a'; g.beginPath(); g.arc(0, 0, r * .8, 0, 7); g.fill(); g.lineWidth = 2; g.stroke(); g.fillStyle = '#ffc857'; g.fillRect(-2, -2, 4, 4); g.restore();
    });
  },

  // ================= RIG / SHOP =================
  r_rig() {
    const line = (grp, k, d, lvl, max, cost, fn) => `<div class="row"><span style="min-width:10em"><b>${d.name}</b></span><span class="pips">${'■'.repeat(lvl)}${'□'.repeat(max - lvl)}</span><span class="dim" style="flex:1">${d.desc}</span>
      ${lvl < max ? `<button onclick="Deck.buy('${grp}','${k}')" ${S.cash >= cost ? '' : 'disabled'}>$${cost}</button>` : '<span class="dim">max</span>'}</div>`;
    return `<div class="cols"><div class="col R"><h3>DECK HARDWARE</h3>${Object.keys(RIG).map(k => line('rig', k, RIG[k], S.rig[k], 5, RIG_COST[S.rig[k] - 1])).join('')}
      <h3>SOFTWARE</h3>${Object.keys(SOFT).map(k => line('soft', k, SOFT[k], S.soft[k], SOFT[k].cost.length, SOFT[k].cost[S.soft[k]])).join('')}</div>
      <div class="col R"><h3>SKATES</h3>${Object.keys(SKATES).map(k => line('skates', k, SKATES[k], S.skates[k], SKATES[k].max, SK_COST[S.skates[k] - 1])).join('')}
      <p class="dim">A courier drone drops parts wherever you're standing. Nobody asks where a pizza kid gets watercooling money.</p></div></div>`;
  },
  buy(grp, k) {
    const lvl = S[grp][k], cost = grp === 'rig' ? RIG_COST[lvl - 1] : grp === 'skates' ? SK_COST[lvl - 1] : SOFT[k].cost[lvl];
    if (cost === undefined || S.cash < cost) return;
    S.cash -= cost; S[grp][k]++; beep(800, .05);
    if (grp === 'soft' && lvl === 0) { addKey(k); if (k === 'onion' && S.flags.tap && S.flags.knowsTap) toast('ONION installed — but your line is mirrored. It will do nothing until that is fixed.'); }
    this.render();
  },

  // ================= KEYCHAIN =================
  keyInfo(id) { if (id.startsWith('bd:')) { const h = id.slice(3); return { t: 'usb', name: 'backdoor: ' + HOSTS[h].name, desc: 'Root from anywhere. Usable as a proxy hop.', bd: 1 }; } return KEYDEF[id]; },
  r_keys() {
    return `<h3>KEYCHAIN — clipped to your belt loop</h3><canvas id="keycv" width="320" height="70" class="px"></canvas>
      <div class="cols"><div class="col R"><h3>PHYSICAL</h3>${S.keys.filter(k => this.keyInfo(k).t === 'phys').map(k => `<div class="row"><b class="amber">${esc(this.keyInfo(k).name)}</b><span class="dim">${esc(this.keyInfo(k).desc)}</span></div>`).join('')}</div>
      <div class="col R"><h3>USB</h3>${S.keys.filter(k => this.keyInfo(k).t === 'usb').map(k => `<div class="row"><b class="cyan">${esc(this.keyInfo(k).name)}</b><span class="dim">${esc(this.keyInfo(k).desc)}</span></div>`).join('') || '<p class="dim">No drives yet.</p>'}</div></div>`;
  },
  drawKeys() {
    const g = $('keycv').getContext('2d'); g.fillStyle = '#070a0e'; g.fillRect(0, 0, 320, 70);
    g.fillStyle = '#c8ccd6'; g.fillRect(8, 8, 304, 2);
    for (let i = 0; i < 6; i++) { g.fillRect(2 + (i % 2) * 4, 4 + i, 3, 3); }
    S.keys.forEach((k, i) => {
      const x = 16 + i * 15, K = this.keyInfo(k), sw = Math.round(Math.sin(i * 1.9) * 2);
      g.fillStyle = '#8a8f9a'; g.fillRect(x + 2, 10, 1, 6 + sw);
      const y = 16 + sw;
      if (K.t === 'phys') {
        g.fillStyle = i % 2 ? '#e8c33c' : '#c8ccd6'; g.fillRect(x, y, 5, 5); g.fillStyle = '#070a0e'; g.fillRect(x + 2, y + 1, 1, 2);
        g.fillStyle = i % 2 ? '#e8c33c' : '#c8ccd6'; g.fillRect(x + 2, y + 5, 2, 14); g.fillRect(x + 4, y + 12, 2, 2); g.fillRect(x + 4, y + 16, 3, 2);
      } else {
        g.fillStyle = K.bd ? '#7dffb0' : k === 'maint' ? '#ff3d6e' : '#4de2ff'; g.fillRect(x - 1, y, 7, 13);
        g.fillStyle = '#10141a'; g.fillRect(x + 1, y + 3, 3, 2);
        g.fillStyle = '#c8ccd6'; g.fillRect(x, y + 13, 5, 5); g.fillStyle = '#070a0e'; g.fillRect(x + 1, y + 15, 1, 2); g.fillRect(x + 3, y + 15, 1, 2);
      }
    });
  },
};
