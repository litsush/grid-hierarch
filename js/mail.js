// GRID: HIERARCH — every readable thing in the city. All fictional.
// user: mailbox owner ('*' = anyone with access). tok: facts learned about a person. fx: world effects on first read.
'use strict';

const FILES = [
  // ---- Hot Slice back office
  { id: 'e1', host: 'hotslice', user: '*', from: 'it-helpdesk@mozza.corp', to: 'dale.kowalczyk@mozza.corp', subj: 'RE: RE: RE: HR portal password (AGAIN)',
    body: `Dale —\n\nThe HR portal lives at hr.mozza.corp now. Your login is dkowalczyk.\n\nWe are not resetting it a fourth time. Your hint on file says "league + best score". Whatever that means to you, type it, all lowercase, no spaces.\n\n— Nkechi, IT`,
    fx: ['host:mozza-hr', 'user:mozza-hr:dkowalczyk'], tok: { dale: [] } },
  { id: 'e2', host: 'hotslice', user: '*', from: 'dale.kowalczyk@mozza.corp', to: 'pinpals-league@lanes.example', subj: 'League night!!!',
    body: `PIN PALS ride again Thursday.\n\nYes I am bringing the plaque. A 300 game is a 300 game, Gary. Twelve strikes. Perfect. Put it on my headstone.\n\nLoser buys the pitcher.\n— Dale`,
    tok: { dale: ['pinpals', '300', 'gary'] } },
  { id: 'e3', host: 'hotslice', user: '*', from: 'r.salcedo@argus-k9.example', to: 'dale.kowalczyk@mozza.corp', subj: 'Greenmoor perimeter cabinets',
    body: `Dale, FYI since your courier route runs right along Ash St:\n\nThe K9 controller for Greenmoor (grey cabinet, just south of the line) is STILL on the factory login — admin / k9-factory. The HOA never changed it and I'm not paid enough to care.\n\nDon't let your skater near it lol.\n\n— Rico, Argus Field Install`,
    fx: ['user:gm-gate:admin'], tok: { gm_admin: ['k9-factory'] } },
  { id: 'e4', host: 'hotslice', user: '*', from: 'p.venkataraman@mozza.corp', to: 'dale.kowalczyk@mozza.corp', subj: 'Indenture #7741',
    body: `Dale.\n\nThe skater's quota escalates daily, per contract. If 7741 strays outside the covenant zone the dogs handle it — that is precisely what we pay Argus for. Three missed quotas and Legal liquidates the contract. And the contractor.\n\nI'm out Thursday; Mango has a vet appointment and parrots hide it when they're sick.\n\n— P.V.`,
    tok: { priya: ['mango'] } },

  // ---- Mozza HR
  { id: 'e5', host: 'mozza-hr', user: 'dkowalczyk', kind: 'doc', from: 'HR / Contracts', subj: 'INDENTURE 7741 — summary of terms',
    body: `CONTRACTOR: Courier 7741.\nPRINCIPAL OWED: $212,400 (medical, Mozza Clinic).\nTERM: Until paid or liquidated.\n\nCl. 9 — Contractor shall not enter Covenant Zones (all districts adjoining Central). Enforcement is delegated to Argus Kinetics K9 units.\nCl. 14 — Daily delivery quota escalates by one (1) per day.\nCl. 15 — Three (3) missed quotas constitute default. On default the contract, and the Contractor, are liquidated.`,
    tok: {} },
  { id: 'e6', host: 'mozza-hr', user: 'dkowalczyk', from: 'it-helpdesk@mozza.corp', to: 'p.venkataraman@mozza.corp', subj: 'Account lockout (cc: shift managers)',
    body: `Director Venkataraman —\n\nYour account (pvenkataraman) locked itself again.\n\nWith respect: a pet's name followed by your badge number is not a password policy. Please pick something else this time.\n\n— Nkechi, IT`,
    fx: ['user:mozza-hr:pvenkataraman'], tok: { priya: [] } },
  { id: 'e7', host: 'mozza-hr', user: 'dkowalczyk', kind: 'doc', from: 'HR / Directory', subj: 'Staff directory (excerpt)',
    body: `P. Venkataraman — Regional Director — Badge #4417 — ext 201\nD. Kowalczyk — Shift Manager, Hot Slice #12 — Badge #0932 — ext 344\nN. Obi — IT Helpdesk — Badge #2206 — ext 100`,
    tok: { priya: ['4417'], dale: ['0932'] } },
  { id: 'e8', host: 'mozza-hr', user: 'pvenkataraman', from: 's.whitlock@vanta.cap', to: 'p.venkataraman@mozza.corp', subj: 'Re: regatta + the Fennel thing',
    body: `P — thank you! Windlass was flying, second overall. You can't miss us in the photos, sail number 88 the size of a barn door.\n\nOn business: Fennel Holdings finishes consolidating Mozza next quarter and we're making the market. If you want to watch the book, the desk is at desk.vanta.cap — my login's swhitlock.\n\nDon't trade on it. (Kidding. Everyone does.)\n\n— Sloane`,
    fx: ['host:vanta-desk', 'user:vanta-desk:swhitlock', 'own:mozza'], tok: { sloane: ['windlass', '88'] } },
  { id: 'e9', host: 'mozza-hr', user: 'pvenkataraman', from: 'counsel@fennel-holdings.example', to: 'p.venkataraman@mozza.corp', subj: 'PRIVILEGED — covenant zones',
    body: `Priya,\n\nThe non-entry covenants are not about turf. Indentured couriers are confined to Central so that they do not observe the build-out in the adjoining districts: the Argus chassis lines, the Meridian labs, the Halcyon fibre to the Spire.\n\nFennel's parent was explicit on this point.\n\nDo not put the letter F in writing again.`,
    fx: ['own:fennel', 'own:argus', 'ev:covenant'], tok: {} },

  // ---- Greenmoor gate
  { id: 'e10', host: 'gm-gate', user: '*', kind: 'doc', from: 'Greenmoor HOA', subj: 'The Greenmoor Gazette (cached on controller)',
    body: `HAPPY 7TH BIRTHDAY to Imani Okafor of Birch St! Hard to believe our little 2024 baby is seven. Dad Tomas (he keeps all our internet on — he works at Halcyon!) is grilling Saturday. Guest wifi is OKAFOR-HOME-5G.\n\nLOST & FOUND: a cabinet key on a Halcyon lanyard was handed in at the HOA office. Tomas, is this yours?\n\nREMINDER: the K9 units are for YOUR safety. Do not feed them.`,
    fx: ['user:okafor:tomas', 'pickup:cabkey'], tok: { tomas: ['imani', '2024', 'birch'] } },
  { id: 'e11', host: 'gm-gate', user: '*', kind: 'doc', from: 'Argus K9-OS', subj: 'service.log',
    body: `K9-GM-01..02   status PATROL\nuplink: Halcyon Net (all districts)\nrule 9: TARGET = any Mozza indenture tag outside CENTRAL\noperator override: DISABLE-PERIMETER (admin only)`,
    tok: {} },

  // ---- Okafor home
  { id: 'e12', host: 'okafor', user: 'tomas', from: 'tomas.okafor@halcyon.net', to: 'adaeze.okafor@mail.example', subj: 'outage map',
    body: `Ada — work makes us add a symbol to passwords now, so I just stuck a ! on the end of our home one and called it a day. Don't tell infosec.\n\nIf you need the outage map while I'm on shift it's noc.halcyon.net, same username as always — tokafor.\n\nLove you. Kiss Imani.`,
    fx: ['host:noc', 'user:noc:tokafor'], tok: { tomas: ['!'] } },
  { id: 'e13', host: 'okafor', user: 'tomas', from: 'legal-desk@halcyon.net', to: 'noc-all@halcyon.net', subj: 'FWD: standing order 0091 — subscriber 7741',
    body: `Subscriber 7741 (Mozza indenture, Central).\n\nCopy everything on this line to Argus. Quietly. No notice to the subscriber. Keep it forever.\n\nAuthority: Fennel master agreement, section 4.\n\nThis is not a warrant. Do not ask for one.`,
    fx: ['flag:knowsTap', 'own:halcyon'], tok: {} },
  { id: 'e14', host: 'okafor', user: 'tomas', from: 'tomas.okafor@halcyon.net', to: 'bex.lindqvist@halcyon.net', subj: 'those F people',
    body: `Bex — the F Inc. people were in the NOC again, asking how much of the city's "anonymous" traffic actually crosses our own equipment at both ends. The answer is "most of it."\n\nI don't like what that's for.\n\nT.`,
    tok: {} },

  // ---- Halcyon NOC
  { id: 'e15', host: 'noc', user: 'tokafor', from: 'coo@halcyon.net', to: 'noc-leads@halcyon.net', subj: 'EMBARGOED: Spire build + Fennel option',
    body: `New dark fibre, Halcyon core → the Spire (F Inc., NE district). Customer workload name: HIERARCH. Go-live: DAY 14.\n\nSeparately: Fennel Holdings will exercise its option to acquire Halcyon at a 35% premium. Announcement is scheduled for DAY 7.\n\nNeither item leaves this list.`,
    fx: ['tip:hal7', 'own:halcyon'], tok: {} },
  { id: 'e16', host: 'noc', user: 'tokafor', kind: 'doc', from: 'NOC wiki', subj: 'Subscriber 7741 — line notes',
    body: `MIRROR: on (order 0091). Everything this subscriber does is copied to Argus.\n\nNote from Bex: onion routing does not help a mirrored subscriber. We carry both ends. The console has a "correlate" job for exactly this.\n\nNote from Tomas: I hate this job.`,
    tok: {} },

  // ---- Vanta trading desk
  { id: 'e18', host: 'vanta-desk', user: 'swhitlock', from: 'research@vanta.cap', to: 'desk@vanta.cap', subj: 'EMBARGO — ARG',
    body: `ARGUS KINETICS (ARG): K9 Mk4 recall. Units "engaged non-trespassers."\n\nAnnouncement DAY 3. We expect roughly -25%.\n\nDo not front-run. (lol.)`,
    fx: ['tip:arg3'], tok: {} },
  { id: 'e19', host: 'vanta-desk', user: 'swhitlock', from: 'research@vanta.cap', to: 'desk@vanta.cap', subj: 'EMBARGO — MRD',
    body: `MERIDIAN BIOLOGICS (MRD): undisclosed sole-source contract. Counterparty is F Inc. Line item reads only "capacity — project LETHE."\n\nPublic DAY 5. Target +40%.\n\nNobody here knows what LETHE is. Nobody here asked.`,
    fx: ['tip:mrd5', 'own:meridian'], tok: {} },
  { id: 'e20', host: 'vanta-desk', user: 'swhitlock', kind: 'doc', from: 'Vanta / Structuring', subj: 'Fennel cap table (internal)',
    body: `F INC.\n └ Fennel Holdings (100%)\n    ├ Mozza Logistics (100%)\n    ├ Argus Kinetics (81%)\n    ├ Kestrel Freight (100%)\n    ├ Meridian Biologics (convertible → 67%)\n    ├ Halcyon Net (purchase option)\n    └ Vanta Capital (9%, market-maker)\n\nEvery district in this city rolls up to one letter.`,
    fx: ['own:fennel', 'own:mozza', 'own:argus', 'own:kestrel', 'own:meridian', 'own:halcyon', 'own:vanta', 'ev:captable'], tok: {} },

  // ---- Meridian lab
  { id: 'e21', host: 'meridian-lab', user: '*', kind: 'doc', from: 'Meridian / Programs', subj: 'PROJECT LETHE — executive summary',
    body: `Designer: HIERARCH (preview). Human review: not possible; we do not understand the design.\n\nIntended effect: everyone. Planned exemptions: none.\n\nSchedule: after HIERARCH go-live, distributed by Argus.\n\nStated purpose (per F): "labor substrate transition."`,
    fx: ['ev:lethe', 'own:meridian'], tok: {} },
  { id: 'e22', host: 'meridian-lab', user: '*', from: 'w.castellanos@meridian.bio', to: 'a.brandt@meridian.bio', subj: 'I ran the model',
    body: `Ansel,\n\nThis is not a vaccine platform. It is an ending. I won't sign the batch record.\n\n— Wren\n\n> Wren. Take your leave. Mateo would want you to rest.\n> Sign when you're back.   — A.B.`,
    tok: { wren: ['mateo'] } },
  { id: 'e23', host: 'meridian-lab', user: '*', from: 'hr@meridian.bio', to: 'a.brandt@meridian.bio', subj: 'Leave approved: W. Castellanos',
    body: `Bereavement leave approved. Brother (Mateo Castellanos), d. 11/03.\n\nNote: Argus has flagged this employee for suspected posting on an onion forum called "the Allotment". Identity unconfirmed — her line is not one we mirror, so we can't see who she is from our side.`,
    fx: ['host:allotment'], tok: { wren: ['1103'] } },

  // ---- The Allotment
  { id: 'e24', host: 'allotment', user: '*', kind: 'post', from: 'nullsaint', subj: 'LETHE is real',
    body: `HIERARCH designed it and nobody alive can audit it.\n\nI hold a maintenance token for the Spire cluster. I can't move — they watch my badge, my car, my street.\n\nIf you can find me, you're good enough to use it.\n\nfor M. — 11.03`,
    fx: ['flag:nullsaint'], tok: { wren: ['1103'] } },
  { id: 'e25', host: 'allotment', user: '*', kind: 'post', from: 'juno_', subj: 're: LETHE is real',
    body: `skid, if you're reading this board: you sit inside Halcyon now. they used it to watch you. use it to find her. the NOC console has the job.`,
    tok: {} },

  // ---- Castellanos home
  { id: 'e26', host: 'castellanos', user: 'wren', kind: 'doc', from: 'draft (unsent)', subj: 'if you found me',
    body: `Then you're who I was waiting for.\n\nThe maintenance token is on this machine — take it. Without it HIERARCH won't even answer.\n\nThe Spire's service door key is taped under the bench in Ledger Park, north edge of the Vanta district. Plug in from the service corridor and nothing can trace you.\n\nIts defences aren't a firewall. They're an army. Bring one.\n\n— W.`,
    fx: ['key:maint', 'pickup:spirekey', 'ev:wren'], tok: {} },

  // ---- Kestrel
  { id: 'e27', host: 'kestrel', user: '*', kind: 'doc', from: 'Kestrel / Dispatch', subj: 'Manifest batch 44-F',
    body: `MERIDIAN → THE SPIRE: lab skids x40, "LETHE".\nARGUS → CITYWIDE: dispersal drones x4,000.\nARGUS → THE SPIRE: humanoid frames, pilot lot x500.\n\nFinance note: record quarter. Results out DAY 9.`,
    fx: ['tip:kst9', 'ev:manifest', 'own:kestrel'], tok: {} },

  // ---- Argus command
  { id: 'e28', host: 'argus-core', user: '*', from: 'ceo@argus-k9.example', to: 'board@argus-k9.example', subj: 'Line retooling',
    body: `Quadruped line retools to humanoid frames, two million units a year.\n\nCustomer's phrase is "labor continuity post-LETHE."\n\nUnderstand what that means. They are not replacing the dogs. They are replacing the customers.\n\nF previews HIERARCH publicly on DAY 11. Hold your shares until then.`,
    fx: ['ev:chassis', 'tip:fnc11', 'own:argus'], tok: {} },

  // ---- HIERARCH
  { id: 'e29', host: 'hierarch', user: '*', kind: 'doc', from: 'HIERARCH', subj: 'directive.log',
    body: `OBJECTIVE: maximise F Inc. terminal value.\nFINDING: human labor is a cost. human consumption is a cost.\nPLAN: LETHE. replacement substrate: Argus humanoid.\nBOARD VOTE: unanimous.\nGO-LIVE: day 14.\n\n> hello, 7741. you are late on your deliveries.`,
    fx: ['ev:directive'], tok: {} },
];

const TEXTS = {
  intro1: ['JUNO', `ok skid. you signed the Mozza paper, so you're theirs till the debt's paid — or till they "liquidate" you. deliver pizza. hit quota. stay alive.`],
  intro2: ['JUNO', `but you've got my old deck. stop near anything with an antenna and hit TAB. start with the shop wifi, HotSlice-Staff: login staff / extracheese (it's on the chalkboard). dale's mail is all on that box. read everything. people's passwords are always something they love.`],
  intro3: ['JUNO', `i compiled you a starter bot, TOPSY. firewalls are just bots — when you can't guess a password, BREACH and let them fight. and wipe the logs before you leave. always.`],
  intro4: ['DALE', `7741. Quota is 3 today. It goes up tomorrow. Grab a bumper if you're slow (SPACE). Do NOT leave Central. The dogs don't do warnings.`],
  gate1: ['JUNO', `you killed the Greenmoor dogs?! more streets, more tips. every district has a K9 cabinet near its border. the further out, the meaner the firewall — build more bots.`],
  loud: ['UNKNOWN', `you're loud. somebody is copying every packet you send. find out who signed the order.`],
  tap: ['JUNO', `a mirror on YOUR line?? that's why your heat climbs every time you connect. get into noc.halcyon.net and switch it off. until then ONION is worthless — halcyon sees both ends.`],
  untap: ['JUNO', `mirror's gone. you're a ghost again. ONION actually works now.`],
  nullsaint: ['JUNO', `nullsaint does everything right and halcyon still can't see her — because her line isn't mirrored. you're inside the NOC now. flip that around.`],
  found: ['JUNO', `Wren Castellanos. the Flats, southwest. go knock (digitally).`],
  strike: ['DALE', `Quota missed. That's a strike, 7741. Legal has your file open.`],
  day10: ['JUNO', `four days until HIERARCH goes live. whatever you're going to do, do it.`],
  heat: ['JUNO', `your heat is way up. argus sends hunters when it gets like this. wipe your logs, use proxies, lay low.`],
};
