/* Carrier downloads via Ivans: per-carrier enablement tracker */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const K = 'cardinal_ivans_v1';

  const SEED = [
    { carrier: 'Safeco', code: 'SFC-88412', lines: 'Auto, Home', downloads: 'Policy, Claims, Commission', status: 'Enabled' },
    { carrier: 'Progressive', code: 'PRG-22019', lines: 'Auto, Umbrella', downloads: 'Policy, Claims, Commission', status: 'Enabled' },
    { carrier: 'Travelers', code: '', lines: 'Home, Umbrella', downloads: 'Policy, Claims', status: 'Pending' },
    { carrier: 'Openly', code: 'OPN-3310', lines: 'Home', downloads: 'Policy', status: 'Enabled' },
    { carrier: 'Farmers', code: '', lines: 'Auto, Home', downloads: 'Policy, Commission', status: 'Pending' },
    { carrier: 'Auto-Owners', code: 'AUO-7741', lines: 'Umbrella, Home', downloads: 'Policy, Claims', status: 'Enabled' },
    { carrier: 'GEICO', code: '', lines: 'Auto', downloads: 'Policy', status: 'Not available' }
  ];

  const read = () => { try { const v = JSON.parse(localStorage.getItem(K)); return v && v.length ? v : SEED.slice(); } catch (e) { return SEED.slice(); } };
  const write = v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} };

  const TONE = { Enabled: '#1D7A46', Pending: '#B25E09', 'Not available': '#8394AC' };

  function render() {
    const rows = read();
    const on = rows.filter(r => r.status === 'Enabled').length;
    $('ivCount').textContent = on + ' of ' + rows.length + ' downloading';
    $('ivRows').innerHTML = rows.map((r, i) => `
      <tr>
        <td style="font-weight:600">${r.carrier}</td>
        <td>${r.code ? '<code style="font-size:11.5px">' + r.code + '</code>' : '<span style="color:#A82029">missing</span>'}</td>
        <td class="ivsmall">${r.lines}</td>
        <td class="ivsmall">${r.downloads}</td>
        <td><span class="ivpill" style="color:${TONE[r.status] || '#5B6B84'}">${r.status}</span></td>
        <td><button class="lnk" data-cycle="${i}">change</button></td>
      </tr>`).join('');

    $('ivRows').querySelectorAll('[data-cycle]').forEach(b => b.addEventListener('click', () => {
      const rows2 = read();
      const order = ['Pending', 'Enabled', 'Not available'];
      const row = rows2[Number(b.dataset.cycle)];
      row.status = order[(order.indexOf(row.status) + 1) % order.length];
      write(rows2);
      render();
    }));
  }

  $('ivAdd').addEventListener('click', () => {
    const name = prompt('Carrier name');
    if (!name) return;
    const rows = read();
    rows.push({ carrier: name, code: '', lines: '', downloads: 'Policy', status: 'Pending' });
    write(rows); render();
    $('ivMsg').textContent = name + ' added as pending. Request the agency code from the carrier.';
  });

  $('ivExport').addEventListener('click', () => {
    const rows = read().filter(r => r.status !== 'Enabled');
    if (!rows.length) {
      $('ivMsg').textContent = 'Every carrier on the list is already downloading.';
      return;
    }
    const csv = 'Carrier,Agency code,What to request\n' +
      rows.map(r => [r.carrier, r.code || 'NOT ON FILE',
        'Enable Ivans download for Cardinal Insurance Group (policy' +
        (/Claims/.test(r.downloads) ? ', claims' : '') +
        (/Commission/.test(r.downloads) ? ', commission' : '') + ') and issue agency code'].join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cardinal-ivans-download-requests.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    $('ivMsg').textContent = rows.length + ' carriers need enabling. The CSV lists exactly what to ask each one.';
  });

  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', render);
})();
