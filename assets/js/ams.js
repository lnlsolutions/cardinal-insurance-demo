/* AMS layer: book of business, claims, commissions, documents, client record, tabs */
(function () {
  'use strict';
  const S = window.CG.store;
  const $ = id => document.getElementById(id);
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const initials = n => (n || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── tabs ─────────────────────────────────────────────── */
  const TITLES = {
    today: 'Today at a glance', leads: 'Leads and follow-up', clients: 'Clients',
    policies: 'Book of business', claims: 'Claims', money: 'Money', automations: 'Automations'
  };
  function showTab(name) {
    document.querySelectorAll('.ntab').forEach(b => b.classList.toggle('ntab--on', b.dataset.tab === name));
    document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('tabpane--on', p.dataset.pane === name));
    const t = $('pageTitle'); if (t) t.textContent = TITLES[name] || 'Dashboard';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.ntab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ── book of business ─────────────────────────────────── */
  const allPolicies = () => {
    const out = [];
    S.clients().forEach(c => c.policies.forEach(p => out.push({ c, p })));
    return out;
  };

  function renderPolicies() {
    const rows = allPolicies();
    const el = $('polRows'); if (!el) return;
    $('polCount').textContent = rows.length + ' policies';
    el.innerHTML = rows.map(({ c, p }) => `
      <tr data-client="${c.id}">
        <td style="font-weight:700">${esc(p.no)}</td>
        <td>${esc(c.name)}</td>
        <td>${esc(p.line)}</td>
        <td>${esc(p.carrier)}</td>
        <td>${esc(p.term)}</td>
        <td>${esc(p.renews)}</td>
        <td style="font-weight:700">${money(p.premium)}</td>
        <td><span class="tg tg--won">${esc(p.status)}</span></td>
      </tr>`).join('') || '<tr><td colspan="8" class="empty">No policies.</td></tr>';
    el.querySelectorAll('[data-client]').forEach(r => r.addEventListener('click', () => openClient(r.dataset.client)));

    const mix = {};
    rows.forEach(({ p }) => { mix[p.line] = (mix[p.line] || 0) + p.premium; });
    const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
    const colours = ['#046DCD', '#1B3A6B', '#C33E47', '#2D6A4F', '#B25E09'];
    $('lineMix').innerHTML = Object.entries(mix).map(([k, v], i) => `
      <div class="pl"><div class="pl__t"><span>${esc(k)}</span><b>${money(v)}</b></div>
      <div class="pl__b"><i style="width:${Math.round(v / total * 100)}%;background:${colours[i % colours.length]}"></i></div></div>`).join('')
      || '<div class="empty">No policies.</div>';
  }

  /* documents are generated on demand so the demo never needs a file server */
  function docsFor(c) {
    return c.policies.flatMap(p => ([
      { key: c.id + ':' + p.no + ':dec', label: p.line + ' declarations page', meta: p.no + ' · ' + p.carrier, kind: 'dec', p },
      { key: c.id + ':' + p.no + ':card', label: p.line + ' insurance card', meta: p.no + ' · ' + p.carrier, kind: 'card', p }
    ]));
  }

  function renderDocs() {
    const el = $('docList'); if (!el) return;
    const docs = [];
    S.clients().forEach(c => docsFor(c).forEach(d => docs.push(Object.assign({ c }, d))));
    el.innerHTML = docs.map(d => `
      <div class="doc" data-doc="${esc(d.key)}">
        <span class="doc__i">PDF</span>
        <div class="doc__b"><div class="doc__t">${esc(d.label)}</div><div class="doc__m">${esc(d.c.name)} · ${esc(d.meta)}</div></div>
        <span class="doc__d">Download</span>
      </div>`).join('');
    el.querySelectorAll('[data-doc]').forEach(row => row.addEventListener('click', () => {
      const [cid, no, kind] = row.dataset.doc.split(':');
      const c = S.clients().find(x => x.id === cid);
      const p = c && c.policies.find(x => x.no === no);
      if (p) window.CG.downloadDoc(c, p, kind || 'dec');
    }));
  }

  /* ── claims ───────────────────────────────────────────── */
  const claimStatusClass = s => s === 'Closed' ? 'tg--won' : s === 'Open' ? 'tg--follow' : 'tg--quoted';

  function renderClaims() {
    const claims = S.claims();
    const el = $('claimRows'); if (!el) return;
    $('claimCount').textContent = claims.length + ' total · ' + claims.filter(c => c.status === 'Open').length + ' open';
    el.innerHTML = claims.map(c => {
      const cl = S.clients().find(x => x.id === c.clientId);
      return `<tr data-claim="${esc(c.id)}">
        <td style="font-weight:700">${esc(c.id)}</td>
        <td>${esc(cl ? cl.name : '—')}</td>
        <td>${esc(c.type)}</td>
        <td>${esc(c.policy)}</td>
        <td>${new Date(c.opened).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td><span class="tg ${claimStatusClass(c.status)}">${esc(c.stage || c.status)}</span></td>
        <td>${money(c.reserve || 0)}</td>
        <td style="font-weight:700">${money(c.paid || 0)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">No claims.</td></tr>';
    el.querySelectorAll('[data-claim]').forEach(r => r.addEventListener('click', () => openClaim(r.dataset.claim)));

    $('claimFeed').innerHTML = claims.map(c => {
      const cl = S.clients().find(x => x.id === c.clientId);
      return `<div class="feed"><div class="feed__h"><b>${esc(c.id)} · ${esc(c.type)}</b><span>${esc(c.status)}</span></div>
        <div class="feed__m">${esc(cl ? cl.name : '')} · ${esc(c.policy)} · adjuster ${esc(c.adjuster || '—')}</div>
        <div class="feed__n">${esc(c.note || '')}</div></div>`;
    }).join('') || '<div class="empty">No claim activity.</div>';
  }

  function openClaim(id) {
    const c = S.claims().find(x => x.id === id); if (!c) return;
    const cl = S.clients().find(x => x.id === c.clientId);
    window.CG.drawer(`
      <div class="drawer__h"><div><b>${esc(c.id)}</b><span>${esc(c.type)} claim</span></div>
        <button class="drawer__x" id="dx">&times;</button></div>
      <div class="drawer__b">
        <div class="dr"><span class="dr__k">Client</span><span class="dr__v">${esc(cl ? cl.name : '—')}</span></div>
        <div class="dr"><span class="dr__k">Policy</span><span class="dr__v">${esc(c.policy)}</span></div>
        <div class="dr"><span class="dr__k">Opened</span><span class="dr__v">${new Date(c.opened).toLocaleDateString()}</span></div>
        <div class="dr"><span class="dr__k">Stage</span><span class="dr__v">${esc(c.stage || c.status)}</span></div>
        <div class="dr"><span class="dr__k">Adjuster</span><span class="dr__v">${esc(c.adjuster || '—')}</span></div>
        <div class="dr"><span class="dr__k">Reserve</span><span class="dr__v">${money(c.reserve || 0)}</span></div>
        <div class="dr"><span class="dr__k">Paid</span><span class="dr__v">${money(c.paid || 0)}</span></div>
        <div class="dr"><span class="dr__k">Notes</span><span class="dr__v">${esc(c.note || '—')}</span></div>
        <div class="acts">
          <button class="btn btn--line btn--sm" data-st="Open">Mark open</button>
          <button class="btn btn--blue btn--sm" data-st="Closed">Mark closed</button>
        </div>
      </div>`);
    document.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => {
      S.updateClaim(c.id, { status: b.dataset.st, stage: b.dataset.st === 'Closed' ? 'Paid' : 'Adjuster assigned' });
      (window.CG.renderAll || renderAll)(); window.CG.closeDrawer();
    }));
  }

  /* ── money ────────────────────────────────────────────── */
  function renderMoney() {
    const rows = allPolicies();
    const byCarrier = {};
    rows.forEach(({ p }) => {
      const b = byCarrier[p.carrier] = byCarrier[p.carrier] || { n: 0, prem: 0 };
      b.n++; b.prem += p.premium;
    });
    const comm = Object.entries(byCarrier).map(([k, v]) => {
      const rate = /Life/i.test(k) ? 0.20 : 0.125;
      return { carrier: k, n: v.n, prem: v.prem, comm: v.prem * 12 * rate, rate };
    }).sort((a, b) => b.comm - a.comm);
    const el = $('commRows'); if (!el) return;
    el.innerHTML = comm.map((c, i) => `
      <tr><td style="font-weight:700">${esc(c.carrier)}</td><td>${c.n}</td>
        <td>${money(c.prem * 12)}</td><td style="font-weight:700">${money(c.comm)}</td>
        <td><span class="tg ${i % 3 === 2 ? 'tg--quoted' : 'tg--won'}">${i % 3 === 2 ? 'Pending' : 'Paid'}</span></td></tr>`).join('')
      || '<tr><td colspan="5" class="empty">No commission data.</td></tr>';

    const totalAnnual = rows.reduce((a, r) => a + r.p.premium * 12, 0);
    const totalComm = comm.reduce((a, c) => a + c.comm, 0);
    const spend = 4200;
    const el2 = $('moneyExtra'); if (!el2) return;
    el2.innerHTML = `
      <div class="kpis kpis--flat">
        <div class="kpi"><div class="kpi__l">Annualized premium</div><div class="kpi__v">${money(totalAnnual)}</div><div class="kpi__d">renewing book</div></div>
        <div class="kpi"><div class="kpi__l">Annual commission</div><div class="kpi__v">${money(totalComm)}</div><div class="kpi__d">at ${(12.5).toFixed(1)}% avg</div></div>
        <div class="kpi"><div class="kpi__l">Monthly ad spend</div><div class="kpi__v">${money(spend)}</div><div class="kpi__d">all channels</div></div>
        <div class="kpi"><div class="kpi__l">Return on spend</div><div class="kpi__v">${(totalComm / (spend * 12)).toFixed(1)}x</div><div class="kpi__d">commission vs spend</div></div>
      </div>`;
  }

  /* ── client record ────────────────────────────────────── */
  function openClient(id) {
    const c = S.clients().find(x => x.id === id); if (!c) return;
    const claims = S.claims().filter(x => x.clientId === c.id);
    const notes = S.notesFor(c.id);
    const prem = c.policies.reduce((a, p) => a + p.premium, 0);
    window.CG.drawer(`
      <div class="drawer__h"><div><b>${esc(c.name)}</b><span>${esc(c.id)} · client since ${new Date(c.since).getFullYear()}</span></div>
        <button class="drawer__x" id="dx">&times;</button></div>
      <div class="drawer__b">
        <div class="dr"><span class="dr__k">Phone</span><span class="dr__v">${esc(c.phone)}</span></div>
        <div class="dr"><span class="dr__k">Email</span><span class="dr__v">${esc(c.email)}</span></div>
        <div class="dr"><span class="dr__k">Address</span><span class="dr__v">${esc(c.address)}</span></div>
        <div class="dr"><span class="dr__k">Agent</span><span class="dr__v">${esc(c.agent)}</span></div>
        <div class="dr"><span class="dr__k">Monthly premium</span><span class="dr__v">${money(prem)}</span></div>

        <h4 class="dr__h">Policies (${c.policies.length})</h4>
        ${c.policies.map(p => `<div class="mini"><b>${esc(p.line)} · ${esc(p.carrier)}</b>
          <span>${esc(p.no)} · ${esc(p.term)} · renews ${esc(p.renews)}</span>
          <em>${money(p.premium)}/mo</em></div>`).join('')}

        <h4 class="dr__h">Claims (${claims.length})</h4>
        ${claims.map(x => `<div class="mini"><b>${esc(x.type)}</b>
          <span>${esc(x.id)} · opened ${new Date(x.opened).toLocaleDateString()}</span>
          <em>${esc(x.stage || x.status)}</em></div>`).join('') || '<div class="empty">No claims on file.</div>'}

        <h4 class="dr__h">Documents</h4>
        ${docsFor(c).map(d => `<div class="doc doc--mini" data-doc="${esc(d.key)}">
          <span class="doc__i">PDF</span><div class="doc__b"><div class="doc__t">${esc(d.label)}</div>
          <div class="doc__m">${esc(d.meta)}</div></div><span class="doc__d">Get</span></div>`).join('')}

        <h4 class="dr__h">Activity</h4>
        <div id="noteList">${notes.map(n => `<div class="note"><span>${new Date(n.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>${esc(n.text)}</div>`).join('') || '<div class="empty">No notes yet.</div>'}</div>
        <form id="noteForm" class="noteform"><input id="noteInput" placeholder="Log a call, note or commitment…"><button class="btn btn--blue btn--xs" type="submit">Add</button></form>

        <div class="acts">
          <button class="btn btn--line btn--sm" id="callBtn">Log call</button>
          <button class="btn btn--blue btn--sm" id="emailBtn">Email client</button>
        </div>
      </div>`);

    document.querySelectorAll('.doc--mini').forEach(r => r.addEventListener('click', () => {
      const [, no, kind] = r.dataset.doc.split(':');
      const p = c.policies.find(x => x.no === no);
      if (p) window.CG.downloadDoc(c, p, kind);
    }));
    $('noteForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('noteInput').value.trim(); if (!v) return;
      S.addNote(c.id, v); S.logTouch({ leadId: c.id, channel: 'note', step: 0, campaign: 'manual' });
      openClient(c.id); (window.CG.renderAll || renderAll)();
    });
    $('callBtn').addEventListener('click', () => {
      S.addNote(c.id, 'Called ' + c.phone + ' — no answer, left voicemail.');
      openClient(c.id);
    });
    $('emailBtn').addEventListener('click', () => {
      S.addNote(c.id, 'Emailed ' + c.email + ' with policy summary.');
      openClient(c.id);
    });
  }

  /* ── document generator ───────────────────────────────── */
  function downloadDoc(c, p, kind) {
    const W = 1000, H = kind === 'card' ? 620 : 1100;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#046DCD'; x.fillRect(0, 0, W, 92);
    x.fillStyle = '#fff'; x.font = 'bold 30px Arial'; x.fillText('CARDINAL INSURANCE GROUP', 44, 58);
    x.font = '16px Arial'; x.fillText(kind === 'card' ? 'Auto ID Card' : 'Declarations Page', 44, 132);
    x.fillStyle = '#1B3A6B'; x.font = 'bold 22px Arial';
    x.fillText(c.name, 44, 168); x.font = '16px Arial'; x.fillStyle = '#42506A';
    x.fillText(c.address, 44, 196);
    const rows = [
      ['Policy number', p.no], ['Line of coverage', p.line], ['Carrier', p.carrier],
      ['Policy term', p.term], ['Renewal date', p.renews], ['Monthly premium', '$' + p.premium.toFixed(2)],
      ['Payment due', p.due + ' of month'], ['Status', p.status]
    ];
    let y = 250;
    rows.forEach(([k, v]) => {
      x.fillStyle = '#8494AC'; x.font = '14px Arial'; x.fillText(k.toUpperCase(), 44, y);
      x.fillStyle = '#1B3A6B'; x.font = 'bold 18px Arial'; x.fillText(String(v), 44, y + 24);
      y += 62;
    });
    x.strokeStyle = '#E2E9F3'; x.beginPath(); x.moveTo(44, y + 6); x.lineTo(W - 44, y + 6); x.stroke();
    x.fillStyle = '#5B6B84'; x.font = '13px Arial';
    x.fillText('2730 S Val Vista Dr Bldg 6 Ste 129, Gilbert, AZ 85295 · (480) 813-2233', 44, y + 40);
    x.fillText('This document is a demonstration sample and is not a binding insurance document.', 44, y + 64);
    cv.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'Cardinal-' + p.line + '-' + (kind === 'card' ? 'Card' : 'Dec-Page') + '-' + p.no + '.png';
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  }

  /* ── drawer plumbing shared with admin.js ─────────────── */
  window.CG.drawer = function (html) {
    const d = $('drawer'), sc = $('scrim');
    d.innerHTML = html; d.classList.add('on'); sc.classList.add('on');
    const x = d.querySelector('#dx'); if (x) x.addEventListener('click', window.CG.closeDrawer);
  };
  window.CG.closeDrawer = function () {
    $('drawer').classList.remove('on'); $('scrim').classList.remove('on');
  };
  window.CG.downloadDoc = downloadDoc;
  window.CG.openClient = openClient;

  function renderAll() {
    renderPolicies(); renderDocs(); renderClaims(); renderMoney();
  }
  window.CG.renderAms = renderAll;

  if (document.readyState !== 'loading') renderAll();
  else document.addEventListener('DOMContentLoaded', renderAll);
})();
