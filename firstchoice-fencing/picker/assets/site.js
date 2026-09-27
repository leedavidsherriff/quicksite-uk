(function(){
  var b = document.getElementById('menuBtn'), m = document.getElementById('menu');
  if (b && m){ b.addEventListener('click', function(){ var o = b.getAttribute('aria-expanded') === 'true'; b.setAttribute('aria-expanded', String(!o)); m.classList.toggle('open', !o); }); }
  var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
})();
