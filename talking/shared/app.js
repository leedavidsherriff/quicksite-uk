(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const store = (() => { try { return window.sessionStorage; } catch { return null; } })();
  const S = { job: null, answers: {}, total: 0, muted: (() => { try { return localStorage.getItem('lee.muted') === '1'; } catch { return false; } })(), voice: null, spoke: false, rec: null };
  const app = $('app'), log = $('log'), answers = $('answers');
  const wa = (msg) => `https://wa.me/${BIZ.phone.replace(/\s/g, '').replace(/^0/, '44')}?text=${encodeURIComponent(msg)}`;

  // ---- one bubble for each normal page
  // pose = what Lee does when you point at it (no mirrored poses: his sleeve is on his LEFT arm), line = what he says.
  // Pictures and lines come from the trade (data.js → TRADE).
  const pic = (n) => (TRADE.photos[n % TRADE.photos.length] || {}).after || '../shared/lee/head.webp';
  const L = TRADE.lines;
  const BUBBLES = [
    { label: 'Get a price', img: pic(0), href: 'prices.html', hot: true, pose: 'thumbs', line: 'Two minutes and you’ll have a price.' },
    { label: 'Our work', img: pic(1), href: 'work.html', pose: 'point', line: L.work },
    { label: 'What we do', img: pic(2), href: 'services.html', pose: 'explain', line: L.services },
    { label: 'Reviews', img: TRADE.photos[0]?.before || pic(3), href: 'reviews.html', pose: 'cheer', line: 'Don’t just take my word for it.' },
    { label: 'About us', img: '../shared/lee/head.webp', href: 'about.html', pose: 'arms', line: 'A local firm that turns up when we say.' },
    { label: 'Areas we cover', img: pic(4), href: 'areas.html', pose: 'point', line: 'Bridgend, Cardiff and all round South Wales.' },
    { label: TRADE.survey, img: TRADE.photos[1]?.before || pic(5), href: 'contact.html#survey', pose: 'handshake', line: L.survey },
    { label: 'Contact us', img: '../shared/lee/head.webp', href: 'contact.html', pose: 'phone', line: 'Give us a ring, or drop us a WhatsApp.' },
  ];
  function layoutBubbles() {
    const h = $('home').clientHeight, top = 44, bottom = document.querySelector('.hello').offsetHeight + 24;
    const gap = (h - top - bottom - 30) / 4;
    $('bubbles').innerHTML = BUBBLES.map((b, i) => {
      const side = i % 2 ? 'r' : 'l', y = top + Math.floor(i / 2) * gap + (side === 'r' ? gap * 0.5 : 0);
      return `<a class="bub ${side}${b.hot ? ' hot' : ''}" href="${b.href}" data-i="${i}" style="top:${Math.round(y)}px;animation-delay:${-i * 0.7}s"><img src="${b.img}" alt="">${esc(b.label)}</a>`;
    }).join('');
  }

  // ---- point at a bubble (mouse) or touch it (phone) and Lee strikes its pose and says its line
  const HELLO = $('helloText').textContent, IDLE = 'thumbs';
  let idleTimer;
  function react(b) {
    clearTimeout(idleTimer);
    const it = BUBBLES[b.dataset.i];
    pose(it.pose); $('helloText').textContent = it.line;
    document.querySelectorAll('.bub').forEach((x) => x.classList.toggle('on', x === b));
  }
  function settle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { pose(IDLE); $('helloText').textContent = HELLO; document.querySelectorAll('.bub.on').forEach((x) => x.classList.remove('on')); }, 700);
  }
  $('bubbles').addEventListener('pointerover', (e) => { const b = e.target.closest('.bub'); if (b && e.pointerType === 'mouse') react(b); });
  $('bubbles').addEventListener('pointerout', (e) => { const b = e.target.closest('.bub'); if (b && e.pointerType === 'mouse' && !b.contains(e.relatedTarget)) settle(); });
  $('bubbles').addEventListener('focusin', (e) => { const b = e.target.closest('.bub'); if (b) react(b); });
  $('bubbles').addEventListener('focusout', settle);
  // on a phone there's no hover: the tap shows his pose for a moment, then opens the page
  let touched = false;
  $('bubbles').addEventListener('pointerdown', (e) => { const b = e.target.closest('.bub'); if (b && e.pointerType !== 'mouse') { touched = true; react(b); } });
  $('bubbles').addEventListener('click', (e) => {
    const b = e.target.closest('.bub'); if (!b || !touched) return;
    touched = false; e.preventDefault();
    setTimeout(() => { location.href = b.getAttribute('href'); }, 650);
  });

  // ---- home ⇄ chat
  function openChat() {
    if (!$('chat').hidden) return;
    $('home').hidden = true; $('chat').hidden = false; $('back').hidden = false; $('who').hidden = false; $('brand').hidden = true;
  }
  function goHome() {
    speechSynthesis?.cancel?.(); mode('');
    $('chat').hidden = true; $('home').hidden = false; $('back').hidden = true; $('who').hidden = true; $('brand').hidden = false;
    log.innerHTML = ''; answers.innerHTML = ''; S.job = null; S.answers = {}; S.total = 0;
    pose(IDLE); layoutBubbles();
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
  $('back').addEventListener('click', goHome);

  // ---- his face and voice
  let poseTimer;
  function pose(name, back) {
    clearTimeout(poseTimer);
    document.querySelectorAll('#sway img').forEach((i) => i.classList.toggle('on', i.dataset.pose === name));
    if (back) poseTimer = setTimeout(() => pose('explain'), back);
  }
  function mode(m) {
    app.classList.toggle('talking', m === 'talking');
    $('status').textContent = m === 'talking' ? 'Talking…' : m === 'listening' ? 'Listening…' : 'Here to help';
  }
  function voice() {
    if (S.voice) return S.voice;
    const gb = speechSynthesis.getVoices().filter((v) => /^en[-_]GB$/i.test(v.lang));
    const like = ['Daniel', 'Arthur', 'Oliver', 'Google UK English Male', 'Microsoft Ryan', 'Microsoft George'];
    S.voice = like.map((n) => gb.find((v) => v.name.startsWith(n))).find(Boolean) || gb.find((v) => /male/i.test(v.name) && !/female/i.test(v.name)) || gb[0] || null;
    return S.voice;
  }
  if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { S.voice = null; });
  function speak(text) {
    // He only talks out loud when someone has talked to him (the mic). Taps and typing get text only.
    if (!S.spokenTo || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; const v = voice(); if (v) u.voice = v; u.rate = 1.03;
    u.onstart = () => mode('talking'); u.onend = () => mode(''); u.onerror = () => mode('');
    speechSynthesis.speak(u);
  }
  function unlock() {   // phones only let a page speak after a tap
    if (S.spoke || !('speechSynthesis' in window)) return;
    S.spoke = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch {}
  }

  // ---- the chat
  function add(node) { log.appendChild(node); requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); return node; }
  const me = (t) => add(el('div', 'me', esc(t)));
  const said = (t) => { add(el('div', 'say', esc(t))); speak(t); };
  const setAnswers = (html) => { answers.innerHTML = html; answers.scrollTop = 0; };
  function chips(list) { setAnswers(`<div class="chips">${list.map(([l, a]) => /\.html|^https?:|^tel:/.test(a) ? `<a class="chip" href="${a}"${/^https?:/.test(a) ? ' target="_blank" rel="noopener"' : ''}>${esc(l)}</a>` : `<button class="chip" type="button" data-act="${a}">${esc(l)}</button>`).join('')}</div>`); }

  function pickJob() {
    said('What are you thinking of having done? Tap one, or tell me in your own words.');
    pose('explain');
    setAnswers(`<div class="opts two">${JOBS.map((j) => `<button class="ans" type="button" data-job="${j.id}"><span>${esc(j.label)}</span>${fromPrice(j) ? `<small>from ${money(fromPrice(j))}</small>` : `<small>${esc(TRADE.survey.toLowerCase())}</small>`}</button>`).join('')}</div>`);
  }
  function step() {
    const j = S.job, left = j.q.filter((q) => !(q.id in S.answers));
    if (left.length > S.total) S.total = left.length;
    if (left.length) {
      const q = left[0], n = Object.keys(S.answers).length;
      said((n ? ['Lovely.', 'Got it.', 'Right then.', 'Spot on.'][n % 4] + ' ' : `${j.label}, no problem. `) + q.ask);
      const pct = S.total ? Math.max(6, Math.round(((S.total - left.length) / S.total) * 100)) : 6;
      setAnswers(`<div class="prog"><span>${left.length === 1 ? 'Last question' : `${left.length} questions`} to your price</span><i><b style="width:${pct}%"></b></i></div>
        <div class="opts">${q.o.map((o) => `<button class="ans" type="button" data-q="${q.id}" data-a="${o[0]}"><span>${esc(o[1])}</span>${o[2] ? `<small>${esc(o[2])}</small>` : ''}</button>`).join('')}</div>`);
      return;
    }
    const p = priceFor(j, S.answers);
    if (p.survey) {
      said(`That one I’d need to see first. It’s a ${TRADE.survey.toLowerCase()}, and there’s no obligation.`);
    } else {
      said(`That’s about ${money(p.low)} to ${money(p.high)}. I’d confirm it after a ${TRADE.survey.toLowerCase()}. Want me to book one?`);
      add(el('div', 'card', `<div class="k">${esc(j.label)} · guide price</div><div class="big">${money(p.low)} to ${money(p.high)}</div><p>${esc(j.blurb)}</p><p class="note" style="color:#7a6a4f">A guide for South Wales. We fix the price after a ${esc(TRADE.survey.toLowerCase())}.</p>`));
      pose('thumbs', 3200);
    }
    const summary = `${j.label}${j.q.map((q) => { const o = q.o.find((x) => x[0] === S.answers[q.id]); return o ? `, ${o[1].toLowerCase()}` : ''; }).join('')}${p.survey ? '' : ` (guide ${money(p.low)} to ${money(p.high)})`}`;
    chips([[`Book a ${TRADE.survey.toLowerCase()}`, wa(`Hi Lee, I’d like a ${TRADE.survey.toLowerCase()}: ${summary}.`)], ['See our work', 'work.html'], ['Another job', 'jobs'], ['Ring us', `tel:${BIZ.phone.replace(/\s/g, '')}`]]);
  }

  answers.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    S.spokenTo = false;
    if (b.dataset.job) { S.job = JOBS.find((j) => j.id === b.dataset.job); S.answers = {}; S.total = 0; me(S.job.label); step(); return; }
    if (b.dataset.q) { S.answers[b.dataset.q] = b.dataset.a; me(b.querySelector('span').textContent); step(); return; }
    if (b.dataset.act === 'jobs') { me('Another job'); pickJob(); }
  });

  // typed or spoken words: no AI in the demo, just the words people use for each job
  function heard(text) {
    unlock(); openChat(); me(text);
    const j = matchJob(text);
    if (j) {   // answers they've already said ("a dormer loft", "a large extension") are taken as read
      S.job = j; S.answers = {}; S.total = 0;
      const t = text.toLowerCase(), skip = new Set(['none', 'yes', 'no', 'ready', 'done', 'load', 'light', 'unsure', 'short', 'mid', 'long']);
      for (const q of j.q) { const o = q.o.find((x) => !skip.has(x[0]) && new RegExp(`\\b${x[0]}`).test(t)); if (o) S.answers[q.id] = o[0]; }
      S.total = j.q.length;
      step(); return;
    }
    if (/price|cost|how much|quote/i.test(text)) { pickJob(); return; }
    if (/area|cover|where|near/i.test(text)) { said(`We cover ${BIZ.area}.`); chips([['Areas we cover', 'areas.html'], ['Get a price', 'jobs']]); return; }
    if (/review|good|trust/i.test(text)) { said('Have a look at our work and what people say.'); chips([['Our work', 'work.html'], ['Reviews', 'reviews.html']]); return; }
    said('Good question. Best thing is a quick chat, so drop us a WhatsApp and I’ll come back to you today.');
    pose('think', 2500);
    chips([['WhatsApp Lee', wa(`Hi Lee, ${text}`)], ['Get a price', 'jobs'], ['Contact us', 'contact.html']]);
  }
  $('form').addEventListener('submit', (e) => { e.preventDefault(); S.spokenTo = false; const t = $('text').value.trim(); if (!t) return; $('text').value = ''; heard(t); });

  // the microphone uses the browser's own speech-to-text (Chrome, Safari); no mic, no button
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) $('mic').hidden = true;
  $('mic').addEventListener('click', () => {
    unlock();
    if (S.rec) { S.rec.stop(); return; }
    speechSynthesis?.cancel?.();
    const rec = new SR(); rec.lang = 'en-GB'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => { const t = e.results[0]?.[0]?.transcript; if (t) { S.spokenTo = true; heard(t); } };
    rec.onend = () => { S.rec = null; $('mic').classList.remove('rec'); $('mic').innerHTML = 'Tap to<br>talk'; mode(''); };
    rec.onerror = () => {};
    S.rec = rec; rec.start();
    $('mic').classList.add('rec'); $('mic').innerHTML = 'Listening'; mode('listening');
  });

  layoutBubbles();
  addEventListener('resize', () => { if (!$('home').hidden) layoutBubbles(); });
  setTimeout(() => { if (!document.querySelector('.bub.on')) pose(IDLE); }, 2600);
  if (location.hash === '#quote') { openChat(); pickJob(); }
  else if (location.hash.startsWith('#job-')) { const j = JOBS.find((x) => x.id === location.hash.slice(5)); if (j) { openChat(); S.job = j; me(j.label); step(); } }
})();
