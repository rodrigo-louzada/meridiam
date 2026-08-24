// Film diagnostics. Loaded BEFORE app.js so it can observe the real play()
// call rather than guess at its outcome. It only watches — nothing here
// changes what app.js does, so the page reproduces production exactly.
(function () {
  'use strict';

  var log = [];
  var plays = [];          // one entry per play() call, in order

  window.addEventListener('error', function (e) {
    log.push('JS ERROR: ' + (e.message || '?') + ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?'));
  });

  // Wrap play() to capture how the promise settles. The original promise is
  // returned untouched, so app.js still sees its own resolution.
  var origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    var el = this;
    var rec = { who: el.className || el.tagName, state: 'pending', name: '', msg: '' };
    plays.push(rec);
    var p;
    try {
      p = origPlay.apply(el, arguments);
    } catch (err) {
      rec.state = 'THREW';
      rec.name = err && err.name;
      rec.msg = err && err.message;
      throw err;
    }
    if (p && p.then) {
      p.then(function () { rec.state = 'resolved'; },
             function (err) {
               rec.state = 'REJECTED';
               rec.name = (err && err.name) || '(no name)';
               rec.msg = (err && err.message) || '';
             });
    } else {
      rec.state = 'no-promise (legacy)';
    }
    return p;
  };

  function yn(b) { return b ? 'yes' : 'NO'; }

  var READY = ['0 NOTHING', '1 METADATA', '2 CURRENT', '3 FUTURE', '4 ENOUGH'];
  var NET = ['0 EMPTY', '1 IDLE', '2 LOADING', '3 NO_SOURCE'];
  var MERR = { 1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED' };

  function vidLines(v, label) {
    var L = [];
    if (!v) { return [label + ': element missing']; }
    L.push('[' + label + ']');
    L.push('  currentSrc   ' + (v.currentSrc ? v.currentSrc.replace(/^.*\//, '') : '(none)'));
    L.push('  readyState   ' + (READY[v.readyState] || v.readyState));
    L.push('  networkState ' + (NET[v.networkState] || v.networkState));
    L.push('  paused       ' + v.paused + (v.paused ? '   <-- not playing' : ''));
    L.push('  currentTime  ' + v.currentTime.toFixed(2) + ' / ' + (isFinite(v.duration) ? v.duration.toFixed(2) : '?'));
    L.push('  muted/inline ' + yn(v.muted) + ' / ' + yn(v.playsInline));
    L.push('  frame size   ' + v.videoWidth + 'x' + v.videoHeight);
    if (v.error) {
      L.push('  MEDIA ERROR  code ' + v.error.code + ' ' + (MERR[v.error.code] || '') +
             (v.error.message ? ' — ' + v.error.message : ''));
    }
    return L;
  }

  var startT = {};
  function advanced(v, key) {
    if (!v) return null;
    if (startT[key] === undefined) { startT[key] = v.currentTime; return null; }
    return v.currentTime > startT[key] + 0.05;
  }

  var fetchInfo = ['  (checking...)'];
  var jsInfo = ['  (checking...)'];

  function render() {
    var real = document.querySelector('.film-video');
    var ctrl = document.querySelector('.ctrl-video');
    var film = document.querySelector('.film');
    var c = navigator.connection || {};
    var L = [];

    var realOk = advanced(real, 'real');
    var ctrlOk = advanced(ctrl, 'ctrl');

    L.push('=== VERDICT ===');
    L.push('Site video actually moving : ' + (realOk === null ? 'measuring...' : (realOk ? 'YES' : 'NO')));
    L.push('Plain video actually moving: ' + (ctrlOk === null ? 'measuring...' : (ctrlOk ? 'YES' : 'NO')));
    L.push('Tap-to-play button shown   : ' + (film && film.classList.contains('needs-tap') ? 'YES' : 'no'));
    L.push('');

    L.push('=== play() CALLS ===');
    if (!plays.length) { L.push('  none — app.js never called play()'); }
    plays.forEach(function (r, i) {
      L.push('  #' + (i + 1) + ' ' + r.who + ' -> ' + r.state +
             (r.name ? '  ' + r.name : '') + (r.msg ? '\n       ' + r.msg : ''));
    });
    L.push('');

    L.push('=== VIDEO ELEMENTS ===');
    L = L.concat(vidLines(real, 'site film (via app.js)'));
    L = L.concat(vidLines(ctrl, 'plain control (no JS)'));
    L.push('');

    L.push('=== GATES app.js CHECKS ===');
    L.push('  reduced motion  ' + yn(matchMedia('(prefers-reduced-motion: reduce)').matches) + '  (yes = film disabled)');
    L.push('  saveData        ' + yn(!!c.saveData) + '  (yes = film disabled)');
    L.push('  effectiveType   ' + (c.effectiveType || 'unknown') + '  (2g = film disabled)');
    L.push('  narrow (<=760)  ' + yn(matchMedia('(max-width: 760px)').matches) + '  -> ' +
           (matchMedia('(max-width: 760px)').matches ? '720p' : '1080p'));
    L.push('');

    L.push('=== FILE DELIVERY ===');
    L = L.concat(fetchInfo);
    L.push('');
    L.push('=== SCRIPT ON SERVER ===');
    L = L.concat(jsInfo);
    L.push('');

    L.push('=== DEVICE ===');
    L.push('  ' + navigator.userAgent);
    L.push('  platform ' + navigator.platform + '  dpr ' + window.devicePixelRatio +
           '  win ' + window.innerWidth + 'x' + window.innerHeight);
    L.push('  canPlay mp4/avc1.4D401F: "' +
           (document.createElement('video').canPlayType('video/mp4; codecs="avc1.4D401F"') || 'EMPTY') + '"');
    if (log.length) { L.push(''); L.push('=== PAGE ERRORS ==='); L = L.concat(log.map(function (s) { return '  ' + s; })); }

    document.getElementById('out').textContent = L.join('\n');

    var v = document.getElementById('verdict');
    if (realOk !== null) {
      v.textContent = realOk ? 'FILM IS PLAYING' : 'FILM IS NOT PLAYING';
      v.className = realOk ? 'ok' : 'bad';
    }
  }

  // Confirm the phone can reach the footage, separately from decoding it.
  // HEAD, so this costs no data on top of the two videos already on the page.
  fetch('assets/hero-720.mp4', { method: 'HEAD' })
    .then(function (r) {
      fetchInfo = ['  hero-720.mp4 HTTP ' + r.status +
                   '  type ' + (r.headers.get('content-type') || '?') +
                   '  size ' + (r.headers.get('content-length') || '?') +
                   '  ranges ' + (r.headers.get('accept-ranges') || 'not advertised')];
    })
    .catch(function (e) { fetchInfo = ['  hero-720.mp4 UNREACHABLE — ' + e]; });

  // Tells us whether this phone is being served the fixed script or a stale one.
  fetch('assets/app.js')
    .then(function (r) { return r.text(); })
    .then(function (t) {
      jsInfo = ['  app.js ' + t.length + ' bytes',
                '  has autoplay-retry fix: ' + (/NotAllowedError/.test(t) ? 'YES' : 'NO — STALE COPY')];
    })
    .catch(function (e) { jsInfo = ['  app.js fetch failed — ' + e]; });

  function boot() {
    document.getElementById('copy').addEventListener('click', function () {
      var t = document.getElementById('out').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(t).then(function () {
          document.getElementById('copy').textContent = 'Copied';
        }, function () { document.getElementById('copy').textContent = 'Select the text below instead'; });
      }
    });
    render();
    setInterval(render, 500);
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
})();
