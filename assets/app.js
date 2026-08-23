// Meridiam Maritime — page behaviour
(function () {
  'use strict';

  var filmWatcher;   // kept alive for the lifetime of the page

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

  // Header. Fixed, so it travels with the scroll. Two states:
  //   .over-film — transparent, masthead logo withheld while the film's own
  //                burned-in wordmark is on screen
  //   .compact   — pinned past the film: solid, utility strip collapsed
  (function () {
    var bar = document.querySelector('.topbar');
    var film = document.querySelector('.film');
    if (!bar) return;

    // Narrow screens lay the film out below the bar rather than behind it,
    // so the film needs to know how tall the bar is.
    var setH = function () {
      document.documentElement.style.setProperty(
        '--topbar-h', bar.getBoundingClientRect().height + 'px');
    };
    if (bar.classList.contains('over-film')) setH();
    addEventListener('resize', function () {
      if (bar.classList.contains('over-film')) setH();
    });

    if (!film || !('IntersectionObserver' in window)) {
      bar.classList.remove('over-film');
      return;
    }

    // Held in a variable on purpose: an IntersectionObserver with no live
    // reference can be collected, which silently stops the callbacks.
    // No rootMargin: the swap happens once the film is fully past, not
    // partway through it.
    filmWatcher = new IntersectionObserver(function (entries) {
      var over = entries[entries.length - 1].isIntersecting;
      bar.classList.toggle('over-film', over);
      bar.classList.toggle('compact', !over);
      // Anchor targets clear the pinned bar by its real collapsed height.
      if (!over) {
        document.documentElement.style.setProperty(
          '--topbar-compact-h', bar.getBoundingClientRect().height + 'px');
      }
    }, { threshold: 0 });
    filmWatcher.observe(film);
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
