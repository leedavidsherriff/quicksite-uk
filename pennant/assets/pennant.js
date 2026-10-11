/* Pennant Windows & Doors — the film, the house, the sheet, the booking.
   No framework, no build. config.js and prices.js load first. */
(function () {
  'use strict';
  var B = window.BIZ, P = window.PRICES;
  // lower-case for running text, keeping the proper nouns
  var lc = function (t) { return t.toLowerCase().replace(/\bfrench\b/, 'French').replace(/\birish\b/, 'Irish').replace(/\bchartwell\b/, 'Chartwell'); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- business details into the page ---------------- */
  $$('[data-biz-name]').forEach(function (el) { el.textContent = B.name; });
  $$('[data-phone]').forEach(function (el) { el.textContent = B.phone; });
  $$('[data-tel]').forEach(function (el) { el.href = B.tel; });
  $$('[data-town]').forEach(function (el) { el.textContent = B.town; });
  document.title = B.name + ' · ' + B.town;
  $('#areas').textContent = B.areas.slice(0, -1).join(', ') + ' and ' + B.areas[B.areas.length - 1];

  /* ================= 01 · THE FILM =================
     Two chained chapters of one locked-off shot: windows fly in and slam home,
     then the glow-up. Advances on `ended`, so a pause must always be paired
     with a resume (the watchdog). Never pauses on visibilitychange: the preview
     pane reports hidden while it renders. No controls, ever. */
  (function film() {
    var HOLDS = [900, 3400];
    var phone = matchMedia('(max-width: 768px)').matches;
    var CLIPS = phone ? ['media/m/hero-flyin.mp4', 'media/m/hero-glow2.mp4'] : ['media/hero-flyin.mp4', 'media/hero-glow2.mp4'];
    var video = $('#heroVideo'), freeze = $('#heroFreeze');
    var btns = $$('#chapters [data-ch]');
    var idx = 0, holdUntil = 0, played = false;
    video.removeAttribute('controls');

    function mark() {
      btns.forEach(function (b, i) { b.classList.toggle('is-on', i === idx); b.querySelector('.bar i').style.width = i < idx ? '100%' : '0'; });
    }
    function play() {
      mark();
      video.src = CLIPS[idx];
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* poster stays */ });
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

    video.addEventListener('playing', function () { played = true; video.classList.add('is-playing'); });
    video.addEventListener('timeupdate', function () {
      if (!video.duration || holdUntil) return;
      btns[idx].querySelector('.bar i').style.width = (video.currentTime / video.duration * 100) + '%';
    });
    video.addEventListener('ended', function () {
      btns[idx].querySelector('.bar i').style.width = '100%';
      showFreeze();
      var hold = HOLDS[idx] || 2500;
      holdUntil = performance.now() + hold;
      setTimeout(function () { if (holdUntil) go((idx + 1) % CLIPS.length); }, hold);
    });
    video.addEventListener('error', function () { setTimeout(function () { go((idx + 1) % CLIPS.length); }, 800); });
    btns.forEach(function (b, i) { b.addEventListener('click', function () { showFreeze(); go(i); }); });

    // watchdog: resume a clip the browser power-paused, or fire an overdue hold
    // (no document.hidden bail-out: the preview pane reports hidden while it
    // renders, and resuming a clip nobody can see costs nothing)
    setInterval(function () {
      if (holdUntil && performance.now() > holdUntil + 1000) { go((idx + 1) % CLIPS.length); return; }
      if (video.paused && !video.ended && !holdUntil) {
        video.play().catch(function () { if (!video.muted) { video.muted = true; sound(); video.play().catch(function () {}); } });
      }
    }, 2000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && played && video.paused && !holdUntil) video.play().catch(function () {}); });

    var toggle = $('#soundToggle');
    function sound() {
      toggle.classList.toggle('is-muted', video.muted);
      toggle.setAttribute('aria-label', video.muted ? 'Tap for sound' : 'Mute');
      toggle.querySelector('.lbl').textContent = video.muted ? 'Sound' : 'Mute';
    }
    toggle.addEventListener('click', function () { video.muted = !video.muted; sound(); if (video.paused && !holdUntil) video.play().catch(function () {}); });

    play();
  })();

  /* ================= 02 · YOUR HOUSE =================
     The photo is never repainted. For each finish we hold one redraw of the
     whole house (the example's are pre-made; a customer's comes from the
     reader's /render), and only the inside of each ticked opening's box is
     taken from it. So unticked windows keep their old frames, the walls stay
     their walls, and next door cannot change: its pixels are never drawn. */
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
  var S = {
    mode: 'sample',
    base: null,          // Image
    photoData: '',       // the customer's photo as a data URL (sent to the reader)
    aspect: 0.75,
    afters: {},          // key -> Image
    pending: {},         // key -> true while a render is in flight
    openings: [],
    finish: 'anthracite',
    sel: -1,
    open: -1,            // the row whose options drawer is open
    roof: 0,             // metres of roofline
    before: false
  };
  var canvas = $('#stageCanvas'), ctx = canvas.getContext('2d');
  var pinsEl = $('#pins'), listEl = $('#openList'), statusEl = $('#stageStatus'), sweep = $('#sweep');

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
    var photo = P.FINISHES[S.finish].photo;
    if (S.mode === 'sample') return photo;
    var kinds = S.openings.filter(function (o) { return o.on && P.KINDS[o.kind].cat === 'door'; }).map(function (o) { return o.kind; }).sort().join(',');
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
    var boxes = S.openings.filter(function (o) { return o.on && o.box; });
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
    S.aspect = w / h;
  }

  /* ---- pins on the photo ---- */
  function renderPins() {
    pinsEl.innerHTML = '';
    var n = 0;
    S.openings.forEach(function (o, i) {
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
  // "Homeframe uPVC casement" on a GAP site, "Made-to-measure uPVC casement" in the library
  function product(kind) { var k = P.KINDS[kind]; return B.supplier[k.range] + ' ' + lc(k.name); }
  function kindOptions(o) {
    var cat = P.KINDS[o.kind].cat, keys = cat === 'door' ? P.DOOR_KINDS : P.WINDOW_KINDS, groups = {};
    keys.forEach(function (k) { (groups[P.KINDS[k].group] = groups[P.KINDS[k].group] || []).push(k); });
    return Object.keys(groups).map(function (g) {
      return '<optgroup label="' + g + '">' + groups[g].map(function (k) {
        var K = P.KINDS[k], txt = /^front/.test(k) ? B.supplier[K.range] : K.name;
        return '<option value="' + k + '"' + (k === o.kind ? ' selected' : '') + '>' + txt + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }
  function renderList() {
    listEl.innerHTML = '';
    S.openings.forEach(function (o, i) {
      var k = P.KINDS[o.kind], band = P.band(P.unit(o, S.finish)), opts = P.optionsFor(o);
      o.opts = o.opts || {};
      var picked = P.optLabels(o);
      var li = document.createElement('li');
      li.className = 'op' + (o.on ? '' : ' is-off') + (S.sel === i ? ' is-sel' : '');
      li.innerHTML =
        '<button type="button" class="op__n" aria-label="' + (o.on ? 'Leave ' : 'Include ') + (i + 1) + '">' + (i + 1) + '</button>' +
        '<div class="op__main"><div class="op__name">' + P.label(o) + (k.cat === 'door' || /bay|bow/.test(o.kind) ? '' : ' window') + '</div>' +
        '<div class="op__opts"><select aria-label="Type">' + kindOptions(o) + '</select>' +
        (k.sized ? '<span class="seg" role="group" aria-label="Size">' + ['S', 'M', 'L'].map(function (s) {
          return '<button type="button" data-size="' + s + '" aria-pressed="' + (o.size === s) + '" title="' + P.SIZES[s].hint + '">' + P.SIZES[s].name + '</button>';
        }).join('') + '</span>' : '') +
        '</div>' +
        (o.nextDoor && !o.on ? '<p class="op__nd">Looks like next door\'s, so it\'s left out</p>' : '') +
        (opts.length ? '<button type="button" class="op__more" aria-expanded="' + (S.open === i) + '">' + (picked.length ? 'With ' + picked.join(', ') : 'Options') + ' <span aria-hidden="true">' + (S.open === i ? '−' : '+') + '</span></button>' : '') +
        '</div>' +
        '<div class="op__price">' + (o.on ? P.range(band) : '<span style="color:var(--ink-3)">Leaving as is</span>') +
        '<small>' + (k.colourIn ? 'colour included' : lc(P.FINISHES[S.finish].name)) + '</small>' +
        '<button type="button" class="op__toggle">' + (o.on ? 'Leave as is' : 'Include') + '</button></div>' +
        (S.open === i && opts.length ? '<div class="op__drawer">' + opts.map(function (key) {
          var O = P.OPTIONS[key];
          return '<button type="button" class="optchip" data-opt="' + key + '" aria-pressed="' + !!o.opts[key] + '"><span>' + O.name + '</span><b>+' + P.gbp(Math.round(P.optAdd(o, key) * (k.colourIn ? 1 : P.FINISHES[S.finish].mult) / 10) * 10) + '</b><small>' + O.note + '</small></button>';
        }).join('') + '</div>' : '');
      li.querySelector('.op__n').addEventListener('click', function () { S.sel = i; o.on = !o.on; update(); });
      li.querySelector('.op__toggle').addEventListener('click', function () { S.sel = i; o.on = !o.on; update(); });
      li.querySelector('select').addEventListener('change', function (e) {
        o.kind = e.target.value; S.sel = i;
        if (!P.KINDS[o.kind].sized) o.size = o.size || 'M';
        update(true);
      });
      $$('[data-size]', li).forEach(function (b) { b.addEventListener('click', function () { o.size = b.dataset.size; S.sel = i; update(false); }); });
      var more = li.querySelector('.op__more');
      if (more) more.addEventListener('click', function () { S.open = S.open === i ? -1 : i; S.sel = i; update(false); });
      $$('[data-opt]', li).forEach(function (b) { b.addEventListener('click', function () { o.opts[b.dataset.opt] = !o.opts[b.dataset.opt]; if (!o.on) o.on = true; update(false); }); });
      li.addEventListener('focusin', function () { if (S.sel !== i) { S.sel = i; $$('.pin').forEach(function (p, j) { p.classList.toggle('is-sel', j === pinIndex(i)); }); } });
      listEl.appendChild(li);
    });
    var on = S.openings.filter(function (o) { return o.on; }).length;
    $('#openCount').textContent = S.openings.length ? on + ' of ' + S.openings.length + ' being replaced' : '';
  }
  function pinIndex(i) { var n = -1; for (var j = 0; j <= i; j++) if (S.openings[j].box) n++; return S.openings[i].box ? n : -1; }

  /* ---- colours: three we can draw on a photo, and the rest of the range ---- */
  function renderFinishes() {
    var row = $('#finishRow'), more = $('#finishMore');
    row.innerHTML = ''; more.innerHTML = '';
    P.FINISH_ORDER.forEach(function (key) {
      var f = P.FINISHES[key], big = key === f.photo;
      var b = document.createElement('button');
      b.type = 'button'; b.className = big ? 'sw' : 'sw-dot';
      b.setAttribute('aria-pressed', String(S.finish === key));
      var up = f.mult === 1 ? 'standard' : '+' + Math.round((f.mult - 1) * 100) + '%';
      b.innerHTML = big
        ? '<img src="' + f.swatch + '" alt="" width="160" height="100" loading="lazy">' + f.name + '<small>' + up + '</small>'
        : '<i style="background:' + f.hex + '"></i>' + f.name + '<small>' + up + '</small>';
      b.addEventListener('click', function () { if (S.finish === key) return; S.finish = key; renderFinishes(); update(true); });
      (big ? row : more).appendChild(b);
    });
    var f = P.FINISHES[S.finish];
    $('#finishNote').textContent = S.finish === f.photo ? '' : 'The photo shows ' + lc(P.FINISHES[f.photo].name) + ', the nearest colour we can draw. Your spec sheet says ' + lc(f.name) + ', and the surveyor brings a real sample.';
  }

  /* ---- roofline ---- */
  function renderRoof() {
    $('#roofM').textContent = S.roof ? S.roof + ' m' : 'None';
    $('#roofCost').textContent = S.roof ? P.range(P.band(P.rooflineCost(S.roof, S.finish))) : 'Add the front';
  }
  $('#roofLess').addEventListener('click', function () { S.roof = Math.max(0, S.roof - 1); update(false); });
  $('#roofMore').addEventListener('click', function () { S.roof = S.roof ? Math.min(40, S.roof + 1) : 5; update(false); });

  /* ---- the running total (count-up, one animation at a time) ---- */
  var shown = [0, 0], countTok = 0;
  function countTo(target) {
    var from = shown.slice(), t0 = performance.now(), tok = ++countTok, dur = reduced ? 0 : 520;
    function step(now) {
      if (tok !== countTok) return;
      var k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      shown = [from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e];
      $('#tallyNum').textContent = target[1] ? P.gbp(Math.round(shown[0] / 10) * 10) + '–' + P.gbp(Math.round(shown[1] / 10) * 10) : '£0';
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    // rAF doesn't run in a hidden tab: land on the real figure regardless
    setTimeout(function () { if (tok === countTok) step(t0 + dur + 1); }, dur + 80);
  }
  function renderTally() {
    var t = P.totals(S.openings, S.finish, S.roof);
    var any = t.units || t.roof;
    countTo(any ? t.band : [0, 0]);
    var save = $('#tallySave');
    if (t.off) save.textContent = t.units + ' in one visit: ' + P.gbp(t.off) + ' off';
    else if (t.units === P.MULTI_MIN - 1) save.textContent = 'One more opening and the lot is 8% off';
    else save.textContent = t.units ? t.units + ' opening' + (t.units > 1 ? 's' : '') + ' · ' + lc(P.FINISHES[S.finish].name) : 'Tick an opening to price it';
    $('#dockLbl').textContent = any ? P.range(t.band) : 'Price my house';
  }

  /* ---- redraws for a customer's photo ---- */
  function ensureAfter() {
    var key = afterKey(), photo = P.FINISHES[S.finish].photo;
    if (S.afters[key] || S.pending[key]) return;
    if (S.mode === 'sample') {
      S.pending[key] = true;
      loadImg(SAMPLE.afters[photo]).then(function (im) { S.afters[key] = im; delete S.pending[key]; draw(); docThumb(); });
      return;
    }
    if (!S.openings.some(function (o) { return o.on && o.box; })) return;
    S.pending[key] = true;
    scanning(true);
    status('Drawing your new ' + lc(P.FINISHES[photo].name) + ' frames…');
    // the reader knows its own door words: map our range back to them
    var READER_KIND = { front: 'front', frontgrp: 'front', back: 'back', french: 'french', patio: 'patio', patio3: 'patio', bifold2: 'bifold', bifold3: 'bifold', bifold4: 'bifold', bifold5: 'bifold', sash: 'sash' };
    var kinds = S.openings.filter(function (o) { return o.on; }).map(function (o) { return READER_KIND[o.kind] || 'casement'; });
    var tries = 0;
    (function send() {
      fetch(B.reader + '/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: S.photoData, aspect: S.aspect, finish: photo, kinds: kinds })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) {
          if (j.retry && tries++ < 2) { setTimeout(send, (j.retry_after || 4) * 1000); return; }
          throw new Error(j.error || 'render_failed');
        }
        return loadImg(j.image).then(function (im) {
          S.afters[key] = im; delete S.pending[key];
          if (afterKey() === key) { scanning(false); status('That\'s your house with new ' + lc(P.FINISHES[photo].name) + ' frames. Hold the button to compare.'); }
          draw(); docThumb();
        });
      }).catch(function () {
        delete S.pending[key];
        scanning(false);
        status('Couldn\'t draw the new frames just now. Your prices are still right. Try another colour, or try again in a minute.');
      });
    })();
  }

  function update(redraw) {
    renderPins(); renderList(); renderRoof(); renderTally();
    if (redraw !== false) ensureAfter();
    draw(); renderDocket();
  }

  /* ---- load the example house ---- */
  function useSample() {
    S.mode = 'sample'; S.photoData = ''; S.afters = {}; S.pending = {}; S.sel = -1;
    S.open = -1;
    S.openings = SAMPLE.openings.map(function (o) { return { kind: o.kind, size: o.size, box: o.box, on: true, opts: {} }; });
    $('#stageTag').textContent = 'Example house';
    $('#useExample').hidden = true;
    scanning(false);
    status('Tap a number to leave that window as it is.');
    return loadImg(SAMPLE.before).then(function (im) { setBase(im); update(); });
  }

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
  $('#photoIn').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    S.mode = 'photo'; S.afters = {}; S.pending = {}; S.openings = []; S.sel = -1;
    $('#stageTag').textContent = 'Your house';
    $('#useExample').hidden = false;
    scanning(true);
    status('Finding your windows and doors…');
    document.getElementById('studio').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    shrink(file).then(function (data) {
      S.photoData = data;
      return loadImg(data).then(function (im) { setBase(im); update(false); });
    }).then(function () {
      return fetch(B.reader + '/read-photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: S.photoData, aspect: S.aspect })
      }).then(function (r) { return r.json(); });
    }).then(function (j) {
      scanning(false);
      if (!j.ok || !j.photo_ok) {
        status(PROBLEMS[j.problem] || 'We couldn\'t read that photo. Add your windows by hand below, or try another.');
        update(false);
        return;
      }
      var FROM_READER = { bay: 'bay3', bifold: 'bifold3' };
      S.open = -1;
      S.openings = j.openings.map(function (o) { return { kind: FROM_READER[o.kind] || o.kind, size: o.size || 'M', box: o.box, on: true, opts: {} }; }).filter(function (o) { return P.KINDS[o.kind]; });
      var nd = markNextDoor(S.openings);
      status(nd ? 'Found yours. ' + nd + ' window' + (nd > 1 ? 's' : '') + ' that look like next door\'s are left out: tap one if it\'s actually yours.' : (j.summary || 'Found them. Tap a number to leave one as it is.'));
      update();
    }).catch(function () {
      scanning(false);
      status('Our window reader is busy. Add your windows by hand below, or try again in a minute.');
      update(false);
    });
  });
  $('#useExample').addEventListener('click', useSample);
  $('#addOne').addEventListener('click', function () {
    S.openings.push({ kind: 'casement', size: 'M', box: null, on: true, opts: {} });
    S.open = S.openings.length - 1;
    S.sel = S.openings.length - 1;
    update(false);
    var last = listEl.lastElementChild; if (last) last.querySelector('select').focus();
  });

  /* ---- hold to see before ---- */
  (function hold() {
    var btn = $('#holdBtn');
    function down(e) { if (e.cancelable) e.preventDefault(); S.before = true; btn.classList.add('is-down'); draw(); }
    function up() { if (!S.before) return; S.before = false; btn.classList.remove('is-down'); draw(); }
    btn.addEventListener('pointerdown', down);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (ev) { btn.addEventListener(ev, up); });
    btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') down(e); });
    btn.addEventListener('keyup', up);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  })();

  /* ================= 03 · SPEC SHEET ================= */
  var REF = 'PN-' + String(Math.floor(1000 + Math.random() * 9000));
  $('#docRef').textContent = REF;
  $('#docDate').textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  function specFor(o) {
    var k = P.KINDS[o.kind], fin = lc(P.FINISHES[S.finish].name);
    var bits = [B.supplier[k.range]];
    bits.push(k.colourIn ? 'your choice of colour' : fin);
    return bits.concat(P.optLabels(o)).join(', ');
  }
  function lineName(o) {
    var k = P.KINDS[o.kind];
    return P.label(o) + (k.cat === 'door' || /bay|bow/.test(o.kind) ? '' : ' window');
  }
  function docLines() {
    return S.openings.map(function (o, i) { return { n: i + 1, o: o }; }).filter(function (x) { return x.o.on; });
  }
  function renderDocket() {
    var lines = docLines(), t = P.totals(S.openings, S.finish, S.roof);
    var rows = lines.map(function (x) {
      return '<tr><td>' + x.n + '</td><td>' + lineName(x.o) + '<small>' + specFor(x.o) + '</small></td><td class="num">' + P.range(P.band(P.unit(x.o, S.finish))) + '</td></tr>';
    });
    if (t.roof) rows.push('<tr><td>R</td><td>Roofline, ' + S.roof + ' m across the front<small>' + B.supplier.roofline + ' fascia, soffit &amp; guttering</small></td><td class="num">' + P.range(P.band(t.roof)) + '</td></tr>');
    $('#docLines').innerHTML = rows.length ? rows.join('') : '<tr><td></td><td colspan="2">Nothing ticked yet. Tap the windows you want replaced.</td></tr>';
    var off = $('#docOff');
    off.hidden = !t.off;
    if (t.off) off.innerHTML = '<span>' + t.units + ' openings in one visit: one van, one day, one skip</span><span>−' + P.gbp(t.off) + '</span>';
    $('#docTotal').textContent = t.units || t.roof ? P.range(t.band) : '£0';

    var sup = B.supplier, by = sup.by ? ' by ' + sup.by : '';
    var has = function (re) { return lines.some(function (x) { return re.test(x.o.kind); }); };
    var spec = [];
    if (lines.some(function (x) { return P.KINDS[x.o.kind].range === 'window' || P.KINDS[x.o.kind].range === 'door'; }))
      spec.push(['Frames', sup.window + by + ', ' + lc(P.FINISHES[S.finish].name) + ', inside and out']);
    if (has(/^front$/)) spec.push(['Front door', sup.front + by + ', multi-point locking']);
    if (has(/^frontgrp$/)) spec.push(['Front door', sup.frontgrp + by + ', multi-point locking']);
    if (has(/^bifold/)) spec.push(['Bi-folds', sup.bifold + by]);
    if (t.roof) spec.push(['Roofline', sup.roofline + by]);
    spec.push(['Glazing', (lines.some(function (x) { return x.o.opts && x.o.opts.triple; }) ? 'Triple where marked, A-rated double elsewhere' : 'A-rated double glazing') + '; toughened wherever the Building Regulations call for safety glass, at no extra cost']);
    spec.push(['Fitting', 'By our own team. Old frames out and taken away, sealed inside and out']);
    $('#docSpec').innerHTML = spec.map(function (s) { return '<dt>' + s[0] + '</dt><dd>' + s[1] + '</dd>'; }).join('');
  }
  var thumbTimer = 0;
  function docThumb() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(function () {
      try { $('#docThumb').src = canvas.toDataURL('image/jpeg', 0.8); } catch (e) { /* ignore */ }
    }, 120);
  }
  // the docket prints out of its slot the first time you reach it
  (function printOnce() {
    var d = $('#docket'), done = false;
    if (reduced || !('IntersectionObserver' in window)) return;
    d.style.visibility = 'hidden';
    new IntersectionObserver(function (es, ob) {
      if (done || !es[0].isIntersecting) return;
      done = true; ob.disconnect();
      docThumb();
      d.style.visibility = '';
      d.classList.add('is-printing');
    }, { threshold: 0.15 }).observe($('.docket-wrap'));
  })();
  $('#printBtn').addEventListener('click', function () { docThumb(); setTimeout(function () { window.print(); }, 150); });

  /* ================= 04 · BOOK ================= */
  (function book() {
    var days = [], d = new Date();
    d.setHours(12, 0, 0, 0);
    while (days.length < 8) {
      d.setDate(d.getDate() + 1);
      if (B.surveyDays.indexOf(d.getDay()) >= 0) days.push(new Date(d));
    }
    var pick = { day: '', part: '' };
    var dayRow = $('#dayChips');
    days.forEach(function (day, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
      var label = day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      b.dataset.label = label;
      b.innerHTML = (i === 0 ? 'Tomorrow' : day.toLocaleDateString('en-GB', { weekday: 'short' })) + '<small>' + day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</small>';
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
      var t = P.totals(S.openings, S.finish, S.roof);
      var msg = [
        'Survey request ' + REF + ' for ' + B.name,
        name + ' · ' + phone + ' · ' + pc,
        'When: ' + pick.day + (pick.part ? ', ' + pick.part.toLowerCase() : ''),
        '',
        'Spec sheet (' + lc(P.FINISHES[S.finish].name) + '):'
      ].concat(docLines().map(function (x) {
        return x.n + '. ' + lineName(x.o) + ' — ' + specFor(x.o) + ' — ' + P.range(P.band(P.unit(x.o, S.finish)));
      })).concat([t.roof ? 'Roofline ' + S.roof + ' m — ' + P.range(P.band(t.roof)) : '', t.off ? 'One visit, 8% off: −' + P.gbp(t.off) : '', 'Guide total: ' + (t.units || t.roof ? P.range(t.band) : 'to price at survey')]).filter(Boolean).join('\n');
      window.open('https://wa.me/' + B.whatsapp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      $('#bookedWhen').textContent = pick.day + (pick.part ? ', ' + pick.part.toLowerCase() : '');
      f.hidden = true;
      $('#booked').hidden = false;
    });
  })();

  /* ================= THE WHOLE PRICE LIST =================
     Built straight from prices.js, so the list, the studio, the spec sheet and
     the recent fits all quote from one table. Swap in a supplier's real list
     and every surface moves together. */
  (function priceList() {
    var tabs = $('#plTabs'), body = $('#plBody'), sel = $('#plColour');
    var colour = 'white', tab = 'Windows';
    var GROUPS = ['Windows', 'Front doors', 'Garden & back doors', 'Bi-folds', 'Options', 'Colours', 'Roofline'];
    P.FINISH_ORDER.forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = P.FINISHES[k].name; sel.appendChild(o);
    });
    sel.addEventListener('change', function () { colour = sel.value; draw(); });
    GROUPS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = g;
      b.addEventListener('click', function () { tab = g; draw(); });
      tabs.appendChild(b);
    });
    var cell = function (mid, l) { return '<td class="num"' + (l ? ' data-l="' + l + '"' : '') + '>' + P.range(P.band(mid)) + '</td>'; };
    var SZ = { S: 'Small', M: 'Standard', L: 'Large' };
    function draw() {
      $$('button', tabs).forEach(function (b) { b.setAttribute('aria-selected', String(b.textContent === tab)); });
      var html = '', f = P.FINISHES[colour];
      if (tab === 'Windows') {
        html = '<table><thead><tr><th>Window</th><th class="num">Small</th><th class="num">Standard</th><th class="num">Large</th></tr></thead><tbody>' +
          P.WINDOW_KINDS.map(function (k) {
            var K = P.KINDS[k];
            var name = '<td><b>' + B.supplier[K.range] + ' ' + lc(K.name) + '</b><small>' + K.note + '</small></td>';
            if (K.sized) return '<tr class="r3">' + name + ['S', 'M', 'L'].map(function (z) { return cell(P.unit({ kind: k, size: z }, colour), SZ[z]); }).join('') + '</tr>';
            return '<tr>' + name + '<td class="num" colspan="3">' + P.range(P.band(P.unit({ kind: k }, colour))) + ' per bay</td></tr>';
          }).join('') + '</tbody></table>';
      } else if (tab === 'Options') {
        html = '<table><thead><tr><th>Option, per frame</th><th class="num">Small</th><th class="num">Standard</th><th class="num">Large</th></tr></thead><tbody>' +
          Object.keys(P.OPTIONS).map(function (key) {
            var O = P.OPTIONS[key], m = f.mult;
            var name = '<td><b>' + O.name + '</b><small>' + O.note + '</small></td>';
            if (typeof O.add === 'number') return '<tr>' + name + '<td class="num" colspan="3">+' + P.gbp(O.add) + ' per door</td></tr>';
            return '<tr class="r3">' + name + ['S', 'M', 'L'].map(function (z) { return '<td class="num" data-l="' + SZ[z] + '">+' + P.gbp(Math.round(O.add[z] * m / 10) * 10) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>';
      } else if (tab === 'Colours') {
        html = '<table><thead><tr><th>Colour</th><th class="num">On frames</th><th class="num">Standard casement</th></tr></thead><tbody>' +
          P.FINISH_ORDER.map(function (k) {
            var F = P.FINISHES[k];
            return '<tr><td><span class="pl-dot" style="background:' + F.hex + '"></span><b>' + F.name + '</b></td><td class="num">' + (F.mult === 1 ? 'standard' : '+' + Math.round((F.mult - 1) * 100) + '%') + '</td>' + cell(P.unit({ kind: 'casement', size: 'M' }, k)) + '</tr>';
          }).join('') + '</tbody></table><p class="plist__note">Front doors and bi-folds come in any colour at no extra cost.</p>';
      } else if (tab === 'Roofline') {
        var per = P.rooflineCost(1, colour);
        html = '<table><thead><tr><th>Roofline</th><th class="num">Per metre</th><th class="num">Terrace, 5 m</th><th class="num">Semi, 7 m</th></tr></thead><tbody>' +
          '<tr><td><b>' + B.supplier.roofline + ' fascia, soffit &amp; guttering</b><small>' + P.ROOFLINE.note + ' Scaffold quoted separately if a house needs it.</small></td><td class="num">' + P.gbp(per) + '</td>' + cell(P.rooflineCost(5, colour)) + cell(P.rooflineCost(7, colour)) + '</tr></tbody></table>';
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
    $('#plSmall').textContent = 'Guide prices for South Wales' + (B.supplier.by ? ', built on ' + B.supplier.by + '’s ranges' : '') + '. Every opening is measured at survey; if anything changes the price you’ll see why, in writing, before we start. Fit five or more in one visit and the lot is 8% off.';
    draw();
  })();

  /* ================= WORK =================
     Each job's price comes from the same engine as the quote, so the three
     places a price appears can never disagree. */
  var JOBS = [
    { b: 'media/w1-before.webp', a: 'media/w1-after.webp', where: 'Maesteg', what: 'Stone terrace, rotten timber sashes', did: 'Heritage white uPVC sashes and a new front door, kept to the terrace\'s look.', finish: 'white',
      items: [{ kind: 'sash', size: 'M' }, { kind: 'sash', size: 'M' }, { kind: 'sash', size: 'L' }, { kind: 'front' }] },
    { b: 'media/w2-before.webp', a: 'media/w2-after.webp', where: 'Pencoed', what: '1930s semi, brown leaded bays', did: 'Both bays, the box room and the front door, in anthracite. Next door\'s half untouched.', finish: 'anthracite',
      items: [{ kind: 'bay3' }, { kind: 'bay3' }, { kind: 'casement', size: 'S' }, { kind: 'front' }] },
    { b: 'media/w3-before.webp', a: 'media/w3-after.webp', where: 'Porthcawl', what: 'Yellowed patio slider onto the garden', did: 'Out with the slider, in with a slim black aluminium bi-fold.', finish: 'white',
      items: [{ kind: 'bifold4' }] }
  ];
  (function work() {
    var grid = $('#workGrid');
    JOBS.forEach(function (j) {
      var t = P.totals(j.items, j.finish);
      var fig = document.createElement('figure');
      fig.className = 'job rv'; fig.style.margin = '0';
      fig.innerHTML = '<div class="ba" tabindex="0" role="slider" aria-label="Before and after, ' + j.where + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">' +
        '<img src="' + j.b + '" alt="Before: ' + j.what + '" loading="lazy" width="1600" height="905">' +
        '<img class="ba__after" src="' + j.a + '" alt="After: ' + j.did + '" loading="lazy" width="1600" height="905">' +
        '<span class="ba__handle"></span><span class="ba__tag ba__tag--b">Before</span><span class="ba__tag ba__tag--a">After</span></div>' +
        '<figcaption><h3>' + j.where + '</h3><p>' + j.what + '. ' + j.did + '</p>' +
        '<p class="came">Came to <b>' + P.range(t.band) + '</b>' + (t.off ? ' with the one-visit 8% off' : '') + '</p></figcaption>';
      grid.appendChild(fig);
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
  })();

  /* ================= DOCK + REVEALS ================= */
  (function chrome() {
    var dock = $('#dock');
    if (!('IntersectionObserver' in window)) { dock.classList.add('is-on'); return; }
    new IntersectionObserver(function (es) { dock.classList.toggle('is-on', !es[0].isIntersecting); }, { threshold: 0.05 }).observe($('#film'));
    // the tally does the dock's job inside the studio
    new IntersectionObserver(function (es) { document.body.classList.toggle('in-studio', es[0].isIntersecting); }, { rootMargin: '-30% 0px -30% 0px' }).observe($('#studio'));
    $$('.sec-head, .how__steps li, .areas').forEach(function (el) { el.classList.add('rv'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$('.rv').forEach(function (el) { io.observe(el); });
  })();

  renderFinishes();
  useSample();
})();
