// Meridiam Maritime — page behaviour
(function () {
  'use strict';

  var filmWatcher;   // kept alive for the lifetime of the page

  // Opening the site should open on the film. Browsers restore the scroll
  // position of the last visit by default, so anyone reloading or reopening
  // the tab landed in the middle of the page instead — the one thing an
  // opener exists to prevent. Deliberate deep links are untouched: a URL
  // carrying a #fragment still goes to its section.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Open positions. The rows come from a Google Sheet the desk keeps, published
  // as CSV, so the list is edited in a spreadsheet rather than in this file.
  // The rows already in the page are the fallback: if the sheet is unreachable,
  // unpublished or malformed, the board stays standing rather than emptying.
  var SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTN_Jn2AUxQwICZ8RPfvzbvBDXUQMhZH1GUXuNUeRXxXGGmlYmYmMHY3AdpWu2-C5x7vf_ThoJSU1cE/pub?gid=0&single=true&output=csv';

  (function () {
    var host = document.getElementById('fleet-rows');
    if (!host || !window.fetch) return;

    // A real CSV reader, not a split on commas: a vessel name or a position can
    // contain one, and the sheet quotes those fields. Doubled quotes inside a
    // quoted field are a single literal quote.
    var parseCSV = function (text) {
      var rows = [], row = [], field = '', quoted = false, i = 0;
      text = text.replace(/^\uFEFF/, '');            // Excel-style byte order mark
      for (; i < text.length; i++) {
        var c = text[i];
        if (quoted) {
          if (c === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
          } else { field += c; }
        } else if (c === '"') { quoted = true;
        } else if (c === ',') { row.push(field); field = '';
        } else if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          row.push(field); field = '';
          rows.push(row); row = [];
        } else { field += c; }
      }
      if (field !== '' || row.length) { row.push(field); rows.push(row); }
      return rows;
    };

    // Headings are matched with accents and case stripped, so "Posição",
    // "posicao" and "POSIÇÃO" are all the same column.
    var norm = function (s) {
      s = String(s == null ? '' : s).trim().toLowerCase();
      return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s;
    };

    // Columns are found by their heading rather than their position, so
    // reordering them in the sheet is harmless. English names accepted too.
    var KEYS = {
      name:  ['navio', 'vessel', 'nome'],
      dwcc:  ['dwcc', 'dwt'],
      open:  ['posicao', 'open', 'position'],
      dates: ['datas', 'dates', 'laycan'],
      pdf:   ['pdf', 'ficheiro', 'documento', 'details']
    };

    var indexOfHeading = function (head, names) {
      for (var i = 0; i < head.length; i++) {
        var h = norm(head[i]);
        for (var j = 0; j < names.length; j++) if (h === names[j]) return i;
      }
      return -1;
    };

    var toVessels = function (rows) {
      if (!rows.length) return [];
      var head = rows[0], at = {};
      for (var k in KEYS) at[k] = indexOfHeading(head, KEYS[k]);
      if (at.name < 0) return [];                    // not the sheet we expect
      var out = [];
      for (var r = 1; r < rows.length; r++) {
        var get = function (k) { return at[k] >= 0 ? (rows[r][at[k]] || '').trim() : ''; };
        if (!get('name')) continue;                  // blank line in the sheet
        out.push({ name: get('name'), dwcc: get('dwcc'), open: get('open'),
                   dates: get('dates'), pdf: get('pdf') });
      }
      return out;
    };

    // A tonnage typed as a bare number reads better with a thousands separator.
    // Anything else is left exactly as the desk wrote it.
    var tonnage = function (s) {
      return /^\d{4,}$/.test(s) ? Number(s).toLocaleString('en-GB') : s;
    };

    // Drive's own "share" link opens its preview page. The desk pastes that,
    // because it is what the Copy link button gives them, so the file id is
    // pulled out and rewritten as the direct download. Any other address is
    // left alone, so a PDF hosted elsewhere still works.
    var directDownload = function (url) {
      var m = /drive\.google\.com\/(?:file\/d\/([\w-]+)|(?:open|uc)\?[^#]*\bid=([\w-]+))/.exec(url);
      var id = m && (m[1] || m[2]);
      return id ? 'https://drive.google.com/uc?export=download&id=' + id : url;
    };

    var cell = function (text, cls) {
      var s = document.createElement('span');
      if (cls) s.className = cls;
      s.textContent = text == null ? '' : String(text);   // never parsed as markup
      return s;
    };

    var row = function (v) {
      var r = document.createElement('div');
      r.className = 'prow';
      r.appendChild(cell(v.name, 'v'));
      r.appendChild(cell(tonnage(v.dwcc)));
      r.appendChild(cell(v.open));
      // "Prompt" is the one value worth picking out of the column.
      r.appendChild(cell(v.dates, /^\s*prompt\s*$/i.test(v.dates || '') ? 'flag' : null));

      var last = document.createElement('span');
      last.className = 'pdf';
      // Only http(s). A stray value in the sheet must never become a javascript:
      // or data: link, whatever someone pastes into the column.
      if (/^https?:\/\//i.test(v.pdf)) {
        var a = document.createElement('a');
        a.href = directDownload(v.pdf);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'PDF';
        a.setAttribute('aria-label', 'Download the particulars for ' + (v.name || 'this vessel'));
        last.appendChild(a);
      }
      r.appendChild(last);
      return r;
    };

    fetch(SHEET_CSV, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (text) {
        var list = text ? toVessels(parseCSV(text)) : [];
        if (!list.length) return;                    // keep the fallback rows
        var frag = document.createDocumentFragment();
        list.forEach(function (v) { frag.appendChild(row(v)); });
        host.textContent = '';
        host.appendChild(frag);

        // A column heading with nothing under it reads as a fault. The
        // Details heading earns its place only once a vessel carries a PDF.
        var head = document.querySelector('.prow.h span:last-child');
        if (head) head.textContent = list.some(function (v) { return /^https?:\/\//i.test(v.pdf); }) ? 'Details' : '';
      })
      .catch(function () { /* fallback rows stay */ });
  })();

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
