/* Pennant Windows & Doors — short pages, one job each, a pill on every one.
   Home (the film) · Price my house (the studio) · Your quote (sheet + book) ·
   Price list · Our work. The studio's choices travel between pages in
   sessionStorage, so the quote page prints exactly what was picked.
   No framework, no build. config.js and prices.js load first. */
(function () {
  'use strict';
  var B = window.BIZ, P = window.PRICES;
  // lower-case for running text, keeping the proper nouns
  var lc = function (t) { return t.toLowerCase().replace(/\bfrench\b/, 'French').replace(/\birish\b/, 'Irish').replace(/\bchartwell\b/, 'Chartwell'); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAGE = document.body.dataset.page;

  /* ================= SHARED: details, state, pill, menu ================= */
  $$('[data-biz-name]').forEach(function (el) { el.textContent = B.name; });
  $$('[data-phone]').forEach(function (el) { el.textContent = B.phone; });
  $$('[data-tel]').forEach(function (el) { el.href = B.tel; });
  $$('[data-town]').forEach(function (el) { el.textContent = B.town; });
  $$('[data-areas]').forEach(function (el) { el.textContent = B.areas.slice(0, -1).join(', ') + ' and ' + B.areas[B.areas.length - 1]; });
  var pageTitle = document.body.dataset.title;
  document.title = (pageTitle ? pageTitle + ' · ' : '') + B.name;

  // The job as picked in the studio. Photo and its redraw ride along so the
  // quote page and a return visit show the customer's own house.
  var KEY = 'pn-job';
  var SAMPLE = {
    before: 'media/house-before.jpg',
    afters: { white: 'media/house-after-white.jpg', anthracite: 'media/house-after-anthracite.jpg', oak: 'media/house-after-oak.jpg' },
    // a saved reply from the photo reader for this photo, sized off the front door
    openings: [
      { kind: 'casement', size: 'M', box: { x: 0.205, y: 0.27, w: 0.19, h: 0.135 } },
      { kind: 'casement', size: 'L', box: { x: 0.565, y: 0.27, w: 0.245, h: 0.135 } },
      { kind: 'casement', size: 'L', box: { x: 0.505, y: 0.545, w: 0.3, h: 0.16 } },
      { kind: 'front', size: 'L', box: { x: 0.235, y: 0.555, w: 0.12, h: 0.24 } }
    ]
  };
  function sampleJob() {
    return {
      mode: 'sample', finish: 'anthracite', roof: 0, photo: '', after: '', afterKey: '', thumb: '',
      openings: SAMPLE.openings.map(function (o) { return { kind: o.kind, size: o.size, box: o.box, on: true, opts: {} }; })
    };
  }
  function loadJob() {
    try { var j = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (j && j.openings) return j; } catch (e) { /* none */ }
    return sampleJob();
  }
  function saveJob(job) {
    try { sessionStorage.setItem(KEY, JSON.stringify(job)); }
    catch (e) { // a big photo can overflow storage: keep the choices, drop the pictures
      try { sessionStorage.setItem(KEY, JSON.stringify(Object.assign({}, job, { photo: '', after: '', thumb: '' }))); } catch (e2) { /* ignore */ }
    }
  }
  var JOB = loadJob();
  // quote.html#q=... carries a quote in the link itself (choices only, never the photo)
  function packJob(j) {
    return btoa(JSON.stringify({ f: j.finish, r: j.roof || 0, o: j.openings.filter(function (o) { return o.on; }).map(function (o) {
      return [o.kind, o.size || 'M', Object.keys(o.opts || {}).filter(function (k) { return o.opts[k]; })];
    }) })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  (function unpack() {
    var m = location.hash.match(/^#q=([\w-]+)/);
    if (!m) return;
    try {
      var d = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!P.FINISHES[d.f] || !Array.isArray(d.o)) return;
      JOB = { mode: 'manual', finish: d.f, roof: Math.max(0, Math.min(40, +d.r || 0)), photo: '', after: '', afterKey: '', thumb: '',
        openings: d.o.filter(function (x) { return P.KINDS[x[0]]; }).slice(0, 30).map(function (x) {
          var opts = {}; (x[2] || []).forEach(function (k) { if (P.OPTIONS[k]) opts[k] = true; });
          return { kind: x[0], size: /^[SML]$/.test(x[1]) ? x[1] : 'M', box: null, on: true, opts: opts };
        }) };
      saveJob(JOB);
    } catch (e) { /* a mangled link: ignore it */ }
  })();

  /* ---- what happened, for the installer's dashboard (stats.html) ----
     Counts only: no photo and no personal details, except on a booking, where the customer
     is asking to be contacted. Each kind is counted once per visit. Never blocks the page. */
  function post(path, data) {
    return fetch(B.reader + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify(Object.assign({ site: B.site }, data)) });
  }
  function track(type, data, onceKey) {
    var k = 'pn-ev-' + (onceKey || type);
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { /* ignore */ }
    post('/event', Object.assign({ type: type }, data || {})).catch(function () { /* offline: fine */ });
  }
  function rangesOf(j) {
    var r = {};
    j.openings.forEach(function (o) { if (o.on) { var g = P.KINDS[o.kind].range; r[g] = (r[g] || 0) + 1; } });
    if (j.roof) r.roofline = 1;
    return r;
  }
  var totalsOf = function (j) { return P.totals(j.openings, j.finish, j.roof); };
  // A quote is THEIR house: a scanned photo, or windows they picked by hand.
  // Playing with the example house never makes one.
  var isMine = function (j) { return j.mode === 'photo' || j.mode === 'manual'; };
  var hasQuote = function (j) { var t = totalsOf(j); return isMine(j) && !!(t.units || t.roof); };

  function specFor(o, finish) {
    var k = P.KINDS[o.kind];
    return [B.supplier[k.range], k.colourIn ? 'your choice of colour' : lc(P.FINISHES[finish].name)].concat(P.optLabels(o)).join(', ');
  }
  function lineName(o) {
    var k = P.KINDS[o.kind];
    return P.label(o) + (k.cat === 'door' || /bay|bow/.test(o.kind) ? '' : ' window');
  }

  /* ---- the pill: one big action, Call, and every page in a sheet ---- */
  var PAGES = [
    { key: 'home', href: 'index.html', name: 'Home', sub: 'Watch a house get new windows' },
    { key: 'price', href: 'price.html', name: 'Price my house', sub: 'Snap it, tap each window' },
    { key: 'quote', href: 'quote.html', name: 'Your quote', sub: 'Spec sheet and booking' },
    { key: 'prices', href: 'prices.html', name: 'Price list', sub: 'Every price, in the open' },
    { key: 'work', href: 'work.html', name: 'Our work', sub: 'Recent fits and how it goes' }
  ];
  function pillMain() {
    var t = totalsOf(JOB), mine = hasQuote(JOB);
    var price = function (small) { return '<span class="pill__big">' + P.range(t.band) + '</span><span class="pill__small">' + small + '</span>'; };
    if (PAGE === 'price') {
      if (mine) return { href: 'quote.html', html: price('See my quote') };
      if (JOB.mode === 'manual') return { href: '#counts', html: 'Pick your windows' };
      return { href: '#', act: 'manual', html: 'No photo? Pick windows' };
    }
    if (PAGE === 'quote') return !mine ? { href: 'price.html', html: 'Price my house' } : JOB.booked ? { href: '#booked', html: 'Booked ✓' } : { href: '#book', html: 'Book my free survey' };
    if (mine) return { href: 'quote.html', html: price('My quote') };
    return { href: 'price.html', html: 'Price my house' };
  }
  (function pill() {
    var nav = document.createElement('nav');
    nav.className = 'pill'; nav.setAttribute('aria-label', 'Quick actions');
    nav.innerHTML =
      '<button type="button" class="pill__btn pill__grid" aria-expanded="false" aria-controls="menu"><i class="pill__dots" aria-hidden="true"></i><span class="sr-only">All pages</span></button>' +
      '<a class="gbtn pill__main" id="pillMain"><i class="gbtn__rim"></i><span id="pillMainIn"></span></a>' +
      '<a class="pill__btn" href="' + B.tel + '" aria-label="Call ' + B.phone + '">Call</a>';
    document.body.appendChild(nav);
    var menu = document.createElement('div');
    menu.className = 'menu'; menu.id = 'menu'; menu.hidden = true;
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Pages');
    menu.innerHTML = '<p class="menu__name">' + B.name + '</p><div class="menu__grid">' + PAGES.map(function (p) {
      return '<a class="menu__tile" href="' + p.href + '"' + (p.key === PAGE ? ' aria-current="page"' : '') + '><b>' + p.name + '</b><small>' + p.sub + '</small></a>';
    }).join('') + '</div><p class="menu__foot"><a href="' + B.tel + '">' + B.phone + '</a> · ' + B.town + ' &amp; the Vale</p><p class="menu__demo">Demo site by QuickSite. Business and number not real; prices are guide estimates.</p>';
    document.body.appendChild(menu);
    var grid = $('.pill__grid', nav);
    // on the pricing page, before there's a quote, the big button opens the camera
    $('#pillMain', nav).addEventListener('click', function (e) {
      if (this.dataset.act === 'snap' && $('#photoIn')) { e.preventDefault(); $('#photoIn').click(); }
      if (this.dataset.act === 'manual' && $('#manualBtn')) { e.preventDefault(); $('#manualBtn').click(); }
    });
    function open(on) {
      menu.hidden = !on; grid.setAttribute('aria-expanded', String(on));
      document.body.classList.toggle('menu-open', on);
    }
    grid.addEventListener('click', function () { open(menu.hidden); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) open(false); });
    menu.addEventListener('click', function (e) { if (e.target === menu) open(false); });
    refreshPill();
  })();
  function refreshPill() {
    var m = pillMain(), a = $('#pillMain');
    if (!a) return;
    a.href = m.href; a.dataset.act = m.act || ''; $('#pillMainIn').innerHTML = m.html;
  }

  /* ================= HOME · THE FILM =================
     Two chained chapters of one locked-off shot: windows fly in and slam home,
     then the glow-up. Advances on `ended`, so a pause must always be paired
     with a resume (the watchdog). Never pauses on visibilitychange: the preview
     pane reports hidden while it renders. No controls, ever. */
  if (PAGE === 'home') track('visit');
  if (PAGE === 'home') (function film() {
    var HOLDS = [900, 3400];
    var phone = matchMedia('(max-width: 768px)').matches;
    var CLIPS = phone ? ['media/m/hero-flyin.mp4', 'media/m/hero-glow2.mp4'] : ['media/hero-flyin.mp4', 'media/hero-glow2.mp4'];
    var video = $('#heroVideo'), freeze = $('#heroFreeze');
    var btns = $$('#chapters [data-ch]');
    var idx = 0, holdUntil = 0;
    video.removeAttribute('controls');
    // iOS autoplays only a video it knows is muted and inline: say so in every way it reads
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');

    function mark() {
      btns.forEach(function (b, i) { b.classList.toggle('is-on', i === idx); b.querySelector('.prog i').style.width = i < idx ? '100%' : '0'; });
    }
    function play() {
      mark();
      video.src = CLIPS[idx];
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* poster stays; the watchdog retries */ });
    }
    function showFreeze() {
      try {
        freeze.width = video.videoWidth; freeze.height = video.videoHeight;
        freeze.getContext('2d').drawImage(video, 0, 0);
        freeze.classList.add('is-shown');
      } catch (e) { /* ignore */ }
    }
    function go(n) {
      holdUntil = 0; idx = n; play();
      video.addEventListener('playing', function once() { freeze.classList.remove('is-shown'); video.removeEventListener('playing', once); });
    }
    if (reduced) return; // the poster (the finished house) stands in

    video.addEventListener('playing', function () { video.classList.add('is-playing'); });
    video.addEventListener('timeupdate', function () {
      if (!video.duration || holdUntil) return;
      btns[idx].querySelector('.prog i').style.width = (video.currentTime / video.duration * 100) + '%';
    });
    video.addEventListener('ended', function () {
      btns[idx].querySelector('.prog i').style.width = '100%';
      showFreeze();
      var hold = HOLDS[idx] || 2500;
      holdUntil = performance.now() + hold;
      setTimeout(function () { if (holdUntil) go((idx + 1) % CLIPS.length); }, hold);
    });
    video.addEventListener('error', function () { setTimeout(function () { go((idx + 1) % CLIPS.length); }, 800); });
    btns.forEach(function (b, i) { b.addEventListener('click', function () { showFreeze(); go(i); }); });

    // watchdog: start or resume a clip the browser paused, or fire an overdue
    // hold. No document.hidden bail-out: resuming a clip nobody sees costs nothing.
    setInterval(function () {
      if (holdUntil && performance.now() > holdUntil + 1000) { go((idx + 1) % CLIPS.length); return; }
      if (video.paused && !video.ended && !holdUntil) {
        video.play().catch(function () { if (!video.muted) { video.muted = true; sound(); video.play().catch(function () {}); } });
      }
    }, 2000);

    var toggle = $('#soundToggle');
    function sound() {
      toggle.classList.toggle('is-muted', video.muted);
      toggle.setAttribute('aria-label', video.muted ? 'Tap for sound' : 'Mute');
      toggle.querySelector('.lbl').textContent = video.muted ? 'Sound' : 'Mute';
    }
    toggle.addEventListener('click', function () { video.muted = !video.muted; sound(); if (video.paused && !holdUntil) video.play().catch(function () {}); });

    // Low Power Mode (and some data savers) refuse autoplay until the page is touched. No play
    // button: the first touch, tap, scroll or key anywhere starts the film, and the poster holds till then.
    function kick() { if (video.paused && !video.ended && !holdUntil) video.play().catch(function () {}); }
    ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
    video.addEventListener('canplay', kick);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

    play();
  })();

  /* ================= PRICE MY HOUSE · THE STUDIO =================
     The photo is never repainted. For each finish we hold one redraw of the
     whole house (the example's are pre-made; a customer's comes from the
     reader's /render), and only the inside of each ticked opening's box is
     taken from it. So unticked windows keep their old frames, the walls stay
     their walls, and next door cannot change: its pixels are never drawn. */
  if (PAGE === 'price') (function studio() {
    var S = { base: null, afters: {}, pending: {}, sel: -1, open: -1, before: false };
    var canvas = $('#stageCanvas'), ctx = canvas.getContext('2d');
    var pinsEl = $('#pins'), listEl = $('#openList'), statusEl = $('#stageStatus'), sweep = $('#sweep'), fit = $('#stageFit');

    function loadImg(src) {
      return new Promise(function (res, rej) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () { res(im); };
        im.onerror = rej;
        im.src = src;
      });
    }
    function status(msg) { statusEl.textContent = msg || ''; }
    function scanning(on) { sweep.hidden = !on; }
    function afterKey() {
      var photo = P.FINISHES[JOB.finish].photo;
      if (JOB.mode !== 'photo') return photo;
      // which doors the house has, not which are ticked: unticked ones are never drawn anyway
      var kinds = JOB.openings.filter(function (o) { return o.box && P.KINDS[o.kind].cat === 'door'; }).map(function (o) { return o.kind; }).sort().join(',');
      return photo + '|' + kinds;
    }

    /* ---- drawing ---- */
    var maskC = document.createElement('canvas'), mctx = maskC.getContext('2d');
    var tmpC = document.createElement('canvas'), tctx = tmpC.getContext('2d');
    function draw() {
      if (!S.base) return;
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(S.base, 0, 0, W, H);
      var after = S.afters[afterKey()];
      // no photo of theirs: the example house previews the colour, every frame done
      var boxes = JOB.mode === 'manual' ? SAMPLE.openings : JOB.openings.filter(function (o) { return o.on && o.box; });
      if (!S.before && after && boxes.length) {
        maskC.width = tmpC.width = W; maskC.height = tmpC.height = H;
        mctx.clearRect(0, 0, W, H);
        var feather = Math.max(3, W * 0.006);
        mctx.fillStyle = '#fff'; mctx.shadowColor = '#fff'; mctx.shadowBlur = feather;
        boxes.forEach(function (o) {
          // a little wider than the frame, and down past the sill, so the new sill comes too
          var b = o.box, px = 0.012, pt = 0.008, pb = 0.022;
          mctx.fillRect((b.x - px) * W, (b.y - pt) * H, (b.w + 2 * px) * W, (b.h + pt + pb) * H);
        });
        tctx.globalCompositeOperation = 'source-over';
        tctx.clearRect(0, 0, W, H);
        tctx.drawImage(after, 0, 0, W, H);
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(maskC, 0, 0);
        ctx.drawImage(tmpC, 0, 0);
      }
      $('#stageImg').classList.toggle('is-before', S.before);
    }
    function setBase(im) {
      S.base = im;
      var long = 1400, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, long / Math.max(w, h));
      canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
      JOB.aspect = w / h;
      fit.style.setProperty('--ar', String(w / h));
    }

    /* ---- pins on the photo ---- */
    function renderPins() {
      pinsEl.innerHTML = '';
      var n = 0;
      JOB.openings.forEach(function (o, i) {
        if (!o.box) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pin' + (o.on ? '' : ' is-off') + (S.sel === i ? ' is-sel' : '');
        b.style.cssText = 'left:' + o.box.x * 100 + '%;top:' + o.box.y * 100 + '%;width:' + o.box.w * 100 + '%;height:' + o.box.h * 100 + '%;--i:' + (n++);
        b.setAttribute('aria-label', (i + 1) + ': ' + P.label(o) + (o.on ? ', included. Tap to leave as it is' : ', left as it is. Tap to include'));
        b.innerHTML = '<b>' + (i + 1) + '</b>';
        b.addEventListener('click', function () { S.sel = i; o.on = !o.on; update(); });
        pinsEl.appendChild(b);
      });
    }

    /* ---- the list ---- */
    function product(kind) { var k = P.KINDS[kind]; return /^front/.test(kind) ? B.supplier[k.range] : k.name; }
    function kindOptions(o) {
      var cat = P.KINDS[o.kind].cat, keys = cat === 'door' ? P.DOOR_KINDS : P.WINDOW_KINDS, groups = {};
      keys.forEach(function (k) { (groups[P.KINDS[k].group] = groups[P.KINDS[k].group] || []).push(k); });
      return Object.keys(groups).map(function (g) {
        return '<optgroup label="' + g + '">' + groups[g].map(function (k) {
          return '<option value="' + k + '"' + (k === o.kind ? ' selected' : '') + '>' + product(k) + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    }
    function pinIndex(i) { var n = -1; for (var j = 0; j <= i; j++) if (JOB.openings[j].box) n++; return JOB.openings[i].box ? n : -1; }
    function renderList() {
      listEl.innerHTML = '';
      JOB.openings.forEach(function (o, i) {
        var k = P.KINDS[o.kind], band = P.band(P.unit(o, JOB.finish)), opts = P.optionsFor(o);
        o.opts = o.opts || {};
        var picked = P.optLabels(o);
        var li = document.createElement('li');
        li.className = 'op' + (o.on ? '' : ' is-off') + (S.sel === i ? ' is-sel' : '');
        li.innerHTML =
          '<button type="button" class="op__n" aria-label="' + (o.on ? 'Leave ' : 'Include ') + (i + 1) + '">' + (i + 1) + '</button>' +
          '<div class="op__main"><div class="op__name">' + lineName(o) + '</div>' +
          '<div class="op__opts"><select aria-label="Type">' + kindOptions(o) + '</select>' +
          (k.sized ? '<span class="seg" role="group" aria-label="Size">' + ['S', 'M', 'L'].map(function (s) {
            return '<button type="button" data-size="' + s + '" aria-pressed="' + (o.size === s) + '" title="' + P.SIZES[s].hint + '">' + P.SIZES[s].name + '</button>';
          }).join('') + '</span>' : '') +
          '</div>' +
          (o.nextDoor && !o.on ? '<p class="op__nd">Looks like next door\'s, so it\'s left out</p>' : '') +
          (opts.length ? '<button type="button" class="op__more" aria-expanded="' + (S.open === i) + '">' + (picked.length ? 'With ' + picked.join(', ') : 'Options') + ' <span aria-hidden="true">' + (S.open === i ? '−' : '+') + '</span></button>' : '') +
          '</div>' +
          '<div class="op__price">' + (o.on ? P.range(band) : '<span class="op__left">Leaving as is</span>') +
          '<small>' + (k.colourIn ? 'colour included' : lc(P.FINISHES[JOB.finish].name)) + '</small>' +
          '<button type="button" class="op__toggle">' + (o.on ? 'Leave as is' : 'Include') + '</button></div>' +
          (S.open === i && opts.length ? '<div class="op__drawer">' + opts.map(function (key) {
            var O = P.OPTIONS[key];
            return '<button type="button" class="optchip" data-opt="' + key + '" aria-pressed="' + !!o.opts[key] + '"><span>' + O.name + '</span><b>+' + P.gbp(Math.round(P.optAdd(o, key) * (k.colourIn ? 1 : P.FINISHES[JOB.finish].mult) / 10) * 10) + '</b><small>' + O.note + '</small></button>';
          }).join('') + '</div>' : '');
        li.querySelector('.op__n').addEventListener('click', function () { S.sel = i; o.on = !o.on; update(); });
        li.querySelector('.op__toggle').addEventListener('click', function () { S.sel = i; o.on = !o.on; update(); });
        li.querySelector('select').addEventListener('change', function (e) { o.kind = e.target.value; S.sel = i; update(true); });
        $$('[data-size]', li).forEach(function (b) { b.addEventListener('click', function () { o.size = b.dataset.size; S.sel = i; update(false); }); });
        var more = li.querySelector('.op__more');
        if (more) more.addEventListener('click', function () { S.open = S.open === i ? -1 : i; S.sel = i; update(false); });
        $$('[data-opt]', li).forEach(function (b) { b.addEventListener('click', function () { o.opts[b.dataset.opt] = !o.opts[b.dataset.opt]; if (!o.on) o.on = true; update(false); }); });
        li.addEventListener('focusin', function () { if (S.sel !== i) { S.sel = i; $$('.pin').forEach(function (p, j) { p.classList.toggle('is-sel', j === pinIndex(i)); }); } });
        listEl.appendChild(li);
      });
      var on = JOB.openings.filter(function (o) { return o.on; }).length;
      $('#openCount').textContent = JOB.mode === 'sample' ? 'on the example house' : JOB.openings.length ? on + ' of ' + JOB.openings.length + ' being replaced' : '';
    }

    /* ---- colours: three we can draw on a photo, and the rest of the range ---- */
    function renderFinishes() {
      var row = $('#finishRow'), more = $('#finishMore');
      row.innerHTML = ''; more.innerHTML = '';
      P.FINISH_ORDER.forEach(function (key) {
        var f = P.FINISHES[key], big = key === f.photo;
        var b = document.createElement('button');
        b.type = 'button'; b.className = big ? 'sw' : 'sw-dot';
        b.setAttribute('aria-pressed', String(JOB.finish === key));
        var up = f.mult === 1 ? 'standard' : '+' + Math.round((f.mult - 1) * 100) + '%';
        b.innerHTML = big
          ? '<img src="' + f.swatch + '" alt="" width="160" height="100">' + f.name + '<small>' + up + '</small>'
          : '<i style="background:' + f.hex + '"></i>' + f.name + '<small>' + up + '</small>';
        b.addEventListener('click', function () { if (JOB.finish === key) return; JOB.finish = key; renderFinishes(); update(true); });
        (big ? row : more).appendChild(b);
      });
      var f = P.FINISHES[JOB.finish];
      $('#finishNote').textContent = JOB.finish === f.photo ? '' : 'The photo shows ' + lc(P.FINISHES[f.photo].name) + ', the nearest colour we can draw. Your quote says ' + lc(f.name) + ', and the surveyor brings a real sample.';
    }

    /* ---- roofline ---- */
    function renderRoof() {
      $('#roofM').textContent = JOB.roof ? JOB.roof + ' m' : 'None';
      $('#roofCost').textContent = JOB.roof ? P.range(P.band(P.rooflineCost(JOB.roof, JOB.finish))) : '';
    }
    $('#roofLess').addEventListener('click', function () { JOB.roof = Math.max(0, JOB.roof - 1); update(false); });
    $('#roofMore').addEventListener('click', function () { JOB.roof = JOB.roof ? Math.min(40, JOB.roof + 1) : 5; update(false); });

    /* ---- the one-visit nudge ---- */
    function renderNudge() {
      var t = totalsOf(JOB), n = $('#nudge');
      if (t.off) n.textContent = t.units + ' in one visit: ' + P.gbp(t.off) + ' off the lot.';
      else if (t.units === P.MULTI_MIN - 1) n.textContent = 'One more opening and the whole job is 8% off: one van, one day, one skip.';
      else n.textContent = 'Five or more in one visit and the whole job is 8% off.';
    }

    /* ---- redraws ---- */
    function ensureAfter() {
      var key = afterKey(), photo = P.FINISHES[JOB.finish].photo;
      if (S.afters[key] || S.pending[key]) return;
      if (JOB.mode !== 'photo') {
        S.pending[key] = true;
        loadImg(SAMPLE.afters[photo]).then(function (im) { S.afters[key] = im; delete S.pending[key]; draw(); persist(); });
        return;
      }
      if (!JOB.openings.some(function (o) { return o.on && o.box; })) return;
      S.pending[key] = true;
      scanning(true);
      status('Drawing your new ' + lc(P.FINISHES[photo].name) + ' frames…');
      // the reader knows its own door words: map our range back to them
      var READER_KIND = { front: 'front', frontgrp: 'front', back: 'back', french: 'french', patio: 'patio', patio3: 'patio', bifold2: 'bifold', bifold3: 'bifold', bifold4: 'bifold', bifold5: 'bifold', sash: 'sash' };
      var kinds = JOB.openings.filter(function (o) { return o.box; }).map(function (o) { return READER_KIND[o.kind] || 'casement'; });
      var tries = 0;
      (function send() {
        fetch(B.reader + '/render', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: JOB.photo, aspect: JOB.aspect, finish: photo, kinds: kinds })
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (!j.ok) {
            if (j.retry && tries++ < 2) { setTimeout(send, (j.retry_after || 4) * 1000); return; }
            throw new Error(j.error || 'render_failed');
          }
          return loadImg(j.image).then(function (im) {
            S.afters[key] = im; delete S.pending[key];
            JOB.after = j.image; JOB.afterKey = key;
            if (afterKey() === key) { scanning(false); status('That\'s your house with new ' + lc(P.FINISHES[photo].name) + ' frames. Hold the photo to compare.'); }
            draw(); persist();
          });
        }).catch(function () {
          delete S.pending[key];
          scanning(false);
          status('Couldn\'t draw the new frames just now. Your prices are still right. Try another colour, or again in a minute.');
        });
      })();
    }

    var thumbTimer = 0;
    function persist() {
      saveJob(JOB);
      clearTimeout(thumbTimer);
      thumbTimer = setTimeout(function () {
        try { JOB.thumb = canvas.toDataURL('image/jpeg', 0.72); } catch (e) { /* ignore */ }
        saveJob(JOB);
      }, 150);
    }

    function update(redraw) {
      renderPins(); renderCounts(); renderList(); renderRoof(); renderNudge();
      if (redraw !== false) ensureAfter();
      draw(); persist(); refreshPill();
    }

    /* ---- the example house, or the job they left ---- */
    var TAGS = { sample: 'Example house', manual: 'Colour preview · example house', photo: 'Your house' };
    function start() {
      $('#useExample').hidden = JOB.mode === 'sample';
      $('#counts').hidden = JOB.mode !== 'manual';
      $('#openingsWrap').hidden = JOB.mode === 'manual' && !JOB.openings.length;
      $('#stageTag').textContent = TAGS[JOB.mode];
      status(JOB.mode === 'sample' ? 'This is our example house: tap around. Snap yours, or pick your windows, for your own quote.'
        : JOB.mode === 'manual' ? 'Pick how many of each below. The photo is our example house, showing your colour.' : '');
      var src = JOB.mode === 'photo' ? JOB.photo : SAMPLE.before;
      if (!src) { JOB = sampleJob(); return start(); }
      if (JOB.mode !== 'sample' && JOB.after && JOB.afterKey) loadImg(JOB.after).then(function (im) { S.afters[JOB.afterKey] = im; draw(); });
      return loadImg(src).then(function (im) { setBase(im); renderFinishes(); update(); });
    }
    function useSample() { waiting(false); JOB = sampleJob(); S.afters = {}; S.pending = {}; S.sel = -1; S.open = -1; scanning(false); start(); }

    /* ---- no photo: pick how many of each ---- */
    var COUNTS = [
      { label: 'Small windows', hint: 'bathroom, landing', match: function (o) { return P.KINDS[o.kind].sized && o.size === 'S'; }, add: { kind: 'casement', size: 'S' } },
      { label: 'Standard windows', hint: 'most bedrooms', match: function (o) { return P.KINDS[o.kind].sized && o.size === 'M'; }, add: { kind: 'casement', size: 'M' } },
      { label: 'Large windows', hint: 'lounge, kitchen', match: function (o) { return P.KINDS[o.kind].sized && o.size === 'L'; }, add: { kind: 'casement', size: 'L' } },
      { label: 'Bay windows', hint: 'per bay', match: function (o) { return /^(bay|bow)/.test(o.kind); }, add: { kind: 'bay3' } },
      { label: 'Front door', match: function (o) { return /^front/.test(o.kind); }, add: { kind: 'front' } },
      { label: 'Back door', match: function (o) { return o.kind === 'back'; }, add: { kind: 'back' } },
      { label: 'French doors', hint: 'a pair', match: function (o) { return o.kind === 'french'; }, add: { kind: 'french' } },
      { label: 'Patio slider', match: function (o) { return /^patio/.test(o.kind); }, add: { kind: 'patio' } },
      { label: 'Bi-fold doors', match: function (o) { return /^bifold/.test(o.kind); }, add: { kind: 'bifold3' } }
    ];
    function renderCounts() {
      var box = $('#countList');
      if (JOB.mode !== 'manual') return;
      box.innerHTML = COUNTS.map(function (c, i) {
        var n = JOB.openings.filter(c.match).length;
        return '<li class="count' + (n ? ' has' : '') + '"><span><b>' + c.label + '</b>' + (c.hint ? '<small>' + c.hint + '</small>' : '') + '</span>' +
          '<span class="count__ctl"><button type="button" data-c="' + i + '" data-d="-1" aria-label="One fewer ' + c.label.toLowerCase() + '"' + (n ? '' : ' disabled') + '>−</button>' +
          '<output>' + n + '</output><button type="button" data-c="' + i + '" data-d="1" aria-label="One more ' + c.label.toLowerCase() + '">+</button></span></li>';
      }).join('');
      $('#openingsWrap').hidden = !JOB.openings.length;
    }
    $('#countList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      var c = COUNTS[+b.dataset.c];
      if (+b.dataset.d > 0) track('pick');
      if (+b.dataset.d > 0) JOB.openings.push({ kind: c.add.kind, size: c.add.size || 'M', box: null, on: true, opts: {} });
      else for (var i = JOB.openings.length - 1; i >= 0; i--) if (c.match(JOB.openings[i])) { JOB.openings.splice(i, 1); break; }
      S.open = -1; S.sel = -1;
      update(false);
    });
    $('#manualBtn').addEventListener('click', function () {
      JOB = { mode: 'manual', finish: JOB.finish, roof: JOB.roof, photo: '', after: '', afterKey: '', thumb: '', openings: [] };
      S.sel = -1; S.open = -1; scanning(false); waiting(false);
      start().then(function () { $('#counts').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
    });

    /* ---- a customer's photo ---- */
    function shrink(file) {
      return new Promise(function (res, rej) {
        var url = URL.createObjectURL(file);
        loadImg(url).then(function (im) {
          var long = 1280, k = Math.min(1, long / Math.max(im.naturalWidth, im.naturalHeight));
          var c = document.createElement('canvas');
          c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          res(c.toDataURL('image/jpeg', 0.85));
        }).catch(rej);
      });
    }
    var PROBLEMS = {
      not_a_window: 'We couldn\'t spot a window in that one. Try the whole front of the house, from across the road.',
      too_dark: 'That one\'s a bit dark for us. A daylight photo works best.',
      too_blurry: 'That came out a bit blurry. Hold still and try again?',
      too_far: 'You\'re a bit far back. Fill the frame with the house.'
    };
    /* The reader is told to ignore next door but doesn't always. Openings come
       in clusters across the photo; a gap of 8% of the width between clusters is
       a party wall or a drive (inside one house the widest gap we've measured
       is 6%). Keep the cluster with the front door, or the biggest, and untick
       the rest, labelled, so a wrong guess is one tap to undo. */
    function markNextDoor(list) {
      var boxed = list.filter(function (o) { return o.box; }).sort(function (a, b) { return a.box.x - b.box.x; });
      if (boxed.length < 3) return 0;
      var groups = [[boxed[0]]], right = boxed[0].box.x + boxed[0].box.w;
      boxed.slice(1).forEach(function (o) {
        if (o.box.x - right > 0.08) groups.push([]);
        groups[groups.length - 1].push(o);
        right = Math.max(right, o.box.x + o.box.w);
      });
      if (groups.length < 2) return 0;
      var keep = groups.filter(function (g) { return g.some(function (o) { return /^front/.test(o.kind); }); })[0] ||
        groups.slice().sort(function (a, b) { return b.length - a.length; })[0];
      var n = 0;
      groups.forEach(function (g) { if (g !== keep) g.forEach(function (o) { o.on = false; o.nextDoor = true; n++; }); });
      return n;
    }
    // The wait is usually 5-15s. Say what's happening, and own up when it's slow.
    var WAIT_LINES = [[0, 'Finding your windows and doors…'], [5, 'Measuring them off your front door…'], [10, 'Checking each frame…'],
      [18, 'Still going. It\'s busy right now, hang on…'], [32, 'Nearly there. Or pick your windows by hand below while you wait.']];
    var waitTimer = 0;
    function waiting(on) {
      clearInterval(waitTimer);
      if (!on) return;
      var t0 = Date.now();
      status(WAIT_LINES[0][1]);
      waitTimer = setInterval(function () {
        var s = (Date.now() - t0) / 1000, line = WAIT_LINES.filter(function (l) { return s >= l[0]; }).pop();
        if (statusEl.textContent !== line[1]) status(line[1]);
      }, 1000);
    }
    function retryOffer(msg) {
      statusEl.innerHTML = '';
      statusEl.appendChild(document.createTextNode(msg + ' '));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'link'; b.textContent = 'Try again';
      b.addEventListener('click', readPhoto);
      statusEl.appendChild(b);
    }
    function readPhoto() {
      if (!JOB.photo) return;
      var job = JOB; // if they move on (pick by hand, the example) before it answers, drop the answer
      scanning(true); waiting(true);
      fetch(B.reader + '/read-photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: JOB.photo, aspect: JOB.aspect })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (JOB !== job) return;
        scanning(false); waiting(false);
        if (!j.ok || !j.photo_ok) {
          status(PROBLEMS[j.problem] || 'We couldn\'t read that photo. Add your windows by hand below, or try another.');
          update(false);
          return;
        }
        // a rough answer (the reader's busy-hour fallback) counts fairly but places boxes badly:
        // never draw from it. Ask for another go, which usually lands on the good reader.
        if (j.rough) { retryOffer('Our window reader is flat out, so that read wasn\'t sharp enough to draw.'); update(false); return; }
        var FROM_READER = { bay: 'bay3', bifold: 'bifold3' };
        JOB.openings = j.openings.map(function (o) { return { kind: FROM_READER[o.kind] || o.kind, size: o.size || 'M', box: o.box, on: true, opts: {} }; }).filter(function (o) { return P.KINDS[o.kind]; });
        var nd = markNextDoor(JOB.openings);
        track('scan', null, 'scan-' + Date.now());
        status(nd ? 'Found yours. ' + nd + ' that look like next door\'s are left out: tap one if it\'s actually yours.' : (j.summary || 'Found them. Tap a number to leave one as it is.'));
        update();
      }).catch(function () {
        if (JOB !== job) return;
        scanning(false); waiting(false);
        retryOffer('Our window reader didn\'t answer.');
        update(false);
      });
    }
    $('#photoIn').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      JOB = { mode: 'photo', finish: JOB.finish, roof: JOB.roof, photo: '', after: '', afterKey: '', thumb: '', openings: [] };
      S.afters = {}; S.pending = {}; S.sel = -1; S.open = -1;
      $('#stageTag').textContent = 'Your house';
      $('#useExample').hidden = false;
      scanning(true); waiting(true);
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      shrink(file).then(function (data) {
        JOB.photo = data;
        return loadImg(data).then(function (im) { setBase(im); update(false); });
      }).then(readPhoto).catch(function () {
        scanning(false); waiting(false);
        status('We couldn\'t open that photo. Try another, or pick your windows by hand below.');
      });
    });
    $('#useExample').addEventListener('click', useSample);
    $('.snap__btn').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#photoIn').click(); } });
    $('#addOne').addEventListener('click', function () {
      JOB.openings.push({ kind: 'casement', size: 'M', box: null, on: true, opts: {} });
      S.sel = S.open = JOB.openings.length - 1;
      update(false);
      var last = listEl.lastElementChild; if (last) last.querySelector('select').focus();
    });

    /* ---- press and hold the photo (or the button) to see it as it is now ---- */
    function holdable(el) {
      function down(e) { if (e.target.closest && e.target.closest('.pin')) return; S.before = true; $('#holdBtn').classList.add('is-down'); draw(); }
      function up() { if (!S.before) return; S.before = false; $('#holdBtn').classList.remove('is-down'); draw(); }
      el.addEventListener('pointerdown', down);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, up); });
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      return { down: down, up: up };
    }
    var hb = holdable($('#holdBtn'));
    holdable(canvas);
    $('#holdBtn').addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hb.down(e); } });
    $('#holdBtn').addEventListener('keyup', hb.up);

    start();
  })();

  /* ================= YOUR QUOTE · SHEET + BOOK ================= */
  if (PAGE === 'quote') (function quote() {
    if (!hasQuote(JOB)) {
      $('.docket-wrap').hidden = true; $('#book').hidden = true; $('#noQuote').hidden = false;
      return;
    }
    var REF = '';
    try { REF = sessionStorage.getItem('pn-ref') || ''; } catch (e) { /* ignore */ }
    if (!REF) { REF = 'PN-' + String(Math.floor(1000 + Math.random() * 9000)); try { sessionStorage.setItem('pn-ref', REF); } catch (e) { /* ignore */ } }
    var t = totalsOf(JOB);
    var lines = JOB.openings.map(function (o, i) { return { n: i + 1, o: o }; }).filter(function (x) { return x.o.on; });

    track('quote', { mid: t.mid, ranges: rangesOf(JOB) }, 'quote-' + t.mid + '-' + JOB.finish);
    $('#docRef').textContent = REF;
    $('#docDate').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#docTag').textContent = JOB.mode === 'photo' ? 'Your house' : 'Example house · your colour';
    $('#docThumb').src = JOB.thumb || (JOB.mode === 'sample' ? SAMPLE.afters[P.FINISHES[JOB.finish].photo] : (JOB.photo || 'media/house-before.jpg'));

    var rows = lines.map(function (x) {
      return '<tr><td>' + x.n + '</td><td>' + lineName(x.o) + '<small>' + specFor(x.o, JOB.finish) + '</small></td><td class="num">' + P.range(P.band(P.unit(x.o, JOB.finish))) + '</td></tr>';
    });
    if (t.roof) rows.push('<tr><td>R</td><td>Roofline, ' + JOB.roof + ' m across the front<small>' + B.supplier.roofline + ' fascia, soffit &amp; guttering</small></td><td class="num">' + P.range(P.band(t.roof)) + '</td></tr>');
    $('#docLines').innerHTML = rows.length ? rows.join('') : '<tr><td></td><td colspan="2">Nothing ticked yet. <a href="price.html">Pick your windows</a>.</td></tr>';
    var off = $('#docOff');
    off.hidden = !t.off;
    if (t.off) off.innerHTML = '<span>' + t.units + ' openings in one visit: one van, one day, one skip</span><span>−' + P.gbp(t.off) + '</span>';
    $('#docTotal').textContent = t.units || t.roof ? P.range(t.band) : '£0';

    var sup = B.supplier, by = sup.by ? ' by ' + sup.by : '';
    var has = function (re) { return lines.some(function (x) { return re.test(x.o.kind); }); };
    var spec = [];
    if (lines.some(function (x) { return /^(window|door)$/.test(P.KINDS[x.o.kind].range); }))
      spec.push(['Frames', sup.window + by + ', ' + lc(P.FINISHES[JOB.finish].name) + ', inside and out']);
    if (has(/^front$/)) spec.push(['Front door', sup.front + by + ', multi-point locking']);
    if (has(/^frontgrp$/)) spec.push(['Front door', sup.frontgrp + by + ', multi-point locking']);
    if (has(/^bifold/)) spec.push(['Bi-folds', sup.bifold + by]);
    if (t.roof) spec.push(['Roofline', sup.roofline + by]);
    spec.push(['Glazing', (lines.some(function (x) { return x.o.opts && x.o.opts.triple; }) ? 'Triple where marked, A-rated double elsewhere' : 'A-rated double glazing') + '; toughened wherever the Building Regulations call for safety glass, at no extra cost']);
    spec.push(['Fitting', 'By our own team. Old frames out and taken away, sealed inside and out']);
    $('#docSpec').innerHTML = spec.map(function (s) { return '<dt>' + s[0] + '</dt><dd>' + s[1] + '</dd>'; }).join('');

    // the docket prints out of its slot as the page opens
    if (!reduced) $('#docket').classList.add('is-printing');
    $('#printBtn').addEventListener('click', function () { window.print(); });
    // send yourself the quote: a link that rebuilds it on any phone
    $('#shareBtn').addEventListener('click', function () {
      var link = location.href.split('#')[0].split('?')[0] + '?supplier=' + B.supplier.key + '#q=' + packJob(JOB);
      var text = 'My window quote from ' + B.name + ': ' + (t.units || t.roof ? P.range(t.band) : '');
      if (navigator.share) { navigator.share({ title: 'My quote', text: text, url: link }).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () {
        $('#shareBtn').textContent = 'Link copied';
      }).catch(function () { window.prompt('Copy your quote link', link); });
    });
    $('#docPromises').innerHTML = (B.promises || []).map(function (p) { return '<li>' + p + '</li>'; }).join('');

    /* ---- book ---- */
    var days = [], d = new Date();
    d.setHours(12, 0, 0, 0);
    while (days.length < 8) {
      d.setDate(d.getDate() + 1);
      if (B.surveyDays.indexOf(d.getDay()) >= 0) days.push(new Date(d));
    }
    var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    var pick = { day: '', part: '' };
    var dayRow = $('#dayChips');
    days.forEach(function (day) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
      b.dataset.label = day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      b.innerHTML = (day.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : day.toLocaleDateString('en-GB', { weekday: 'short' })) + '<small>' + day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</small>';
      dayRow.appendChild(b);
    });
    function chooser(row, key, attr) {
      row.addEventListener('click', function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        $$('.chip', row).forEach(function (c) { c.setAttribute('aria-pressed', String(c === b)); });
        pick[key] = b.dataset[attr];
      });
    }
    chooser(dayRow, 'day', 'label');
    chooser($('#partChips'), 'part', 'part');

    $('#bookForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, err = $('#bookErr');
      var name = f.name.value.trim(), phone = f.phone.value.trim(), pc = f.postcode.value.trim().toUpperCase();
      var miss = [];
      if (!pick.day) miss.push('a day');
      if (!name) miss.push('your name');
      if (phone.replace(/\D/g, '').length < 10) miss.push('a mobile number');
      if (!/^[A-Z]{1,2}\d/.test(pc)) miss.push('your postcode');
      if (miss.length) { err.hidden = false; err.textContent = 'Just need ' + miss.join(', ') + '.'; return; }
      err.hidden = true;
      var msg = [
        'Survey request ' + REF + ' for ' + B.name,
        name + ' · ' + phone + ' · ' + pc,
        'When: ' + pick.day + (pick.part ? ', ' + pick.part.toLowerCase() : ''),
        '',
        'Spec sheet (' + lc(P.FINISHES[JOB.finish].name) + '):'
      ].concat(lines.map(function (x) {
        return x.n + '. ' + lineName(x.o) + ' — ' + specFor(x.o, JOB.finish) + ' — ' + P.range(P.band(P.unit(x.o, JOB.finish)));
      })).concat([
        t.roof ? 'Roofline ' + JOB.roof + ' m — ' + P.range(P.band(t.roof)) : '',
        t.off ? 'One visit, 8% off: −' + P.gbp(t.off) : '',
        'Guide total: ' + (t.units || t.roof ? P.range(t.band) : 'to price at survey')
      ]).filter(Boolean).join('\n');
      var go = $('.bookform__go'); go.disabled = true; go.querySelector('span').textContent = 'Booking…';
      var when = pick.day + (pick.part ? ', ' + pick.part.toLowerCase() : '');
      var payload = {
        ref: REF, name: name, phone: phone, postcode: pc, when: when, finish: P.FINISHES[JOB.finish].name, mode: JOB.mode,
        total: t.units || t.roof ? P.range(t.band) : '', mid: t.mid,
        lines: lines.map(function (x) { return { n: String(x.n), name: lineName(x.o), spec: specFor(x.o, JOB.finish), range: P.KINDS[x.o.kind].range, band: P.range(P.band(P.unit(x.o, JOB.finish))) }; })
          .concat(t.roof ? [{ n: 'R', name: 'Roofline, ' + JOB.roof + ' m', spec: B.supplier.roofline + ' fascia, soffit & guttering', range: 'roofline', band: P.range(P.band(t.roof)) }] : [])
      };
      var wa = 'https://wa.me/' + B.whatsapp + '?text=' + encodeURIComponent(msg);
      $('#bookedMsg').textContent = msg;
      $('#bookedWa').href = wa;
      $('#bookedSms').href = 'sms:' + B.tel.replace('tel:', '') + '?&body=' + encodeURIComponent(msg);
      $('#bookedWhen').textContent = when;
      post('/book', payload).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.error);
        $('#bookedHead').textContent = 'Booked';
        JOB.booked = REF; saveJob(JOB); refreshPill();
        $('#bookedLine').textContent = 'We\'ve got your request and your quote. We\'ll text to confirm';
      }).catch(function () {
        // couldn't reach us: hand it to WhatsApp, the way it always worked
        $('#bookedHead').textContent = 'Ready to send';
        $('#bookedLine').textContent = 'Press send in WhatsApp and we\'ll text to confirm';
        window.open(wa, '_blank', 'noopener');
      }).then(function () {
        f.hidden = true;
        $('#booked').hidden = false;
        $('#booked').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
  })();

  /* ================= PRICE LIST =================
     Built straight from prices.js, so the list, the studio, the quote and the
     recent fits all quote from one table. Swap in a supplier's real list and
     every page moves together. */
  if (PAGE === 'prices') (function priceList() {
    var tabs = $('#plTabs'), body = $('#plBody'), sel = $('#plColour');
    var colour = JOB.finish || 'white', tab = 'Windows';
    var GROUPS = ['Windows', 'Front doors', 'Garden & back doors', 'Bi-folds', 'Options', 'Colours', 'Roofline'];
    P.FINISH_ORDER.forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = P.FINISHES[k].name; o.selected = k === colour; sel.appendChild(o);
    });
    sel.addEventListener('change', function () { colour = sel.value; draw(); });
    GROUPS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'plBody'); b.textContent = g;
      b.addEventListener('click', function () { tab = g; draw(); });
      tabs.appendChild(b);
    });
    var SZ = { S: 'Small', M: 'Standard', L: 'Large' };
    var cell = function (mid, l) { return '<td class="num"' + (l ? ' data-l="' + l + '"' : '') + '>' + P.range(P.band(mid)) + '</td>'; };
    function draw() {
      $$('button', tabs).forEach(function (b) { b.setAttribute('aria-selected', String(b.textContent === tab)); });
      var html = '', f = P.FINISHES[colour];
      if (tab === 'Windows') {
        html = '<table><thead><tr><th>Window</th><th class="num">Small</th><th class="num">Standard</th><th class="num">Large</th></tr></thead><tbody>' +
          P.WINDOW_KINDS.map(function (k) {
            var K = P.KINDS[k];
            var name = '<td><b>' + B.supplier[K.range] + ' ' + lc(K.name) + '</b><small>' + K.note + '</small></td>';
            if (K.sized) return '<tr class="r3">' + name + ['S', 'M', 'L'].map(function (z) { return cell(P.unit({ kind: k, size: z }, colour), SZ[z]); }).join('') + '</tr>';
            return '<tr class="r3">' + name + '<td class="num" colspan="3">' + P.range(P.band(P.unit({ kind: k }, colour))) + ' per bay</td></tr>';
          }).join('') + '</tbody></table>';
      } else if (tab === 'Options') {
        html = '<table><thead><tr><th>Option, per frame</th><th class="num">Small</th><th class="num">Standard</th><th class="num">Large</th></tr></thead><tbody>' +
          Object.keys(P.OPTIONS).map(function (key) {
            var O = P.OPTIONS[key], m = f.mult;
            var name = '<td><b>' + O.name + '</b><small>' + O.note + '</small></td>';
            if (typeof O.add === 'number') return '<tr class="r3">' + name + '<td class="num" colspan="3">+' + P.gbp(O.add) + ' per door</td></tr>';
            return '<tr class="r3">' + name + ['S', 'M', 'L'].map(function (z) { return '<td class="num" data-l="' + SZ[z] + '">+' + P.gbp(Math.round(O.add[z] * m / 10) * 10) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>';
      } else if (tab === 'Colours') {
        html = '<table><thead><tr><th>Colour</th><th class="num">On frames</th><th class="num">Standard casement</th></tr></thead><tbody>' +
          P.FINISH_ORDER.map(function (k) {
            var F = P.FINISHES[k];
            return '<tr><td><span class="pl-dot" style="background:' + F.hex + '"></span><b>' + F.name + '</b></td><td class="num">' + (F.mult === 1 ? 'standard' : '+' + Math.round((F.mult - 1) * 100) + '%') + '</td>' + cell(P.unit({ kind: 'casement', size: 'M' }, k)) + '</tr>';
          }).join('') + '</tbody></table><p class="plist__note">Front doors and bi-folds come in any colour at no extra cost.</p>';
      } else if (tab === 'Roofline') {
        html = '<table><thead><tr><th>Roofline</th><th class="num">Per metre</th><th class="num">Terrace, 5 m</th><th class="num">Semi, 7 m</th></tr></thead><tbody>' +
          '<tr><td><b>' + B.supplier.roofline + ' fascia, soffit &amp; guttering</b><small>' + P.ROOFLINE.note + ' Scaffold quoted separately if a house needs it.</small></td><td class="num">' + P.gbp(P.rooflineCost(1, colour)) + '</td>' + cell(P.rooflineCost(5, colour)) + cell(P.rooflineCost(7, colour)) + '</tr></tbody></table>';
      } else {
        var keys = P.DOOR_KINDS.filter(function (k) { return P.KINDS[k].group === tab; });
        html = '<table><thead><tr><th>' + (tab === 'Bi-folds' ? 'Bi-fold' : tab === 'Front doors' ? 'Front door' : 'Door') + '</th><th class="num">Fitted</th></tr></thead><tbody>' +
          keys.map(function (k) {
            var K = P.KINDS[k];
            return '<tr><td><b>' + B.supplier[K.range] + ' ' + lc(K.name) + '</b><small>' + K.note + (K.colourIn ? '' : ' In ' + lc(f.name) + '.') + '</small></td>' + cell(P.unit({ kind: k }, colour)) + '</tr>';
          }).join('') + '</tbody></table>';
      }
      body.innerHTML = html;
    }
    $('#plPromises').innerHTML = (B.promises || []).map(function (p) { return '<li>' + p + '</li>'; }).join('');
    $('#plSmall').textContent = 'Guide prices for South Wales' + (B.supplier.by ? ', built on ' + B.supplier.by + '’s ranges' : '') + '. Every opening is measured at survey; if anything changes the price you’ll see why, in writing, before we start. Fit five or more in one visit and the lot is 8% off.';
    draw();
  })();

  /* ================= OUR WORK =================
     Each job's price comes from the same engine as the quote, so the price on
     a past job can never disagree with the price list. On a phone the jobs are
     a swipe deck, one at a time. */
  if (PAGE === 'work') (function work() {
    var JOBS = [
      { b: 'media/w1-before.webp', a: 'media/w1-after.webp', where: 'Maesteg', what: 'Stone terrace, rotten timber sashes', did: 'Heritage white uPVC sashes and a new front door, kept to the terrace\'s look.', finish: 'white',
        items: [{ kind: 'sash', size: 'M' }, { kind: 'sash', size: 'M' }, { kind: 'sash', size: 'L' }, { kind: 'front' }] },
      { b: 'media/w2-before.webp', a: 'media/w2-after.webp', where: 'Pencoed', what: '1930s semi, brown leaded bays', did: 'Both bays, the box room and the front door, in anthracite. Next door\'s half untouched.', finish: 'anthracite',
        items: [{ kind: 'bay3' }, { kind: 'bay3' }, { kind: 'casement', size: 'S' }, { kind: 'front' }] },
      { b: 'media/w3-before.webp', a: 'media/w3-after.webp', where: 'Porthcawl', what: 'Yellowed patio slider onto the garden', did: 'Out with the slider, in with a slim black aluminium bi-fold.', finish: 'white',
        items: [{ kind: 'bifold4' }] }
    ];
    var track = $('#workTrack');
    JOBS.forEach(function (j) {
      var t = P.totals(j.items, j.finish);
      var fig = document.createElement('figure');
      fig.className = 'job';
      fig.innerHTML = '<div class="ba" tabindex="0" role="slider" aria-label="Before and after, ' + j.where + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">' +
        '<img src="' + j.b + '" alt="Before: ' + j.what + '" width="1600" height="905">' +
        '<img class="ba__after" src="' + j.a + '" alt="After: ' + j.did + '" width="1600" height="905">' +
        '<span class="ba__handle"></span><span class="ba__tag ba__tag--b">Before</span><span class="ba__tag ba__tag--a">After</span></div>' +
        '<figcaption><h2>' + j.where + '</h2><p>' + j.what + '. ' + j.did + '</p>' +
        '<p class="came">Came to <b>' + P.range(t.band) + '</b>' + (t.off ? ' with the one-visit 8% off' : '') + '</p></figcaption>';
      track.appendChild(fig);
      var ba = fig.querySelector('.ba'), dragging = false;
      function setX(clientX) {
        var r = ba.getBoundingClientRect(), x = Math.max(0, Math.min(100, (clientX - r.left) / r.width * 100));
        ba.style.setProperty('--x', x + '%'); ba.setAttribute('aria-valuenow', Math.round(x));
      }
      ba.addEventListener('pointerdown', function (e) { dragging = true; ba.setPointerCapture(e.pointerId); setX(e.clientX); });
      ba.addEventListener('pointermove', function (e) { if (dragging) setX(e.clientX); });
      ['pointerup', 'pointercancel'].forEach(function (ev) { ba.addEventListener(ev, function () { dragging = false; }); });
      ba.addEventListener('keydown', function (e) {
        var v = +ba.getAttribute('aria-valuenow');
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault(); v = Math.max(0, Math.min(100, v + (e.key === 'ArrowLeft' ? -5 : 5)));
          ba.style.setProperty('--x', v + '%'); ba.setAttribute('aria-valuenow', v);
        }
      });
    });
    var dots = $('#workDots');
    JOBS.forEach(function (j, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', j.where);
      b.addEventListener('click', function () { track.scrollTo({ left: track.children[i].offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' }); });
      dots.appendChild(b);
    });
    function mark() {
      var w = track.children[0].offsetWidth + 12, i = Math.round(track.scrollLeft / Math.max(1, w));
      $$('button', dots).forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    }
    track.addEventListener('scroll', function () { requestAnimationFrame(mark); }, { passive: true });
    mark();
  })();
})();
