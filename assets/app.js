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
