/* THEME E · PIXAR GUIDE
   The robot's poses, scenes and illustrations are all named in HTML attributes (src, data-pose-*),
   never in this file. Numbers come from <script type="application/json" id="pgCfg">. */
(function(){
  'use strict';
  var $ = function(id){ return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function gbp(n){ return '£' + Math.round(n).toLocaleString('en-GB'); }
  function r10(n){ return Math.round(n/10)*10; }

  var mb = $('menuBtn'), mn = $('menu');
  if (mb && mn) mb.addEventListener('click', function(){ var o = mb.getAttribute('aria-expanded') === 'true'; mb.setAttribute('aria-expanded', String(!o)); mn.classList.toggle('open', !o); });
  var yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- the robot: poses + a speech bubble that types ---------- */
  function pose(bot, name){
    if (!bot) return;
    var src = bot.getAttribute('data-pose-' + name); if (!src || bot.getAttribute('src') === src) return;
    bot.setAttribute('src', src);
    if (!reduce){ bot.classList.remove('hop'); void bot.offsetWidth; bot.classList.add('hop'); }
  }
  var typing = new WeakMap();
  function say(el, text){
    if (!el) return;
    clearTimeout(typing.get(el));
    if (reduce){ el.textContent = text; return; }
    var i = 0; el.textContent = '';
    var cur = document.createElement('span'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
    (function step(){
      i = Math.min(text.length, i + 2);
      el.textContent = text.slice(0, i); el.appendChild(cur);
      if (i < text.length) typing.set(el, setTimeout(step, 22)); else typing.set(el, setTimeout(function(){ if (cur.parentNode) cur.remove(); }, 900));
    })();
  }
  /* the hero greets, then cycles through its lines until the visitor does something */
  var heroSay = $('heroSay'), heroBot = $('heroBot');
  if (heroSay){
    var lines = []; try{ lines = JSON.parse(heroSay.getAttribute('data-lines') || '[]'); }catch(e){}
    var li = 0, touched = false;
    var next = function(){ if (touched || !lines.length) return; say(heroSay, lines[li % lines.length]); pose(heroBot, ['wave','explain','present'][li % 3]); li++; setTimeout(next, 5200); };
    setTimeout(next, 400);
    document.addEventListener('pointerdown', function(){ touched = true; }, { once:true });
  }

  /* ---------- tap to fix ---------- */
  var fix = $('fix'), fixBtn = $('fixBtn');
  if (fix && fixBtn){
    var spark = fix.querySelector('.spark');
    if (spark && !reduce){ for (var s = 0; s < 14; s++){ var i2 = document.createElement('i'); var a = s/14*Math.PI*2, d = 60 + (s%3)*30;
      i2.style.left = '50%'; i2.style.top = '85%'; i2.style.setProperty('--dx', Math.cos(a)*d + 'px'); i2.style.setProperty('--dy', Math.sin(a)*d - 40 + 'px'); i2.style.animationDelay = (s%4)*40 + 'ms'; spark.appendChild(i2); } }
    fixBtn.addEventListener('click', function(){
      var on = !fix.classList.contains('is-fixed');
      fix.classList.toggle('is-fixed', on);
      fix.querySelector('.fix-tag').textContent = on ? fix.getAttribute('data-after') : fix.getAttribute('data-before');
      fixBtn.textContent = on ? fixBtn.getAttribute('data-undo') : fixBtn.getAttribute('data-do');
      touched = true;
      pose(heroBot, on ? 'cheer' : 'think');
      say(heroSay, on ? heroSay.getAttribute('data-fixed') : heroSay.getAttribute('data-unfixed'));
    });
  }

  /* ---------- "what do you need?" ---------- */
  var svcSay = $('svcSay'), svcBot = $('svcBot'), svcGo = $('svcGo');
  document.querySelectorAll('.svc').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.svc').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
      say(svcSay, b.getAttribute('data-say'));
      pose(svcBot, 'present');
      if (svcGo){ svcGo.setAttribute('href', b.getAttribute('data-href')); svcGo.hidden = false; svcGo.querySelector('span').textContent = b.getAttribute('data-name'); }
    });
  });

  /* ---------- the price builder ---------- */
  var cfgEl = $('pgCfg');
  if (cfgEl){
    var C = JSON.parse(cfgEl.textContent), U = C.unit;
    var st = { c:C.choices[0].id, qty:C.qty.def, on:{} };
    C.extras.forEach(function(e){ st.on[e.id] = !!e.on; });
    var bBot = $('buildBot'), bSay = $('buildSay');
    function choice(){ return C.choices.filter(function(c){ return c.id === st.c; })[0]; }
    function price(){
      var c = choice(), q = U === 'job' ? 1 : st.qty, lo = q*c.lo, hi = q*c.hi, lines = [[c.name + (U === 'job' ? '' : ' × ' + st.qty + ' ' + (st.qty === 1 ? C.unitOne : C.unitMany)), lo, hi]], eLo = 0, eHi = 0, n = 0;
      C.extras.forEach(function(e){ if (!st.on[e.id]) return; var k = e.per === 'unit' ? st.qty : 1; n++; eLo += k*e.low; eHi += k*e.high; lines.push([e.name, k*e.low, k*e.high]); });
      var d = (C.discount && n >= 2) ? C.discount.pct/100 : 0;
      if (d) lines.push([C.discount.label + ' (−' + C.discount.pct + '%)', -eLo*d, -eHi*d, true]);
      lo += eLo*(1-d); hi += eHi*(1-d);
      return { c:c, lines:lines, lo:r10(Math.max(lo, C.minJob[0])), hi:r10(Math.max(hi, C.minJob[1])), floor: lo < C.minJob[0] };
    }
    var shown = [0,0], anim = 0;
    function countTo(lo, hi){
      var el = $('pgTotal');
      if (reduce){ el.textContent = gbp(lo) + '–' + gbp(hi); shown = [lo, hi]; return; }
      var a0 = shown[0], b0 = shown[1], t0 = performance.now(); cancelAnimationFrame(anim);
      (function f(now){ var k = Math.min(1, (now - t0)/600), e = 1 - Math.pow(1-k, 3);
        shown = [a0 + (lo - a0)*e, b0 + (hi - b0)*e];
        el.textContent = gbp(k < 1 ? r10(shown[0]) : lo) + '–' + gbp(k < 1 ? r10(shown[1]) : hi);
        if (k < 1) anim = requestAnimationFrame(f); })(t0);
    }
    function render(tip){
      var p = price();
      document.querySelectorAll('.opt').forEach(function(o){ o.setAttribute('aria-pressed', String(o.getAttribute('data-c') === st.c)); });
      document.querySelectorAll('.chip[data-x]').forEach(function(b){ b.setAttribute('aria-pressed', String(!!st.on[b.getAttribute('data-x')])); });
      var qo = $('pgQty'); if (qo){ qo.textContent = st.qty; $('pgQtyWord').textContent = st.qty === 1 ? C.unitOne : C.unitMany; }
      $('pgLines').innerHTML = p.lines.map(function(l){ var amt = l[3] ? '−' + gbp(r10(-l[1])) + '–' + gbp(r10(-l[2])) : gbp(r10(l[1])) + '–' + gbp(r10(l[2]));
        return '<li' + (l[3] ? ' class="save"' : '') + '><span>' + l[0] + '</span><span>' + amt + '</span></li>'; }).join('');
      $('pgFloor').hidden = !p.floor;
      countTo(p.lo, p.hi);
      var bars = document.querySelectorAll('.steps-bar i'); var done = 1 + (U === 'job' ? 0 : 1) + (C.extras.some(function(e){ return st.on[e.id]; }) ? 1 : 0);
      bars.forEach(function(b, i){ b.classList.toggle('on', i < done); });
      var ex = C.extras.filter(function(e){ return st.on[e.id]; }).map(function(e){ return '- ' + e.name; });
      var txt = 'Hello ' + C.biz.name + ',\n\nI priced this on your website:\n' + p.c.name + (U === 'job' ? '' : ', ' + st.qty + ' ' + (st.qty === 1 ? C.unitOne : C.unitMany)) + '\n' + (ex.length ? ex.join('\n') + '\n' : '') +
        'Guide price: ' + gbp(p.lo) + '–' + gbp(p.hi) + '\n\nCould you book me a free survey?\nPostcode: \nBest time to call: \n';
      var ta = $('pgText'); if (ta) ta.value = txt;
      var m = $('pgMail'), s = $('pgSms');
      if (m) m.href = 'mai' + 'lto:' + C.biz.email + '?subject=' + encodeURIComponent('Quote: ' + p.c.name) + '&body=' + encodeURIComponent(txt);
      if (s) s.href = 'sms:' + C.biz.phone + '?&body=' + encodeURIComponent(txt);
      try{ sessionStorage.setItem('pg', JSON.stringify({ trade:C.trade, txt:txt })); }catch(e){}
      if (tip){ say(bSay, tip); }
    }
    document.querySelectorAll('.opt').forEach(function(o){ o.addEventListener('click', function(){ st.c = o.getAttribute('data-c'); pose(bBot, 'thumbs'); render(o.getAttribute('data-tip')); }); });
    document.querySelectorAll('.qty button').forEach(function(b){ b.addEventListener('click', function(){ st.qty = Math.max(C.qty.min, Math.min(C.qty.max, st.qty + (+b.getAttribute('data-d'))*C.qty.step)); pose(bBot, 'think'); render(C.qtyTip); }); });
    document.querySelectorAll('.chip[data-x]').forEach(function(b){ b.addEventListener('click', function(){ var k = b.getAttribute('data-x'); st.on[k] = !st.on[k]; pose(bBot, st.on[k] ? 'cheer' : 'think'); render(b.getAttribute('data-tip')); }); });
    render();
  }
  /* contact page picks up what was priced */
  var cm = $('ctMsg');
  if (cm){ try{ var sv = JSON.parse(sessionStorage.getItem('pg') || 'null'); if (sv && sv.txt){ if ('value' in cm) cm.value = sv.txt; else cm.textContent = sv.txt;
    var cmail = $('ctMail'), csms = $('ctSms');
    if (cmail) cmail.href = cmail.href.split('?')[0] + '?subject=' + encodeURIComponent('Survey request') + '&body=' + encodeURIComponent(sv.txt);
    if (csms) csms.href = csms.href.split('?')[0] + '?&body=' + encodeURIComponent(sv.txt); } }catch(e){} }
})();
