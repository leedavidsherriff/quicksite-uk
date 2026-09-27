/* Our work: before/after per job. Drag (mouse or sideways swipe), tap a point, arrow keys, or the Before/After buttons.
   --cut is how much of the BEFORE shows from the left: 100 = all before, 0 = all after. */
(function () {
  var els = document.querySelectorAll('[data-wk]');
  Array.prototype.forEach.call(els, function (el) {
    var stage = el.querySelector('.wk-stage');
    if (!stage) return;
    var btns = el.querySelectorAll('[data-wk-to]');
    var cur = 50;
    function set(p, anim, from) {
      p = Math.max(0, Math.min(100, p)); cur = p;
      el.classList.toggle('is-anim', !!anim);
      stage.style.setProperty('--cut', p + '%');
      stage.setAttribute('aria-valuenow', String(Math.round(p)));
      stage.setAttribute('aria-valuetext', p >= 99 ? 'Before' : p <= 1 ? 'After' : Math.round(p) + '% before');
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(from === b)); });
    }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () { set(+b.getAttribute('data-wk-to'), true, b); });
    });
    var drag = false, decided = false, moved = false, sx = 0, sy = 0;
    function pct(e) { var r = stage.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    stage.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      drag = true; moved = false; decided = e.pointerType !== 'touch'; sx = e.clientX; sy = e.clientY;
      if (decided) { try { stage.setPointerCapture(e.pointerId); } catch (_) {} set(pct(e), false); }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (!decided) {
        var dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { drag = false; return; }          // vertical: let the page scroll
        decided = true; try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      }
      moved = true; set(pct(e), false);
    });
    function end(e) {
      if (drag && !decided && !moved && e.type === 'pointerup') set(pct(e), true);   // a tap jumps the divider there
      drag = false;
    }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('keydown', function (e) {
      var k = e.key, step = e.shiftKey ? 25 : 5;
      if (k === 'ArrowLeft' || k === 'ArrowDown') set(cur - step, true);
      else if (k === 'ArrowRight' || k === 'ArrowUp') set(cur + step, true);
      else if (k === 'Home') set(0, true);
      else if (k === 'End') set(100, true);
      else return;
      e.preventDefault();
    });
    set(50, false);
  });
})();
