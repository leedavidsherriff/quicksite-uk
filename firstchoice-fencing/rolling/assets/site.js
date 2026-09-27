/* FIRST CHOICE FENCING · Theme C · shared behaviour for every page (forked from theme-builds/themes/rolling).
   No media paths live in this file: every src/poster is an HTML attribute. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js'); doc.classList.add('js');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveal ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (el) { el.style.transitionDelay = (el.dataset.d || 0) + 'ms'; io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* ---------- before / after drag compare ---------- */
  function bindBA(el) {
    var dragging = false, decided = false, sx = 0, sy = 0;
    function set(clientX) {
      var r = el.getBoundingClientRect();
      var x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      el.style.setProperty('--x', (x * 100).toFixed(2) + '%');
      el.setAttribute('aria-valuenow', Math.round(x * 100));
    }
    el.addEventListener('pointerdown', function (e) {
      dragging = true; decided = e.pointerType !== 'touch'; sx = e.clientX; sy = e.clientY;
      if (decided) { try { el.setPointerCapture(e.pointerId); } catch (x) {} set(e.clientX); }
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (!decided) {
        var dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { dragging = false; return; }
        decided = true; try { el.setPointerCapture(e.pointerId); } catch (x) {}
      }
      set(e.clientX);
    });
    el.addEventListener('pointerup', function () { dragging = false; });
    el.addEventListener('pointercancel', function () { dragging = false; });
    el.addEventListener('click', function (e) { if (el.closest('a')) e.preventDefault(); });
    el.tabIndex = 0;
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100'); el.setAttribute('aria-valuenow', '50');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Drag to compare before and after');
    el.addEventListener('keydown', function (e) {
      var cur = parseFloat(el.style.getPropertyValue('--x')) || 50;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        var n = Math.max(0, Math.min(100, cur + (e.key === 'ArrowLeft' ? -5 : 5)));
        el.style.setProperty('--x', n + '%'); el.setAttribute('aria-valuenow', Math.round(n));
      }
    });
    if (!reduced && 'IntersectionObserver' in window) {
      var nudge = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          nudge.disconnect();
          var t0 = performance.now();
          (function step(now) {
            var k = Math.min(1, (now - t0) / 1400);
            el.style.setProperty('--x', (50 + Math.sin(k * Math.PI * 2) * 18 * (1 - k)) + '%');
            if (k < 1 && !dragging) requestAnimationFrame(step);
          })(t0);
        });
      }, { threshold: .6 });
      nudge.observe(el);
    }
  }
  document.querySelectorAll('.ba').forEach(bindBA);

  /* ---------- every in-page clip (class "clip"): show only once really playing ----------
     Each clip sits over its own still <img> in the HTML, so if playback never starts the
     still is simply what people see: no JS image paths, no play button. */
  function markPlaying(v) { if (!v.__qsOn) { v.__qsOn = true; v.classList.add('qs-playing'); } }
  function watchClip(v) {
    v.muted = true; v.setAttribute('muted', '');
    v.addEventListener('playing', function () { markPlaying(v); });
    v.addEventListener('timeupdate', function () { if (v.currentTime > 0.05 && !v.paused) markPlaying(v); });
    // autoplay may already have started before this script ran
    if (!v.paused && v.readyState > 2) markPlaying(v);
    if (reduced) { try { v.pause(); } catch (e) {} v.removeAttribute('autoplay'); return; }
    var p = v.play && v.play();
    if (p && p.catch) p.catch(function () {});
  }
  var clips = [].slice.call(document.querySelectorAll('video.clip'));
  clips.forEach(watchClip);
  // watchdog: browsers power-pause clips; resume looping clips that are on screen
  if (!reduced && clips.length) {
    var onScreen = new Map();
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { onScreen.set(e.target, e.isIntersecting); if (!e.isIntersecting && !e.target.paused) e.target.pause(); });
      }, { rootMargin: '150px 0px' });
      clips.forEach(function (v) { cio.observe(v); });
    }
    setInterval(function () {
      if (document.hidden) return;
      clips.forEach(function (v) {
        if (v.loop && v.paused && onScreen.get(v) !== false) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }, 2000);
  }

  /* ---------- tabs (care tabs on About, pay tabs share this) ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (list) {
    var group = list.getAttribute('data-tabs');
    var btns = [].slice.call(list.querySelectorAll('[role="tab"]'));
    function open(id, push) {
      btns.forEach(function (b) { var on = b.getAttribute('aria-controls') === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      document.querySelectorAll('[data-pane-of="' + group + '"]').forEach(function (p) {
        var on = p.id === id; p.classList.toggle('on', on);
        if (on) p.querySelectorAll('.rv').forEach(function (r) { r.classList.add('in'); });
      });
      if (push && list.hasAttribute('data-hash')) try { history.replaceState(null, '', '#' + id); } catch (e) {}
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { open(b.getAttribute('aria-controls'), true); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var n = btns[(i + d + btns.length) % btns.length]; n.focus(); n.click();
      });
    });
    var h = location.hash.slice(1);
    open(h && document.getElementById(h) && document.getElementById(h).getAttribute('data-pane-of') === group ? h : btns[0].getAttribute('aria-controls'), false);
  });

  /* ---------- style chips on the Styles page swap the compare slider's AFTER picture ---------- */
  var picks = [].slice.call(document.querySelectorAll('[data-ba-pick]'));
  picks.forEach(function (b) {
    b.addEventListener('click', function () {
      var ba = document.getElementById('styleBA'); if (!ba) return;
      var img = ba.querySelector('.ba__after'), tag = ba.querySelector('[data-ba-tag]');
      img.setAttribute('src', b.getAttribute('data-ba-pick')); img.setAttribute('alt', b.getAttribute('data-ba-alt'));
      if (tag) tag.textContent = b.getAttribute('data-ba-label');
      picks.forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      var cta = ba.parentNode.querySelector('.callrow .gbtn'); if (cta) cta.href = b.getAttribute('data-href');
    });
  });

  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();
