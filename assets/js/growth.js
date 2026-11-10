/* Growth tab — where leads and calls actually come from */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = n => '$' + Math.round(n).toLocaleString('en-US');

  const CHANNELS = [
    { name: 'Google Ads (PPC)', spend: 1800, leads: 41, calls: 96 },
    { name: 'Local Services Ads', spend: 1200, leads: 29, calls: 74 },
    { name: 'Meta / Facebook', spend: 800, leads: 18, calls: 22 },
    { name: 'SEO + Google Business', spend: 400, leads: 15, calls: 61 },
    { name: 'Referral / walk-in', spend: 0, leads: 9, calls: 18 }
  ];

  const ZIPS = [
    { zip: '85254', area: 'Scottsdale', leads: 18 },
    { zip: '85249', area: 'Chandler', leads: 16 },
    { zip: '85233', area: 'Gilbert', leads: 14 },
    { zip: '85258', area: 'Scottsdale', leads: 12 },
    { zip: '85226', area: 'Chandler', leads: 11 },
    { zip: '85281', area: 'Tempe', leads: 9 },
    { zip: '85048', area: 'Ahwatukee', leads: 8 },
    { zip: '85297', area: 'Gilbert', leads: 7 },
    { zip: '85142', area: 'Queen Creek', leads: 6 },
    { zip: '85201', area: 'Mesa', leads: 5 },
    { zip: '85032', area: 'Phoenix', leads: 4 },
    { zip: '85308', area: 'Glendale', leads: 3 }
  ];

  const KEYWORDS = [
    { kw: 'insurance agency chandler az', vol: 720, rank: 3, prev: 7 },
    { kw: 'auto insurance gilbert az', vol: 1300, rank: 5, prev: 11 },
    { kw: 'homeowners insurance arizona', vol: 2400, rank: 9, prev: 14 },
    { kw: 'cheap car insurance chandler', vol: 590, rank: 4, prev: 9 },
    { kw: 'commercial insurance gilbert', vol: 320, rank: 2, prev: 6 },
    { kw: 'sr22 insurance chandler az', vol: 480, rank: 6, prev: 6 },
    { kw: 'independent insurance agent near me', vol: 3600, rank: 12, prev: 22 }
  ];

  const CALLS = [
    { t: '9:12 AM', who: 'Jill Nakamura', src: 'Google Ads', out: 'Answered', dur: '4:12' },
    { t: '8:47 AM', who: 'Unknown', src: 'Google Ads', out: 'Missed', dur: '—' },
    { t: '8:31 AM', who: 'Tom Bledsoe', src: 'LSA', out: 'Answered', dur: '7:38' },
    { t: '8:04 AM', who: 'Marc Dimini', src: 'SEO', out: 'Answered', dur: '2:55' },
    { t: 'Yest. 5:38 PM', who: 'Unknown', src: 'Meta', out: 'Missed', dur: '—' },
    { t: 'Yest. 4:02 PM', who: 'Dana Whitfield', src: 'Google Ads', out: 'Answered', dur: '6:20' }
  ];

  const spend = CHANNELS.reduce((a, c) => a + c.spend, 0);
  const leads = CHANNELS.reduce((a, c) => a + c.leads, 0);
  const calls = CHANNELS.reduce((a, c) => a + c.calls, 0);
  const missed = 47;
  const answered = calls - missed;

  function kpis() {
    const items = [
      ['Ad spend', money(spend), '30 days, all channels'],
      ['Leads', leads, (spend / leads).toFixed(0) + ' cost per lead'],
      ['Calls', calls, (100 - Math.round(missed / calls * 100)) + '% answered'],
      ['Missed calls', missed, 'auto-texted within 60s'],
      ['Cost per call', money(spend / calls), 'all paid channels'],
      ['Live keywords top 3', KEYWORDS.filter(k => k.rank <= 3).length + '/' + KEYWORDS.length, 'local pack']
    ];
    $('gKpis').innerHTML = items.map(([l, v, d]) =>
      `<div class="kpi"><div class="kpi__l">${l}</div><div class="kpi__v">${v}</div><div class="kpi__d">${d}</div></div>`).join('');
  }

  function chans() {
    $('gChan').innerHTML = CHANNELS.map(c => `<tr>
      <td style="font-weight:700">${c.name}</td>
      <td>${c.spend ? money(c.spend) : '—'}</td>
      <td>${c.leads}</td>
      <td>${c.spend ? money(c.spend / c.leads) : '—'}</td>
      <td>${c.calls}</td>
      <td>${c.spend ? money(c.spend / c.calls) : '—'}</td>
    </tr>`).join('') + `<tr style="font-weight:800;background:#F7FAFF">
      <td>Total</td><td>${money(spend)}</td><td>${leads}</td>
      <td>${money(spend / leads)}</td><td>${calls}</td><td>${money(spend / calls)}</td></tr>`;
  }

  function callPanel() {
    $('gCallMeta').textContent = answered + ' answered · ' + missed + ' missed';
    $('gCalls').innerHTML = '<table><thead><tr><th>Time</th><th>Caller</th><th>Source</th><th>Outcome</th><th>Talk</th></tr></thead><tbody>' +
      CALLS.map(c => `<tr>
        <td style="color:#5B6B84">${c.t}</td>
        <td style="font-weight:600">${c.who}</td>
        <td>${c.src}</td>
        <td><span class="tg ${c.out === 'Missed' ? 'tg--miss' : 'tg--won'}">${c.out}</span></td>
        <td>${c.dur}</td></tr>`).join('') + '</tbody></table>';
  }

  function zipMap() {
    const max = Math.max(...ZIPS.map(z => z.leads));
    $('gZip').innerHTML =
      '<div class="zgrid">' + ZIPS.map(z => {
        const t = z.leads / max;
        const bg = t > .8 ? '#0B4FA8' : t > .6 ? '#046DCD' : t > .4 ? '#4A93DC' : t > .25 ? '#8FB9E8' : t > .1 ? '#C3D8F2' : '#E4EEFA';
        const fg = t > .4 ? '#fff' : '#12325C';
        return `<div class="zt" style="background:${bg};color:${fg}">
          <b>${z.zip}</b><span>${z.area}</span><em>${z.leads} leads</em></div>`;
      }).join('') + '</div>' +
      '<div class="zlegend"><span>Fewer leads</span><i style="background:#E4EEFA"></i><i style="background:#C3D8F2"></i><i style="background:#8FB9E8"></i><i style="background:#4A93DC"></i><i style="background:#046DCD"></i><i style="background:#0B4FA8"></i><span>More leads</span></div>';
  }

  function keywords() {
    $('gKw').innerHTML = KEYWORDS.map(k => {
      const d = k.prev - k.rank;
      const arrow = d > 0 ? `<span style="color:#0E8F4E;font-weight:700">▲ ${d}</span>`
        : d < 0 ? `<span style="color:#C33E47;font-weight:700">▼ ${Math.abs(d)}</span>`
        : '<span style="color:#8A99AE">—</span>';
      return `<tr>
        <td style="font-weight:600">${k.kw}</td>
        <td>${k.vol.toLocaleString()}</td>
        <td><b>#${k.rank}</b></td>
        <td>${arrow}</td>
        <td>${k.rank <= 3 ? '<span class="tg tg--won">Top 3</span>' : '<span class="tg tg--new">Page 1</span>'}</td>
      </tr>`;
    }).join('');
  }

  function render() { kpis(); chans(); callPanel(); zipMap(); keywords(); }
  window.CG.renderGrowth = render;

  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', render);
})();
