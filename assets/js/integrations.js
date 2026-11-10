/* Integrations: Applied Epic connector + book import */
(function () {
  'use strict';
  const S = window.CG.store;
  const $ = id => document.getElementById(id);
  const K = 'cardinal_epic_v1';
  const LOG = 'cardinal_synclog_v1';

  const read = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? fb : v; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const TEMPLATE = 'Client,Policy,Line,Carrier,Premium,Renewal,Email,Phone\n' +
    'Jill Nakamura,AZ-AU-884120,Auto,Safeco,168.40,2027-03-11,jill.n@example.com,(480) 555-0183\n' +
    'Jill Nakamura,AZ-HO-551903,Homeowners,Openly,214.75,2027-06-02,jill.n@example.com,(480) 555-0183\n' +
    'Tom Bledsoe,AZ-AU-772335,Auto,Farmers,142.10,2027-01-18,tb@example.com,(480) 555-0164\n';

  function log(msg) {
    const all = read(LOG, []);
    all.unshift({ at: new Date().toISOString(), msg });
    write(LOG, all.slice(0, 12));
    renderLog();
  }

  function renderLog() {
    const all = read(LOG, []);
    $('syncLog').innerHTML = all.length
      ? all.map(l => `<div class="feed"><b>${new Date(l.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b><span>${l.msg}</span></div>`).join('')
      : '<p class="mut" style="margin:0">Nothing logged yet. Saving a connection or importing a book shows up here.</p>';
  }

  function state(txt, tone) {
    const el = $('epicState');
    el.textContent = txt;
    el.style.color = tone === 'on' ? '#1D7A46' : tone === 'warn' ? '#A82029' : '#5B6B84';
  }

  function prefill() {
    const c = read(K, {});
    $('epicEnv').value = c.env || 'sandbox';
    $('epicEnt').value = c.ent || '';
    $('epicDb').value = c.db || '';
    $('epicCid').value = c.cid || '';
    $('epicUrl').value = c.url || 'https://api.myappliedproducts.com';
    if (c.savedAt) {
      state('credentials saved', 'on');
      $('epicMsg').textContent = 'Saved ' + new Date(c.savedAt).toLocaleDateString() + ' in this browser for the demo. Live calls run server side once the key is in the vault.';
    }
  }

  $('epicSave').addEventListener('click', () => {
    const rec = {
      env: $('epicEnv').value, ent: $('epicEnt').value.trim(), db: $('epicDb').value.trim(),
      cid: $('epicCid').value.trim(), url: $('epicUrl').value.trim(), savedAt: new Date().toISOString()
    };
    if (!rec.cid || !rec.ent) {
      state('missing fields', 'warn');
      $('epicMsg').textContent = 'Client ID and enterprise ID are required before a connection can be tested.';
      return;
    }
    write(K, rec);
    state('credentials saved', 'on');
    $('epicMsg').textContent = 'Saved locally for the demo. The secret is never stored in this page; it belongs in the server vault.';
    log('Applied Epic connection saved for ' + rec.env + ' (enterprise ' + rec.ent + ')');
  });

  $('epicTest').addEventListener('click', () => {
    const c = read(K, {});
    if (!c.cid) {
      state('not connected', 'warn');
      $('epicMsg').textContent = 'Nothing to test yet. Save the connection first.';
      return;
    }
    const hasSecret = ($('epicSec').value || '').length > 8;
    state(hasSecret ? 'ready to authorize' : 'needs secret', hasSecret ? 'on' : 'warn');
    $('epicMsg').textContent = hasSecret
      ? 'Credentials look complete. Live authorization runs through the backend function with the vaulted key.'
      : 'Client ID and enterprise look good. The secret is what is missing, and it goes in the vault, not this form.';
    log('Connection test: ' + (hasSecret ? 'credentials complete' : 'secret missing'));
  });

  $('epicPull').addEventListener('click', () => {
    $('epicMsg').textContent = 'A live pull needs the server-side call with the vaulted key. Until that is in place, use the CSV import on the right and the data lands the same way.';
    log('Live pull requested, waiting on vaulted credentials');
  });

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    const head = lines[0].split(',').map(x => x.trim().toLowerCase());
    const idx = n => head.indexOf(n);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',');
      const get = n => (idx(n) > -1 ? (cells[idx(n)] || '').trim() : '');
      rows.push({
        name: get('client') || get('name'), no: get('policy') || get('policy number'),
        line: get('line') || get('coverage'), carrier: get('carrier'),
        premium: get('premium') || get('monthly premium'), renews: get('renewal') || get('renews'),
        email: get('email'), phone: get('phone'), status: get('status') || 'Active'
      });
    }
    return rows.filter(r => r.name);
  }

  $('bookFile').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const rows = parseCsv(String(rd.result));
      if (!rows.length) {
        $('importMsg').textContent = 'No rows found. Check the header row matches the template.';
        return;
      }
      const res = S.importBook(rows);
      $('importMsg').textContent = 'Imported ' + res.policies + ' policies. ' + res.added + ' new clients added.';
      log('Imported book: ' + res.policies + ' policies, ' + res.added + ' new clients');
      if (window.CG.renderAll) window.CG.renderAll();
    };
    rd.readAsText(f);
  });

  $('sampleCsv').addEventListener('click', ev => {
    ev.preventDefault();
    const blob = new Blob([TEMPLATE], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'epic-book-template.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  });


  /* ── Lightspeed Voice ─────────────────────────────────── */
  const LSK = 'cardinal_ls_v1';

  function renderCalls() {
    const host = $('lsCalls');
    if (!host) return;
    const calls = S.calls();
    $('lsCount').textContent = calls.length + ' calls';
    host.innerHTML = calls.map(c => {
      const mins = Math.floor(c.seconds / 60), secs = String(c.seconds % 60).padStart(2, '0');
      const dur = c.seconds ? mins + ':' + secs : '—';
      const miss = c.outcome === 'Missed';
      const hasTr = c.transcript && c.transcript !== '(no recording)';
      return '<div class="call">' +
        '<div class="call__top"><div class="call__who"><b>' + (c.name || c.from) + '</b>' +
        '<span>' + c.from + ' · ' + c.direction + ' · ' + dur + ' · ' + c.agent + '</span></div>' +
        '<span class="tg ' + (miss ? 'tg--miss' : 'tg--won') + '">' + c.outcome + '</span></div>' +
        '<div class="call__sum">' + c.summary + '</div>' +
        '<div class="call__meta"><span class="pill2">Sentiment: ' + c.sentiment + '</span>' +
        '<button class="lnk" data-expand="' + c.id + '">' + (hasTr ? 'Show transcript' : 'No recording') + '</button></div>' +
        '<div class="call__tr" id="tr-' + c.id + '" hidden>' + (c.transcript || '') + '</div>' +
        '</div>';
    }).join('') || '<p class="mut">No calls synced yet.</p>';

    host.querySelectorAll('[data-expand]').forEach(btn => btn.addEventListener('click', () => {
      const el = document.getElementById('tr-' + btn.dataset.expand);
      if (!el) return;
      el.hidden = !el.hidden;
      btn.textContent = el.hidden ? 'Show transcript' : 'Hide transcript';
    }));
  }

  function lsPrefill() {
    const c = read(LSK, {});
    $('lsAcct').value = c.acct || '';
    $('lsKey').value = c.key || '';
    if (c.sync) $('lsSync').value = c.sync;
    if (c.saved) $('lsMsg').textContent = 'Credentials saved on this device. Live capture needs Lightspeed to enable API access for your account.';
  }

  $('lsSave').addEventListener('click', () => {
    write(LSK, { acct: $('lsAcct').value, key: $('lsKey').value, sync: $('lsSync').value, saved: true });
    $('lsMsg').textContent = 'Saved. Point Lightspeed at the webhook above to start capturing calls.';
    log('Lightspeed connection saved');
  });

  $('lsTest').addEventListener('click', () => {
    const acct = $('lsAcct').value.trim(), key = $('lsKey').value.trim();
    $('lsMsg').textContent = (!acct || !key)
      ? 'Enter the account ID and API key first.'
      : 'Credentials look complete. Live calls begin once Lightspeed whitelists the webhook.';
  });

  window.CG.renderIntegrations = renderCalls;

  prefill();
  renderLog();
  setTimeout(renderCalls, 300);
})();
