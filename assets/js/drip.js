/* Drip campaigns, follow-up queue, pipeline and retention */
(function () {
  'use strict';
  const S = window.CG.store;
  const $ = id => document.getElementById(id);
  const DAY = 864e5;

  const CAMPAIGNS = [
    {
      id: 'new_lead', name: 'New Lead Nurture', trigger: 'Lead created',
      desc: 'First 14 days. Speed to lead, then stay in front of them until they buy.',
      steps: [
        { d: 0, ch: 'SMS', label: 'Intro text from John' },
        { d: 0, ch: 'Call', label: 'First call attempt' },
        { d: 1, ch: 'Call', label: 'Second attempt + voicemail' },
        { d: 3, ch: 'Email', label: 'Coverage options email' },
        { d: 7, ch: 'SMS', label: 'Check-in text' },
        { d: 14, ch: 'Email', label: 'Last touch before recycle' }
      ]
    },
    {
      id: 'quote_follow', name: 'Quote Follow-Up', trigger: 'Quote sent',
      desc: 'Most quotes are lost to silence, not price. Four touches over ten days.',
      steps: [
        { d: 0, ch: 'Email', label: 'Quote delivered + summary' },
        { d: 2, ch: 'Call', label: 'Did you see the numbers?' },
        { d: 5, ch: 'SMS', label: 'Quick question text' },
        { d: 10, ch: 'Call', label: 'Final call before close file' }
      ]
    },
    {
      id: 'renewal', name: 'Renewal Save', trigger: '60 days before renewal',
      desc: 'Renewals are the cheapest premium you have. Five touches into the date.',
      steps: [
        { d: -60, ch: 'Email', label: 'Renewal heads up' },
        { d: -45, ch: 'SMS', label: 'Any changes to vehicles or home?' },
        { d: -30, ch: 'Call', label: 'Review and re-shop' },
        { d: -14, ch: 'Email', label: 'Renewal documents' },
        { d: -7, ch: 'Call', label: 'Confirm payment method' }
      ]
    },
    {
      id: 'xsell', name: 'Cross-Sell Gap', trigger: 'Auto only, no home',
      desc: 'Every auto client without a home policy is a two-minute conversation.',
      steps: [
        { d: 0, ch: 'Email', label: 'Bundle savings note' },
        { d: 4, ch: 'Call', label: 'Bundle review call' },
        { d: 9, ch: 'SMS', label: 'Last nudge' }
      ]
    }
  ];

  const CH = { SMS: '#046DCD', Call: '#C33E47', Email: '#26488A' };

  const byName = n => (n || '').trim().toLowerCase();

  /* which campaign a lead belongs to */
  function campaignFor(lead) {
    if (lead.status === 'Won' || lead.status === 'Lost') return null;
    if (lead.status === 'Quoted') return 'quote_follow';
    return 'new_lead';
  }

  function stepDue(lead, step) {
    return new Date(new Date(lead.createdAt).getTime() + step.d * DAY);
  }

  function progress(lead, camp) {
    const logged = S.touches().filter(t => t.leadId === lead.id && t.campaign === camp.id).length;
    return Math.min(logged, camp.steps.length);
  }

  /* every touch that is due now and not yet logged or snoozed */
  function queue() {
    const out = [];
    const snoozed = S.snoozes();
    const now = Date.now();
    S.leads().forEach(lead => {
      const cid = campaignFor(lead);
      if (!cid) return;
      const camp = CAMPAIGNS.find(c => c.id === cid);
      if (!camp || S.paused()[cid]) return;
      const done = progress(lead, camp);
      const step = camp.steps[done];
      if (!step) return;
      const due = stepDue(lead, step);
      const key = lead.id + ':' + cid + ':' + done;
      if (snoozed[key] && new Date(snoozed[key]).getTime() > now) return;
      if (due.getTime() > now) return;
      out.push({
        key, lead, camp, step, done,
        daysLate: Math.floor((now - due.getTime()) / DAY)
      });
    });
    return out.sort((a, b) => b.daysLate - a.daysLate);
  }

  function renderQueue() {
    const q = queue();
    const el = $('queue');
    if (!el) return;
    $('qCount').textContent = q.length + ' due';
    if (!q.length) { el.innerHTML = '<div class="empty">Nothing due. Every follow-up is logged.</div>'; return; }
    el.innerHTML = q.map(item => {
      const late = item.daysLate > 0 ? '<b style="color:#C33E47">' + item.daysLate + 'd late</b>' : 'Due today';
      return '<div class="qrow" data-key="' + item.key + '" data-lead="' + item.lead.id + '">' +
        '<div class="qrow__l"><div class="qrow__n">' + item.lead.name + '</div>' +
        '<div class="qrow__m">' + item.lead.type + ' · ' + item.camp.name + ' · step ' + (item.done + 1) + ' of ' + item.camp.steps.length + '</div></div>' +
        '<div class="qrow__s"><span class="chip" style="background:' + CH[item.step.ch] + '">' + item.step.ch + '</span>' +
        '<span class="qrow__t">' + item.step.label + '</span></div>' +
        '<div class="qrow__r"><span class="qrow__d">' + late + '</span>' +
        '<button class="btn btn--blue btn--xs" data-done="' + item.key + '">Log it</button>' +
        '<button class="btn btn--line btn--xs" data-snooze="' + item.key + '">Snooze</button></div></div>';
    }).join('');

    el.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const [leadId, cid, step] = b.dataset.done.split(':');
      S.logTouch({ leadId, campaign: cid, step: +step, channel: 'manual' });
      S.updateLead(leadId, { lastTouch: new Date().toISOString() });
      refresh();
    }));
    el.querySelectorAll('[data-snooze]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      S.snooze(b.dataset.snooze);
      refresh();
    }));
    el.querySelectorAll('.qrow').forEach(r => r.addEventListener('click', () => {
      const id = r.dataset.lead;
      if (window.CG.openLead) window.CG.openLead(id);
    }));
  }

  function renderCampaigns() {
    const el = $('campaigns');
    if (!el) return;
    const leads = S.leads();
    el.innerHTML = CAMPAIGNS.map(c => {
      const enrolled = leads.filter(l => campaignFor(l) === c.id).length;
      const off = !!S.paused()[c.id];
      const steps = c.steps.map(s =>
        '<span class="stp"><i style="background:' + CH[s.ch] + '"></i>D' + (s.d < 0 ? s.d : '+' + s.d) + ' ' + s.ch + '</span>').join('');
      return '<div class="camp' + (off ? ' camp--off' : '') + '">' +
        '<div class="camp__h"><div><b>' + c.name + '</b>' +
        '<span class="camp__tg">' + c.trigger + '</span></div>' +
        '<button class="tog' + (off ? '' : ' tog--on') + '" data-camp="' + c.id + '"><span></span></button></div>' +
        '<p class="camp__d">' + c.desc + '</p>' +
        '<div class="camp__steps">' + steps + '</div>' +
        '<div class="camp__f"><span>' + enrolled + ' enrolled</span><span>' + c.steps.length + ' touches</span>' +
        '<span class="camp__st">' + (off ? 'Paused' : 'Active') + '</span></div></div>';
    }).join('');
    el.querySelectorAll('[data-camp]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.camp;
      S.setPaused(id, !S.paused()[id]);
      refresh();
    }));
  }

  function renderPipeline() {
    const el = $('pipeline');
    if (!el) return;
    const order = ['New', 'Follow-up', 'Quoted', 'Won'];
    const leads = S.leads();
    const max = Math.max(1, ...order.map(s => leads.filter(l => l.status === s).length));
    el.innerHTML = order.map(s => {
      const n = leads.filter(l => l.status === s).length;
      const w = Math.round(n / max * 100);
      const col = s === 'Won' ? '#2D6A4F' : s === 'Quoted' ? '#046DCD' : s === 'Follow-up' ? '#C33E47' : '#26488A';
      return '<div class="pl"><div class="pl__t"><span>' + s + '</span><b>' + n + '</b></div>' +
        '<div class="pl__b"><i style="width:' + w + '%;background:' + col + '"></i></div></div>';
    }).join('');
  }

  function parseDate(s, fallback) {
    const d = new Date(s);
    return isNaN(d) ? fallback : d;
  }

  function renderRetention() {
    const el = $('retention');
    if (!el) return;
    const clients = S.clients();
    const soon = [];
    clients.forEach(c => c.policies.forEach(p => {
      const d = parseDate(p.renews, null);
      if (!d) return;
      const days = Math.round((d - Date.now()) / DAY);
      if (days >= 0 && days <= 400) soon.push({ c, p, days });
    }));
    soon.sort((a, b) => a.days - b.days);
    const renewals = soon.slice(0, 3).map(r =>
      '<div class="rt"><span>' + r.c.name + '</span>' +
      '<span class="rt__m">' + r.p.line + ' · ' + r.p.carrier + '</span>' +
      '<b>' + r.p.renews + '</b></div>').join('');

    const gaps = clients.filter(c => c.policies.some(p => /Auto/i.test(p.line)) && !c.policies.some(p => /Home/i.test(p.line)));
    const xsell = gaps.length
      ? gaps.map(c => '<div class="rt"><span>' + c.name + '</span><span class="rt__m">Auto only, no home</span><b class="rt__x">Cross-sell</b></div>').join('')
      : '<div class="empty">No coverage gaps.</div>';

    el.innerHTML = '<div class="rt__h">Renewals coming up</div>' + (renewals || '<div class="empty">None in window.</div>') +
      '<div class="rt__h" style="margin-top:14px">Coverage gaps</div>' + xsell;
  }

  function renderOwn() { renderQueue(); renderCampaigns(); renderPipeline(); renderRetention(); }
  window.CG.renderDrip = renderOwn;

  /* one entry point for every button in the dashboard */
  window.CG.renderAll = function () {
    if (window.CG.renderAdmin) window.CG.renderAdmin();
    if (window.CG.renderAms) window.CG.renderAms();
    renderOwn();
  };
  const refresh = () => (window.CG.renderAll || renderOwn)();

  if (document.readyState !== 'loading') refresh();
  else document.addEventListener('DOMContentLoaded', refresh);

  setInterval(refresh, 20000);
})();
