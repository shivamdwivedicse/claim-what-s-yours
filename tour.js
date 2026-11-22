/* tour.js - guided tour. Raju and Asha take turns; a spotlight highlights the real UI.
   Start: the "Take the tour" buttons. Keys: Right/Enter = next, Left = back, Esc = close.
   "Tour done" is remembered in localStorage (safe if storage is blocked). */
(function () {
  'use strict';

  var DONE_KEY = 'cwy-tour-done';
  var STEPS = [
    { who: 'raju', face: 'point', target: '.input-card' },
    { who: 'asha', face: 'wave', target: '#chips' },
    { who: 'raju', face: 'point', target: '#missed-banner' },
    { who: 'asha', face: 'think', target: '.card ul.docs' },
    { who: 'raju', face: 'point', target: '.card ol' },
    { who: 'asha', face: 'point', target: '#tab-applications' },
    { who: 'both', face: 'cheer', target: null }
  ];
  var NAMES = { raju: 'Raju', asha: 'Asha', both: 'Raju & Asha' };
  var DEMO_TEXT = 'Papa kisan hain. Maa vidhwa hain aur 45 saal ki hain. Behen 8th mein hai. Main 12th mein hu, ladki hu, OBC, UP, family income 1.2 lakh.';

  var root, spot, bubble, idx = 0, active = false, timer = null;

  function $(s) { return document.querySelector(s); }
  function lang() { return window.CWY_UI ? window.CWY_UI.getLang() : 'en'; }
  function texts() { return window.CWY_UI ? window.CWY_UI.tourText() : []; }
  function ui() { return lang() === 'hi' ? { next: 'आगे', back: 'पीछे', skip: 'छोड़ें', done: 'पूरा', of: '/' } : { next: 'Next', back: 'Back', skip: 'Skip', done: 'Done', of: '/' }; }

  function markDone() { try { localStorage.setItem(DONE_KEY, '1'); } catch (e) { /* ignore */ } }

  function ensureReady(cb) {
    if (location.hash !== '#finder') { location.hash = '#finder'; }
    var tab = $('#tab-find');
    if (tab) tab.click();
    var ta = $('#situation');
    var hasResults = $('#results .card');
    if (ta && !hasResults) {
      if (!ta.value.trim()) ta.value = DEMO_TEXT;
      var btn = $('#analyse');
      if (btn) btn.click();
    }
    setTimeout(cb, 380);
  }

  function build() {
    root = $('#tour-root');
    root.textContent = '';
    spot = document.createElement('div');
    spot.className = 'tour-spot';
    bubble = document.createElement('div');
    bubble.className = 'tour-bubble';
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-modal', 'true');
    bubble.setAttribute('aria-label', 'Guided tour');
    root.appendChild(spot);
    root.appendChild(bubble);
  }

  function guideHtml(step) {
    if (!window.CWY_GUIDE) return '';
    if (step.who === 'both') {
      return '<div style="display:flex;width:100%"><div style="width:50%">' + CWY_GUIDE.svg('raju', 'cheer') +
        '</div><div style="width:50%">' + CWY_GUIDE.svg('asha', 'cheer') + '</div></div>';
    }
    return CWY_GUIDE.svg(step.who, step.face);
  }

  function place(step) {
    var el = step.target ? $(step.target) : null;
    var pad = 10;
    var vw = window.innerWidth, vh = window.innerHeight;
    var small = vw <= 640;

    if (!el || el.offsetParent === null) {
      spot.style.cssText = 'top:' + (vh / 2) + 'px;left:' + (vw / 2) + 'px;width:0;height:0;';
      bubble.style.left = small ? '' : Math.max(12, (vw - 380) / 2) + 'px';
      bubble.style.top = small ? '' : Math.max(12, vh / 2 - 130) + 'px';
      return;
    }
    var r = el.getBoundingClientRect();
    var top = Math.max(6, r.top - pad);
    var h = Math.min(r.height + pad * 2, vh - 12);
    spot.style.top = top + 'px';
    spot.style.left = Math.max(6, r.left - pad) + 'px';
    spot.style.width = Math.min(r.width + pad * 2, vw - 12) + 'px';
    spot.style.height = h + 'px';

    if (small) { bubble.style.left = ''; bubble.style.top = ''; return; }
    var bw = Math.min(380, vw - 24);
    var bh = bubble.offsetHeight || 200;
    var left = Math.min(Math.max(12, r.left), vw - bw - 12);
    var below = top + h + 14;
    var y = below + bh < vh ? below : Math.max(12, top - bh - 14);
    bubble.style.left = left + 'px';
    bubble.style.top = y + 'px';
  }

  function render() {
    var step = STEPS[idx];
    var t = ui();
    var dots = STEPS.map(function (s, i) { return '<i class="' + (i === idx ? 'on' : '') + '"></i>'; }).join('');
    var isLast = idx === STEPS.length - 1;
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
    bubble.innerHTML =
      '<div class="tour-guide">' + guideHtml(step) + '</div>' +
      '<div><div class="tour-name">' + NAMES[step.who] + '</div><p class="tour-text"></p></div>' +
      '<div class="tour-foot"><div class="tour-dots" aria-hidden="true">' + dots + '</div>' +
      (isLast ? '' : '<button type="button" class="t-skip">' + t.skip + '</button>') +
      (idx > 0 ? '<button type="button" class="t-back">' + t.back + '</button>' : '') +
      '<button type="button" class="t-next">' + (isLast ? t.done : t.next) + '</button></div>';
    bubble.querySelector('.tour-text').textContent = texts()[idx] || '';
    bubble.style.gridTemplateColumns = step.who === 'both' ? '150px 1fr' : '';
    if (step.who === 'both') bubble.querySelector('.tour-guide').style.width = '150px';

    var el = step.target ? $(step.target) : null;
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    clearTimeout(timer);
    place(step);
    timer = setTimeout(function () { place(step); }, 450);

    var next = bubble.querySelector('.t-next');
    next.addEventListener('click', go.bind(null, 1));
    var back = bubble.querySelector('.t-back');
    if (back) back.addEventListener('click', go.bind(null, -1));
    var skip = bubble.querySelector('.t-skip');
    if (skip) skip.addEventListener('click', close);
    next.focus();
  }

  function go(d) {
    var n = idx + d;
    if (n >= STEPS.length) { close(); return; }
    if (n < 0) return;
    idx = n;
    render();
  }

  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Tab') {
      var f = bubble.querySelectorAll('button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function onResize() { if (active) place(STEPS[idx]); }

  function close() {
    active = false;
    clearTimeout(timer);
    markDone();
    if (root) { root.classList.remove('on'); root.textContent = ''; }
    window.scrollTo({ top: 0 });
  }

  function start() {
    if (active) return;
    ensureReady(function () {
      active = true;
      idx = 0;
      build();
      root.classList.add('on');
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['nav-tour', 'hero-tour'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function (e) { e.preventDefault(); start(); });
    });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, { passive: true });
    window.addEventListener('cwy-lang', function () { if (active) render(); });
    window.CWY_TOUR = { start: start, close: close };
  });
})();