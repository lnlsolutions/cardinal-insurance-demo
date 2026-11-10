/* Admin: schedule when the quote assistant popup opens by itself */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const K = 'cardinal_popup_v1';
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const read = () => { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } };
  const write = v => { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} };

  function days() {
    const cfg = read();
    const on = Array.isArray(cfg.days) && cfg.days.length ? cfg.days : [0, 1, 2, 3, 4, 5, 6];
    $('popDays').innerHTML = NAMES.map((n, i) =>
      `<button type="button" class="dchip${on.indexOf(i) > -1 ? ' dchip--on' : ''}" data-day="${i}">${n}</button>`).join('');
    $('popDays').querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
      b.classList.toggle('dchip--on');
    }));
  }

  function status(cfg) {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    const el = $('popState');
    if (cfg.enabled === false) { el.textContent = 'switched off'; el.style.color = '#A82029'; return; }
    if (cfg.start && today < cfg.start) { el.textContent = 'scheduled ' + cfg.start; el.style.color = '#046DCD'; return; }
    if (cfg.end && today > cfg.end) { el.textContent = 'ended ' + cfg.end; el.style.color = '#8394AC'; return; }
    if (cfg.start || cfg.end) { el.textContent = 'live until ' + (cfg.end || 'cleared'); el.style.color = '#1D7A46'; return; }
    el.textContent = 'live every day'; el.style.color = '#1D7A46';
  }

  function load() {
    const cfg = read();
    $('popStart').value = cfg.start || '';
    $('popEnd').value = cfg.end || '';
    $('popDelay').value = cfg.delay == null ? 3 : cfg.delay;
    $('popFrom').value = cfg.from || '';
    $('popTo').value = cfg.to || '';
    $('popOn').checked = cfg.enabled !== false;
    days();
    status(cfg);
  }

  $('popSave').addEventListener('click', () => {
    const picked = [...$('popDays').querySelectorAll('.dchip--on')].map(b => Number(b.dataset.day));
    const cfg = {
      enabled: $('popOn').checked,
      start: $('popStart').value || '',
      end: $('popEnd').value || '',
      from: $('popFrom').value || '',
      to: $('popTo').value || '',
      delay: Number($('popDelay').value || 3),
      days: picked.length ? picked : [0, 1, 2, 3, 4, 5, 6]
    };
    if (cfg.start && cfg.end && cfg.end < cfg.start) {
      $('popMsg').textContent = 'The end date is before the start date.';
      return;
    }
    write(cfg);
    status(cfg);
    const when = cfg.start || cfg.end
      ? 'Runs ' + (cfg.start || 'today') + ' through ' + (cfg.end || 'no end date') + '.'
      : 'Runs every day.';
    $('popMsg').textContent = when + ' Opens after ' + cfg.delay + ' seconds' +
      (cfg.from || cfg.to ? ', between ' + (cfg.from || 'midnight') + ' and ' + (cfg.to || 'midnight') + '.' : '.');
  });

  $('popClear').addEventListener('click', () => {
    $('popStart').value = '';
    $('popEnd').value = '';
    $('popFrom').value = '';
    $('popTo').value = '';
    $('popOn').checked = true;
    write({ enabled: true, delay: Number($('popDelay').value || 3), start: '', end: '', from: '', to: '', days: [0, 1, 2, 3, 4, 5, 6] });
    load();
    $('popMsg').textContent = 'Dates cleared. The assistant opens on every visit.';
  });

  $('popOn').addEventListener('change', () => {
    const cfg = read(); cfg.enabled = $('popOn').checked; write(cfg); status(cfg);
  });

  if (document.readyState !== 'loading') load();
  else document.addEventListener('DOMContentLoaded', load);
})();
