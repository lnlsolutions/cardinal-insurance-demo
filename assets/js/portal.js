/* Client portal */
(function () {
  'use strict';
  const S = window.CG.store;
  const $ = id => document.getElementById(id);

  const loginView = $('loginView'), portalView = $('portalView');
  let client = null;

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._x); t._x = setTimeout(() => t.classList.remove('show'), 2600);
  }

  $('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('pEmail').value.trim().toLowerCase();
    const pin = $('pPin').value.trim();
    const found = S.clients().find(c =>
      c.email.toLowerCase() === email &&
      (c.policies.some(p => p.no.slice(-4) === pin) ||
       c.id.replace(/[^0-9]/g, '').slice(-4) === pin));
    if (!found) { $('loginErr').style.display = 'block'; return; }
    $('loginErr').style.display = 'none';
    client = found;
    sessionStorage.setItem('cardinal_uid', found.id);
    showPortal();
  });

  $('signOut').addEventListener('click', () => {
    sessionStorage.removeItem('cardinal_uid');
    portalView.classList.add('hide'); loginView.classList.remove('hide');
    $('pEmail').value = ''; $('pPin').value = ''; client = null;
  });

  function showPortal() {
    loginView.classList.add('hide'); portalView.classList.remove('hide');
    $('whoName').textContent = client.name;
    $('whoSince').textContent = 'Client since ' + new Date(client.since).getFullYear();
    const first = client.name.split(' ')[0];
    $('greeting').textContent = 'Welcome back, ' + first + '. Everything below is live from your carrier.';
    $('polCount').textContent = client.policies.length + ' active';
    renderPolicies(); renderMessages();
  }

  const money = v => '$' + v.toFixed(2);

  function renderPolicies() {
    $('polList').innerHTML = client.policies.map(p => `
      <div class="pol">
        <div class="pol__top">
          <div><div class="pol__tp">${p.line}</div><div class="pol__car">${p.carrier}</div></div>
          <div class="pol__no">${p.no}</div>
        </div>
        <div class="pol__grid">
          <div><div class="pol__k">Monthly</div><div class="pol__v big">${money(p.premium)}</div></div>
          <div><div class="pol__k">Term</div><div class="pol__v">${p.term}</div></div>
          <div><div class="pol__k">Renews</div><div class="pol__v">${p.renews}</div></div>
          <div><div class="pol__k">Due</div><div class="pol__v">${p.due} of month</div></div>
        </div>
        <div class="pol__acts">
          <button class="btn btn--line btn--sm" data-card="${p.no}">Download insurance card</button>
          <button class="btn btn--line btn--sm" data-change="${p.no}">Request change</button>
        </div>
      </div>`).join('');

    document.querySelectorAll('[data-card]').forEach(b =>
      b.addEventListener('click', () => makeCard(b.dataset.card)));
    document.querySelectorAll('[data-change]').forEach(b =>
      b.addEventListener('click', () => {
        $('msgInput').value = 'Requesting a change on policy ' + b.dataset.change + ': ';
        $('msgInput').focus();
      }));
  }

  /* messages */
  function threadKey() { return 'cardinal_msg_' + client.id; }
  function thread() { try { return JSON.parse(localStorage.getItem(threadKey())) || []; } catch (e) { return []; } }
  function saveThread(t) { localStorage.setItem(threadKey(), JSON.stringify(t)); }

  function renderMessages() {
    let t = thread();
    if (!t.length) {
      t = [{ from: 'agent', text: 'Hi ' + client.name.split(' ')[0] + ', this is John. Your policies are all current — let me know if anything changed at home or with the vehicles and I’ll re-shop at renewal.', at: new Date().toISOString() }];
      saveThread(t);
    }
    $('msgBox').innerHTML = t.map(m => `
      <div class="bub bub--${m.from === 'agent' ? 'them' : 'me'}">${escape0(m.text)}
        <div class="bub__m">${m.from === 'agent' ? 'John · Cardinal' : 'You'} · ${timeOf(m.at)}</div></div>`).join('');
    $('msgBox').scrollTop = $('msgBox').scrollHeight;
  }
  function escape0(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function timeOf(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  $('msgForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('msgInput').value.trim(); if (!v) return;
    const t = thread(); t.push({ from: 'client', text: v, at: new Date().toISOString() }); saveThread(t);
    $('msgInput').value = ''; renderMessages();
    setTimeout(() => {
      const t2 = thread();
      t2.push({ from: 'agent', text: 'Got it — thanks for letting me know. I’m pulling your file now and will get back to you today with options.', at: new Date().toISOString() });
      saveThread(t2); renderMessages();
    }, 1400);
  });

  $('reqReview').addEventListener('click', () => {
    $('msgInput').value = 'I’d like a free coverage review before my next renewal.';
    $('msgInput').focus();
    toast('Review requested — add a note and send');
  });

  document.querySelectorAll('.docStub').forEach(a =>
    a.addEventListener('click', () => toast('Demo: this document opens from the carrier in the live portal')));

  /* insurance card generator */
  function makeCard(policyNo) {
    const p = client.policies.find(x => x.no === policyNo);
    if (!p) return;
    const W = 1000, H = 620, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1B3A6B'; g.fillRect(0, 0, W, 96);
    g.fillStyle = '#C33E47'; g.fillRect(0, 96, W, 6);

    g.fillStyle = '#fff'; g.font = 'bold 30px Roboto, Arial'; g.fillText('CARDINAL INSURANCE GROUP', 40, 52);
    g.font = '16px Roboto, Arial'; g.fillStyle = '#C6D8EE';
    g.fillText('Auto ID Card · ' + p.carrier + ' · (480) 813-2233', 40, 76);

    g.fillStyle = '#fff'; g.font = 'bold 15px Roboto, Arial';
    g.fillText(p.line.toUpperCase() + ' INSURANCE', W - 300, 52);
    g.font = '14px Roboto, Arial'; g.fillStyle = '#C6D8EE';
    g.fillText('POLICY ' + p.no, W - 300, 76);

    let y = 156;
    const row = (label, value) => {
      g.fillStyle = '#7C8BA3'; g.font = 'bold 12px Roboto, Arial';
      g.fillText(label.toUpperCase(), 40, y);
      g.fillStyle = '#22304A'; g.font = 'bold 22px Roboto, Arial';
      g.fillText(value, 40, y + 28);
      y += 74;
    };
    row('Named insured', client.name);
    row('Mailing address', client.address);
    row('Policy number', p.no);
    row('Effective term', p.term + ' · renews ' + p.renews);

    g.fillStyle = '#F4F7FB'; g.fillRect(0, H - 118, W, 118);
    g.fillStyle = '#1B3A6B'; g.font = 'bold 14px Roboto, Arial';
    g.fillText('24/7 CLAIMS', 40, H - 82);
    g.fillStyle = '#334662'; g.font = '18px Roboto, Arial';
    g.fillText('(480) 813-2233', 40, H - 56);
    g.fillStyle = '#7C8BA3'; g.font = '12px Roboto, Arial';
    g.fillText('This card is a demo representation generated from your portal record.', 40, H - 28);

    // red cardinal mark
    g.fillStyle = '#C33E47';
    g.beginPath(); g.arc(W - 90, H - 70, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 30px Roboto, Arial'; g.textAlign = 'center';
    g.fillText('C', W - 90, H - 59); g.textAlign = 'left';

    const a = document.createElement('a');
    a.download = 'Cardinal-' + p.line.replace(/\s/g, '') + '-Card-' + p.no + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
    toast('Insurance card downloaded');
  }

  // restore session
  const saved = sessionStorage.getItem('cardinal_uid');
  if (saved) {
    const c = S.clients().find(x => x.id === saved);
    if (c) { client = c; showPortal(); }
  }
})();
