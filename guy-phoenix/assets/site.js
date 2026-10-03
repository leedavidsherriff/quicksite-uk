/* Guy Phoenix · Superhomes. No libraries, no trackers, nothing stored. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "£" + (n >= 1e6 ? (n / 1e6).toFixed(2).replace(/0$/, "") + "m" : Math.round(n / 1000) + "k"); };

  /* ---------- the doors ----------
     Tap a door (or scroll) and they slide apart. If nobody touches them they
     open on their own after a beat, so no one is ever stuck outside. */
  var doors = $(".doors");
  function openDoors() { if (doors && !doors.classList.contains("open")) { doors.classList.add("open"); startGuy(); } }
  if (doors) {
    $$(".door", doors).forEach(function (d) { d.addEventListener("click", openDoors); });
    if (reduce || (location.hash && location.hash !== "#top")) openDoors();
    else {
      setTimeout(openDoors, 2600);
      window.addEventListener("scroll", function once() { openDoors(); window.removeEventListener("scroll", once); }, { passive: true });
      window.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") openDoors(); });
    }
  }

  /* ---------- top bar goes solid once past the doors ---------- */
  var top = $(".top");
  function onScroll() {
    if (top) top.classList.toggle("solid", window.scrollY > window.innerHeight * 0.6);
    if (promo) promo.classList.toggle("show", window.scrollY > window.innerHeight * 0.7 && !nearBuild());
    if (mcBg && !reduce) {
      var r = mcBg.parentNode.getBoundingClientRect();
      mcBg.style.transform = "translateY(" + (r.top * -0.12).toFixed(1) + "px)";
    }
  }
  var mcBg = $(".monaco__bg");
  var promo = $(".promo"), build = $("#build") || $("#dates");
  // keep the promo out of the way of the enquiry form at the bottom
  function nearBuild() { return build && build.getBoundingClientRect().top < window.innerHeight * 0.85; }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$(".rv");
  if (!("IntersectionObserver" in window) || reduce) revealEls.forEach(function (el) { el.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Guy's transparent wave ----------
     Safari/iOS get HEVC-with-alpha (.mov), everything else VP9-with-alpha (.webm):
     Safari plays WebM but drops the alpha, Chrome plays HEVC but drops the alpha.
     Invisible until genuinely playing; if it can't play it is removed and the
     still (its own first frame) stays. Never a play button. */
  var ua = navigator.userAgent;
  var webkitOnly = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ||
    (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua));
  var guyStarted = false;
  function startGuy() {
    if (guyStarted || reduce) return; guyStarted = true;
    $$(".guy[data-webm]").forEach(function (fig) {
      var v = document.createElement("video");
      v.className = "guy__clip";
      v.setAttribute("muted", ""); v.muted = true; v.defaultMuted = true;
      v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
      v.setAttribute("loop", ""); v.setAttribute("preload", "auto");
      v.setAttribute("aria-hidden", "true"); v.setAttribute("disablepictureinpicture", "");
      v.setAttribute("disableremoteplayback", "");
      v.src = webkitOnly ? fig.getAttribute("data-hevc") : fig.getAttribute("data-webm");
      var everPlayed = false, killed = false, timer = 0;
      function kill() { if (everPlayed || killed) return; killed = true; v.pause(); v.remove(); fig.classList.remove("clip-on"); }
      v.addEventListener("playing", function () { everPlayed = true; fig.classList.add("clip-on"); });
      v.addEventListener("error", kill);
      fig.appendChild(v);
      function tryPlay() {
        if (killed || document.hidden) return;
        if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 6000);
        var p = v.play(); if (p && p.catch) p.catch(function () { if (!document.hidden) kill(); });
      }
      tryPlay();
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { if (!everPlayed) { clearTimeout(timer); timer = 0; } return; }
        tryPlay();
      });
    });
  }

  /* ---------- films straight off site ----------
     Loaded only on screen, shown only once playing, paused off screen.
     If one can't play, the video is removed and its poster stays. */
  $$(".film[data-film]").forEach(function (box) {
    if (reduce) return;
    var v = null, everPlayed = false, killed = false, inView = false, timer = 0;
    function kill() { if (everPlayed || killed) return; killed = true; if (v) { v.pause(); v.remove(); } }
    function make() {
      v = document.createElement("video");
      v.className = "film__v";
      v.setAttribute("muted", ""); v.muted = true; v.defaultMuted = true;
      v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
      v.setAttribute("loop", ""); v.setAttribute("preload", "auto"); v.setAttribute("aria-hidden", "true");
      v.setAttribute("disablepictureinpicture", ""); v.setAttribute("disableremoteplayback", "");
      v.src = box.getAttribute("data-film");
      v.addEventListener("playing", function () { everPlayed = true; v.classList.add("is-playing"); });
      v.addEventListener("error", kill);
      box.insertBefore(v, box.firstChild);
    }
    function tryPlay() {
      if (killed || document.hidden || !inView) return;
      if (!v) make();
      if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 7000);
      var p = v.play(); if (p && p.catch) p.catch(function () { if (!document.hidden) kill(); });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { inView = e.isIntersecting; if (killed) return; if (inView) tryPlay(); else if (v && everPlayed) v.pause(); });
      }, { threshold: 0.25 }).observe(box);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tryPlay(); });
  });

  /* ---------- home cards: second photo on hover ---------- */
  $$(".home[data-b]").forEach(function (a) {
    var holder = $(".home__img", a), b = new Image();
    b.className = "b"; b.alt = ""; b.loading = "lazy"; b.src = a.getAttribute("data-b");
    holder.appendChild(b);
  });

  /* ---------- spec your Superhome ----------
     Guide ranges only: shell + fit-out £400–£550 / sq ft, plus each toy's range. */
  var sqft = $("#sqft"), loEl = $("#lo"), hiEl = $("#hi"), nudge = $("#nudge"), guy = $("#specGuy");
  var RATE_LO = 400, RATE_HI = 550;
  var shown = { lo: 0, hi: 0 }, raf = 0;
  function animateTo(lo, hi) {
    if (reduce) { loEl.textContent = money(lo); hiEl.textContent = money(hi); shown = { lo: lo, hi: hi }; return; }
    var from = { lo: shown.lo, hi: shown.hi }, t0 = performance.now();
    cancelAnimationFrame(raf);
    (function step(t) {
      var k = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - k, 3);
      shown.lo = from.lo + (lo - from.lo) * e; shown.hi = from.hi + (hi - from.hi) * e;
      loEl.textContent = money(shown.lo); hiEl.textContent = money(shown.hi);
      if (k < 1) raf = requestAnimationFrame(step);
    })(t0);
  }
  var lastPose = "";
  function setPose(p) {
    if (p === lastPose) return; lastPose = p;
    guy.src = "assets/guy/" + p + ".webp";
    guy.classList.remove("bump"); void guy.offsetWidth; guy.classList.add("bump");
    setTimeout(function () { guy.classList.remove("bump"); }, 380);
  }
  function calc() {
    if (!sqft) return;
    var s = +sqft.value, lo = s * RATE_LO, hi = s * RATE_HI, picked = [];
    $$(".spec__chips input").forEach(function (c) {
      if (c.checked) { lo += +c.dataset.lo; hi += +c.dataset.hi; picked.push(c.nextElementSibling.textContent); }
    });
    $("#sqftOut").textContent = s.toLocaleString("en-GB") + " sq ft";
    animateTo(lo, hi);
    var n = picked.length, shark = $('[data-k="shark"]').checked;
    nudge.textContent =
      shark ? "A shark tank. Guy's done one before. Let's talk." :
      n === 0 ? "No toys? Guy will talk you into a pool." :
      n < 3 ? "Add a cinema or a spa and it starts feeling like a Superhome." :
      n < 6 ? "Now we're talking. Send it over and Guy will tell you what he'd change." :
      "That's a proper Superhome. Guy wants to hear about this one.";
    setPose(shark || n >= 6 ? "wow" : n >= 3 ? "thumbs" : "think");
    var send = $("#specSend");
    send.onclick = function () {
      window.__spec = { keys: $$(".spec__chips input").filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.k; }), mid: (lo + hi) / 2 };
      if (window.__wizFromSpec) window.__wizFromSpec(window.__spec);
    };
  }
  if (sqft) {
    sqft.addEventListener("input", calc);
    $$(".spec__chips input").forEach(function (c) { c.addEventListener("change", calc); });
    calc();
  }

  /* ---------- Monaco count ---------- */
  // (static "3": the number is the point, not the animation)

  /* ---------- Build with Guy: six-step wizard ----------
     Demo: nothing is sent anywhere. On Guy's live site the brief goes to his WhatsApp. */
  var wiz = $("#wiz");
  if (wiz) {
    var steps = $$(".step", wiz), at = 1, LAST = 6;
    var next = $("#wizNext"), back = $("#wizBack"), msg = $("#briefMsg"), gImg = $("#wizGuy"), say = $("#wizSay");
    var BANDS = ["Under £2m", "£2m to £4m", "£4m to £7m", "£7m to £10m", "£10m+"];
    var BAND_LINE = ["Plenty to work with. Get the layout right first.", "Now that's a proper Superhome budget.",
      "Pools, cinemas, the lot. Let's talk.", "Glass floors and a champagne room? Go on then.", "World's most expensive house? I'm listening."];
    var SPEC_TO_TOY = { pool: "Indoor pool", spa: "Spa: sauna and steam", cinema: "Home cinema", glass: "Glass floor", stair: "Statement staircase",
      auto: "Full home automation", champ: "Champagne room", gym: "Gym", shark: "Shark tank" };
    var f = $("#brief");
    function val(n) { var el = f.querySelector('[name="' + n + '"]:checked') || f.querySelector('[name="' + n + '"]'); return el && el.type !== "radio" ? el.value.trim() : (el && el.checked ? el.value : ""); }
    function ok(n) {
      if (n === 1) return !!val("plot");
      if (n === 2) return !!$("#where").value.trim();
      if (n === 3) return !!val("vibe");
      if (n === 6) return !!f.name.value.trim() && !!f.contact.value.trim();
      return true;
    }
    var NEED = { 1: "Pick one to crack on.", 2: "Tap an area or type a town.", 3: "Pick the one that feels like you.", 6: "Name and a way to reach you, please." };
    function guy(pose, line) {
      if (reduce) { gImg.src = "assets/guy/" + pose + ".webp"; say.textContent = line; return; }
      gImg.classList.add("swap"); say.classList.add("swap");
      setTimeout(function () { gImg.src = "assets/guy/" + pose + ".webp"; say.textContent = line; gImg.classList.remove("swap"); say.classList.remove("swap"); }, 180);
    }
    function show(n) {
      at = n;
      steps.forEach(function (st) { st.classList.toggle("is-on", +st.dataset.step === n); });
      var st = steps.filter(function (x) { return +x.dataset.step === n; })[0];
      guy(st.dataset.guy, st.dataset.say);
      $("#wizFill").style.width = Math.min(100, n / LAST * 100) + "%";
      $("#wizNo").textContent = Math.min(n, LAST);
      back.hidden = n === 1 || n > LAST;
      $("span", next).textContent = n === LAST ? "Send to Guy" : "Next";
      msg.textContent = "";
      if (n === 5) budget();
    }
    function go(d) {
      if (d > 0 && !ok(at)) { msg.textContent = NEED[at]; return; }
      if (d > 0 && at === LAST) return finish();
      show(Math.max(1, at + d));
      var r = wiz.getBoundingClientRect(); if (r.top < 0) wiz.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
    next.addEventListener("click", function () { go(1); });
    back.addEventListener("click", function () { go(-1); });
    // single-choice steps move on by themselves
    $$('input[type=radio]', wiz).forEach(function (r) { r.addEventListener("change", function () { setTimeout(function () { go(1); }, reduce ? 0 : 420); }); });
    // area chips fill the town box
    $$(".chips button", wiz).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".chips button", wiz).forEach(function (x) { x.classList.toggle("on", x === b); });
        $("#where").value = b.textContent; setTimeout(function () { go(1); }, reduce ? 0 : 300);
      });
    });
    $("#where").addEventListener("input", function () { $$(".chips button", wiz).forEach(function (x) { x.classList.remove("on"); }); });
    $("#where").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(1); } });
    // must-haves: Guy reacts to the big ones
    $$("#toys input").forEach(function (c) {
      c.addEventListener("change", function () {
        if (!c.checked) return;
        var v = c.value;
        if (v === "Shark tank") guy("wow", "A shark tank. I've done one before. Love it.");
        else if (v === "Helipad") guy("wow", "Helipad? Now we're talking.");
        else if (v === "Champagne room") guy("thumbs", "Hermitage has one. Good shout.");
        else if (v === "Indoor pool") guy("present", "Bigger than the average house. Sorted.");
      });
    });
    function budget() { var i = +$("#budget").value; $("#budgetOut").textContent = BANDS[i]; $("#budgetLine").textContent = BAND_LINE[i]; }
    $("#budget").addEventListener("input", function () { budget(); if (+this.value >= 3) guy("wow", BAND_LINE[+this.value]); });
    // the spec tool hands over its picks
    window.__wizFromSpec = function (sp) {
      $$("#toys input").forEach(function (c) { c.checked = sp.keys.some(function (k) { return SPEC_TO_TOY[k] === c.value; }); });
      var m = sp.mid; $("#budget").value = m < 2e6 ? 0 : m < 4e6 ? 1 : m < 7e6 ? 2 : m < 1e7 ? 3 : 4;
      show(1); msg.textContent = "Your spec's loaded in. Start with the plot.";
    };
    function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
    function finish() {
      var vibe = f.querySelector('[name="vibe"]:checked'), toys = $$("#toys input").filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      var img = vibe ? vibe.nextElementSibling.style.backgroundImage : "";
      $("#ticket").innerHTML = '<div class="ticket__img" style="background-image:' + esc(img.replace(/"/g, "'")) + '"></div><div>' +
        '<h3>' + esc(f.name.value.trim().split(" ")[0]) + "'s Superhome</h3><dl>" +
        "<dt>Starting with</dt><dd>" + esc(val("plot")) + "</dd>" +
        "<dt>Where</dt><dd>" + esc($("#where").value.trim()) + "</dd>" +
        "<dt>Vibe</dt><dd>" + esc(vibe ? vibe.value : "") + "</dd>" +
        "<dt>Must-haves</dt><dd>" + esc(toys.join(", ") || "Guy's choice") + "</dd>" +
        "<dt>Budget</dt><dd>" + esc(BANDS[+$("#budget").value]) + "</dd></dl></div>";
      show(7); $("#wizFill").style.width = "100%";
    }
    $("#wizAgain").addEventListener("click", function () { f.reset(); $$(".chips button", wiz).forEach(function (x) { x.classList.remove("on"); }); show(1); });
    f.addEventListener("submit", function (e) { e.preventDefault(); go(1); });
    show(1);
  }

  /* ---------- plain brief (stay page) ----------
     Demo: nothing is sent anywhere. */
  var brief = $("#brief");
  if (brief && !wiz) brief.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = brief.name.value.trim();
    $("#briefMsg").textContent = name
      ? "Cheers " + name.split(" ")[0] + ". On the live site this lands straight on Guy's phone."
      : "Pop your name in first.";
  });
})();
