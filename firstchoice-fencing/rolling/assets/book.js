/* FIRST CHOICE FENCING · Theme C · BOOK A MEASURE — pick a day and a time of day, then send it.
   If the form has a data-lead-url the request is POSTed there as JSON. It is empty today, so nothing
   pretends to be booked: the request is written out and the visitor calls, or sends it by WhatsApp,
   text or email. Call is always the first option; WhatsApp is offered, never promised. */
(function () {
  'use strict';
  var cfgEl = document.getElementById('bookCfg'); if (!cfgEl) return;
  var C = JSON.parse(cfgEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var form = $('bookForm'), leadUrl = (form.getAttribute('data-lead-url') || '').trim();
  var q = null; try { q = JSON.parse(localStorage.getItem(C.storeKey) || 'null'); } catch (e) {}
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var gbp = function (n) { return '£' + Math.round(n).toLocaleString('en-GB'); };

  if (q && q.lo) {
    $('sumBody').innerHTML = '<div class="total">' + gbp(q.lo) + '–' + gbp(q.hi) + '</div><ul>' +
      q.lines.map(function (l) { return '<li><span>' + esc(l.k) + '</span><b>' + esc(l.v) + '</b></li>'; }).join('') +
      '</ul><a class="edit" href="' + C.quoteHref + '">Change it →</a>';
  }

  var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var days = [], d = new Date(); d.setHours(0, 0, 0, 0);
  while (days.length < 12) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) days.push(new Date(d)); }
  $('days').innerHTML = days.map(function (x, i) {
    return '<button type="button" class="day" data-i="' + i + '" aria-pressed="false" aria-label="' + names[x.getDay()] + ' ' + x.getDate() + ' ' + mon[x.getMonth()] + '"><small>' + names[x.getDay()] + '</small><b>' + x.getDate() + '</b><em>' + mon[x.getMonth()] + '</em></button>';
  }).join('');
  var pick = { day: null, slot: null };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.day, .slot'); if (!t) return;
    if (t.classList.contains('day')) {
      pick.day = days[+t.getAttribute('data-i')];
      document.querySelectorAll('.day').forEach(function (b) { b.setAttribute('aria-pressed', b === t); });
    } else {
      pick.slot = t.getAttribute('data-slot');
      document.querySelectorAll('.slot').forEach(function (b) { b.setAttribute('aria-pressed', b === t); });
    }
  });

  function done(msg, sent) {
    form.hidden = true;
    var box = $('done'); box.hidden = false;
    $('doneH').textContent = sent ? 'Request sent.' : 'Nearly done: send it to us.';
    $('doneTxt').textContent = sent
      ? C.firm + ' will be in touch to confirm the day. Nothing is booked until they do.'
      : 'Your request is written out below. Ring ' + C.phoneTxt + ' and read it out, or send it as a message, and ' + C.firm + ' will confirm the day. Nothing is booked until they do.';
    $('doneMsg').textContent = msg;
    $('sendWa').href = 'https://wa.me/' + C.wa + '?text=' + encodeURIComponent(msg);
    $('sendSms').href = 'sms:' + C.phone + '?&body=' + encodeURIComponent(msg);
    $('sendMail').href = 'mai' + 'lto:' + C.email + '?subject=' + encodeURIComponent('Fence measure request') + '&body=' + encodeURIComponent(msg);
    window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    $('doneH').focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (id) { return $(id).value.trim(); };
    var nm = v('nm'), ph = v('ph'), pc = v('pc').toUpperCase(), em = v('em'), nt = v('nt'), miss = [];
    if (!pick.day) miss.push('a day'); if (!pick.slot) miss.push('a time of day');
    if (!nm) miss.push('your name'); if (ph.replace(/\D/g, '').length < 10) miss.push('a phone number'); if (pc.length < 5) miss.push('your postcode');
    if (!$('ok').checked) miss.push('the tick box');
    if (miss.length) { $('err').textContent = 'Nearly there: we just need ' + miss.join(', ') + '.'; return; }
    $('err').textContent = '';
    var when = names[pick.day.getDay()] + ' ' + pick.day.getDate() + ' ' + mon[pick.day.getMonth()] + ', ' + pick.slot.toLowerCase();
    var msg = 'Hello ' + C.firm + ',\n\nI\'d like a fence measured.\nPreferred: ' + when + '\nName: ' + nm + '\nPhone: ' + ph + '\nPostcode: ' + pc +
      (em ? '\nEmail: ' + em : '') + (nt ? '\nNotes: ' + nt : '') +
      (q && q.lo ? '\n\nMy guide price from your website: ' + gbp(q.lo) + '–' + gbp(q.hi) + '\n' + q.lines.map(function (l) { return '- ' + l.k + ': ' + l.v; }).join('\n') : '');
    if (!leadUrl) { done(msg, false); return; }
    var btn = form.querySelector('[type="submit"]'); btn.disabled = true;
    fetch(leadUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'measure', name: nm, phone: ph, postcode: pc, email: em, notes: nt, day: pick.day.toISOString().slice(0, 10), slot: pick.slot, quote: q, message: msg }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); done(msg, true); })
      .catch(function () { done(msg, false); })
      .then(function () { btn.disabled = false; });
  });
})();
