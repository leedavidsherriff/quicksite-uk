(function(){
  var b = document.getElementById('menuBtn'), m = document.getElementById('menu');
  if (b && m){ b.addEventListener('click', function(){ var o = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!o)); m.classList.toggle('open', !o); }); }
  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();

/* Facebook pill: step aside while the home hero, or any in-page call/price CTA row, passes through the strip it sits in */
(function(){
  var fb = document.querySelector('.fbf');
  var els = [].slice.call(document.querySelectorAll('section.hero, .hero-cta'));
  if (!fb || !els.length || !('IntersectionObserver' in window)) return;
  var io, on = new Set();
  function arm(){
    if (io) io.disconnect(); on.clear();
    var r = fb.getBoundingClientRect(), band = Math.max(0, Math.round(window.innerHeight - r.top + 8));
    io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) on.add(e.target); else on.delete(e.target); });
      fb.classList.toggle('fbf--away', on.size > 0);
    }, { rootMargin: '-' + Math.max(0, window.innerHeight - band) + 'px 0px 0px 0px' });
    els.forEach(function(el){ io.observe(el); });
  }
  arm(); var t; window.addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(arm, 150); });
})();

/* Facebook pill: ~4s after it first shows, shrink to the round "f" badge for the rest of the page view
   (hover / keyboard focus expands it again via CSS; a tap on touch just follows the link) */
(function(){
  var fb = document.querySelector('.fbf'); if (!fb) return;
  var t = null, done = false, mo;
  function shown(){ return !fb.classList.contains('fbf--away') && getComputedStyle(fb).visibility !== 'hidden'; }
  function check(){
    if (done) return;
    if (shown()) { if (!t) t = setTimeout(function(){ done = true; fb.classList.add('fbf--mini'); if (mo) mo.disconnect(); }, 4000); }
    else if (t) { clearTimeout(t); t = null; }
  }
  if ('MutationObserver' in window) { mo = new MutationObserver(check); mo.observe(fb, { attributes: true, attributeFilter: ['class'] }); }
  check();
})();
