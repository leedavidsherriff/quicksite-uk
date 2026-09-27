(function(){
  var b = document.getElementById('menuBtn'), m = document.getElementById('menu');
  if (b && m){ b.addEventListener('click', function(){ var o = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!o)); m.classList.toggle('open', !o); }); }
  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();

/* Facebook pill: step aside while the home hero's own content (headline, CTAs, picker, stage rail) sits under it */
(function(){
  var fb = document.querySelector('.fbf'), hero = document.querySelector('main .hero, body > .hero, section.hero');
  if (!fb || !hero || !('IntersectionObserver' in window)) return;
  var io;
  function arm(){
    if (io) io.disconnect();
    var r = fb.getBoundingClientRect(), band = Math.max(0, Math.round(window.innerHeight - r.top + 8));   // the strip the pill occupies
    io = new IntersectionObserver(function(es){ fb.classList.toggle('fbf--away', es[0].isIntersecting); },
      { rootMargin: '-' + Math.max(0, window.innerHeight - band) + 'px 0px 0px 0px' });
    io.observe(hero);
  }
  arm(); var t; window.addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(arm, 150); });
})();
