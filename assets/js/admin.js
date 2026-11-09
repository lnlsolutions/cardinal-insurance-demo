/* Admin dashboard */
(function () {
  'use strict';
  const S = window.CG.store;
  const $ = id => document.getElementById(id);
  const money = n => '$' + Math.round(n).toLocaleString('en-US');

  const CHANNELS = [
    { name: 'Google Ads', spend: 1800, leads: 34, bound: 6 },
    { name: 'Local Services Ads', spend: 1500, leads: 29, bound: 5 },
    { name: 'Meta', spend: 900, leads: 22, bound: 2 },
    { name: 'Referral / organic', spend: 0, leads: 14, bound: 4 }
  ];

  /* gate */
  if (sessionStorage.getItem('cardinal_admin') !== 'ok') {
    $('gate').style.display = 'grid';
  } else { $('gate').style.display = 'none'; }

  $('gateForm').addEventListener('submit', e => {
    e.preventDefault();
    if ($('gateCode').value.trim().toLowerCase() === 'cardinal2026') {
      sessionStorage.setItem('cardinal_admin', 'ok');
      $('gate').style.display = 'none';
      renderAll();
    } else {
      $('gateErr').style.display = 'block';
      $('gateCode').value = '';
    }
  });

  const STATUS_TG = { New: 'tg--new', 'Follow-up': 'tg--follow', Quoted: 'tg--quoted', Won: 'tg--won' };

  function ago(iso) {
    const d = Math.floor((Date.now() - new Date(iso)) / 864e5);
    if (d <= 0) return 'Today';
    if (d === 1) return 'Yesterday';
    return d + 'd ago';
  }
  const initials = n => (n || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  function renderKpis() {
    const leads = S.leads();
    const newL = leads.filter(l => l.status === 'New').length;
    const fu = leads.filter(l => l.status === 'Follow-up').length;
    const quoted = leads.filter(l => l.status === 'Quoted').length;
    const won = leads.filter(l => l.status === 'Won').length;
    const premium = S.clients().reduce((a, c) => a + c.policies.reduce((x, p) => x + p.premium, 0), 0);
    const spend = CHANNELS.reduce((a, c) => a + c.spend, 0);
    const totalLeads = CHANNELS.reduce((a, c) => a + c.leads, 0);

    $('kpis').innerHTML = [
      ['New leads', newL, 'since last run', ''],
      ['Follow-ups due', fu, 'needs a call today', 'kpi--alert'],
      ['Quotes out', quoted, 'waiting on decision', ''],
      ['Policies bound', won, 'this month', ''],
      ['Premium collected', money(premium), 'monthly, all clients', ''],
      ['Ad spend', money(spend), '30 days', ''],
      ['Cost per lead', money(spend / totalLeads), 'blended', ''],
      ['Cost per bound policy', money(spend / 17), 'across all channels', '']
    ].map(([l, v, d, cls]) => `<div class="kpi ${cls}"><div class="kpi__l">${l}</div><div class="kpi__v">${v}</div><div class="kpi__d">${d}</div></div>`).join('');

    $('asOf').textContent = new Date().toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function renderLeads() {
    const leads = S.leads();
    $('leadCount').textContent = leads.length + ' total';
    $('leadRows').innerHTML = leads.map(l => `
      <tr data-lead="${l.id}">
        <td><div class="who"><span class="av">${initials(l.name)}</span><span>${l.name || 'Unknown'}</span></div></td>
        <td>${l.type || '—'}</td>
        <td>${l.zip || '—'}</td>
        <td>${l.channel || '—'}</td>
        <td><span class="tg ${STATUS_TG[l.status] || 'tg--new'}">${l.status}</span></td>
        <td style="color:#5B6B84">${ago(l.createdAt)}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">No leads yet.</td></tr>';
    $('leadRows').querySelectorAll('[data-lead]').forEach(r =>
      r.addEventListener('click', () => openLead(r.dataset.lead)));
  }

  function renderFollowUps() {
    const fu = S.leads().filter(l => l.status === 'New' || l.status === 'Follow-up');
    $('fuCount').textContent = fu.length + ' open';
    $('fuList').innerHTML = fu.length ? fu.map(l => `
      <div class="fu" data-lead="${l.id}">
        <span class="av">${initials(l.name)}</span>
        <div class="fu__b"><div class="fu__n">${l.name}</div>
          <div class="fu__m">${l.type} · ${l.insured === 'Yes' ? 'currently insured' : 'not insured'} · added ${ago(l.createdAt)}</div></div>
        <button class="btn btn--line btn--sm" type="button">Open</button>
      </div>`).join('') : '<div class="empty">Nothing waiting. Everything has been worked.</div>';
    $('fuList').querySelectorAll('[data-lead]').forEach(r =>
      r.addEventListener('click', () => openLead(r.dataset.lead)));
  }

  function renderClients() {
    const cs = S.clients();
    $('clientCount').textContent = cs.length + ' active';
    $('clientRows').innerHTML = cs.map(c => {
      const prem = c.policies.reduce((a, p) => a + p.premium, 0);
      return `<tr>
        <td><div class="who"><span class="av">${initials(c.name)}</span><span>${c.name}</span></div></td>
        <td>${c.policies.map(p => p.line).join(', ')}</td>
        <td style="font-weight:700">${money(prem)}</td>
        <td>${[...new Set(c.policies.map(p => p.carrier))].join(', ')}</td>
        <td style="color:#5B6B84">${new Date(c.since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="empty">No clients yet.</td></tr>';
  }

  function renderChannels() {
    $('chanRows').innerHTML = CHANNELS.map(c => `
      <tr><td style="font-weight:700">${c.name}</td>
        <td>${money(c.spend)}</td><td>${c.leads}</td>
        <td>${c.spend ? money(c.spend / c.leads) : '—'}</td>
        <td>${c.bound}</td></tr>`).join('');
  }

  /* drawer */
  const drawer = $('drawer'), scrim = $('scrim');
  function closeAll() { drawer.classList.remove('on'); scrim.classList.remove('on'); }
  $('scrim').addEventListener('click', closeAll);

  function openLead(id) {
    const l = S.leads().find(x => x.id === id); if (!l) return;
    drawer.innerHTML = `
      <div class="drawer__h">
        <div><b>${l.name}</b><span>${l.type} insurance · ${l.channel}</span></div>
        <button class="drawer__x" id="dx">&times;</button>
      </div>
      <div class="drawer__b">
        <div class="dr"><span class="dr__k">Status</span><span class="dr__v"><span class="tg ${STATUS_TG[l.status] || 'tg--new'}">${l.status}</span></span></div>
        <div class="dr"><span class="dr__k">Phone</span><span class="dr__v">${l.phone || '—'}</span></div>
        <div class="dr"><span class="dr__k">Email</span><span class="dr__v">${l.email || '—'}</span></div>
        <div class="dr"><span class="dr__k">ZIP</span><span class="dr__v">${l.zip || '—'}</span></div>
        <div class="dr"><span class="dr__k">Currently insured</span><span class="dr__v">${l.insured || '—'}</span></div>
        <div class="dr"><span class="dr__k">Appointment</span><span class="dr__v">${l.appointment || 'Not booked'}</span></div>
        <div class="dr"><span class="dr__k">Lead score</span><span class="dr__v">${l.score || '—'}/100</span></div>
        <div class="dr"><span class="dr__k">Added</span><span class="dr__v">${new Date(l.createdAt).toLocaleDateString()}</span></div>
        <div class="acts">
          <button class="btn btn--blue btn--sm" data-st="Quoted">Mark quoted</button>
          <button class="btn btn--line btn--sm" data-st="Follow-up">Needs follow-up</button>
          <button class="btn btn--line btn--sm" data-st="Won">Mark won</button>
        </div>
        <p style="font-size:12.5px;color:#5B6B84;margin-top:16px">Status changes save to this dashboard only, for the demo.</p>
      </div>`;
    drawer.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => {
      S.updateLead(l.id, { status: b.dataset.st });
      renderAll(); openLead(l.id);
    }));
    drawer.querySelector('#dx').addEventListener('click', closeAll);
    drawer.classList.add('on'); scrim.classList.add('on');
  }

  function renderAll() { renderKpis(); renderLeads(); renderFollowUps(); renderClients(); renderChannels(); }

  $('refresh').addEventListener('click', renderAll);
  $('addLead').addEventListener('click', () => {
    const names = ['Walk-in inquiry', 'Phone inquiry', 'Referral lead'];
    S.addLead({
      name: names[Math.floor(Math.random() * names.length)],
      phone: '(480) 555-01' + Math.floor(10 + Math.random() * 89),
      zip: '8529' + Math.floor(Math.random() * 9),
      type: ['Auto', 'Home', 'Commercial', 'Life'][Math.floor(Math.random() * 4)],
      insured: Math.random() > .4 ? 'Yes' : 'No',
      channel: 'Walk-in', status: 'New'
    });
    renderAll();
  });

  renderAll();
})();
