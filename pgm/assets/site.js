/* PGM Construction — shared behaviour. No libraries, no trackers, nothing stored. */
(function () {
  "use strict";
  var B = window.PGM_BIZ || {}, P = window.PGM_PRICES || {};
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- nav ---------- */
  var burger = $(".burger"), nav = $("#nav");
  if (burger && nav) burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open); nav.classList.toggle("open", open);
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$(".rv, .jon--in, .say-in");
  if (!("IntersectionObserver" in window) || reduce) revealEls.forEach(function (el) { el.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Jon's transparent loop ----------
     Safari/iOS get HEVC-with-alpha (.mov), everything else VP9-with-alpha (.webm):
     Safari plays WebM but drops the alpha, Chrome plays HEVC but drops the alpha.
     The clip is invisible until it is genuinely playing; if it can't play it is
     removed and the still (its own first frame) stays. Never a play button. */
  var ua = navigator.userAgent;
  var webkitOnly = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ||
    (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua));
  $$(".jon[data-webm]").forEach(function (fig) {
    if (reduce) return;
    var src = webkitOnly ? fig.getAttribute("data-hevc") : fig.getAttribute("data-webm");
    var v = document.createElement("video");
    v.className = "jon__clip";
    v.setAttribute("muted", ""); v.muted = true; v.defaultMuted = true;
    v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    v.setAttribute("loop", ""); v.setAttribute("preload", "auto");
    v.setAttribute("aria-hidden", "true"); v.setAttribute("disablepictureinpicture", "");
    v.setAttribute("disableremoteplayback", "");
    v.src = src;
    var everPlayed = false, killed = false;
    function kill() { if (everPlayed || killed) return; killed = true; v.pause(); v.remove(); fig.classList.remove("has-clip", "clip-on"); }
    v.addEventListener("playing", function () { everPlayed = true; v.classList.add("is-playing"); fig.classList.add("clip-on"); });
    v.addEventListener("error", kill);
    fig.classList.add("has-clip");
    fig.appendChild(v);
    // Only judge a clip once the page is visible and Jon is on screen: a
    // background tab never autoplays, and that must not cost the visitor the clip.
    var inView = false, timer = 0;
    function tryPlay() {
      if (killed || document.hidden || !inView) return;
      if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 6000);
      var p = v.play(); if (p && p.catch) p.catch(function () { if (!document.hidden) kill(); });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { inView = e.isIntersecting; if (killed) return; if (inView) tryPlay(); else if (everPlayed) v.pause(); });
      }, { threshold: 0.2 }).observe(fig);
    } else { inView = true; tryPlay(); }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!everPlayed) { clearTimeout(timer); timer = 0; } return; }
      tryPlay();
    });
  });

  /* ---------- films: reused Seedance transformations ----------
     Loaded only when on screen, shown only once genuinely playing, paused off
     screen. Near the end the clip fades to its poster (= its first frame), so the
     loop back to "before" is a crossfade, not a jump. If it can't play, the video
     is removed and the poster stays — never a play button. */
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
      v.addEventListener("timeupdate", function () {
        if (!v.duration) return;
        v.classList.toggle("is-fading", v.currentTime > v.duration - 0.6 || v.currentTime < 0.15);
      });
      box.appendChild(v);
    }
    function tryPlay() {
      if (killed || document.hidden || !inView) return;
      if (!v) make();
      if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 8000);
      var p = v.play(); if (p && p.catch) p.catch(function () { if (!document.hidden) kill(); });
    }
    if (!("IntersectionObserver" in window)) { inView = true; return tryPlay(); }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { inView = e.isIntersecting; if (killed) return; if (inView) tryPlay(); else if (v && everPlayed) v.pause(); });
    }, { rootMargin: "120px 0px", threshold: 0.15 }).observe(box);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!everPlayed) { clearTimeout(timer); timer = 0; } return; }
      tryPlay();
    });
  });

  /* ---------- a little hop when you tap Jon ---------- */
  $$(".jon[data-hop]").forEach(function (fig) {
    fig.addEventListener("click", function () {
      if (reduce) return;
      fig.classList.remove("hop"); void fig.offsetWidth; fig.classList.add("hop");
    });
    fig.addEventListener("animationend", function () { fig.classList.remove("hop"); });
  });

  /* ---------- put-it-off-o-meter ---------- */
  var LINES = {
    damp: ["Good on you for catching it early. Damp’s a lot cheaper when someone finds the cause quickly.",
      "A few months? That damp patch isn’t going to fix itself, is it?",
      "Over a year? It’s not a damp patch any more, it’s a lodger. Let’s find where it’s getting in.",
      "Since lockdown? Put the kettle on and ring me. I’m not cross, just disappointed."],
    tap: ["A new washer or cartridge and you’ll never hear it again. Easy one.",
      "You’ve stopped hearing it, haven’t you? Your water bill hasn’t.",
      "A year of drip, drip, drip. That’s a lot of water down the plughole for a twenty-minute job.",
      "That drip’s been going so long it’s got its own postcode. Let’s sort it."],
    boiler: ["Banging, gurgling or whistling? Tell me which and I’ll tell you what it probably is.",
      "Making that noise for months and you’ve just turned the telly up, haven’t you?",
      "A year of noises and it’s still going? It’s not brave, it’s tired. Better sorted before winter than during it.",
      "Since lockdown? Let’s look at it before it picks the coldest night of the year to give up."],
    bathroom: ["Fancy a change? Good. Let’s see what fits.",
      "Months of saving pictures and the old suite’s still there. Don’t worry, I’ve seen worse.",
      "A year? You’ve earned a new bathroom. About a week of us and it’s done.",
      "If the bath’s older than your kids, it’s time. " + (B.CATCH || "")],
    wall: ["A crack in a garden wall is worth a look while it’s small. Usually a simple fix.",
      "Is it getting wider? Pencil a mark at each end and check it in a week. Then ring me anyway.",
      "A wall that’s been leaning for a year is still leaning. It’s just doing it slowly.",
      "Retaining walls hold back a lot of earth. Let’s not wait to find out how much."],
    patio: ["One wobbly slab is an easy fix. It’s the trip to A&E I’m worried about.",
      "You’ve learned to step over it, haven’t you? Your visitors haven’t.",
      "A year of ‘mind that slab’. Let’s lift it, bed it, done.",
      "That slab’s been wobbling so long it’s part of the family. Time to let it go."]
  };
  var meter = $("#meter");
  if (meter) {
    var prob = "damp", range = $("#putoff", meter), out = $(".meter__line", meter);
    var say = function () { out.textContent = LINES[prob][+range.value]; };
    $$(".chip", meter).forEach(function (c) {
      c.addEventListener("click", function () {
        $$(".chip", meter).forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
        prob = c.getAttribute("data-p"); say();
      });
    });
    range.addEventListener("input", say);
  }

  /* ---------- before / after ---------- */
  $$(".ba").forEach(function (ba) {
    var r = $("input", ba); if (!r) return;
    var set = function () { ba.style.setProperty("--cut", r.value + "%"); };
    r.addEventListener("input", set); set();
  });

  /* ---------- hand-off to Jon's phone (nothing is stored here) ---------- */
  function sendToJon(text, via) {
    var t = encodeURIComponent(text);
    location.href = via === "sms" ? "sms:" + B.TEL + "?&body=" + t : "https://wa.me/" + B.WA + "?text=" + t;
  }
  window.PGM_send = sendToJon;

  var cb = $("#cb-form");
  if (cb) cb.addEventListener("submit", function (e) {
    e.preventDefault();
    var via = (e.submitter && e.submitter.getAttribute("data-via")) || "wa";
    var name = $("#cb-name").value.trim(), phone = $("#cb-phone").value.trim();
    var msg = $("[data-cb-msg]", cb);
    if (!name || phone.replace(/\D/g, "").length < 10) {
      msg.hidden = false; msg.textContent = "Just need your name and a phone number so Jon can ring you back.";
      (!name ? $("#cb-name") : $("#cb-phone")).focus(); return;
    }
    msg.hidden = true;
    var what = $("#cb-what").value.trim();
    sendToJon("Hi Jon, please could you give me a call back.\nName: " + name + "\nNumber: " + phone +
      "\nBest time: " + $("#cb-time").value + (what ? "\nAbout: " + what : "") + "\n(sent from the PGM website)", via);
  });

  /* ---------- Ask Jon ---------- */
  var fab = $(".askjon"), chat = $("#chat");
  if (!fab || !chat) return;
  var log = $(".chat__log", chat), chips = $(".chat__chips", chat), form = $(".chat__form", chat), input = $("#chat-in");
  var started = false;
  var b = P.bathroom, bo = P.boiler, ex = P.extension, o = P.outdoor, rp = P.repair;
  var r = function (x) { return money(x.lo) + "–" + money(x.hi); };
  var tel = '<a href="tel:' + B.TEL + '">' + B.PHONE + "</a>";
  var A = {
    hello: "Alright! Jon here. Ask me anything: rough prices, how long a job takes, how much mess. Or tap one of these. " + B.CATCH,
    what: "Bathrooms (my favourite), boilers and radiators, extensions and garage conversions, garden walls, patios and makeovers, and repairs: leaks, toilets, taps, the odd soggy floor. Landlords too. <a href=\"services.html\">Everything’s on the Services page.</a>",
    price: "Ballpark, for a typical Cardiff job:<br>• Bathroom: " + r(b.size[1]) + "<br>• Combi boiler swap: " + r(bo.type[0]) +
      "<br>• Patio: " + money(o.patio.lo) + "–" + money(o.patio.hi) + " a m²<br>• Call-out + first hour: " + r(rp.first) +
      "<br>For your job, <a href=\"quote.html\">the quote page</a> works it out in two minutes. I firm it up after a look, in writing.",
    long: "Roughly: boiler swap, a day. Bathroom, about a week. Patio, 3 to 5 days. Single-storey extension, 10 to 14 weeks. You get start and finish dates in writing.",
    mess: "Honest answer? Some. It’s building work. But dust sheets go down first, dusty rooms get sealed off, and we sweep up every evening, not just on the last day. The first two days of a bathroom are the noisy bit: that’s the old one coming out.",
    move: "Almost never. Bathroom: you’re without it for about a week, so tell me if it’s your only loo and we’ll plan round it. Extension: the kitchen’s out for a couple of weeks around the knock-through. Boiler: no hot water for a day. That’s it.",
    surprise: "If I find something nasty, rotten joists under the floor, say, I show you before it’s fixed and you get the price first. Nothing goes on the bill you didn’t say yes to.",
    area: "I’m in Rhiwbina and work all over Cardiff: Whitchurch, Llanishen, the Heath, Llandaff, Radyr, Pontprennau, Roath, Canton, the lot. Just outside? Ring anyway: " + tel + ".",
    quote: "Easiest way: <a href=\"quote.html\">the quote page</a> gives you a guide price in two minutes, then you send it to me. Or ring " + tel + ".",
    call: "Ring me on " + tel + ". If I’m up a ladder, <a href=\"contact.html#callback\">ask for a call-back</a> and I’ll ring you when it suits.",
    bathroom: "Bathrooms are my favourite. A full refit is usually about a week. Guide prices: shower room " + r(b.size[0]) + ", family bathroom " + r(b.size[1]) + ", bigger layouts " + r(b.size[2]) + ". <a href=\"quote.html\">Price yours here.</a>",
    boiler: "New combi swap " + r(bo.type[0]) + ", tank-in-the-loft to combi " + r(bo.type[1]) + ", extra radiators " + r(bo.radiator) + " each. A swap is done in a day. If yours is making noises, don’t wait for January.",
    extension: "Single-storey extensions run about " + money(ex.type[0].lo) + "–" + money(ex.type[0].hi) + " a m² built and plastered, so a 3 × 4m kitchen extension is around " + money(ex.type[0].lo * 12) + "–" + money(ex.type[0].hi * 12) + ". Garage conversions " + r(ex.type[1]) + ". I’ll tell you straight what planning you need.",
    outdoor: "Porcelain patio " + money(o.patio.lo) + "–" + money(o.patio.hi) + " a m², retaining walls " + money(o.wall.lo) + "–" + money(o.wall.hi) + " a metre run. Lots of Cardiff gardens are on a hill, so walls are a big part of what we do outside.",
    repair: "Call-out and first hour " + r(rp.first) + ", then " + money(rp.hour.lo) + "–" + money(rp.hour.hi) + " an hour. If it turns out bigger, you get the price before I carry on.",
    damp: "That damp patch isn’t going to fix itself, is it? Could be a leak, a gutter, bad pointing or no airflow. I’ll find the cause first; no point painting over it.",
    putoff: "How long’s it been bugging you? Be honest. Go on, <a href=\"index.html#meter\">try the put-it-off-o-meter</a>, then ring me.",
    thanks: "No bother at all. " + B.CATCH,
    insure: "Good question, and you should ask it of any builder. Ask me on the first visit and I’ll go through it all with you.",
    unknown: "You’ve stumped me there. Best thing is to ring me on " + tel + " and I’ll answer it properly."
  };
  var CHIPS = [["What do you do?", "what"], ["Rough prices?", "price"], ["How long?", "long"], ["How much mess?", "mess"],
    ["Will I need to move out?", "move"], ["What if you find a problem?", "surprise"], ["Do you cover my area?", "area"], ["Get a quote", "quote"]];
  var KEYS = [
    ["thanks", /\b(thank|thanks|cheers|ta|diolch|lush)\b/], ["move", /move out|stay|live (in|at)|sleep|hotel|without (a )?(toilet|loo|kitchen|bath)/],
    ["mess", /mess|dust|dirty|clean|tidy|noise|noisy/], ["long", /how long|weeks?|days?|time|quick|when can|start/],
    ["surprise", /surprise|extra|hidden|unexpected|find (a|something)|rot|joist/], ["area", /area|cover|where|postcode|cf\d|penarth|caerphilly|near|location/],
    ["insure", /insur|guarantee|warrant|certif|qualified|gas safe|registered/],
    ["damp", /damp|mould|mold|condensation|wet wall/], ["putoff", /put(ting)? (it )?off|ages|years?|ignor/],
    ["bathroom", /bath|shower|toilet suite|en-?suite|wet ?room|tiling|tiles/], ["boiler", /boiler|heating|radiator|rad\b|combi|hot water|powerflush/],
    ["extension", /extension|extend|conversion|garage|knock|loft|planning/], ["outdoor", /patio|wall|garden|steps|slab|landscap|driveway/],
    ["repair", /leak|drip|tap|toilet|loo|repair|fix|broken|blocked|call.?out|emergency|floorboard/],
    ["price", /price|cost|how much|£|quote|cheap|expensive|ballpark|rate/], ["call", /call|ring|phone|number|contact|speak|talk/],
    ["what", /what do you|services|what can|do you do/]
  ];
  function add(html, who) {
    var m = document.createElement("div"); m.className = "msg msg--" + who;
    if (who === "me") m.textContent = html; else m.innerHTML = html;
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }
  function jonSays(key) {
    var t = add("Jon’s typing…", "jon"); t.classList.add("msg--typing");
    setTimeout(function () { t.classList.remove("msg--typing"); t.innerHTML = A[key] || A.unknown; log.scrollTop = log.scrollHeight; }, reduce ? 0 : 550);
  }
  function answer(q) {
    var s = q.toLowerCase();
    for (var i = 0; i < KEYS.length; i++) if (KEYS[i][1].test(s)) return jonSays(KEYS[i][0]);
    jonSays("unknown");
  }
  CHIPS.forEach(function (c) {
    var btn = document.createElement("button"); btn.type = "button"; btn.textContent = c[0];
    btn.addEventListener("click", function () { add(c[0], "me"); jonSays(c[1]); });
    chips.appendChild(btn);
  });
  function open() {
    chat.hidden = false; fab.setAttribute("aria-expanded", "true"); fab.classList.remove("nudge-on");
    if (!started) { started = true; jonSays("hello"); }
    if (matchMedia("(min-width: 861px)").matches) input.focus();
  }
  function close() { chat.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.focus(); }
  fab.addEventListener("click", open);
  $(".chat__x", chat).addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !chat.hidden) close(); });
  form.addEventListener("submit", function (e) {
    e.preventDefault(); var q = input.value.trim(); if (!q) return;
    add(q, "me"); input.value = ""; answer(q);
  });
  setTimeout(function () { if (!started) fab.classList.add("nudge-on"); }, 9000);
})();
