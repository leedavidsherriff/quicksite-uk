/* FIRST CHOICE FENCING · Theme C · 4-STEP PRICER — length → style → extras → your price (+ book a measure).
   Rates come from #pricerCfg (numbers only) and the server-rendered style cards (data-lo / data-hi).
   The maths is the SAME as the picker site's price(): extras per metre or per job, the "one trip"
   saving on the extras once two or more are on, the minimum job, and round-to-nearest-£10. So the
   same length and choices give the same figure on all three First Choice demo sites. */
(function () {
  'use strict';
  var cfgEl = document.getElementById('pricerCfg');
  if (!cfgEl) return;
  var C = JSON.parse(cfgEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gbp = function (n) { return '£' + Math.round(n).toLocaleString('en-GB'); };
  var r10 = function (n) { return Math.round(n / 10) * 10; };
  var rng = function (lo, hi) { var a = r10(lo), b = r10(hi); return a === b ? gbp(a) : gbp(a) + '–' + gbp(b); };

  var cards = [].slice.call(document.querySelectorAll('.fin[data-choice]'));
  var FIN = {};
  cards.forEach(function (b) { FIN[b.getAttribute('data-choice')] = { name: b.getAttribute('data-name'), lo: +b.getAttribute('data-lo'), hi: +b.getAttribute('data-hi'), card: b }; });
  var S = { finish: cards.length ? cards[0].getAttribute('data-choice') : null, qty: C.qty.def, ex: {}, step: 0 };
  C.extras.forEach(function (e) { S.ex[e.id] = !!e.on; });

  try {
    var saved = JSON.parse(localStorage.getItem(C.storeKey) || 'null');
    if (saved && saved.state && FIN[saved.state.finish]) { S.finish = saved.state.finish; S.qty = saved.state.qty || S.qty; S.ex = Object.assign(S.ex, saved.state.ex || {}); }
  } catch (e) {}
  var qs = new URLSearchParams(location.search);
  if (qs.get('style') && FIN[qs.get('style')]) { S.finish = qs.get('style'); S.step = 1; }

  function blocked(e) { return !!(e.not_for && e.not_for.indexOf(FIN[S.finish].name) > -1); }
  function calc() {
    var f = FIN[S.finish], q = S.qty, lines = [];
    var lo = q * f.lo, hi = q * f.hi;
    lines.push({ k: f.name + ' · ' + q + ' m', lo: lo, hi: hi });
    var exLo = 0, exHi = 0, nEx = 0;
    C.extras.forEach(function (e) {
      if (!S.ex[e.id] || blocked(e)) return;
      var n = e.per === 'unit' ? q : 1;
      nEx++; exLo += n * e.low; exHi += n * e.high;
      lines.push({ k: e.name + (e.per === 'unit' ? ' · ' + q + ' m' : ''), lo: n * e.low, hi: n * e.high });
    });
    var d = 0;
    if (C.discount && nEx >= 2) { d = C.discount.pct / 100; lines.push({ k: C.discount.label + ' · −' + C.discount.pct + '% on the extras', lo: -exLo * d, hi: -exHi * d, save: true }); }
    lo += exLo * (1 - d); hi += exHi * (1 - d);
    var floored = false;
    if (lo < C.minJob[0]) { lo = C.minJob[0]; floored = true; }
    if (hi < C.minJob[1]) { hi = C.minJob[1]; floored = true; }
    return { f: f, lines: lines, lo: r10(lo), hi: r10(hi), floored: floored, nEx: nEx };
  }
  window.__fcfPrice = function (o) { var keep = JSON.parse(JSON.stringify(S)); Object.assign(S, o || {}); var r = calc(); S = keep; return r; };

  /* count-up on the running total, rAF-throttled */
  var tw = {};
  function tween(el, lo, hi) {
    if (!el) return;
    var id = el.id, from = tw[id] || { lo: lo, hi: hi };
    if (reduced || !tw[id]) { el.textContent = gbp(lo) + '–' + gbp(hi); tw[id] = { lo: lo, hi: hi }; return; }
    var t0 = performance.now(), last = 0;
    tw[id] = { lo: lo, hi: hi };
    (function step(now) {
      var k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
      if (now - last > 30 || k === 1) { last = now; el.textContent = gbp(r10(from.lo + (lo - from.lo) * e)) + '–' + gbp(r10(from.hi + (hi - from.hi) * e)); }
      if (k < 1 && tw[id].lo === lo && tw[id].hi === hi) requestAnimationFrame(step);
    })(t0);
  }

  function message(c) {
    var ex = C.extras.filter(function (e) { return S.ex[e.id] && !blocked(e); }).map(function (e) { return '- ' + e.name; });
    return 'Hello ' + C.firm + ',\n\nI\'d like a fence measured and a written price.\n\nStyle: ' + c.f.name + '\nLength: about ' + S.qty + ' m\n' +
      (ex.length ? 'Extras:\n' + ex.join('\n') + '\n' : '') + 'Guide price from your website: ' + gbp(c.lo) + '–' + gbp(c.hi) + '\n\nMy postcode: \nBest time to call: \n';
  }

  function paint() {
    var c = calc();
    $('qty').value = S.qty; $('qtyOut').textContent = S.qty + ' m';
    document.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-preset') === S.qty); });
    cards.forEach(function (b) {
      var id = b.getAttribute('data-choice'), f = FIN[id];
      b.setAttribute('aria-pressed', id === S.finish);
      var y = b.querySelector('[data-yours]'); if (y) y.textContent = rng(S.qty * f.lo, S.qty * f.hi);
    });
    document.querySelectorAll('.x[data-x]').forEach(function (b) {
      var e = C.extras.filter(function (x) { return x.id === b.getAttribute('data-x'); })[0], n = e.per === 'unit' ? S.qty : 1;
      var na = blocked(e);
      b.classList.toggle('is-na', na); b.disabled = na;
      b.setAttribute('aria-pressed', !!S.ex[e.id] && !na);
      b.querySelector('[data-xp]').textContent = rng(n * e.low, n * e.high) + (e.per === 'unit' ? ' for ' + S.qty + ' m' : '');
    });
    if ($('nudge') && C.discount) {
      var need = 2 - c.nEx;
      $('nudge').innerHTML = need <= 0 ? '<b>' + C.discount.label + '</b>: ' + C.discount.pct + '% off the extras, because it is all done in one trip.'
        : 'Add ' + need + ' more extra' + (need > 1 ? 's' : '') + ' and <b>' + C.discount.label.toLowerCase() + '</b> takes ' + C.discount.pct + '% off them.';
    }
    $('lines').innerHTML = c.lines.map(function (l) {
      return '<div class="line' + (l.save ? ' save' : '') + '"><span>' + l.k + '</span><span>' + (l.save ? '−' + rng(-l.lo, -l.hi) : rng(l.lo, l.hi)) + '</span></div>';
    }).join('') + (c.floored ? '<div class="line sub"><span>Our minimum job</span><span>' + rng(C.minJob[0], C.minJob[1]) + '</span></div>' : '') +
      '<div class="line tot"><span>Guide price</span><span>' + gbp(c.lo) + '–' + gbp(c.hi) + '</span></div>';
    tween($('sTotal'), c.lo, c.hi); tween($('mTotal'), c.lo, c.hi);
    $('sLines').innerHTML = c.lines.map(function (l) { return '<li' + (l.save ? ' class="save"' : '') + '><span>' + l.k + '</span><b>' + (l.save ? '−' + rng(-l.lo, -l.hi) : rng(l.lo, l.hi)) + '</b></li>'; }).join('');
    var st = c.f.card.getAttribute('data-still'), img = $('sideImg');
    if (st && img && img.getAttribute('src') !== st) {
      img.classList.add('swap');
      setTimeout(function () { img.setAttribute('src', st); img.setAttribute('alt', c.f.card.getAttribute('data-still-alt') || ''); img.classList.remove('swap'); }, reduced ? 0 : 160);
    }
    var msg = message(c);
    if ($('waLink')) $('waLink').href = 'https://wa.me/' + C.wa + '?text=' + encodeURIComponent(msg);
    if ($('smsLink')) $('smsLink').href = 'sms:' + C.phone + '?&body=' + encodeURIComponent(msg);
    if ($('mailLink')) $('mailLink').href = 'mai' + 'lto:' + C.email + '?subject=' + encodeURIComponent('Fence measure – ' + c.f.name) + '&body=' + encodeURIComponent(msg);
    try {
      localStorage.setItem(C.storeKey, JSON.stringify({ state: { finish: S.finish, qty: S.qty, ex: S.ex }, finish: c.f.name, qty: S.qty + ' m',
        lines: c.lines.map(function (l) { return { k: l.k, v: l.save ? '−' + rng(-l.lo, -l.hi) : rng(l.lo, l.hi) }; }), lo: c.lo, hi: c.hi, t: Date.now() }));
    } catch (e) {}
  }

  function show(n, scroll) {
    S.step = Math.max(0, Math.min(3, n));
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('on', +p.getAttribute('data-step') === S.step); });
    document.querySelectorAll('.prog button').forEach(function (b) {
      var i = +b.getAttribute('data-go'); b.classList.toggle('on', i === S.step); b.classList.toggle('done', i < S.step);
      if (i === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    paint();
    if (scroll) {
      var top = document.querySelector('.stage').getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      var h = document.querySelector('.panel.on h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-next')) show(S.step + 1, true);
    else if (t.hasAttribute('data-prev')) show(S.step - 1, true);
    else if (t.hasAttribute('data-go')) show(+t.getAttribute('data-go'), false);
    else if (t.hasAttribute('data-choice')) { S.finish = t.getAttribute('data-choice'); paint(); }
    else if (t.hasAttribute('data-preset')) { S.qty = +t.getAttribute('data-preset'); paint(); }
    else if (t.hasAttribute('data-x')) { var id = t.getAttribute('data-x'); S.ex[id] = !S.ex[id]; paint(); }
  });
  $('qty').addEventListener('input', function (e) { S.qty = +e.target.value; paint(); });
  document.documentElement.classList.add('pricer-on');
  show(S.step, false);
})();
