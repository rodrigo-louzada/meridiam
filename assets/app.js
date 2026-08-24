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

  // Film opener. The poster is both a CSS background and the video's own
  // poster attribute, so any early return here simply leaves the still frame
  // in place — nothing to clean up.
  (function () {
    var v = document.querySelector('.film-video');
    if (!v) return;
    var film = v.parentNode;
    var btn = film.querySelector('.film-play');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Respect data-saver and metered/slow connections.
    var c = navigator.connection;
    if (c && (c.saveData || /^(slow-)?2g$/.test(c.effectiveType || ''))) return;

    // Safari needs these as properties, not only as attributes, when the
    // source is assigned from script — otherwise it can judge the element
    // unmuted and refuse to start it inline.
    v.muted = true;
    v.playsInline = true;

    // 720p for phones, 1080p above. Chosen once — swapping later would
    // re-download the footage.
    var narrow = window.matchMedia('(max-width: 760px)').matches;
    var src = v.getAttribute(narrow ? 'data-src-narrow' : 'data-src-wide');
    v.src = src;
    v.load();                        // preload="none" needs the explicit kick

    var armed = false;
    var reloads = 0;                 // bounded, so a genuinely broken file settles

    var onGesture = function () { disarm(); attempt(); };

    // Offer the tap fallback: the poster is on screen and something has to let
    // the viewer past it.
    var arm = function () {
      if (armed) return;
      armed = true;
      film.classList.add('needs-tap');
      // A gesture anywhere counts, so most viewers never have to find the
      // button. Passive: this never calls preventDefault.
      document.addEventListener('touchend', onGesture, { passive: true });
      document.addEventListener('click', onGesture);
    };

    var disarm = function () {
      armed = false;
      film.classList.remove('needs-tap');
      document.removeEventListener('touchend', onGesture);
      document.removeEventListener('click', onGesture);
    };

    var attempt = function () {
      // An element that failed to load will not play again until it is given a
      // fresh source. A phone losing signal mid-download is ordinary, so this
      // is worth a couple of goes before giving up on the footage entirely.
      if (v.error) {
        if (reloads >= 2) { disarm(); return; }
        reloads++;
        v.src = src;
        v.load();
      }
      var p = v.play();
      if (!p || !p.catch) return;
      // Any rejection at all, not just NotAllowedError. Low Power Mode refuses
      // autoplay with NotAllowedError, but WebKit also rejects a pending play
      // with AbortError whenever it drops or reloads the media — on slow
      // cellular, on backgrounding the tab, on a power-mode change. Returning
      // silently there stranded the viewer on a still frame with no way out.
      p.catch(arm);
    };

    v.addEventListener('playing', disarm);
    v.addEventListener('error', arm);
    // If the first attempt simply lost a race with the network, the source
    // becoming ready is another chance — taken without needing a gesture.
    v.addEventListener('canplay', function () { if (armed) onGesture(); });

    if (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); onGesture(); });
    }

    attempt();
  })();

  // Header. Fixed, so it travels with the scroll. Two states:
  //   .over-film — transparent, masthead logo withheld while the film's own
  //                burned-in wordmark is on screen
  //   .compact   — pinned past the film: solid, utility strip collapsed
  (function () {
    var bar = document.querySelector('.topbar');
    var film = document.querySelector('.film');
    if (!bar) return;

    // The collapsed height is needed up front: it sets both the anchor
    // offset and the point at which the bar takes over from the film.
    // Measured by applying .compact synchronously with transitions off, so
    // nothing is painted and nothing animates.
    var root = document.documentElement;
    var measureCompactH = function () {
      var wasOver = bar.classList.contains('over-film');
      var wasCompact = bar.classList.contains('compact');
      root.classList.add('no-transition');
      bar.classList.remove('over-film');
      bar.classList.add('compact');
      var h = bar.getBoundingClientRect().height;
      bar.classList.toggle('compact', wasCompact);
      bar.classList.toggle('over-film', wasOver);
      void bar.offsetHeight;                       // commit before re-enabling
      root.classList.remove('no-transition');
      return h;
    };
    var compactH = measureCompactH();
    var syncCompactH = function () {
      root.style.setProperty('--topbar-compact-h', compactH + 'px');
    };
    syncCompactH();
    var remeasure = function () {
      compactH = measureCompactH();
      syncCompactH();
      build();                                     // trigger point moves with it
    };

    if (!film || !('IntersectionObserver' in window)) {
      bar.classList.remove('over-film');
      return;
    }

    // Hand over exactly when the collapsed bar would cover whatever film is
    // still showing: shrinking the root by that height makes the film stop
    // intersecting at the moment its last visible strip fits behind the bar.
    // Held in a variable on purpose - an IntersectionObserver with no live
    // reference can be collected, which silently stops the callbacks.
    var build = function () {
      if (filmWatcher) filmWatcher.disconnect();
      filmWatcher = new IntersectionObserver(function (entries) {
        var over = entries[entries.length - 1].isIntersecting;
        bar.classList.toggle('over-film', over);
        bar.classList.toggle('compact', !over);
      }, { rootMargin: -Math.round(compactH) + 'px 0px 0px 0px', threshold: 0 });
      filmWatcher.observe(film);
    };
    build();
    addEventListener('resize', remeasure);
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
