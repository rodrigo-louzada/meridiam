// Meridiam Maritime — page behaviour
(function () {
  'use strict';

  // Dateline stamp in the utility bar.
  var stamp = document.getElementById('stamp');
  if (stamp) {
    stamp.textContent = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ' · 08:00 CET';
  }

  // Film opener. The poster is a CSS background, so any early return here
  // simply leaves the still frame in place — nothing to clean up.
  (function () {
    var v = document.querySelector('.film-video');
    if (!v) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Respect data-saver and metered/slow connections.
    var c = navigator.connection;
    if (c && (c.saveData || /^(slow-)?2g$/.test(c.effectiveType || ''))) return;

    // 720p for phones, 1080p above. Chosen once — swapping later would
    // re-download the footage.
    var narrow = window.matchMedia('(max-width: 760px)').matches;
    v.src = v.getAttribute(narrow ? 'data-src-narrow' : 'data-src-wide');

    v.addEventListener('playing', function () { v.classList.add('playing'); }, { once: true });
    v.addEventListener('error', function () { v.removeAttribute('src'); });

    var p = v.play();
    // Autoplay can still be refused (iOS Low Power Mode, strict settings).
    if (p && p.catch) p.catch(function () { v.removeAttribute('src'); });
  })();

  // Mobile nav disclosure.
  var toggle = document.getElementById('navtoggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      toggle.setAttribute('aria-expanded', nav.classList.toggle('open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
