/* THEME A · PICKER — trade-agnostic.
   Every media path lives in HTML attributes (data-clip / data-still on the chips),
   never in this file, so an importer that rewrites attributes keeps them working.
   Numbers come from <script type="application/json" id="pickCfg">. */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var cfgEl = $('pickCfg'); if (!cfgEl) return;
  var CFG = JSON.parse(cfgEl.textContent);
  var BIZ = CFG.biz, UNIT = CFG.unit, reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var perUnit = UNIT === 'job' ? '' : '/' + UNIT;
  function gbp(n){ return '£' + Math.round(n).toLocaleString('en-GB'); }
  function r10(n){ return Math.round(n/10)*10; }

  /* choices are read from the hero chips (server-rendered) */
  var CH = {}, ORDER = [];
  document.querySelectorAll('#heroSwatches .sw').forEach(function(b){
    var k = b.dataset.choice;
    ORDER.push(k);
    CH[k] = { name:b.dataset.name, lo:+b.dataset.lo, hi:+b.dataset.hi, clip:b.dataset.clip || '', still:b.dataset.still || '', before:b.dataset.before || '', look:b.dataset.look || '' };
  });
  if (!ORDER.length) return;
  var EXTRAS = CFG.extras || [];
  var state = { choice:ORDER[0], qty:CFG.qty.def, ex:{}, touched:false };
  EXTRAS.forEach(function(e){ state.ex[e.id] = !!e.on; });

  function blocked(e, k){ return !!(e.not_for && e.not_for.indexOf(CH[k].name) > -1); }
  function price(st){
    var c = CH[st.choice], q = UNIT === 'job' ? 1 : st.qty, lines = [], lo = q*c.lo, hi = q*c.hi;
    lines.push({ k: c.name + (UNIT === 'job' ? '' : ' · ' + st.qty + ' ' + UNIT), lo:lo, hi:hi });
    var exLo = 0, exHi = 0, nEx = 0;
    EXTRAS.forEach(function(e){
      var qty = e.per === 'unit' ? st.qty : 1;
      e._lo = qty*e.low; e._hi = qty*e.high;
      if (!st.ex[e.id] || blocked(e, st.choice)) return;
      nEx++; exLo += e._lo; exHi += e._hi;
      lines.push({ k:e.name, lo:e._lo, hi:e._hi });
    });
    var disc = 0;
    if (CFG.discount && nEx >= 2){ disc = CFG.discount.pct/100; lines.push({ k:CFG.discount.label + ' · −' + CFG.discount.pct + '% on extras', lo:-exLo*disc, hi:-exHi*disc, save:true }); }
    lo += exLo*(1-disc); hi += exHi*(1-disc);
    var floored = false;
    if (lo < CFG.minJob[0]){ lo = CFG.minJob[0]; floored = true; }
    if (hi < CFG.minJob[1]){ hi = CFG.minJob[1]; floored = true; }
    return { lo:r10(lo), hi:r10(hi), lines:lines, floored:floored, disc:disc };
  }
  window.__price = function(o){ return price(Object.assign({}, state, o)); };

  /* count-up */
  var tweens = {}, rafOn = false, lastPaint = 0;
  function tweenTo(el, to){
    if (!el) return;
    var id = el.id, cur = tweens[id] ? tweens[id].val : 0;
    if (reduce.matches){ el.textContent = gbp(to); tweens[id] = { val:to }; return; }
    tweens[id] = { el:el, from:cur, to:to, val:cur, t0:performance.now() };
    if (!rafOn){ rafOn = true; requestAnimationFrame(step); }
  }
  function step(now){
    var busy = false;
    if (now - lastPaint >= 33){
      lastPaint = now;
      Object.keys(tweens).forEach(function(id){
        var t = tweens[id]; if (!t.el) return;
        var k = Math.min(1, (now - t.t0)/520), e = 1 - Math.pow(1-k, 3);
        t.val = t.from + (t.to - t.from)*e;
        var txt = gbp(k < 1 ? Math.round(t.val/10)*10 : t.to);
        if (t.el.textContent !== txt) t.el.textContent = txt;
        if (k < 1) busy = true;
      });
    } else busy = true;
    if (busy) requestAnimationFrame(step); else rafOn = false;
  }

  function hint(q){
    var h = CFG.qty.presets || [], best = '';
    h.forEach(function(p){ if (q >= p.value * 0.8) best = p.label.split('·')[0].trim(); });
    return best ? 'about ' + best.toLowerCase() : '';
  }

  function render(){
    var c = CH[state.choice], p = price(state), q = state.qty;
    if ($('qtyOut')){
      $('qtyOut').textContent = q;
      $('qtyHint').textContent = hint(q);
      var rng = $('qty'); rng.style.setProperty('--fill', ((q - rng.min)/(rng.max - rng.min)*100) + '%');
    }
    $('prQty').textContent = UNIT === 'job' ? 'per job' : q + ' ' + UNIT;
    tweenTo($('tLo'), p.lo); tweenTo($('tHi'), p.hi);
    $('prRate').textContent = c.name + ' at guide £' + c.lo + '–£' + c.hi + (UNIT === 'job' ? ' per job' : ' per ' + UNIT) + (p.floored ? ' · minimum job ' + gbp(CFG.minJob[0]) + '–' + gbp(CFG.minJob[1]) : '');
    $('prLines').innerHTML = p.lines.map(function(l){
      return '<li' + (l.save ? ' class="inc"' : '') + '><span>' + l.k + '</span><span>' + (l.save ? '−' + gbp(r10(-l.lo)) + '–' + gbp(r10(-l.hi)) : gbp(r10(l.lo)) + '–' + gbp(r10(l.hi))) + '</span></li>';
    }).join('');
    EXTRAS.forEach(function(e){
      var el = $('exp-' + e.id), box = $('ex-' + e.id), no = blocked(e, state.choice);
      if (el) el.textContent = no ? 'n/a' : gbp(r10(e._lo)) + '–' + gbp(r10(e._hi));
      if (box){ box.disabled = no; box.checked = !no && !!state.ex[e.id]; box.closest('.ex').classList.toggle('off', no); }
    });
    $('prPhoto').style.backgroundImage = c.still ? "url('" + c.still + "')" : 'none';
    $('prPhoto').classList.toggle('typecard', !c.still);
    $('prPhotoName').textContent = c.name;
    var n = $('nudge');
    if (n){
      var on = EXTRAS.filter(function(e){ return state.ex[e.id] && !blocked(e, state.choice); }).length;
      n.innerHTML = CFG.discount ? (on >= 2 ? CFG.discount.label + ': ' + CFG.discount.pct + '% off the extras is applied.' : 'Add ' + (2 - on) + ' more extra' + (2 - on > 1 ? 's' : '') + ' and ' + CFG.discount.label.toLowerCase() + ' takes ' + CFG.discount.pct + '% off them.') : '';
      n.hidden = !n.innerHTML;
    }
    summary(p);
    if ($('dockName')){ $('dockName').textContent = c.name + (UNIT === 'job' ? '' : ' · ' + q + ' ' + UNIT); $('dockPrice').textContent = gbp(p.lo) + '–' + gbp(p.hi); }
    try{ sessionStorage.setItem('pick', JSON.stringify({ choice:c.name, qty:q, unit:UNIT, lo:p.lo, hi:p.hi, extras:EXTRAS.filter(function(e){ return state.ex[e.id] && !blocked(e, state.choice); }).map(function(e){ return e.name; }) })); }catch(e){}
  }

  function summary(p){
    var c = CH[state.choice];
    var ex = EXTRAS.filter(function(e){ return state.ex[e.id] && !blocked(e, state.choice); }).map(function(e){ return '- ' + e.name; });
    var txt = 'Hello ' + BIZ.name + ',\n\nI’d like a price for a new fence.\n\n' + CFG.pickNoun.charAt(0).toUpperCase() + CFG.pickNoun.slice(1) + ': ' + c.name + '\n' +
      (UNIT === 'job' ? '' : 'Approx. length: ' + state.qty + ' ' + UNIT + '\n') + (ex.length ? 'Extras:\n' + ex.join('\n') + '\n' : '') +
      'Guide price from your site: ' + gbp(p.lo) + '–' + gbp(p.hi) + '\n\nMy postcode: \nBest time to call: \n';
    if ($('summary')) $('summary').textContent = txt;
    if ($('mailLink') && BIZ.email) $('mailLink').href = 'mai' + 'lto:' + BIZ.email + '?subject=' + encodeURIComponent('Quote – ' + c.name) + '&body=' + encodeURIComponent(txt);
    if ($('smsLink') && BIZ.phone) $('smsLink').href = 'sms:' + BIZ.phone + '?&body=' + encodeURIComponent(txt);
    if (BIZ.whatsapp) ['waLink','waPrice','dockWa'].forEach(function(id){ if ($(id)) $(id).href = 'https://wa.me/' + BIZ.whatsapp + '?text=' + encodeURIComponent(txt); });
  }

  /* extras */
  EXTRAS.forEach(function(e){
    var box = $('ex-' + e.id); if (!box) return;
    box.checked = !!e.on;
    box.addEventListener('change', function(){ state.ex[e.id] = box.checked; state.touched = true; render(); });
  });
  if ($('qty')){
    $('qty').addEventListener('input', function(ev){ state.qty = +ev.target.value; state.touched = true; render(); });
    document.querySelectorAll('.presets button').forEach(function(b){
      b.addEventListener('click', function(){ state.qty = +b.dataset.qty; $('qty').value = state.qty; state.touched = true; render(); });
    });
  }
  document.querySelectorAll('.sw').forEach(function(b){
    b.addEventListener('click', function(){ state.touched = true; setChoice(b.dataset.choice, true); });
  });

  /* compare */
  var selA = $('cmpSelA'), selB = $('cmpSelB'), cmp = $('cmp'), cmpR = $('cmpRange');
  function optStill(sel){ var o = sel.options[sel.selectedIndex]; return [o.dataset.still, o.textContent]; }
  function cmpSet(){
    if (!selA) return;
    var a = optStill(selA), b = optStill(selB);
    $('cmpA').src = a[0]; $('cmpA').alt = a[1]; $('cmpTagA').textContent = a[1];
    $('cmpB').src = b[0]; $('cmpB').alt = b[1]; $('cmpTagB').textContent = b[1];
  }
  if (selA){ selA.addEventListener('change', cmpSet); selB.addEventListener('change', cmpSet); }
  if (cmp && cmpR){
    var cut = function(pct){ pct = Math.max(0, Math.min(100, pct)); cmp.style.setProperty('--cut', pct + '%'); cmpR.value = Math.round(pct); cmpR.style.setProperty('--fill', pct + '%'); };
    cmpR.addEventListener('input', function(){ cut(+cmpR.value); });
    var dragging = false, sx = 0, sy = 0, decided = false;
    var pctFrom = function(ev){ var r = cmp.getBoundingClientRect(); return (ev.clientX - r.left)/r.width*100; };
    cmp.addEventListener('pointerdown', function(ev){ dragging = true; decided = ev.pointerType !== 'touch'; sx = ev.clientX; sy = ev.clientY; if (decided){ cmp.setPointerCapture(ev.pointerId); cut(pctFrom(ev)); } });
    cmp.addEventListener('pointermove', function(ev){
      if (!dragging) return;
      if (!decided){ var dx = Math.abs(ev.clientX-sx), dy = Math.abs(ev.clientY-sy); if (dx < 6 && dy < 6) return; if (dy > dx){ dragging = false; return; } decided = true; try{ cmp.setPointerCapture(ev.pointerId); }catch(e){} }
      cut(pctFrom(ev));
    });
    var end = function(){ dragging = false; };
    cmp.addEventListener('pointerup', end); cmp.addEventListener('pointercancel', end);
  }

  /* hero player: one clip per choice, same camera; cycles until the visitor picks */
  var video = $('heroVideo'), freeze = $('heroFreeze'), still = $('heroStill'), prog = $('filmProg'), film = $('film'), card = $('heroCard');
  var HOLD_MS = 3200, holdTimer = 0, holdDeadline = 0, heroInView = true, pendingAdvance = false;

  function setChoice(k, fromUser){
    state.choice = k;
    document.querySelectorAll('.sw').forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.choice === k)); });
    var c = CH[k];
    if (video){
      $('filmName').textContent = c.name;
      $('filmRate').textContent = 'guide £' + c.lo + '–£' + c.hi + perUnit;
      still.style.backgroundImage = c.still ? "url('" + c.still + "')" : 'none';
      still.setAttribute('aria-label', c.name + ' fence, finished');
      film.style.backgroundImage = c.before ? "url('" + c.before + "')" : (c.still ? "url('" + c.still + "')" : 'none');
      card.hidden = true;
      heroLoad(c.clip);
    }
    if (selB && fromUser){ selB.value = k; cmpSet(); }
    render();
  }
  function paintFreeze(){
    try{ if (!video.videoWidth) return; freeze.width = video.videoWidth; freeze.height = video.videoHeight; freeze.getContext('2d').drawImage(video, 0, 0); freeze.classList.add('on'); }catch(e){}
  }
  /* a choice with no clip: show its finished still (or a type card when there is no image yet), hold, move on */
  function showStatic(c){
    clearTimeout(holdTimer);
    freeze.classList.remove('on'); video.classList.remove('is-playing'); try{ video.pause(); }catch(e){}
    prog.style.width = '0';
    $('filmState').textContent = 'Finished';
    if (c.still){ still.style.display = 'block'; }
    else { still.style.display = 'none'; $('heroCardName').textContent = c.name; $('heroCardLook').textContent = c.look + '.'; card.hidden = false; }
    holdDeadline = performance.now() + HOLD_MS + 1800;
    holdTimer = setTimeout(afterHold, HOLD_MS + 1800);
  }
  function heroLoad(src){
    clearTimeout(holdTimer); holdDeadline = 0;
    $('filmState').textContent = CFG.nowLabel;
    if (!src){ showStatic(CH[state.choice]); return; }
    if (!video.__fallback && !reduce.matches) still.style.display = 'none';
    if (reduce.matches || video.__fallback){ still.style.display = 'block'; if (!CH[state.choice].still){ still.style.display = 'none'; $('heroCardName').textContent = CH[state.choice].name; $('heroCardLook').textContent = CH[state.choice].look; card.hidden = false; } $('filmState').textContent = 'Finished'; return; }
    if (video.getAttribute('src') === src){ if (video.readyState > 0){ try{ video.currentTime = 0; }catch(e){} } }
    else { paintFreeze(); video.classList.remove('is-playing'); video.src = src; }
    var p = video.play(); if (p && p.catch) p.catch(function(){});
  }
  function afterHold(){
    holdDeadline = 0;
    if (!heroInView){ pendingAdvance = true; return; }
    if (!state.touched) setChoice(ORDER[(ORDER.indexOf(state.choice) + 1) % ORDER.length], false);
    else if (CH[state.choice].clip) heroLoad(CH[state.choice].clip);
  }
  function stillFallback(v){
    if (v.__fallback || v.__everPlayed) return;
    v.__fallback = true;
    if (v === video){ still.style.display = 'block'; $('filmState').textContent = 'Finished'; prog.style.display = 'none'; }
    else { var d = document.createElement('div'); d.className = 'noplay-still'; d.style.backgroundImage = "url('" + v.getAttribute('poster') + "')"; v.parentElement.insertBefore(d, v); }
    v.style.display = 'none';
  }
  function tryPlay(v){
    if (reduce.matches) return;
    v.addEventListener('playing', function(){ v.__everPlayed = true; }, { once:true });
    var p = v.play();
    if (p && p.catch) p.catch(function(err){ if (err && err.name === 'NotAllowedError' && !document.hidden) setTimeout(function(){ if (!v.__everPlayed) stillFallback(v); }, 400); });
    var t0 = Date.now();
    (function check(){
      if (v.__everPlayed || v.__fallback) return;
      if (document.hidden){ t0 = Date.now(); setTimeout(check, 800); return; }
      var waited = Date.now() - t0;
      if (waited > 1200 && v.paused){ var rp = v.play(); if (rp && rp.catch) rp.catch(function(){}); }
      if ((v.readyState >= 3 && waited > 2400) || waited > 12000){ stillFallback(v); return; }
      setTimeout(check, 800);
    })();
  }
  if (video){
    video.addEventListener('playing', function(){ video.__everPlayed = true; video.classList.add('is-playing'); freeze.classList.remove('on'); });
    video.addEventListener('timeupdate', function(){ if (video.duration) prog.style.width = (video.currentTime/video.duration*100) + '%'; });
    video.addEventListener('ended', function(){ $('filmState').textContent = 'Finished'; holdDeadline = performance.now() + HOLD_MS; holdTimer = setTimeout(afterHold, HOLD_MS); });
    video.addEventListener('error', function(){ if (video.__everPlayed) afterHold(); else stillFallback(video); });
    setInterval(function(){
      if (document.hidden || reduce.matches || video.__fallback) return;
      if (holdDeadline && performance.now() > holdDeadline + 1200){ afterHold(); return; }
      if (video.paused && !video.ended && !holdDeadline && heroInView && CH[state.choice].clip){ var p = video.play(); if (p && p.catch) p.catch(function(){}); }
    }, 2000);
    if (!reduce.matches) tryPlay(video);
  }

  var ambient = Array.prototype.slice.call(document.querySelectorAll('video.ambient'));
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var v = en.target;
        if (v === video){
          heroInView = en.isIntersecting;
          if (!en.isIntersecting){ if (!video.paused) video.pause(); }
          else if (pendingAdvance){ pendingAdvance = false; afterHold(); }
          else if (video.paused && !video.ended && !holdDeadline && !video.__fallback && !reduce.matches && CH[state.choice].clip){ var hp = video.play(); if (hp && hp.catch) hp.catch(function(){}); }
          return;
        }
        if (en.isIntersecting){
          if (!v.getAttribute('src') && v.dataset.src){ v.src = v.dataset.src; v.preload = 'auto'; }
          if (!v.__fallback){ if (!v.__tried){ v.__tried = true; tryPlay(v); } else { var p = v.play(); if (p && p.catch) p.catch(function(){}); } }
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin:'200px 0px', threshold:0.15 });
    ambient.forEach(function(v){ io.observe(v); });
    if (video) io.observe(video);
  }

  var dock = $('dock'), enq = $('enquire'), heroEl = document.querySelector('.hero');
  if (dock && heroEl){
    var dockCheck = function(){
      var past = heroEl.getBoundingClientRect().bottom < 0;
      var atEnq = enq ? enq.getBoundingClientRect().top < window.innerHeight*0.9 : false;
      dock.classList.toggle('on', past && !atEnq);
    };
    window.addEventListener('scroll', dockCheck, { passive:true }); dockCheck();
  }

  setChoice(ORDER[0], false);
  window.__state = state;
})();
