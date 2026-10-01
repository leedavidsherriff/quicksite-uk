/* PGM quote builder. Every figure comes from window.PGM_PRICES (build.py).
   Options are gated by job type: a patio never offers bifolds. Nothing is stored
   or sent anywhere except to Jon's phone, by the visitor, at the last step. */
(function () {
  "use strict";
  var P = window.PGM_PRICES, B = window.PGM_BIZ;
  var root = document.getElementById("quote"); if (!root || !P) return;
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var stepsEl = $(".qt__steps"), bar = $(".qt__bar i");
  var E = { num: $("[data-num]"), was: $("[data-was]"), lines: $("[data-lines]"), nudge: $("[data-nudge]") };
  var sayEl = document.getElementById("qt-say");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var money = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };
  var round = function (n) { var q = n < 2000 ? 10 : 50; return Math.round(n / q) * q; };
  var find = function (arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return arr[0]; };

  var JOBS = [
    ["bathroom", "Bathroom", "Full refit or a new shower room"],
    ["boiler", "Boiler & heating", "New boiler, radiators, powerflush"],
    ["extension", "Extension or conversion", "Kitchen extension, garage conversion"],
    ["outdoor", "Patio, wall or garden", "Retaining walls, patios, steps, makeovers"],
    ["repair", "A repair", "Leaks, toilets, taps, the odd bit of rot"],
    ["other", "Something else", "Tell Jon what you need"]
  ];
  var LINES = {
    0: "Right then. What are we pricing?",
    bathroom: "Bathrooms! My favourite. Tell me what you’ve got in mind.",
    boiler: "Making that noise again, is it? Let’s have a look.",
    extension: "More room. Lovely. How big are we thinking?",
    outdoor: "Cardiff gardens: all hills. Let’s sort yours.",
    repair: "What’s broken? Don’t worry, I’ve seen worse.",
    other: "Go on then, surprise me.",
    2: "While I’ve got the van loaded… anything else? Two jobs in one go saves you a few quid.",
    3: "Where’s it to, then?",
    4: "Nearly there. Who am I ringing?",
    5: "There you go. That’s a fair guide, and I’ll firm it up when I’ve had a look. " + B.CATCH
  };
  var ADDS = [
    { id: "boiler", cat: "boiler", label: "A new combi boiler (swap)", lo: P.boiler.type[0].lo, hi: P.boiler.type[0].hi, bundle: true },
    { id: "rads", cat: "boiler", label: "Two extra radiators", lo: 2 * P.boiler.radiator.lo, hi: 2 * P.boiler.radiator.hi, bundle: true },
    { id: "bath", cat: "bathroom", label: "A family bathroom refit (standard)", lo: P.bathroom.size[1].lo, hi: P.bathroom.size[1].hi, bundle: true },
    { id: "patio", cat: "outdoor", label: "A porcelain patio, about 20 m²", lo: 20 * P.outdoor.patio.lo, hi: 20 * P.outdoor.patio.hi, bundle: true },
    { id: "odd", cat: "repair", label: "A couple of hours of odd jobs", lo: P.repair.first.lo + P.repair.hour.lo, hi: P.repair.first.hi + P.repair.hour.hi, bundle: false }
  ];

  var S = { step: 0, job: null, c: null, adds: {}, pc: "", when: "Within the next 3 months", name: "", phone: "", time: "Any time", notes: "" };

  function defCfg(job) {
    switch (job) {
      case "bathroom": return { size: "family", finish: "std", extras: {} };
      case "boiler": return { type: "swap", rads: 0, flush: false };
      case "extension": return { type: "rear", m2: P.extension.type[0].def, extras: {} };
      case "outdoor": return { patio: P.outdoor.patio.def, wall: 0, steps: 0, garden: "none" };
      case "repair": return { hours: 1 };
      default: return {};
    }
  }

  /* price of the main job: {lo, hi, title, bits[]} */
  function calc(job, c) {
    var lo = 0, hi = 0, bits = [], title = "";
    if (job === "bathroom") {
      var s = find(P.bathroom.size, c.size), f = find(P.bathroom.finish, c.finish);
      lo = s.lo * f.x; hi = s.hi * f.x; title = s.label; if (f.id !== "std") bits.push(f.label.toLowerCase());
      P.bathroom.extras.forEach(function (e) { if (c.extras[e.id]) { lo += e.lo; hi += e.hi; bits.push(e.label.toLowerCase()); } });
    } else if (job === "boiler") {
      var t = find(P.boiler.type, c.type); lo = t.lo; hi = t.hi; title = t.label;
      if (c.rads) { lo += c.rads * P.boiler.radiator.lo; hi += c.rads * P.boiler.radiator.hi; bits.push(c.rads + " new radiator" + (c.rads > 1 ? "s" : "")); }
      if (c.flush) { lo += P.boiler.flush.lo; hi += P.boiler.flush.hi; bits.push("powerflush"); }
    } else if (job === "extension") {
      var x = find(P.extension.type, c.type); title = x.label;
      if (x.perm2) { lo = c.m2 * x.lo; hi = c.m2 * x.hi; title += ", about " + c.m2 + " m²"; } else { lo = x.lo; hi = x.hi; }
      P.extension.extras.forEach(function (e) { if (e.only === c.type && c.extras[e.id]) { lo += e.lo; hi += e.hi; bits.push(e.label.toLowerCase()); } });
    } else if (job === "outdoor") {
      var o = P.outdoor, parts = [];
      if (c.patio) { lo += c.patio * o.patio.lo; hi += c.patio * o.patio.hi; parts.push(c.patio + " m² patio"); }
      if (c.wall) { lo += c.wall * o.wall.lo; hi += c.wall * o.wall.hi; parts.push(c.wall + " m of retaining wall"); }
      if (c.steps) { lo += c.steps * o.steps.lo; hi += c.steps * o.steps.hi; parts.push(c.steps + " flight" + (c.steps > 1 ? "s" : "") + " of steps"); }
      var g = find(o.garden, c.garden); if (g.id !== "none") { lo += g.lo; hi += g.hi; parts.push(g.label.toLowerCase()); }
      title = parts.length ? parts.join(", ") : "Nothing picked yet";
      title = title.charAt(0).toUpperCase() + title.slice(1);
    } else if (job === "repair") {
      lo = P.repair.first.lo + (c.hours - 1) * P.repair.hour.lo; hi = P.repair.first.hi + (c.hours - 1) * P.repair.hour.hi;
      title = "Repair, about " + c.hours + " hour" + (c.hours > 1 ? "s" : "");
    }
    return { lo: lo, hi: hi, title: title, bits: bits };
  }

  function total() {
    if (!S.job || S.job === "other") return null;
    var m = calc(S.job, S.c), items = [{ label: m.title + (m.bits.length ? " + " + m.bits.join(", ") : ""), lo: m.lo, hi: m.hi }];
    var eligible = (S.job !== "repair" && m.lo > 0) ? 1 : 0;
    ADDS.forEach(function (a) { if (S.adds[a.id] && a.cat !== S.job) { items.push({ label: a.label, lo: a.lo, hi: a.hi }); if (a.bundle) eligible++; } });
    var lo = 0, hi = 0; items.forEach(function (i) { lo += i.lo; hi += i.hi; });
    var pct = eligible >= 2 ? P.bundle.pct : 0;
    var res = { items: items, rawLo: round(lo), rawHi: round(hi), pct: pct };
    res.lo = round(lo * (1 - pct / 100)); res.hi = round(hi * (1 - pct / 100));
    return res;
  }

  /* ---------- count-up, one rAF at a time ---------- */
  var shown = { lo: 0, hi: 0 }, raf = 0;
  function countTo(lo, hi) {
    cancelAnimationFrame(raf);
    if (reduce) { shown = { lo: lo, hi: hi }; E.num.textContent = money(lo) + " – " + money(hi); return; }
    var from = { lo: shown.lo, hi: shown.hi }, t0 = performance.now(), d = 450;
    (function tick(t) {
      var k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      shown = { lo: from.lo + (lo - from.lo) * e, hi: from.hi + (hi - from.hi) * e };
      E.num.textContent = money(round(shown.lo)) + " – " + money(round(shown.hi));
      if (k < 1) raf = requestAnimationFrame(tick); else { shown = { lo: lo, hi: hi }; E.num.textContent = money(lo) + " – " + money(hi); }
    })(t0);
  }

  function renderEst() {
    var t = total();
    E.lines.innerHTML = ""; E.nudge.hidden = true; E.was.textContent = "";
    if (S.job === "other") { cancelAnimationFrame(raf); E.num.textContent = "Jon will price it"; return; }
    if (!t) { E.num.textContent = "Pick a job"; return; }
    if (t.rawLo === 0) { cancelAnimationFrame(raf); shown = { lo: 0, hi: 0 }; E.num.textContent = "Pick something"; return; }
    countTo(t.lo, t.hi);
    t.items.forEach(function (i) {
      var li = document.createElement("li"); li.innerHTML = "<span>" + esc(i.label) + "</span><span>" + money(round(i.lo)) + "–" + money(round(i.hi)) + "</span>"; E.lines.appendChild(li);
    });
    if (t.pct) {
      E.was.textContent = money(t.rawLo) + " – " + money(t.rawHi) + " on their own";
      var li = document.createElement("li"); li.className = "save";
      li.innerHTML = "<span>" + esc(P.bundle.label) + ": " + t.pct + "% off</span><span>−" + money(t.rawLo - t.lo) + "</span>"; E.lines.appendChild(li);
    } else if (S.step >= 1 && S.job !== "repair") {
      E.nudge.hidden = false;
      E.nudge.textContent = "Add a second job on the next step and Jon knocks " + P.bundle.pct + "% off the lot: " + P.bundle.label.toLowerCase() + ".";
    }
  }

  function say(text) { if (sayEl) sayEl.innerHTML = '<span class="say__who">Jon</span>' + esc(text); }

  /* ---------- steps ---------- */
  function opt(group, val, b, s, on) {
    return '<button type="button" class="opt" data-g="' + group + '" data-v="' + val + '" aria-pressed="' + !!on + '"><b>' + esc(b) + "</b>" + (s ? "<span>" + esc(s) + "</span>" : "") + "</button>";
  }
  function check(group, id, b, s, on) {
    return '<label class="check"><input type="checkbox" data-g="' + group + '" data-v="' + id + '"' + (on ? " checked" : "") + "><div><b>" + esc(b) + "</b>" + (s ? "<span>" + esc(s) + "</span>" : "") + "</div></label>";
  }
  function slider(group, label, min, max, val, unit) {
    return '<div class="field"><label for="sl-' + group + '">' + esc(label) + '</label><div class="slider"><input class="range" id="sl-' + group + '" type="range" min="' + min + '" max="' + max + '" value="' + val + '" data-g="' + group + '"><output>' + val + " " + unit + "</output></div></div>";
  }
  var range = function (x) { return money(x.lo) + "–" + money(x.hi); };

  function stepHTML() {
    var h = "", c = S.c;
    if (S.step === 0) {
      h = "<h2>What’s the job?</h2><div class=\"opts\">" + JOBS.map(function (j) { return opt("job", j[0], j[1], j[2], S.job === j[0]); }).join("") + "</div>";
    } else if (S.step === 1) {
      if (S.job === "bathroom") {
        h = "<h2>Your bathroom</h2><p class=\"muted\">Size</p><div class=\"opts opts--1\">" +
          P.bathroom.size.map(function (s) { return opt("size", s.id, s.label, range(s), c.size === s.id); }).join("") +
          "</div><p class=\"muted\">Finish</p><div class=\"opts\">" +
          P.bathroom.finish.map(function (f) { return opt("finish", f.id, f.label, "", c.finish === f.id); }).join("") +
          "</div><p class=\"muted\">Extras</p>" + P.bathroom.extras.map(function (e) { return check("extras", e.id, e.label, "+" + range(e), c.extras[e.id]); }).join("");
      } else if (S.job === "boiler") {
        h = "<h2>Your heating</h2><div class=\"opts opts--1\">" +
          P.boiler.type.map(function (t) { return opt("type", t.id, t.label, range(t), c.type === t.id); }).join("") + "</div>" +
          slider("rads", "New radiators (" + range(P.boiler.radiator) + " each)", 0, P.boiler.radiator.max, c.rads, "") +
          check("flush", "flush", P.boiler.flush.label, "+" + range(P.boiler.flush) + ". Worth it if your radiators are cold at the bottom", c.flush);
      } else if (S.job === "extension") {
        h = "<h2>Your extension</h2><div class=\"opts\">" +
          P.extension.type.map(function (t) { return opt("type", t.id, t.label, t.perm2 ? range(t) + " per m²" : range(t), c.type === t.id); }).join("") + "</div>";
        if (c.type === "rear") {
          var r = P.extension.type[0];
          h += slider("m2", "Floor area (a 3m × 4m kitchen extension is 12 m²)", r.min, r.max, c.m2, "m²") +
            P.extension.extras.filter(function (e) { return e.only === "rear"; }).map(function (e) { return check("extras", e.id, e.label, "+" + range(e), c.extras[e.id]); }).join("");
        }
        h += "<p class=\"small muted\">Built, roofed, plastered, windows and doors in, ready for your kitchen fitter. Planning and building regs fees are on top.</p>";
      } else if (S.job === "outdoor") {
        var o = P.outdoor;
        h = "<h2>Your garden</h2>" + slider("patio", "Porcelain patio (" + money(o.patio.lo) + "–" + money(o.patio.hi) + " per m²)", 0, o.patio.max, c.patio, "m²") +
          slider("wall", "Retaining wall (" + money(o.wall.lo) + "–" + money(o.wall.hi) + " per metre)", 0, o.wall.max, c.wall, "m") +
          slider("steps", "Flights of steps (" + range(o.steps) + " each)", 0, 4, c.steps, "") +
          "<p class=\"muted\">Full garden makeover?</p><div class=\"opts\">" + o.garden.map(function (g) { return opt("garden", g.id, g.label, g.lo ? range(g) : "", c.garden === g.id); }).join("") + "</div>";
      } else if (S.job === "repair") {
        h = "<h2>Your repair</h2>" + slider("hours", "Roughly how long? (call-out + first hour " + range(P.repair.first) + ", then " + range(P.repair.hour) + " an hour)", 1, P.repair.hour.max, c.hours, "hr") +
          "<p class=\"small muted\">Not sure? Leave it at one hour. Jon will tell you on the phone.</p>";
      }
    } else if (S.step === 2) {
      var list = ADDS.filter(function (a) { return a.cat !== S.job; });
      h = "<h2>Anything else while we’re there?</h2><p class=\"muted\">Two or more jobs in one booking: " + esc(P.bundle.label.toLowerCase()) + ", and " + P.bundle.pct + "% off the lot.</p>" +
        list.map(function (a) { return check("adds", a.id, a.label, "+" + money(a.lo) + "–" + money(a.hi) + (a.bundle ? "" : " (doesn’t count towards the saving)"), S.adds[a.id]); }).join("");
    } else if (S.step === 3) {
      h = "<h2>Where’s the job?</h2><div class=\"field\"><label for=\"q-pc\">Postcode (just the first half is fine)</label><input id=\"q-pc\" data-f=\"pc\" value=\"" + esc(S.pc) + "\" placeholder=\"e.g. CF14\" autocomplete=\"postal-code\" maxlength=\"8\"></div><p class=\"small\" data-pcmsg></p>" +
        "<div class=\"field\"><label for=\"q-when\">When are you hoping to start?</label><select id=\"q-when\" data-f=\"when\">" +
        ["As soon as possible", "Within the next 3 months", "Later this year", "Just getting a feel for prices"].map(function (w) { return "<option" + (w === S.when ? " selected" : "") + ">" + w + "</option>"; }).join("") + "</select></div>";
    } else if (S.step === 4) {
      h = "<h2>Who’s Jon ringing?</h2><div class=\"field\"><label for=\"q-name\">Your name</label><input id=\"q-name\" data-f=\"name\" value=\"" + esc(S.name) + "\" autocomplete=\"given-name\"></div>" +
        "<div class=\"field\"><label for=\"q-phone\">Your number</label><input id=\"q-phone\" type=\"tel\" inputmode=\"tel\" data-f=\"phone\" value=\"" + esc(S.phone) + "\" autocomplete=\"tel\"></div>" +
        "<div class=\"field\"><label for=\"q-time\">Best time to ring</label><select id=\"q-time\" data-f=\"time\">" + ["Any time", "Morning", "Lunchtime", "Afternoon", "After 5pm"].map(function (w) { return "<option" + (w === S.time ? " selected" : "") + ">" + w + "</option>"; }).join("") + "</select></div>" +
        "<div class=\"field\"><label for=\"q-notes\">Anything Jon should know?" + (S.job === "other" ? "" : " <span class=\"muted\">(optional)</span>") + "</label><textarea id=\"q-notes\" data-f=\"notes\" rows=\"3\" placeholder=\"e.g. it’s our only bathroom, there’s a damp patch by the window\">" + esc(S.notes) + "</textarea></div><p class=\"small\" data-err style=\"color:var(--red)\"></p>";
    } else if (S.step === 5) {
      var t = total();
      h = "<div class=\"result\"><h2>Here’s your ballpark, " + esc(S.name) + ".</h2>" +
        (t ? "<p class=\"est__num\">" + money(t.lo) + " – " + money(t.hi) + "</p>" + (t.pct ? "<p class=\"muted\">Includes " + t.pct + "% off for doing it all in one go.</p>" : "") : "<p class=\"lead\">Jon will price this one after a quick chat.</p>") +
        "<p>That’s a guide for a typical Cardiff job. Send it to Jon and he’ll ring you " + esc(S.time === "Any time" ? "back" : "in the " + S.time.toLowerCase().replace("after 5pm", "evening")) + " to book a look. The real price comes in writing after that.</p>" +
        "<div class=\"send\"><button type=\"button\" class=\"gbtn gbtn--onlight gbtn--big\" data-send=\"wa\"><i class=\"gbtn__rim\"></i><span>Send it to Jon on WhatsApp</span></button>" +
        "<button type=\"button\" class=\"btn\" data-send=\"sms\">Send as a text instead</button><a class=\"btn\" href=\"tel:" + B.TEL + "\">Or just ring Jon: " + B.PHONE + "</a></div>" +
        "<p class=\"small muted\" style=\"margin-top:14px\">Nothing is saved on this website. Your message goes from your phone to Jon’s.</p></div>";
    }
    return "<div class=\"qt__step\">" + h + "</div>" + nav();
  }
  function nav() {
    if (S.step === 5) return "<div class=\"qt__nav\"><button type=\"button\" class=\"btn\" data-act=\"back\">← Change something</button></div>";
    var back = S.step > 0 ? "<button type=\"button\" class=\"btn\" data-act=\"back\">← Back</button>" : "<span></span>";
    var nextLabel = S.step === 4 ? "See my price" : "Next";
    var dis = S.step === 0 && !S.job ? " disabled style=\"opacity:.5;pointer-events:none\"" : "";
    return "<div class=\"qt__nav\">" + back + "<button type=\"button\" class=\"gbtn gbtn--onlight\" data-act=\"next\"" + dis + "><i class=\"gbtn__rim\"></i><span>" + nextLabel + " →</span></button></div>";
  }

  function render(focus) {
    stepsEl.innerHTML = stepHTML();
    bar.style.width = Math.round((S.step + 1) / 6 * 100) + "%";
    say(S.step === 1 ? LINES[S.job] : (LINES[S.step] || LINES[0]));
    renderEst();
    if (S.step === 3) pcCheck();
    if (focus) { var h = $(".qt__step h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  }
  function go(n) {
    if (S.job === "other" && (n === 1 || n === 2)) n = n > S.step ? 3 : 0;
    S.step = n; render(true);
    var top = root.getBoundingClientRect().top + scrollY - 90;
    if (Math.abs(scrollY - top) > 200) scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
  }

  function pcCheck() {
    var m = $("[data-pcmsg]"); if (!m) return;
    var pc = S.pc.toUpperCase().replace(/\s+/g, ""), out = (pc.match(/^([A-Z]{1,2}\d{1,2})/) || [])[1];
    if (!out) { m.textContent = ""; return; }
    var cardiff = ["CF3", "CF5", "CF10", "CF11", "CF14", "CF15", "CF23", "CF24"];
    if (cardiff.indexOf(out) > -1 || (out === "CF1" && pc.length <= 3)) m.textContent = "📍 " + out + ": that’s my patch. Lovely.";
    else if (/^CF|^NP10$|^NP11$/.test(out)) m.textContent = "📍 " + out + ": just outside Cardiff, I can usually do that. Mention it when we talk.";
    else m.textContent = "📍 " + out + ": that’s a bit far for me, but send it anyway and I’ll be straight with you.";
  }

  function message() {
    var t = total(), L = ["Hi Jon, I’ve used the price guide on your website."];
    var job = JOBS.filter(function (j) { return j[0] === S.job; })[0];
    if (t) {
      L.push("Job: " + t.items[0].label);
      t.items.slice(1).forEach(function (i) { L.push("Also: " + i.label); });
      L.push("Guide price: " + money(t.lo) + " – " + money(t.hi) + (t.pct ? " (incl. " + t.pct + "% for one visit)" : ""));
    } else L.push("Job: " + (job ? job[1] : "Something else"));
    if (S.pc) L.push("Postcode: " + S.pc.toUpperCase());
    L.push("Start: " + S.when, "Name: " + S.name, "Number: " + S.phone, "Best time to ring: " + S.time);
    if (S.notes) L.push("Notes: " + S.notes);
    return L.join("\n");
  }

  stepsEl.addEventListener("click", function (e) {
    var o = e.target.closest(".opt"), a = e.target.closest("[data-act]"), s = e.target.closest("[data-send]");
    if (o) {
      var g = o.getAttribute("data-g"), v = o.getAttribute("data-v");
      if (g === "job") { if (S.job !== v) { S.job = v; S.c = defCfg(v); S.adds = {}; } render(); return; }
      S.c[g] = v; if (g === "type" && S.job === "extension") S.c.extras = {};
      render(); return;
    }
    if (a) {
      var act = a.getAttribute("data-act");
      if (act === "back") return go(S.step === 5 ? 4 : S.step - 1);
      if (S.step === 0 && !S.job) return;
      if (S.step === 1 && S.job === "outdoor" && calc("outdoor", S.c).lo === 0) { say("You’ll need to pick at least one thing, butt."); return; }
      if (S.step === 4) {
        var err = $("[data-err]");
        if (!S.name.trim()) { err.textContent = "Just need your name."; $("#q-name").focus(); return; }
        if (S.phone.replace(/\D/g, "").length < 10) { err.textContent = "And a phone number Jon can ring."; $("#q-phone").focus(); return; }
        if (S.job === "other" && !S.notes.trim()) { err.textContent = "Tell Jon a bit about the job."; $("#q-notes").focus(); return; }
      }
      return go(S.step + 1);
    }
    if (s) window.PGM_send(message(), s.getAttribute("data-send"));
  });
  stepsEl.addEventListener("change", function (e) {
    var el = e.target, g = el.getAttribute("data-g"), v = el.getAttribute("data-v");
    if (el.type === "checkbox") {
      if (g === "extras") S.c.extras[v] = el.checked;
      else if (g === "flush") S.c.flush = el.checked;
      else if (g === "adds") S.adds[v] = el.checked;
      renderEst();
    }
  });
  stepsEl.addEventListener("input", function (e) {
    var el = e.target, g = el.getAttribute("data-g"), f = el.getAttribute("data-f");
    if (el.type === "range" && g) { S.c[g] = +el.value; var out = el.parentNode.querySelector("output"); out.textContent = el.value + " " + ({ m2: "m²", patio: "m²", wall: "m", hours: "hr" }[g] || ""); renderEst(); }
    if (f) { S[f] = el.value; if (f === "pc") pcCheck(); }
  });

  // deep links: quote.html?job=bathroom
  var q = (location.search.match(/[?&]job=(\w+)/) || [])[1];
  if (q && JOBS.some(function (j) { return j[0] === q; })) { S.job = q; S.c = defCfg(q); S.step = q === "other" ? 3 : 1; }
  render(false);
  window.PGM_quote = { calc: calc, total: total, S: S, ADDS: ADDS };
})();
