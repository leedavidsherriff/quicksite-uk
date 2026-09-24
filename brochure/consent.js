/* Cookie consent + Meta pixel. build.py copies this into the site as consent.js
   and fills in 1624852022599041. The pixel script is never requested until the
   visitor presses Accept. Before then nothing from Meta loads and no cookie is set.
   The only thing stored is the choice itself (localStorage "qs-consent"), which is
   strictly necessary so we don't ask on every page.
   With no pixel ID configured, this file does nothing: no banner, no settings link. */
(function(){
  var ID = '1624852022599041', KEY = 'qs-consent';
  if (!/^\d{6,20}$/.test(ID)) return;

  function get(){ try { return localStorage.getItem(KEY); } catch(e) { return null; } }
  function put(v){ try { localStorage.setItem(KEY, v); } catch(e) {} }

  function loadPixel(){
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', ID);
    fbq('track', 'PageView');
  }

  /* Meta's first-party cookies, cleared if someone changes their mind. */
  function clearMeta(){
    var h = location.hostname;
    ['_fbp', '_fbc'].forEach(function(n){
      ['', '; domain=' + h, '; domain=.' + h].forEach(function(d){
        document.cookie = n + '=; Max-Age=0; path=/' + d;
      });
    });
  }

  var css = '#qs-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;'
    + 'background:#fff;color:#0F172A;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.22);'
    + 'padding:18px 18px 16px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
    + '#qs-consent p{margin:0 0 14px}#qs-consent a{color:#0F172A;font-weight:600}'
    + '#qs-consent .qs-row{display:flex;gap:10px}'
    + '#qs-consent button{flex:1 1 0;min-height:46px;border:0;border-radius:10px;background:#0F172A;color:#fff;'
    + 'font:700 16px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer}'
    + '#qs-consent button:focus-visible{outline:3px solid #F26F21;outline-offset:2px}'
    + '[data-cookie-settings]{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;text-align:left}';

  function banner(){
    if (document.getElementById('qs-consent')) return;
    var cookies = (document.querySelector('a[href$="cookies.html"]') || {}).href || 'cookies.html';
    var box = document.createElement('div');
    box.id = 'qs-consent';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Cookie choice');
    box.innerHTML = '<p>Can we use a cookie to measure our adverts? If you say yes, Meta’s pixel records that you visited, '
      + 'so we can tell which Facebook and Instagram ads work. Say no and it never loads. '
      + '<a href="' + cookies + '">More on cookies</a></p>'
      + '<div class="qs-row"><button type="button" data-choice="granted">Accept</button>'
      + '<button type="button" data-choice="denied">No thanks</button></div>';
    box.addEventListener('click', function(e){
      var c = e.target.getAttribute && e.target.getAttribute('data-choice');
      if (!c) return;
      var had = !!window.fbq;
      put(c);
      box.parentNode.removeChild(box);
      if (c === 'granted') { loadPixel(); return; }
      clearMeta();
      if (had) location.reload();   // the only way to unload a script that already ran
    });
    document.body.appendChild(box);
  }

  function start(){
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    [].forEach.call(document.querySelectorAll('[data-cookie-settings-wrap]'), function(w){ w.hidden = false; });
    [].forEach.call(document.querySelectorAll('[data-cookie-settings]'), function(b){
      b.hidden = false;
      b.addEventListener('click', banner);
    });
    var c = get();
    if (c === 'granted') loadPixel();
    else if (c !== 'denied') banner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
