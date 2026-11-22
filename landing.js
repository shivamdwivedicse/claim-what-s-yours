/* landing.js - routing, language toggle, animated tabs, reveal, and small enhancements
   on top of app.js (count-up number, reasoning colours). It never changes eligibility logic. */
(function () {
  'use strict';

  var LANG_KEY = 'cwy-ui-lang';
  var lang = 'en';

  /* ---------- Translations for static text. Results text from app.js stays English. ---------- */
  var HI = {
    nav_home: 'होम', nav_find: 'योजनाएँ खोजें', nav_apps: 'मेरे आवेदन', nav_tour: 'टूर देखें',
    hero_eyebrow: 'मुफ़्त · आधार नंबर नहीं · सिर्फ़ सरकारी लिंक',
    hero_sub: 'सरकार ने दिया है, बस क्लेम करना बाकी है।',
    hero_p: 'अपने परिवार के बारे में अपने शब्दों में बताइए। हम बताएँगे कि कौन सी योजनाएँ मिलने की संभावना है, कौन से कागज़ चाहिए और आवेदन कैसे करना है।',
    cta_start: 'अपनी स्थिति बताइए', bubble: 'नमस्ते! हम राजू और आशा हैं।',
    tr1: 'हमेशा मुफ़्त', tr2: 'आधार नंबर नहीं', tr3: 'सिर्फ़ आधिकारिक लिंक', tr4: 'संभावित पात्र, पक्का वादा नहीं',
    tabs_title: 'सब कुछ एक जगह', tabs_lead: 'उत्तर प्रदेश के छात्रों और परिवारों के लिए। आसान कदम, ईमानदार जवाब।',
    tb1: 'कैसे काम करता है', tb2: 'कौन सी योजनाएँ', tb3: 'कागज़ात आसान', tb4: 'दलालों से सावधान', tb5: 'आख़िरी तारीख़ और ट्रैकिंग',
    s1t: 'बताइए', s1d: 'हिंदी या अंग्रेज़ी में लिखिए या बोलिए। लंबा फ़ॉर्म नहीं।',
    s2t: 'हम मिलान करते हैं', s2d: 'हर नियम जाँचकर बताते हैं कि योजना क्यों मिलेगी या क्यों नहीं।',
    s3t: 'तैयारी करें', s3d: 'आपके लिए कागज़ात की सूची और आवेदन के आसान कदम।',
    s4t: 'ट्रैक करें', s4d: 'योजना सेव करें, आख़िरी तारीख़ डालें और देखें क्या जल्दी ख़त्म हो रहा है।',
    schemes_note: 'नियम संपादन योग्य डेटा में रखे हैं और सरकारी स्रोतों से मिलाए गए हैं। आख़िरी जाँच 21 नवंबर 2026।',
    d1: 'आय प्रमाण पत्र', d2: 'जाति प्रमाण पत्र (SC, ST या OBC हो तो)', d3: 'मूल निवास प्रमाण पत्र',
    d4: 'छात्र के अपने नाम का बैंक पासबुक', d5: 'मार्कशीट और स्कूल या कॉलेज का प्रमाण',
    d_note: 'आय, जाति और निवास प्रमाण पत्र आमतौर पर तहसील या यूपी ई-डिस्ट्रिक्ट से बनते हैं। फ़ोटोकॉपी तैयार रखें।',
    m1: 'यहाँ की योजनाओं के आवेदन पर कोई फ़ीस नहीं है।', m2: 'सिर्फ़ आधिकारिक साइट इस्तेमाल करें। वे .gov.in या .nic.in पर ख़त्म होती हैं।',
    m3: 'मंज़ूरी की गारंटी कोई नहीं दे सकता। पैसे लेकर वादा करने वाले से सावधान रहें।', m4: 'अपना OTP, बैंक PIN या पासवर्ड किसी को न बताएँ।',
    dl1: 'किसी भी योजना पर Track दबाकर उसे सेव करें।', dl2: 'आख़िरी तारीख़ डालें और स्थिति बदलें: शुरू नहीं, कागज़ तैयार, आवेदन किया, मंज़ूर।',
    dl3: 'आख़िरी तारीख़ 7 दिन के अंदर हो तो हम चेताते हैं।', dl4: 'ध्यान दें: यूपी स्कॉलरशिप 2026-27 की तारीख़ 31 अक्टूबर 2026 को ख़त्म हुई। पोर्टल पर बढ़ी तारीख़ देखें।',
    cta_title: 'अपना हक़ जानने के लिए तैयार?',
    f_title: 'अपने परिवार के बारे में बताइए', f_help: 'हिंदी या अंग्रेज़ी में लिखिए या माइक दबाइए। कक्षा, श्रेणी, पारिवारिक आय, कौन खेती करता है और घर में विधवा या बुज़ुर्ग हों तो बताइए।',
    f_ph: 'उदाहरण: मैं 17 साल की लड़की हूँ, 11वीं में, यूपी से, ओबीसी, परिवार की आय 1.5 लाख।',
    f_examples: 'उदाहरण आज़माइए:', f_details: 'हमें ये जानकारी मिली', f_details_hint: 'किसी भी जानकारी को छूकर सुधारिए।',
    f_family: 'परिवार के सदस्य', f_add: 'सदस्य जोड़ें', f_results: 'आपके लिए योजनाएँ', f_recheck: 'पात्रता जाँचें',
    f_download: 'सारांश डाउनलोड करें', f_nm: 'मेल नहीं खाईं, और क्यों', apps_title: 'मेरे आवेदन', apps_help: 'जिन योजनाओं को आप ट्रैक करते हैं वे आख़िरी तारीख़ के साथ यहाँ दिखती हैं।',
    foot_note: 'जानकारी सार्वजनिक योजना पन्नों से ली गई है। नियम बदलते हैं, इसलिए हमेशा आधिकारिक वेबसाइट पर जाँच करें। हम आधार या कोई ID नंबर नहीं माँगते।'
  };
  var TOUR_HI = [
    'यहाँ अपनी स्थिति अपने शब्दों में लिखिए, या माइक दबाकर बोलिए।',
    'हमने जो समझा वो यहाँ दिखता है। किसी भी चिप को छूकर सुधार सकते हैं।',
    'यहाँ दिखती हैं मिलने की संभावना वाली योजनाएँ, और हर नियम का कारण।',
    'यह आपके लिए कागज़ात की सूची है। जो तैयार हो उस पर टिक लगाइए।',
    'ये आवेदन के आसान कदम हैं, और आख़िर में सरकारी वेबसाइट का लिंक।',
    'योजना को Track करें और \'मेरे आवेदन\' में आख़िरी तारीख़ पर नज़र रखें।',
    'बस! अब आपका हक़ आपके हाथ में है। शुभकामनाएँ!'
  ];
  var TOUR_EN = [
    'Write your situation in your own words here, or tap the mic and speak.',
    'This is what we understood. Tap any chip to correct it.',
    'Here are the schemes you are likely eligible for, with the reason for every rule.',
    'This is your personal document checklist. Tick what you already have.',
    'These are the simple steps to apply, with the official website link at the end.',
    'Track a scheme and keep an eye on last dates in My Applications.',
    "That's it! What is yours is now in your hands. Good luck!"
  ];

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- Language ---------- */
  function applyLang(next) {
    lang = next === 'hi' ? 'hi' : 'en';
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    $all('[data-i18n]').forEach(function (el) {
      if (!el.hasAttribute('data-en')) el.setAttribute('data-en', el.textContent);
      el.textContent = lang === 'hi' && HI[el.getAttribute('data-i18n')] ? HI[el.getAttribute('data-i18n')] : el.getAttribute('data-en');
    });
    $all('[data-i18n-ph]').forEach(function (el) {
      if (!el.hasAttribute('data-en-ph')) el.setAttribute('data-en-ph', el.getAttribute('placeholder') || '');
      var key = el.getAttribute('data-i18n-ph');
      el.setAttribute('placeholder', lang === 'hi' && HI[key] ? HI[key] : el.getAttribute('data-en-ph'));
    });
    $all('.lang-toggle button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    safeSet(LANG_KEY, lang);
    buildSchemeTiles();
    window.dispatchEvent(new CustomEvent('cwy-lang', { detail: lang }));
  }

  /* ---------- Router: #home, #finder, #applications ---------- */
  function route() {
    var h = (location.hash || '#home').replace('#', '');
    var home = $('#view-home');
    var app = $('#view-app');
    if (h === 'tour') { h = 'finder'; }
    var isHome = !(h === 'finder' || h === 'applications');
    home.hidden = !isHome;
    app.hidden = isHome;
    $all('.nav-links a[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === (isHome ? 'home' : h));
    });
    if (!isHome) {
      var tab = $(h === 'applications' ? '#tab-applications' : '#tab-find');
      if (tab) tab.click();
    }
    window.scrollTo(0, 0);
    revealOnScroll();
  }

  /* keep the URL in sync when the user switches the two inner tabs */
  function syncInnerTabs() {
    var f = $('#tab-find'), a = $('#tab-applications');
    if (f) f.addEventListener('click', function () { if (location.hash !== '#finder') history.replaceState(null, '', '#finder'); setActive('finder'); });
    if (a) a.addEventListener('click', function () { if (location.hash !== '#applications') history.replaceState(null, '', '#applications'); setActive('applications'); });
  }
  function setActive(name) {
    $all('.nav-links a[data-route]').forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-route') === name); });
  }

  /* ---------- Animated tabs on the landing page ---------- */
  function initTabs() {
    var wrap = $('#home-tabs');
    if (!wrap) return;
    var buttons = $all('.tab-btn', wrap);
    var panels = $all('.tab-panel');
    var line = $('#tab-underline');

    function moveLine(btn) {
      line.style.left = btn.offsetLeft + 'px';
      line.style.width = btn.offsetWidth + 'px';
    }
    function select(i) {
      buttons.forEach(function (b, j) { b.setAttribute('aria-selected', i === j ? 'true' : 'false'); });
      panels.forEach(function (p) {
        var on = Number(p.getAttribute('data-panel')) === i;
        p.hidden = !on;
      });
      moveLine(buttons[i]);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { var n = (i + 1) % buttons.length; select(n); buttons[n].focus(); }
        if (e.key === 'ArrowLeft') { var p = (i - 1 + buttons.length) % buttons.length; select(p); buttons[p].focus(); }
      });
    });
    window.addEventListener('resize', function () {
      var cur = buttons.filter(function (b) { return b.getAttribute('aria-selected') === 'true'; })[0];
      if (cur) moveLine(cur);
    });
    setTimeout(function () { select(0); }, 60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { select(0); });
  }

  /* ---------- Scheme tiles on the landing page (from schemes.js) ---------- */
  function money(n) { return typeof n === 'number' ? 'Rs ' + n.toLocaleString('en-IN') + (lang === 'hi' ? ' प्रति वर्ष' : ' per year') : (lang === 'hi' ? 'राशि अलग-अलग' : 'Amount varies'); }
  function buildSchemeTiles() {
    var grid = $('#home-scheme-grid');
    if (!grid || typeof SCHEMES === 'undefined') return;
    grid.textContent = '';
    SCHEMES.forEach(function (s) {
      var t = document.createElement('article');
      t.className = 'scheme-tile';
      var pill = document.createElement('span');
      pill.className = 'pill'; pill.textContent = s.category;
      var h = document.createElement('h3'); h.textContent = s.name;
      var p = document.createElement('p'); p.textContent = money(s.benefit_amount_per_year);
      var meta = document.createElement('div'); meta.className = 'meta';
      var a = document.createElement('a'); a.href = s.official_url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = lang === 'hi' ? 'आधिकारिक वेबसाइट' : 'Official website';
      meta.appendChild(a);
      t.appendChild(pill); t.appendChild(h); t.appendChild(p); t.appendChild(meta);
      grid.appendChild(t);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var io = null;
  function revealOnScroll() {
    var items = $all('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('in'); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
    }
    items.forEach(function (i) { io.observe(i); });
  }

  /* ---------- Example chips ---------- */
  function initExamples() {
    $all('.example-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var ta = $('#situation');
        ta.value = b.getAttribute('data-example');
        ta.focus();
        $('#analyse').click();
      });
    });
  }

  /* ---------- Enhancements on app.js output ---------- */
  var enhancing = false;

  function countUp(el, to, formatter) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || to <= 0) { el.textContent = formatter(to); return; }
    var start = null, dur = 900;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatter(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function enhanceBanner() {
    var box = $('#missed-banner');
    if (!box) return;
    var head = $('.missed-total', box);
    if (!head || head.getAttribute('data-done')) return;
    var m = /^At least Rs ([\d,]+) per year in verified amounts, plus (\d+) schemes? whose amount varies\.$/.exec(head.textContent);
    if (!m) return;
    var total = Number(m[1].replace(/,/g, ''));
    var varies = Number(m[2]);
    enhancing = true;
    head.setAttribute('data-done', '1');
    head.textContent = '';
    var lead = document.createElement('span');
    lead.textContent = lang === 'hi' ? 'आपका परिवार हर साल कम से कम' : 'Your family may be leaving at least';
    var big = document.createElement('span');
    big.className = 'count';
    big.textContent = 'Rs 0';
    var tail = document.createElement('span');
    tail.textContent = (lang === 'hi' ? 'प्रति वर्ष छोड़ रहा हो सकता है (जाँची हुई राशि)' : 'per year unclaimed (verified amounts)') +
      (varies ? (lang === 'hi' ? ', और ' + varies + ' योजनाओं की राशि अलग-अलग है।' : ', plus ' + varies + ' scheme' + (varies === 1 ? '' : 's') + ' whose amount varies.') : '.');
    head.appendChild(lead); head.appendChild(big); head.appendChild(tail);
    countUp(big, total, function (v) { return 'Rs ' + v.toLocaleString('en-IN'); });

    var list = $('.missed-list', box);
    if (list && !$('.missed-toggle', box)) {
      var tg = document.createElement('button');
      tg.type = 'button'; tg.className = 'missed-toggle';
      var label = function () { return box.classList.contains('open') ? (lang === 'hi' ? 'सूची छिपाएँ' : 'Hide the list') : (lang === 'hi' ? 'योजना-वार सूची देखें' : 'See scheme-wise list'); };
      tg.textContent = label();
      tg.addEventListener('click', function () { box.classList.toggle('open'); tg.textContent = label(); });
      list.parentNode.insertBefore(tg, list);
    }
    enhancing = false;
  }

  function enhanceReasons() {
    $all('ul.reasons li').forEach(function (li) {
      if (li.className) return;
      var c = li.textContent.charAt(0);
      li.className = c === '✔' ? 'ok' : (c === '✖' ? 'bad' : (c === '?' ? 'unk' : ''));
    });
  }

  function watchResults() {
    var results = $('#results');
    if (!results || !('MutationObserver' in window)) return;
    var queued = false;
    var obs = new MutationObserver(function () {
      if (enhancing || queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; enhanceBanner(); enhanceReasons(); });
    });
    obs.observe(results, { childList: true, subtree: true });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var saved = safeGet(LANG_KEY);
    $all('.lang-toggle button').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
    });
    initTabs();
    initExamples();
    syncInnerTabs();
    watchResults();
    applyLang(saved === 'hi' ? 'hi' : 'en');
    window.addEventListener('hashchange', route);
    route();
    enhanceBanner();
    enhanceReasons();
    window.CWY_UI = { getLang: function () { return lang; }, tourText: function () { return lang === 'hi' ? TOUR_HI : TOUR_EN; }, goFinder: function () { location.hash = '#finder'; } };
  });
})();