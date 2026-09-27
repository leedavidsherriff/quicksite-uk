/* FIRST CHOICE FENCING · Theme C · ROLLING HERO — the job, chapter by chapter, under one locked-off camera.
   The rail lists every chapter. data-kind says what each one is:
     clip     a chained clip (it starts on the previous chapter's last frame), played in order
     hold     no clip: hold on its still (the finished boundary) for data-hold ms
     pending  the clip hasn't been made yet: labelled on the rail, skipped, never faked
   No play button, ever: clips have no controls, are revealed only on the "playing" event, and if the
   browser refuses to start the film it is removed (display:none via .still-mode) and the still stays.
   Clip paths come from data-clip / data-clip-m, stills from data-still: nothing here names a file. */
(function () {
  'use strict';
  var box = document.getElementById('heroMedia');
  if (!box) return;
  var hero = box.closest('.hero');
  var still = document.getElementById('heroStill');
  var btns = [].slice.call(document.querySelectorAll('#rail button[data-key]'));
  var vidBy = {};
  [].slice.call(box.querySelectorAll('video[data-for]')).forEach(function (v) { vidBy[v.getAttribute('data-for')] = v; });
  var steps = btns.filter(function (b) { var k = b.getAttribute('data-kind'); return k === 'clip' ? !!vidBy[b.getAttribute('data-key')] : k === 'hold'; });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 760px)').matches;
  var cur = -1, timer = 0, deadline = 0, everPlayed = false, stillMode = false, inView = true, z = 1;
  if (!steps.length) return;

  function vid(i) { return vidBy[steps[i].getAttribute('data-key')]; }
  function ensure(v) {
    if (v && !v.getAttribute('src')) {
      v.setAttribute('muted', ''); v.muted = true;
      v.setAttribute('src', (phone && v.getAttribute('data-clip-m')) || v.getAttribute('data-clip'));
      v.preload = 'auto'; try { v.load(); } catch (e) {}
    }
  }
  function mark(i) {
    btns.forEach(function (b) {
      var on = steps[i] === b;
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on);
      var bar = b.querySelector('.bar i'); if (bar && on) bar.style.width = '0';
    });
    steps.forEach(function (b, j) { var bar = b.querySelector('.bar i'); if (bar && j < i) bar.style.width = '100%'; if (bar && j > i) bar.style.width = '0'; });
  }
  function bar(i, k) { var el = steps[i] && steps[i].querySelector('.bar i'); if (el) el.style.width = (k * 100).toFixed(1) + '%'; }
  function stillFor(b) { return b.getAttribute('data-still'); }

  function showStill(i) {
    var b = steps[i]; if (!b || !still || !stillFor(b)) return;
    still.setAttribute('src', stillFor(b)); still.setAttribute('alt', b.getAttribute('data-alt') || still.alt);
    mark(i); bar(i, 1); cur = i;
  }
  function enterStillMode(i) {
    stillMode = true; clearTimeout(timer); deadline = 0;
    hero.classList.add('still-mode');
    Object.keys(vidBy).forEach(function (k) { var v = vidBy[k]; v.classList.remove('is-front'); try { v.pause(); } catch (e) {} });
    showStill(i == null ? steps.length - 1 : i);
  }
  function schedule(ms) { clearTimeout(timer); deadline = performance.now() + ms; timer = setTimeout(advance, ms); }

  function go(i) {
    clearTimeout(timer); deadline = 0;
    cur = i; mark(i);
    var b = steps[i];
    if (b.getAttribute('data-kind') === 'hold') {
      // the finished boundary: the previous clip's last frame is already on screen; animate the bar through the hold
      var h = +b.getAttribute('data-hold') || 3000, t0 = performance.now();
      (function tick(now) { if (cur !== i || stillMode) return; bar(i, Math.min(1, (now - t0) / h)); if (now - t0 < h) requestAnimationFrame(tick); })(t0);
      schedule(h);
      return;
    }
    var v = vid(i); ensure(v);
    try { if (v.ended || v.currentTime > 0) v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && p.catch) p.catch(function (err) { if (err && err.name === 'NotAllowedError' && !everPlayed) enterStillMode(); });
  }
  function next() {
    // when the loop wraps back to chapter I, cut to its first frame (the poster) before playing
    var n = (cur + 1) % steps.length;
    if (n === 0) {
      Object.keys(vidBy).forEach(function (k) { if (vidBy[k] !== vid(0)) vidBy[k].classList.remove('is-front'); });
    }
    return n;
  }
  function advance() {
    deadline = 0;
    if (!inView || document.hidden) { deadline = -1; return; }
    go(next());
  }

  Object.keys(vidBy).forEach(function (key) {
    var v = vidBy[key];
    v.muted = true; v.setAttribute('muted', '');
    var idx = function () { return steps.indexOf(btns.filter(function (b) { return b.getAttribute('data-key') === key; })[0]); };
    v.addEventListener('playing', function () {
      var i = idx(); if (i !== cur) return;
      everPlayed = true;
      if (stillMode) return;
      v.style.zIndex = ++z;
      v.classList.add('qs-playing', 'is-front');
      setTimeout(function () { Object.keys(vidBy).forEach(function (k) { var o = vidBy[k]; if (o !== v) { o.classList.remove('is-front'); if (!o.paused) o.pause(); } }); }, 350);
      var n = (i + 1) % steps.length; if (steps[n].getAttribute('data-kind') === 'clip') ensure(vid(n));
    });
    v.addEventListener('timeupdate', function () {
      var i = idx(); if (i !== cur || !v.duration) return;
      if (v.currentTime > 0.05 && !v.paused && !stillMode && !v.classList.contains('is-front')) v.dispatchEvent(new Event('playing'));
      bar(i, v.currentTime / v.duration);
    });
    v.addEventListener('ended', function () {
      var i = idx(); if (i !== cur || stillMode) return;
      bar(i, 1);
      var h = +steps[i].getAttribute('data-hold');
      var nx = (i + 1) % steps.length;
      // straight on into a chained clip or a hold; otherwise let the finished frame land first
      schedule(h > 0 ? h : (steps[nx].getAttribute('data-kind') === 'hold' ? 60 : 2400));
    });
    v.addEventListener('error', function () {
      var i = idx(); if (i !== cur) return;
      if (everPlayed && steps.length > 1) schedule(1500); else enterStillMode();
    });
  });

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = steps.indexOf(b); if (i < 0) return;
      if (stillMode) {
        showStill(i);
        if (reduced || b.getAttribute('data-kind') !== 'clip') return;
        var v = vid(i); ensure(v);
        var p = v.play();   // a tap is a user gesture: try to bring the film back
        if (p && p.then) p.then(function () { stillMode = false; hero.classList.remove('still-mode'); cur = i; v.dispatchEvent(new Event('playing')); }).catch(function () {});
        return;
      }
      go(i);
    });
  });

  if (reduced) { enterStillMode(); return; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (stillMode || cur < 0) return;
      var v = steps[cur].getAttribute('data-kind') === 'clip' ? vid(cur) : null;
      if (!inView) { if (v && !v.paused) v.pause(); return; }
      if (deadline === -1) { advance(); return; }
      if (v && v.paused && !v.ended && !deadline) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    }, { threshold: 0.1 }).observe(box);
  }
  setInterval(function () {
    if (document.hidden || stillMode || !inView || cur < 0) return;
    if (deadline === -1 || (deadline > 0 && performance.now() > deadline + 1000)) { advance(); return; }
    var v = steps[cur].getAttribute('data-kind') === 'clip' ? vid(cur) : null;
    if (v && v.paused && !v.ended && !deadline) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }, 2000);
  // never started at all (data saver, blocked media, Low Power Mode): no film, no button, just the finished still
  setTimeout(function () { if (!everPlayed && !document.hidden) enterStillMode(); }, 8000);

  go(0);
})();
