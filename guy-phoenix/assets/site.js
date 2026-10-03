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
    var send = $("#specSend"), dream = $("#dream");
    send.onclick = function () {
      if (dream) dream.value = "About " + s.toLocaleString("en-GB") + " sq ft with: " + (picked.join(", ") || "no toys yet") +
        ". Guide " + money(lo) + " to " + money(hi) + ".";
    };
  }
  if (sqft) {
    sqft.addEventListener("input", calc);
    $$(".spec__chips input").forEach(function (c) { c.addEventListener("change", calc); });
    calc();
  }

  /* ---------- Monaco count ---------- */
  // (static "3": the number is the point, not the animation)

  /* ---------- brief ----------
     Demo: nothing is sent anywhere. On Guy's live site this goes to his WhatsApp. */
  var brief = $("#brief");
  if (brief) brief.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = brief.name.value.trim();
    $("#briefMsg").textContent = name
      ? "Cheers " + name.split(" ")[0] + ". On the live site this lands straight on Guy's phone."
      : "Pop your name in first.";
  });
})();
