/* Every autoplay clip starts at opacity:0 (fcf.css) and is revealed only once it is actually playing.
   A clip that has never played after 4s is taken out of the render and its poster shown instead,
   so a refused clip degrades to a still, never to a play button or a dark hole.
   The hero player (picker.js) manages its own clip; this covers it too, harmlessly. */
(function(){
  function bind(v){
    if (v.__rv) return; v.__rv = true;
    v.muted = true; v.setAttribute('muted', '');
    var on = function(){ v.__everPlayed = true; v.classList.add('is-playing'); };
    v.addEventListener('playing', on);
    if (!v.paused && v.readyState > 2) on();
    if (v.id === 'heroVideo') return;
    setTimeout(function(){
      if (v.__everPlayed || !v.getAttribute('poster')) return;
      var d = document.createElement('div'); d.className = 'noplay-still';
      d.style.backgroundImage = "url('" + v.getAttribute('poster') + "')";
      v.parentElement.insertBefore(d, v); v.style.display = 'none';
    }, 4000);
  }
  document.querySelectorAll('video').forEach(bind);
})();
