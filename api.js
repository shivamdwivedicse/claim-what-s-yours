/* api.js - "Search live" button. Talks to server/index.js (same address as the page).
   If the server or key is missing, nothing changes: the app works fully with the stored schemes.
   Live results are shown in a separate, clearly labelled section and are NEVER counted in Missed Money. */
(function () {
  'use strict';

  var live = false;       // true only when /api/health says the server has a key
  var lastSnapshot = '';  // details used for the last live search (to spot stale results)
  var busy = false;

  var TXT = {
    en: {
      btn: 'Search live (AI)', searching: 'Searching...',
      title: 'More ideas found live', badge: 'AI-assisted, not verified',
      note: 'These come from a live web search by an AI. We have not checked them and they are not counted in your Missed Money total. Confirm every detail on the official website before you apply.',
      sent: 'Only your selected details (age, class, category, income and similar) are sent. Never your typed text, names or ID numbers.',
      may: 'May be eligible, please check', docs: 'Documents mentioned', official: 'Official website', source: 'Source page',
      retrieved: 'Found on', none: 'No extra schemes found for these details. Your stored matches above are still valid.',
      stale: 'Your details changed after this search. Tap "Search live" again to refresh.',
      needDetails: 'Add a few details first (class, category, income), then search again.',
      sources: 'Pages the AI searched',
      e_busy: 'The AI service is busy right now. Please try again in a minute.',
      e_timeout: 'The search took too long. Please try again.',
      e_rate_limited: 'Too many searches. Please wait a minute.',
      e_config: 'The AI key was rejected. Check the key in server/.env.',
      e_not_configured: 'Live search is not set up on this server.',
      e_model: 'The AI model name was not found. Set GEMINI_MODEL in server/.env to a current model.',
      e_network: 'The server could not reach the AI service. Check the internet connection.',
      e_unavailable: 'The AI service returned an error. Look at the server terminal for the reason.',
      e_bad_response: 'The AI answered in an unexpected format. Please try once more.',
      e_default: 'Live search is not available right now. Your stored matches still work.',
      cached: 'Showing a recent result.',
      ungrounded: 'Warning: this answer comes from the AI\'s own memory, not a live web search, so a link may be old or wrong. Check each one on the official website.',
      privacy: 'We do not ask for Aadhaar or any ID number. Your typed text stays in this browser. If you tap "Search live", only your selected details (not your text) go to an AI service (Google Gemini) to look for more schemes.'
    },
    hi: {
      btn: 'लाइव खोजें (AI)', searching: 'खोज रहे हैं...',
      title: 'लाइव मिले और विकल्प', badge: 'AI की मदद से, जाँचा नहीं गया',
      note: 'ये AI की लाइव वेब खोज से आए हैं। हमने इन्हें जाँचा नहीं है और ये आपके Missed Money में नहीं जुड़ते। आवेदन से पहले हर जानकारी आधिकारिक वेबसाइट पर जाँचें।',
      sent: 'सिर्फ़ चुनी हुई जानकारी (उम्र, कक्षा, श्रेणी, आय जैसी) भेजी जाती है। आपका लिखा हुआ टेक्स्ट, नाम या ID नंबर कभी नहीं।',
      may: 'पात्र हो सकते हैं, कृपया जाँचें', docs: 'बताए गए कागज़ात', official: 'आधिकारिक वेबसाइट', source: 'स्रोत पन्ना',
      retrieved: 'मिलने की तारीख़', none: 'इन जानकारियों पर कोई और योजना नहीं मिली। ऊपर की जमा की हुई योजनाएँ सही हैं।',
      stale: 'इस खोज के बाद आपकी जानकारी बदली है। दोबारा "लाइव खोजें" दबाइए।',
      needDetails: 'पहले कुछ जानकारी जोड़िए (कक्षा, श्रेणी, आय), फिर खोजिए।', sources: 'AI ने ये पन्ने खोजे',
      e_busy: 'AI सेवा अभी व्यस्त है। एक मिनट बाद फिर कोशिश करें।', e_timeout: 'खोज में बहुत समय लगा। दोबारा कोशिश करें।',
      e_rate_limited: 'बहुत सारी खोजें हुईं। एक मिनट रुकिए।', e_config: 'AI की key स्वीकार नहीं हुई। server/.env में key जाँचें।',
      e_not_configured: 'इस सर्वर पर लाइव खोज सेट नहीं है।', e_model: 'AI मॉडल का नाम नहीं मिला। server/.env में GEMINI_MODEL बदलें।', e_network: 'सर्वर AI सेवा तक नहीं पहुँच पाया। इंटरनेट जाँचें।', e_unavailable: 'AI सेवा ने गड़बड़ी बताई। कारण सर्वर टर्मिनल में देखें।', e_bad_response: 'AI का जवाब अपेक्षित रूप में नहीं आया। एक बार और कोशिश करें।', e_default: 'लाइव खोज अभी उपलब्ध नहीं है। जमा की हुई योजनाएँ चल रही हैं।',
      cached: 'हाल का नतीजा दिखा रहे हैं।',
      ungrounded: 'चेतावनी: ये जवाब AI की अपनी याददाश्त से है, लाइव वेब खोज से नहीं, इसलिए कोई लिंक पुराना या गलत हो सकता है। हर लिंक आधिकारिक वेबसाइट पर जाँचें।',
      privacy: 'हम आधार या कोई ID नंबर नहीं माँगते। आपका लिखा टेक्स्ट इसी ब्राउज़र में रहता है। "लाइव खोजें" दबाने पर सिर्फ़ चुनी हुई जानकारी (आपका टेक्स्ट नहीं) और योजनाएँ खोजने के लिए AI सेवा (Google Gemini) को जाती है।'
    }
  };
  function lang() { return window.CWY_UI && window.CWY_UI.getLang() === 'hi' ? 'hi' : 'en'; }
  function t(k) { return TXT[lang()][k] || TXT.en[k] || ''; }

  function $(s) { return document.querySelector(s); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  /* ---------- Styles (kept here so no other file needs to change) ---------- */
  function addStyles() {
    var css = [
      '#live-section{order:4;margin-top:6px}',
      '.live-box{background:#fffdf7;border:2px dashed var(--amber);border-radius:24px;padding:18px 20px;animation:rise .4s both}',
      '.live-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:6px}',
      '.live-head h2{margin:0;font-size:1.3rem}',
      '.live-badge{background:var(--amber-soft);color:#8a5a10;border:1px solid var(--amber);border-radius:999px;padding:2px 12px;font-weight:800;font-size:.8rem}',
      '.live-note{color:var(--muted);font-size:.9rem;margin:4px 0}',
      '.live-card{background:var(--paper);border:1px solid var(--line);border-left:6px solid var(--amber);border-radius:18px;padding:14px 16px;margin-top:12px;animation:rise .4s both}',
      '.live-card h3{margin:0 0 4px;font-size:1.05rem}',
      '.live-card .may{display:inline-block;background:var(--amber-soft);color:#8a5a10;border-radius:999px;padding:1px 10px;font-weight:800;font-size:.8rem;margin-bottom:6px}',
      '.live-card ul{margin:4px 0 8px;padding-left:20px;font-size:.92rem}',
      '.live-card .links a{display:inline-block;margin:6px 10px 0 0;font-weight:800}',
      '.live-meta{color:var(--muted);font-size:.8rem;margin-top:8px}',
      '.live-error{background:#fde9e4;border-radius:14px;padding:10px 14px;margin-top:10px;font-weight:700}',
      '.live-stale{background:var(--amber-soft);border-radius:14px;padding:10px 14px;margin-top:10px;font-weight:700}',
      '.live-box.is-stale .live-card{opacity:.55}',
      '.skel{height:84px;border-radius:18px;margin-top:12px;background:linear-gradient(90deg,#f6ece1 25%,#fff7ee 50%,#f6ece1 75%);background-size:200% 100%;animation:shimmer 1.2s infinite}',
      '@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}',
      '.live-sources{margin-top:8px;font-size:.85rem}.live-sources summary{cursor:pointer;color:var(--muted);font-weight:700}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- Gather typed details from what app.js already saved ---------- */
  var KEYS = ['age', 'gender', 'education_level', 'category', 'minority', 'income', 'occupation',
    'widow_in_family', 'senior_in_family', 'marks_percent', 'marks_kind', 'place', 'school_type'];
  function details() {
    var p = readJSON('cwy-fields') || {};
    var fam = readJSON('cwy-family');
    return { profile: p, family: Array.isArray(fam) ? fam : [] };
  }
  function hasDetails(d) {
    var any = KEYS.some(function (k) { return d.profile[k] !== null && d.profile[k] !== undefined; });
    var famAny = d.family.some(function (m) {
      return KEYS.some(function (k) { return m && m[k] !== null && m[k] !== undefined; });
    });
    return any || famAny;
  }
  function snapshot(d) {
    var pick = function (o) { var r = {}; KEYS.forEach(function (k) { if (o && o[k] !== null && o[k] !== undefined) r[k] = o[k]; }); return r; };
    return JSON.stringify([pick(d.profile), d.family.map(function (m) { var r = pick(m); r.role = m.role; return r; })]);
  }
  function storedNames() {
    return typeof SCHEMES !== 'undefined' ? SCHEMES.map(function (s) { return s.name; }) : [];
  }

  /* ---------- Rendering ---------- */
  function isOfficial(u) {
    try {
      var x = new URL(u);
      var h = x.hostname.toLowerCase();
      return x.protocol === 'https:' && (/\.gov\.in$/.test(h) || /\.nic\.in$/.test(h) || h === 'gov.in' || h === 'nic.in');
    } catch (e) { return false; }
  }

  function section() {
    var s = $('#live-section');
    if (!s) {
      s = el('div');
      s.id = 'live-section';
      var results = $('#results');
      if (results) results.appendChild(s);
    }
    return s;
  }
  function clearSection() { var s = $('#live-section'); if (s) s.textContent = ''; lastSnapshot = ''; }

  function shell() {
    var box = el('div', 'live-box');
    var head = el('div', 'live-head');
    head.appendChild(el('h2', '', t('title')));
    head.appendChild(el('span', 'live-badge', t('badge')));
    box.appendChild(head);
    box.appendChild(el('p', 'live-note', t('note')));
    box.appendChild(el('p', 'live-note', t('sent')));
    return box;
  }

  function showLoading() {
    var s = section();
    s.textContent = '';
    var box = shell();
    box.appendChild(el('p', 'live-note', t('searching')));
    for (var i = 0; i < 3; i++) box.appendChild(el('div', 'skel'));
    s.appendChild(box);
  }

  function showError(code, upstream) {
    var s = section();
    s.textContent = '';
    var box = shell();
    var msg = TXT.en['e_' + code] ? t('e_' + code) : t('e_default');
    box.appendChild(el('div', 'live-error', msg + (upstream ? ' (code ' + upstream + ')' : '')));
    s.appendChild(box);
  }

  function showMessage(msg) {
    var s = section();
    s.textContent = '';
    var box = shell();
    box.appendChild(el('div', 'live-stale', msg));
    s.appendChild(box);
  }

  function showResults(data) {
    var s = section();
    s.textContent = '';
    var box = shell();
    if (data.grounded === false) box.appendChild(el('div', 'live-error', t('ungrounded')));
    if (data.cached) box.appendChild(el('p', 'live-note', t('cached')));

    if (!data.items.length) {
      box.appendChild(el('p', 'live-note', t('none')));
    }
    data.items.forEach(function (it) {
      var c = el('article', 'live-card');
      c.appendChild(el('span', 'may', t('may')));
      c.appendChild(el('h3', '', it.name));
      if (it.benefit) c.appendChild(el('p', '', it.benefit));
      if (it.eligibility) {
        var p = el('p', 'live-note');
        p.appendChild(el('strong', '', (lang() === 'hi' ? 'नियम: ' : 'Rules: ')));
        p.appendChild(document.createTextNode(it.eligibility));
        c.appendChild(p);
      }
      if (it.documents && it.documents.length) {
        c.appendChild(el('strong', '', t('docs')));
        var ul = el('ul');
        it.documents.forEach(function (d) { ul.appendChild(el('li', '', d)); });
        c.appendChild(ul);
      }
      var links = el('div', 'links');
      if (isOfficial(it.officialUrl)) {
        var a = el('a', '', t('official'));
        a.href = it.officialUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
        links.appendChild(a);
      }
      if (it.sourceUrl && isOfficial(it.sourceUrl)) {
        var b = el('a', '', t('source'));
        b.href = it.sourceUrl; b.target = '_blank'; b.rel = 'noopener noreferrer';
        links.appendChild(b);
      }
      c.appendChild(links);
      var when = '';
      try { when = new Date(data.retrievedAt).toLocaleDateString(lang() === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { when = ''; }
      c.appendChild(el('div', 'live-meta', t('retrieved') + ': ' + when + ' · AI-assisted'));
      box.appendChild(c);
    });

    var good = (data.sources || []).filter(function (x) { return x && /^https:\/\//.test(x.uri); });
    if (good.length) {
      var d = el('details', 'live-sources');
      d.appendChild(el('summary', '', t('sources')));
      var ul2 = el('ul');
      good.forEach(function (x) {
        var li = el('li');
        var a2 = el('a', '', x.title || x.uri);
        a2.href = x.uri; a2.target = '_blank'; a2.rel = 'noopener noreferrer';
        li.appendChild(a2);
        ul2.appendChild(li);
      });
      d.appendChild(ul2);
      box.appendChild(d);
    }
    s.appendChild(box);
  }

  /* ---------- Search ---------- */
  function setBusy(on) {
    busy = on;
    var b = $('#live-btn');
    if (b) { b.disabled = on; b.textContent = on ? t('searching') : t('btn'); }
  }

  function search() {
    if (busy) return;
    var d = details();
    if (!hasDetails(d)) { showMessage(t('needDetails')); return; }
    setBusy(true);
    showLoading();
    var snap = snapshot(d);
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 40000);
    fetch('/api/discover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile: d.profile, family: d.family, excluded: storedNames() }),
      signal: ctl.signal
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'default' }; });
    }).then(function (data) {
      if (data && data.ok && Array.isArray(data.items)) { lastSnapshot = snap; showResults(data); }
      else showError((data && data.error) || 'default', data && data.upstream);
    }).catch(function (e) {
      showError(e && e.name === 'AbortError' ? 'timeout' : 'default');
    }).then(function () {
      clearTimeout(timer);
      setBusy(false);
    });
  }

  /* ---------- Stale results: warn when the user changes details after a search ---------- */
  function checkStale() {
    var box = $('#live-section .live-box');
    if (!box || !lastSnapshot) return;
    var d = details();
    if (!hasDetails(d)) { clearSection(); return; }
    var stale = snapshot(d) !== lastSnapshot;
    box.classList.toggle('is-stale', stale);
    var warn = box.querySelector('.live-stale');
    if (stale && !warn) {
      var w = el('div', 'live-stale', t('stale'));
      box.insertBefore(w, box.children[3] || null);
    } else if (!stale && warn) {
      warn.remove();
    }
  }

  function watch() {
    if (!('MutationObserver' in window)) return;
    var timer = null;
    var obs = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(checkStale, 120);
    });
    ['#chips', '#family-list'].forEach(function (sel) {
      var n = $(sel);
      if (n) obs.observe(n, { childList: true, subtree: true });
    });
  }

  /* ---------- Start: only switch on if the server answers and has a key ---------- */
  function enable() {
    live = true;
    var actions = $('.results-actions');
    if (actions && !$('#live-btn')) {
      var b = el('button', 'btn-primary', t('btn'));
      b.type = 'button';
      b.id = 'live-btn';
      b.addEventListener('click', search);
      actions.insertBefore(b, actions.firstChild);
    }
    var pn = $('#privacy-note');
    if (pn) { pn.textContent = t('privacy'); pn.setAttribute('data-live', '1'); }
    watch();
    // A new analysis is a new situation: drop old live results instead of leaving them behind.
    document.addEventListener('click', function (e) {
      var target = e.target && e.target.closest ? e.target.closest('#analyse, #recheck') : null;
      if (target) clearSection();
    }, true);
    window.addEventListener('cwy-lang', function () {
      var b2 = $('#live-btn'); if (b2 && !busy) b2.textContent = t('btn');
      var pn2 = $('#privacy-note'); if (pn2 && pn2.getAttribute('data-live')) pn2.textContent = t('privacy');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (location.protocol.indexOf('http') !== 0) return; // opened as a file: no server, no live search
    addStyles();
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 2500);
    fetch('/api/health', { signal: ctl.signal }).then(function (r) { return r.json(); }).then(function (h) {
      clearTimeout(timer);
      if (h && h.ok && h.live) enable();
    }).catch(function () { clearTimeout(timer); /* no server: stay in offline mode */ });
  });
})();