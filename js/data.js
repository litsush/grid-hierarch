// GRID: HIERARCH — world structure: zones, landmarks, corporations, hosts, shop tables.
'use strict';

const ZONES = {
  '1,1': { name: 'CENTRAL', corp: 'MOZ', ground: '#2b2622', pal: ['#8a5a3c', '#a8703f', '#6e4a3a', '#b5894f'], mix: [.5, .3, .1, .1], dogs: 0 },
  '1,2': { name: 'GREENMOOR', corp: 'HOA', ground: '#23301f', pal: ['#c9a27a', '#9fb7c9', '#c98f8f', '#b9c48a', '#d9d2b0'], mix: [.72, .1, 0, .18], res: 1, dogs: 2, gate: 'gm-gate' },
  '2,1': { name: 'VANTA DISTRICT', corp: 'VNT', ground: '#1e2433', pal: ['#2d4a7a', '#c9a13c', '#3b5f9a', '#56627a'], mix: [.25, .3, .35, .1], dogs: 3, gate: 'vanta-gate' },
  '1,0': { name: 'HALCYON EXCHANGE', corp: 'HAL', ground: '#1c2e30', pal: ['#2f8f8a', '#3aa6a0', '#22686a', '#5b7f86'], mix: [.3, .3, .3, .1], dogs: 3, gate: 'hal-gate' },
  '0,1': { name: 'MERIDIAN PARK', corp: 'MRD', ground: '#22302a', pal: ['#d5ddd8', '#9fc7b0', '#b8c9c0', '#7fae95'], mix: [.25, .35, .25, .15], dogs: 3, gate: 'mer-gate' },
  '0,2': { name: 'THE FLATS', corp: 'HOA', ground: '#2a2a26', pal: ['#8f8a78', '#9a8f86', '#7f8a8f', '#a39a7f'], mix: [.75, .15, 0, .1], res: 1, dogs: 3, gate: 'flats-gate' },
  '2,2': { name: 'KESTREL DOCKS', corp: 'KST', ground: '#2c2420', pal: ['#b0552f', '#3f6f8a', '#8a8f3f', '#7a4a3a'], mix: [.2, .55, .2, .05], dogs: 4, gate: 'docks-gate' },
  '0,0': { name: 'ARGUS CAMPUS', corp: 'ARG', ground: '#22232a', pal: ['#4a4f5c', '#5c6170', '#3a3d48', '#7a2f3a'], mix: [.2, .35, .4, .05], dogs: 5, gate: 'argus-gate' },
  '2,0': { name: 'THE SPIRE', corp: 'FNC', ground: '#1a1622', pal: ['#2a2238', '#3a2f52', '#1f1a2c', '#5a3f8a'], mix: [.15, .3, .5, .05], dogs: 6, gate: 'spire-gate' },
};

const AVES = ['Kessel Ave', 'Orchid Ave', 'Tallow Ave', 'Juniper Ave', 'Marrow Ave', 'Pylon Ave', 'Quince Ave', 'Sable Ave', 'Vesper Ave', 'Zinc Ave'];
const STS = ['1st St', '2nd St', 'Halyard St', 'Ember St', 'Dough St', 'Crust St', 'Ash St', 'Birch St', 'Cinder St', 'Dock St'];

// Landmarks: block [bx,by]; lot 0-3 (quarter lot), 'C' (whole-block tower) or 'P' (park)
const LM = {
  hotslice: { block: [4, 4], lot: 0, name: 'HOT SLICE #12', type: 'pizza' },
  mozza: { block: [5, 3], lot: 'C', name: 'MOZZA LOGISTICS', type: 'corp' },
  'gm-gate': { block: [4, 6], lot: 0, name: 'K9 CABINET — GREENMOOR', type: 'util' },
  hoa: { block: [3, 6], lot: 1, name: 'GREENMOOR HOA OFFICE', type: 'biz' },
  okafor: { block: [4, 7], lot: 2, name: 'OKAFOR RESIDENCE', type: 'res' },
  'vanta-gate': { block: [6, 4], lot: 0, name: 'K9 CABINET — VANTA', type: 'util' },
  vanta: { block: [7, 4], lot: 'C', name: 'VANTA CAPITAL', type: 'corp' },
  bench: { block: [7, 3], lot: 'P', name: 'LEDGER PARK', type: 'park' },
  'hal-gate': { block: [4, 2], lot: 2, name: 'K9 CABINET — HALCYON', type: 'util' },
  halcyon: { block: [4, 0], lot: 'C', name: 'HALCYON NET CORE', type: 'corp' },
  'mer-gate': { block: [2, 4], lot: 1, name: 'K9 CABINET — MERIDIAN', type: 'util' },
  meridian: { block: [1, 4], lot: 'C', name: 'MERIDIAN BIOLOGICS', type: 'corp' },
  'flats-gate': { block: [2, 7], lot: 1, name: 'K9 CABINET — FLATS', type: 'util' },
  castellanos: { block: [1, 7], lot: 3, name: 'CASTELLANOS RESIDENCE', type: 'res' },
  'docks-gate': { block: [6, 7], lot: 0, name: 'K9 CABINET — DOCKS', type: 'util' },
  kestrel: { block: [7, 7], lot: 'C', name: 'KESTREL FREIGHT', type: 'corp' },
  'argus-gate': { block: [2, 1], lot: 1, name: 'K9 CABINET — ARGUS', type: 'util' },
  argus: { block: [1, 1], lot: 'C', name: 'ARGUS KINETICS', type: 'corp' },
  'spire-gate': { block: [6, 1], lot: 0, name: 'K9 CABINET — SPIRE', type: 'util' },
  spire: { block: [7, 1], lot: 'C', name: 'THE SPIRE — F INC.', type: 'corp' },
};

const CORPS = [
  { id: 'FNC', name: 'F Inc.', p: 940 },
  { id: 'MOZ', name: 'Mozza Logistics', own: 'mozza', p: 42 },
  { id: 'ARG', name: 'Argus Kinetics', own: 'argus', p: 118 },
  { id: 'HAL', name: 'Halcyon Net', own: 'halcyon', p: 67 },
  { id: 'MRD', name: 'Meridian Biologics', own: 'meridian', p: 88 },
  { id: 'KST', name: 'Kestrel Freight', own: 'kestrel', p: 31 },
  { id: 'VNT', name: 'Vanta Capital', own: 'vanta', p: 203 },
];
const OWN_NOTE = { mozza: '100%', argus: '81%', halcyon: 'purchase option', meridian: 'convertible, 67%', kestrel: '100%', vanta: '9% + market-maker' };

const PEOPLE = {
  dale: { name: 'Dale Kowalczyk', role: 'Shift Manager, Hot Slice #12', corp: 'MOZ' },
  priya: { name: 'Priya Venkataraman', role: 'Regional Director', corp: 'MOZ' },
  gm_admin: { name: 'Greenmoor K9 admin', role: 'factory account', corp: 'ARG' },
  tomas: { name: 'Tomas Okafor', role: 'NOC Engineer', corp: 'HAL' },
  sloane: { name: 'Sloane Whitlock', role: 'Senior Analyst', corp: 'VNT' },
  wren: { name: 'Dr. Wren Castellanos', role: 'Researcher (on leave)', corp: 'MRD' },
};

// kind: wifi (must be in range) | pub (reachable anywhere once known) | tor (needs ONION client)
// fw: firewall bot levels. trace: seconds until traced with no proxies.
const HOSTS = {
  hotslice: { name: 'HotSlice-Staff', addr: '10.7.41.1', corp: 'MOZ', kind: 'wifi', lm: 'hotslice', os: 'ShopRouter 2 (never updated)', fw: [0], trace: 90,
    users: { staff: { person: 'shop', pw: 'extracheese', parts: ['extracheese'], root: true } } },
  'mozza-hr': { name: 'hr.mozza.corp', addr: '198.51.100.12', corp: 'MOZ', kind: 'pub', lm: 'mozza', os: 'PeopleStack 9', fw: [2, 1], trace: 45,
    users: { dkowalczyk: { person: 'dale', pw: 'pinpals300', parts: ['pinpals', '300'] }, pvenkataraman: { person: 'priya', pw: 'mango4417', parts: ['mango', '4417'], root: true } } },
  'gm-gate': { name: 'K9-CTRL-GREENMOOR', addr: '10.66.2.1', corp: 'ARG', kind: 'wifi', lm: 'gm-gate', os: 'Argus K9-OS 4.1', fw: [1, 1], trace: 60, gate: '1,2',
    users: { admin: { person: 'gm_admin', pw: 'k9-factory', parts: ['k9-factory'], root: true } } },
  okafor: { name: 'OKAFOR-HOME-5G', addr: '192.168.1.1', corp: 'HAL', kind: 'wifi', lm: 'okafor', os: 'Halcyon HomeHub 3', fw: [1, 1], trace: 50,
    users: { tomas: { person: 'tomas', pw: 'imani2024', parts: ['imani', '2024'], root: true } } },
  noc: { name: 'noc.halcyon.net', addr: '203.0.113.7', corp: 'HAL', kind: 'pub', lm: 'halcyon', os: 'Halcyon NOC console', fw: [3, 3, 2, 2], trace: 35,
    users: { tokafor: { person: 'tomas', pw: 'imani2024!', parts: ['imani', '2024', '!'], root: true } } },
  'vanta-gate': { name: 'K9-CTRL-VANTA', addr: '10.66.3.1', corp: 'ARG', kind: 'wifi', lm: 'vanta-gate', os: 'Argus K9-OS 4.2', fw: [1], trace: 45, gate: '2,1', users: {} },
  'vanta-desk': { name: 'desk.vanta.cap', addr: '198.51.100.88', corp: 'VNT', kind: 'pub', lm: 'vanta', os: 'TradeStation 8', fw: [3, 2, 2], trace: 35,
    users: { swhitlock: { person: 'sloane', pw: 'windlass88', parts: ['windlass', '88'] } } },
  'hal-gate': { name: 'K9-CTRL-HALCYON', addr: '10.66.4.1', corp: 'ARG', kind: 'wifi', lm: 'hal-gate', os: 'Argus K9-OS 4.2', fw: [2, 1], trace: 40, gate: '1,0', hardKey: 'cabkey', users: {} },
  'mer-gate': { name: 'K9-CTRL-MERIDIAN', addr: '10.66.5.1', corp: 'ARG', kind: 'wifi', lm: 'mer-gate', os: 'Argus K9-OS 4.3', fw: [2, 2, 2], trace: 36, gate: '0,1', users: {} },
  'meridian-lab': { name: 'LIMS-MERIDIAN', addr: '172.20.0.5', corp: 'MRD', kind: 'wifi', lm: 'meridian', os: 'LabVault (air-gapped)', fw: [3, 3, 2], trace: 30, users: {} },
  allotment: { name: 'the Allotment (onion forum)', addr: '(hidden)', corp: '—', kind: 'tor', os: 'message board', fw: [], trace: 999, open: true, users: {} },
  'flats-gate': { name: 'K9-CTRL-FLATS', addr: '10.66.6.1', corp: 'ARG', kind: 'wifi', lm: 'flats-gate', os: 'Argus K9-OS 4.3', fw: [3, 2, 2], trace: 32, gate: '0,2', users: {} },
  castellanos: { name: 'wren-net', addr: '192.168.8.1', corp: 'MRD', kind: 'wifi', lm: 'castellanos', os: 'hardened home gateway', fw: [3, 3, 3], trace: 40,
    users: { wren: { person: 'wren', pw: 'mateo1103', parts: ['mateo', '1103'], root: true } } },
  'docks-gate': { name: 'K9-CTRL-DOCKS', addr: '10.66.7.1', corp: 'ARG', kind: 'wifi', lm: 'docks-gate', os: 'Argus K9-OS 4.4', fw: [3, 3, 3], trace: 30, gate: '2,2', users: {} },
  kestrel: { name: 'MANIFEST-KESTREL', addr: '172.31.9.2', corp: 'KST', kind: 'wifi', lm: 'kestrel', os: 'FreightBook mainframe', fw: [4, 3, 3], trace: 28, users: {} },
  'argus-gate': { name: 'K9-CTRL-ARGUS', addr: '10.66.8.1', corp: 'ARG', kind: 'wifi', lm: 'argus-gate', os: 'Argus K9-OS 5.0', fw: [4, 4, 3, 3], trace: 26, gate: '0,0', users: {} },
  'argus-core': { name: 'K9-COMMAND', addr: '172.16.0.1', corp: 'ARG', kind: 'wifi', lm: 'argus', os: 'Argus SOC', fw: [5, 4, 4, 4, 3], trace: 24, users: {} },
  'spire-gate': { name: 'K9-CTRL-SPIRE', addr: '10.66.9.1', corp: 'ARG', kind: 'wifi', lm: 'spire-gate', os: 'Argus K9-OS 5.1', fw: [5, 5, 4, 4, 4], trace: 22, gate: '2,0', users: {} },
  hierarch: { name: 'HIERARCH', addr: 'fd00:f::1', corp: 'FNC', kind: 'wifi', lm: 'spire', os: 'unknown — self-modifying', fw: [6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4], trace: 20, needKey: 'maint', hardKey: 'spirekey', users: {} },
};

// Scheduled market events. Tips are learned by reading the right mail.
const EVENTS = [
  { id: 'arg3', t: 'ARG', day: 3, mult: 0.74, news: 'ARGUS recalls K9 Mk4 units after "non-trespasser incidents"' },
  { id: 'mrd5', t: 'MRD', day: 5, mult: 1.42, news: 'MERIDIAN lands sole-source bioreactor contract' },
  { id: 'hal7', t: 'HAL', day: 7, mult: 1.35, news: 'FENNEL HOLDINGS to acquire HALCYON NET at 35% premium' },
  { id: 'kst9', t: 'KST', day: 9, mult: 1.33, news: 'KESTREL FREIGHT books record quarter' },
  { id: 'fnc11', t: 'FNC', day: 11, mult: 1.5, news: 'F INC. previews HIERARCH: "the last invention"' },
];

const KEYDEF = {
  apt: { t: 'phys', name: 'Apartment 4C', desc: 'Your door. Mozza owns the building.' },
  locker: { t: 'phys', name: 'Hot Slice locker', desc: 'Smells like oregano.' },
  cabkey: { t: 'phys', name: 'Halcyon cabinet key', desc: 'Opens the North K9 cabinet. Plug in directly: no trace.' },
  spirekey: { t: 'phys', name: 'Spire service door', desc: 'Hardline into HIERARCH: no trace.' },
  maint: { t: 'usb', name: 'HIERARCH-MAINT token', desc: 'Lets a deck handshake with HIERARCH at all.' },
  dendrite: { t: 'usb', name: 'DENDRITE', desc: 'Password-tree virus.' },
  onion: { t: 'usb', name: 'ONION client', desc: 'Anonymous circuits.' },
  scrub: { t: 'usb', name: 'LOGSCRUB', desc: 'Fast log wiper.' },
};
const PICKUPS = { cabkey: { lm: 'hoa', key: 'cabkey' }, spirekey: { lm: 'bench', key: 'spirekey' } };

const RIG = {
  cpu: { name: 'CPU', desc: 'bot damage · log-wipe speed' },
  gpu: { name: 'GPU', desc: 'DENDRITE guesses per second' },
  ram: { name: 'RAM', desc: 'bot slots (1 + 2 per level)' },
  cool: { name: 'WATERCOOLING', desc: 'bot stamina · slower spin decay' },
  nic: { name: 'ANTENNA', desc: 'wifi range' },
};
const RIG_COST = [200, 500, 1100, 2000];
const SKATES = {
  wheels: { name: 'WHEELS', desc: 'top skating speed', max: 5 },
  bearings: { name: 'BEARINGS', desc: 'coast longer after a tow', max: 5 },
  grapple: { name: 'MAG-GRAPPLE', desc: 'latch range · release whip', max: 5 },
  rack: { name: 'PIZZA RACK', desc: 'carry more orders at once', max: 3 },
};
const SK_COST = [120, 300, 650, 1200];
const SOFT = {
  dendrite: { name: 'DENDRITE', desc: 'grows a tree of password guesses from what you know about a person', cost: [250, 700, 1500] },
  scrub: { name: 'LOGSCRUB', desc: 'wipe logs much faster', cost: [200, 600] },
  onion: { name: 'ONION client', desc: 'x2.5 trace time — unless someone is watching your line', cost: [500] },
};
const BOT_NAMES = ['TOPSY', 'GYRE', 'WHIRL', 'DERVISH', 'VORTEX', 'SPINDLE', 'CYCLONE', 'PIVOT', 'TORQUE', 'AXEL', 'NUTATE', 'EDDY'];
const COMMON = ['password', '123', 'admin', 'qwerty', '2031', 'letmein', 'love', 'pizza'];
