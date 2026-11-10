/* Cardinal Insurance — shared store + quote assistant */
(function () {
  'use strict';
  const NS = 'cardinal';
  const K = {
    leads: NS + '_leads_v1',
    clients: NS + '_clients_v1',
    msgs: NS + '_msgs_v1',
    seeded: NS + '_seeded_v1',
    touches: NS + '_touches_v1',
    paused: NS + '_paused_v1',
    snooze: NS + '_snooze_v1',
    claims: NS + '_claims_v1',
    notes: NS + '_notes_v1'
  };
  const read = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? fb : v; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const uid = p => p + Math.random().toString(36).slice(2, 8).toUpperCase();
  const daysAgo = d => new Date(Date.now() - d * 864e5).toISOString();

  const S = window.CG = window.CG || {};

  S.store = {
    leads: () => read(K.leads, []),
    clients: () => read(K.clients, []),
    msgs: () => read(K.msgs, []),
    addLead(l) {
      const leads = this.leads();
      const lead = Object.assign({
        id: uid('L-'), createdAt: new Date().toISOString(), status: 'New',
        channel: 'Website — AI Chat', type: 'Auto'
      }, l);
      lead.score = scoreOf(lead);
      leads.unshift(lead); write(K.leads, leads);
      window.dispatchEvent(new CustomEvent('cg:lead', { detail: lead }));
      return lead;
    },
    updateLead(id, patch) {
      const leads = this.leads().map(l => l.id === id ? Object.assign({}, l, patch) : l);
      write(K.leads, leads);
    },
    touches: () => read(K.touches, []),
    logTouch(t) {
      const all = this.touches();
      all.unshift(Object.assign({ id: uid('T-'), at: new Date().toISOString() }, t));
      write(K.touches, all);
      return all;
    },
    paused: () => read(K.paused, {}),
    setPaused(id, val) { const m = this.paused(); m[id] = !!val; write(K.paused, m); },
    snoozes: () => read(K.snooze, {}),
    snooze(key) { const m = this.snoozes(); m[key] = new Date(Date.now() + 864e5).toISOString(); write(K.snooze, m); },
    claims: () => read(K.claims, []),
    addClaim(c) {
      const all = this.claims();
      all.unshift(Object.assign({ id: uid('CLM-'), opened: new Date().toISOString() }, c));
      write(K.claims, all);
      return all;
    },
    updateClaim(id, patch) {
      write(K.claims, this.claims().map(c => c.id === id ? Object.assign({}, c, patch) : c));
    },
    notes: () => read(K.notes, {}),
    notesFor(id) { return this.notes()[id] || []; },
    addNote(id, text) {
      const m = this.notes(); m[id] = m[id] || [];
      m[id].unshift({ at: new Date().toISOString(), text });
      write(K.notes, m);
    },
    addMsg(m) {
      const all = this.msgs();
      all.unshift(Object.assign({ id: uid('M-'), at: new Date().toISOString(), from: 'client' }, m));
      write(K.msgs, all);
    },
    seed() {
      const have = read(K.seeded, false);
      const leads = read(K.leads, []), clients = read(K.clients, []);
      const demoLeads = [
        { name: 'Marisol Vega', phone: '(480) 555-0148', email: 'marisol.v@example.com', zip: '85295', type: 'Auto', insured: 'Yes', channel: 'Google Ads', status: 'Quoted', createdAt: daysAgo(1), appointment: 'Tomorrow, 10:00 AM' },
        { name: 'Dale Whitaker', phone: '(602) 555-0193', email: 'dale.w@example.com', zip: '85234', type: 'Home', insured: 'Yes', channel: 'LSA', status: 'New', createdAt: daysAgo(1) },
        { name: 'Priya Raman', phone: '(480) 555-0117', email: 'priya.r@example.com', zip: '85298', type: 'Commercial', insured: 'No', channel: 'Meta', status: 'New', createdAt: daysAgo(2) },
        { name: 'Tom Bledsoe', phone: '(480) 555-0164', email: 'tb@example.com', zip: '85286', type: 'Auto', insured: 'Yes', channel: 'Google Ads', status: 'Follow-up', createdAt: daysAgo(3) },
        { name: 'Renee Osgood', phone: '(602) 555-0129', email: 'renee.o@example.com', zip: '85048', type: 'Life', insured: 'No', channel: 'LSA', status: 'Quoted', createdAt: daysAgo(4) },
        { name: 'Hector Salas', phone: '(480) 555-0176', email: 'hsalas@example.com', zip: '85296', type: 'Home', insured: 'Yes', channel: 'Meta', status: 'Follow-up', createdAt: daysAgo(5) },
        { name: 'Jill Nakamura', phone: '(480) 555-0183', email: 'jill.n@example.com', zip: '85249', type: 'Auto', insured: 'No', channel: 'Google Ads', status: 'Won', createdAt: daysAgo(6) }
      ].map(l => Object.assign({ id: uid('L-'), score: 0 }, l));

      const demoClients = [
        { id: 'CL-1001', name: 'Jill Nakamura', email: 'jill.n@example.com', phone: '(480) 555-0183',
          address: '4120 E Cherry Hills Pl, Chandler, AZ 85249', since: '2024-03-11', agent: 'John C.',
          policies: [
            { no: 'AZ-AU-884120', line: 'Auto', carrier: 'Safeco', term: '12 months', renews: 'Mar 11, 2027', premium: 168.40, due: '1st', status: 'Active' },
            { no: 'AZ-HO-551903', line: 'Homeowners', carrier: 'Openly', term: '12 months', renews: 'Jun 02, 2027', premium: 214.75, due: '1st', status: 'Active' }
          ] },
        { id: 'CL-1002', name: 'Tom Bledsoe', email: 'tb@example.com', phone: '(480) 555-0164',
          address: '908 W Jasper Dr, Gilbert, AZ 85233', since: '2022-08-04', agent: 'John C.',
          policies: [
            { no: 'AZ-AU-772335', line: 'Auto', carrier: 'Farmers', term: '6 months', renews: 'Jan 18, 2027', premium: 142.10, due: '15th', status: 'Active' },
            { no: 'AZ-UM-118420', line: 'Umbrella', carrier: 'Auto-Owners', term: '12 months', renews: 'Sep 30, 2027', premium: 28.00, due: '15th', status: 'Active' }
          ] }
      ];

      const seen = new Set(leads.map(l => (l.name || '').trim().toLowerCase()));
      const add = demoLeads.filter(l => !seen.has(l.name.trim().toLowerCase()));
      write(K.leads, leads.concat(add));
      if (!clients.length) write(K.clients, demoClients);
      if (!read(K.claims, []).length) write(K.claims, [
        { id: 'CLM-2401', clientId: 'CL-1001', policy: 'AZ-HO-551903', type: 'Water damage', opened: '2026-08-14',
          status: 'Open', stage: 'Adjuster assigned', adjuster: 'M. Ruiz', reserve: 8400, paid: 0,
          note: 'Supply line under kitchen sink. Mitigation done, drywall scheduled.' },
        { id: 'CLM-2402', clientId: 'CL-1002', policy: 'AZ-AU-772335', type: 'Windshield', opened: '2026-09-02',
          status: 'Closed', stage: 'Paid', adjuster: '—', reserve: 620, paid: 612,
          note: 'Safelite replaced at home. Paid in 4 days.' }
      ]);
      write(K.seeded, true);
    }
  };

  function scoreOf(l) {
    let s = 40;
    if (l.insured === 'Yes') s += 15;
    if (l.email) s += 10;
    if (l.appointment) s += 20;
    if (/Commercial/i.test(l.type || '')) s += 10;
    return Math.min(97, s);
  }
  S.scoreOf = scoreOf;

  /* ── quote assistant ─────────────────────────────────────── */
  const TYPES = [
    { label: 'Auto', action: () => pick('Auto') },
    { label: 'Home', action: () => pick('Home') },
    { label: 'Commercial', action: () => pick('Commercial') },
    { label: 'Life', action: () => pick('Life') },
    { label: 'Something else', action: () => pick('Other') }
  ];
  const SLOTS = [
    { d: 'Tomorrow', t: '9:00 AM', full: 'Tomorrow, 9:00 AM' },
    { d: 'Tomorrow', t: '1:30 PM', full: 'Tomorrow, 1:30 PM' },
    { d: 'Wed', t: '10:15 AM', full: 'Wednesday, 10:15 AM' },
    { d: 'Wed', t: '4:00 PM', full: 'Wednesday, 4:00 PM' }
  ];

  S.chat = function () {
    const root = document.createElement('div');
    root.innerHTML =
      '<button class="chat-fab" id="cgFab"><span class="chat-fab__dot"></span> Get a free quote</button>' +
      '<div class="chat" id="cgChat">' +
        '<div class="chat__head"><div class="chat__av">C</div>' +
          '<div><div class="chat__t">Cardinal Quote Assistant</div><div class="chat__s">Typically replies in seconds</div></div>' +
          '<button class="chat__x" id="cgX" aria-label="Close">&times;</button></div>' +
        '<div class="chat__body" id="cgBody"></div>' +
        '<form class="chat__foot" id="cgForm"><input class="chat__input" id="cgInput" placeholder="Type your answer…" autocomplete="off"><button class="chat__send" type="submit">Send</button></form>' +
      '</div>';
    document.body.appendChild(root);

    const chat = document.getElementById('cgChat');
    const body = document.getElementById('cgBody');
    const fab = document.getElementById('cgFab');
    const input = document.getElementById('cgInput');
    const form = document.getElementById('cgForm');

    let lead = {}, step = 'start', busy = false, opened = false;

    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

    function addMsg(text, who, chips, after) {
      const m = el('div', 'msg msg--' + who, text);
      body.appendChild(m);
      if (chips && chips.length) {
        const q = el('div', 'quick');
        chips.forEach(c => {
          const b = el('button', null, c.label || c); b.type = 'button';
          b.addEventListener('click', () => { if (busy) return; addMsg(c.label || c, 'me'); (c.action || (() => handle(String(c.label || c))))(); });
          q.appendChild(b);
        });
        body.appendChild(q);
      }
      body.scrollTop = body.scrollHeight;
      if (after) after();
    }
    function botSay(text, chips, delay) {
      busy = true;
      const t = el('div', 'msg msg--bot', '…'); t.style.opacity = '.5';
      body.appendChild(t); body.scrollTop = body.scrollHeight;
      setTimeout(() => { t.remove(); addMsg(text, 'bot', chips); busy = false; }, delay || 560);
    }

    function open() {
      chat.classList.add('open'); fab.style.display = 'none';
      if (!opened) { opened = true; greet(); }
      setTimeout(() => input && input.focus(), 300);
    }
    function close() { chat.classList.remove('open'); fab.style.display = 'flex'; }

    function greet() {
      botSay('Hi, thanks for stopping by Cardinal Insurance Group. Are you looking for a quote?', TYPES, 400);
    }
    function pick(t) {
      lead.type = t; step = 'insured';
      botSay('Got it, ' + (t === 'Other' ? 'we can help with that' : t.toLowerCase() + ' insurance') + '. Are you currently insured?', [
        { label: 'Yes', action: () => { lead.insured = 'Yes'; askZip(); } },
        { label: 'No', action: () => { lead.insured = 'No'; askZip(); } },
        { label: 'Not sure', action: () => { lead.insured = 'Not sure'; askZip(); } }
      ]);
    }
    function askZip() { step = 'zip'; botSay('What ZIP code are you in?', null, 480); }
    function askName() { step = 'name'; botSay('Perfect. What’s your name?', null, 480); }
    function askPhone() { step = 'phone'; botSay('And the best phone number to reach you?', null, 480); }
    function askEmail() { step = 'email'; botSay('Last one, what’s your email so we can send the quote?', null, 480); }

    function offerSlots() {
      step = 'slots';
      const m = el('div', 'msg msg--bot', 'I can book you a free 15-minute quote review with John. Which works?');
      body.appendChild(m);
      const grid = el('div', 'chat__slots');
      SLOTS.forEach(s => {
        const b = el('button', null, s.t + '<span>' + s.d + ' · 15 min</span>');
        b.type = 'button';
        b.addEventListener('click', () => {
          lead.appointment = s.full;
          grid.remove();
          addMsg(s.d + ' at ' + s.t, 'me');
          finish();
        });
        grid.appendChild(b);
      });
      body.appendChild(grid);
      body.scrollTop = body.scrollHeight;
    }

    function finish() {
      step = 'done';
      const saved = window.CG.store.addLead(lead);
      lead.id = saved.id;
      botSay('You’re booked for ' + lead.appointment + '. John or the team will confirm by text shortly. Anything else I can answer?', [
        { label: 'How much will it cost?', action: () => handle('cost') },
        { label: 'What carriers do you use?', action: () => handle('carrier') },
        { label: 'No, that’s all', action: () => botSay('Thanks! We’ll talk soon. You can also call (480) 813-2233.', null, 300) }
      ], 700);
    }

    const ANSWERS = [
      { k: /cost|price|how much|rate|cheap/, a: 'Rates depend on your vehicle or home, ZIP and coverage level. Most Arizona auto policies we place land between $95 and $210 a month, and bundling home usually takes 10-25% off. John will give you an exact number on the call.' },
      { k: /carrier|company|who.*(with|through)/, a: 'We represent Safeco, Farmers, Auto-Owners, Openly, Hagerty, Geico and several regional carriers, so we shop your risk instead of pushing one company.' },
      { k: /claim|accident|file/, a: 'You can report a claim right through our office and we’ll handle the carrier for you. Call (480) 813-2233 or use Report a Claim and we’ll walk you through it.' },
      { k: /bundle|home.*auto|discount/, a: 'Yes. Bundling auto and home is the fastest discount most clients get, and an umbrella policy on top is usually under $30 a month.' },
      { k: /commercial|business|bop|workers/, a: 'We write commercial auto, BOP, general liability, workers comp and bonds for Arizona businesses. Happy to look at your operation.' },
      { k: /life|final expense/, a: 'We write term, whole life and final expense, no medical exam options available depending on age and amount.' },
      { k: /state|area|serve|where/, a: 'We’re licensed in Arizona, New Mexico, Illinois, Iowa, Missouri and Texas, based in Gilbert.' },
      { k: /hours|open|time/, a: 'We’re open Monday through Friday, 9 to 5, and after-hours messages get answered first thing the next morning.' }
    ];

    function handle(text) {
      const t = text.toLowerCase();
      if (step === 'zip') { const m = text.match(/\b(\d{5})\b/); lead.zip = m ? m[1] : text.slice(0, 12); return askName(); }
      if (step === 'name') { lead.name = text.trim().slice(0, 60); return askPhone(); }
      if (step === 'phone') { lead.phone = text.trim().slice(0, 24); return askEmail(); }
      if (step === 'email') {
        lead.email = text.trim().slice(0, 80);
        botSay('Thanks ' + (lead.name || '') + '. Checking John’s calendar…', null, 500);
        return setTimeout(offerSlots, 900);
      }
      const hit = ANSWERS.find(x => x.k.test(t));
      if (hit) return botSay(hit.a, [
        { label: 'Book a free quote', action: () => pick(lead.type || 'Auto') },
        { label: 'Ask something else', action: () => handle('') }
      ], 700);
      if (/^(auto|home|commercial|life)/.test(t) && Object.keys(lead).length === 0) return pick(text.trim());
      botSay('Happy to help with that. Want me to get you on John’s calendar for a free quote review?', [
        { label: 'Yes, book me', action: () => pick(lead.type || 'Auto') },
        { label: 'Auto', action: () => pick('Auto') },
        { label: 'Home', action: () => pick('Home') }
      ], 620);
    }

    fab.addEventListener('click', open);
    document.getElementById('cgX').addEventListener('click', close);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value.trim(); if (!v || busy) return;
      addMsg(v, 'me'); input.value = '';
      handle(v);
    });

    // pop on every page after 3s
    setTimeout(() => { if (!opened && !chat.classList.contains('open')) open(); }, 3000);
  };

  /* ── page behaviours ─────────────────────────────────────── */
  S.init = function () {
    S.store.seed();
    const b = document.getElementById('burger'), n = document.getElementById('navlinks');
    if (b && n) b.addEventListener('click', () => n.classList.toggle('open'));

    const f = document.getElementById('quoteForm');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault();
      const g = id => (document.getElementById(id) || {}).value || '';
      const lead = {
        name: g('qName'), phone: g('qPhone'), email: g('qEmail'), zip: g('qZip'),
        type: g('qType') || 'Auto', insured: g('qInsured') || 'Not sure',
        channel: 'Website — Quote Form', status: 'New'
      };
      window.CG.store.addLead(lead);
      f.innerHTML = '<div style="padding:8px 0"><h3 style="margin-bottom:6px">You’re in the queue.</h3>' +
        '<p class="muted" style="font-size:14px;margin:0">John or the team will call you within one business hour. ' +
        'Need it sooner? Call (480) 813-2233.</p></div>';
    });

    if (!document.body.classList.contains('portal') && !document.body.classList.contains('admin')) S.chat();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', S.init);
  else S.init();
})();
