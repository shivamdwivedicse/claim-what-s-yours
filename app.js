/* Claim What's Yours - app.js
   Plain vanilla JS. Relies on the global scheme array from schemes.js (see loadSchemes).
   Everything lives inside one IIFE; only the DOMContentLoaded hook is global.

   DATA MODEL
   - HOUSEHOLD = the `state` object, saved under "cwy-fields". It is also the SELF member's profile.
     Household-shared fields: income, category, state, minority.
   - FAMILY = array saved under "cwy-family", non-self members only:
     {id, role: 'father'|'mother'|'sibling'|'other', name, age, gender, education_level,
      occupation, widow_in_family, senior_in_family, marks_percent}. Unknown values are null.
   - Member list = [SELF (read from HOUSEHOLD)] + FAMILY.
   - Engine profile for a member = shared fields from HOUSEHOLD + that member's own fields.
     For SELF the profile is HOUSEHOLD itself.
   - "cwy-situation" holds the typed text, "cwy-voice-lang" the chosen voice language. */
(function () {
  'use strict';

  const KEY_SITUATION = 'cwy-situation';
  const KEY_FIELDS = 'cwy-fields';
  const KEY_DOCS = 'cwy-docs';
  const KEY_FAMILY = 'cwy-family';
  const KEY_VOICE_LANG = 'cwy-voice-lang';
  const KEY_SCHEMES_OVERRIDE = 'cwy-schemes-override';
  const KEY_TRACKER = 'cwy-tracker';
  const DISCLAIMER = 'Likely eligible only, please confirm on the official website.';

  // App-wide copy in one place. Set on startup in init().
  const APP_CONFIG = {
    privacyNote: 'We do not ask for Aadhaar or any ID number. Nothing is sent to a server; your text stays in this browser.'
  };

  /* ---------- Storage helpers (localStorage only, failures are ignored) ---------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage full or blocked: app still works in memory */
    }
  }

  /* ---------- Scheme list (admin override, Step 1) ---------- */

  // Returns the admin override from localStorage when it is a non-empty array of
  // objects with string id and name; otherwise the built-in SCHEMES from schemes.js.
  function loadSchemes() {
    const fallback = typeof SCHEMES !== 'undefined' ? SCHEMES : [];
    try {
      const raw = localStorage.getItem(KEY_SCHEMES_OVERRIDE);
      const parsed = raw ? JSON.parse(raw) : null;
      const valid = Array.isArray(parsed) && parsed.length > 0 && parsed.every(function (s) {
        return !!s && typeof s.id === 'string' && typeof s.name === 'string';
      });
      return valid ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  const ACTIVE_SCHEMES = loadSchemes();

  /* ---------- Application tracker storage (Step 2) ---------- */
  // Stored under KEY_TRACKER as {schemeId: {status, deadline, savedAt}}.
  const TRACKER_STATUSES = [
    { value: 'not_started', label: 'Not started' },
    { value: 'documents_ready', label: 'Documents ready' },
    { value: 'applied', label: 'Applied' },
    { value: 'approved', label: 'Approved' }
  ];

  function loadTracker() {
    const t = loadJSON(KEY_TRACKER, {});
    return t && typeof t === 'object' && !Array.isArray(t) ? t : {};
  }

  function saveTracker(tracker) {
    saveJSON(KEY_TRACKER, tracker);
  }

  /* ---------- Text matching helpers ---------- */

  // Escape a string so it can be used literally inside a RegExp.
  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Index of keyword kw in text, or -1. Latin keywords must be whole words.
  function kwIndex(text, kw) {
    const esc = escapeRe(kw);
    const latin = /[a-z]/.test(kw);
    const re = latin
      ? new RegExp('(^|[^a-z0-9])' + esc + '(?![a-z0-9])')
      : new RegExp('()' + esc);
    const m = re.exec(text);
    return m ? m.index + m[1].length : -1;
  }

  // Smallest index of any keyword in the list, or -1 if none present.
  function firstIndex(text, kws) {
    let best = -1;
    kws.forEach(function (kw) {
      const i = kwIndex(text, kw);
      if (i >= 0 && (best < 0 || i < best)) best = i;
    });
    return best;
  }

  function hasAny(text, kws) {
    return firstIndex(text, kws) >= 0;
  }

  /* ---------- Keyword lists ---------- */
  const FEMALE_KW = ['ladki', 'ladkee', 'larki', 'beti', 'mahila', 'girl', 'female',
    'लड़की', 'बेटी', 'महिला', 'स्त्री'];
  const MALE_KW = ['ladka', 'larka', 'beta', 'ladke', 'boy', 'male', 'purush',
    'लड़का', 'बेटा', 'पुरुष'];
  const GRAD_KW = ['graduate', 'graduation', 'college', 'ba first year', 'b.a', 'b.tech', 'btech',
    'b tech', 'b.sc', 'bsc', 'bca', 'bba', 'स्नातक', 'स्नातक प्रथम वर्ष',
    'pg', 'post graduate', 'पीजी', 'm.a', 'msc', 'm.tech', 'mba'];
  const GRAD_STEM = /graduat/; // matches "graduated" too, which the whole-word list cannot
  // Class 6-12 by Hindi/English word. Each entry: [class number, forms].
  const CLASS_WORDS = [
    [6, ['chhathi', 'chhatha', 'छठी', 'छठवीं', '6vi']],
    [7, ['satvi', 'सातवीं', '7vi']],
    [8, ['aathvi', 'आठवीं', '8vi']],
    [9, ['nauvi', 'navi', 'नौवीं', '9vi']],
    [10, ['dasvi', 'दसवीं', '10vi', '10th']],
    [11, ['gyarvi', 'gyarahvi', 'ग्यारहवीं', 'ग्यारहवी']],
    [12, ['barvi', 'barahvi', 'बारहवीं', 'बारहवी', '12vi']]
  ];
  // Fractions of a lakh written as words: "dedh lakh" = 1.5 lakh, "dhai lakh" = 2.5 lakh.
  const WORD_AMOUNT_LAKH = { dedh: 1.5, dhai: 2.5, 'डेढ़': 1.5, 'ढाई': 2.5 };
  const WORD_AMOUNT_RE = /(?:^|[^a-z])(dedh|dhai)(?![a-z])|(डेढ़|ढाई)/;
  const RURAL_KW = ['gaon', 'gaav', 'village', 'rural', 'dehat', 'गांव', 'गाँव', 'देहात'];
  const URBAN_KW = ['sheher', 'shahar', 'city', 'urban', 'nagar', 'शहर', 'नगर'];
  const GOVT_SCHOOL_KW = ['government school', 'sarkari school', 'sarkari vidyalaya', 'govt school',
    'सरकारी स्कूल', 'सरकारी विद्यालय'];
  const PRIVATE_SCHOOL_KW = ['private school', 'private', 'निजी स्कूल'];
  const ITI_KW = ['iti', 'diploma'];
  const CATEGORY_RULES = [
    ['ST', ['anusuchit janjati', 'anusuchit jan jati', 'अनुसूचित जनजाति', 'एसटी', 'st']],
    ['SC', ['anusuchit jaati', 'anusuchit jati', 'अनुसूचित जाति', 'एससी', 'sc']],
    ['OBC', ['obc', 'pichda', 'other backward', 'पिछड़ा', 'ओबीसी', 'ebc']],
    ['General', ['general', 'samanya', 'सामान्य', 'जनरल']]
  ];
  const MINORITY_KW = ['muslim', 'musalman', 'christian', 'isai', 'sikh', 'buddhist', 'jain',
    'parsi', 'minority', 'alpsankhyak', 'मुस्लिम', 'मुसलमान', 'ईसाई', 'सिख', 'बौद्ध',
    'जैन', 'पारसी', 'अल्पसंख्यक'];
  const OCCUPATION_RULES = [
    ['Farmer', ['kisan', 'kisaan', 'farmer', 'kheti', 'खेती', 'किसान']],
    ['Labourer', ['mazdoor', 'majdoor', 'labour', 'labor', 'daily wage', 'मजदूर']],
    ['Driver', ['driver', 'chalak', 'चालक']],
    ['Shopkeeper', ['shopkeeper', 'dukandar', 'दुकानदार']],
    ['Salaried', ['naukri', 'job', 'service', 'नौकरी']]
  ];
  const WIDOW_KW = ['vidhwa', 'vidhva', 'vidhava', 'widow', 'विधवा'];
  const SENIOR_KW = ['buzurg', 'bujurg', 'senior citizen', 'dadi', 'dada', 'nani', 'nana',
    'old age', 'वृद्ध', 'बुज़ुर्ग', 'बुजुर्ग'];
  const INCOME_HINT = /income|aay|आय|kamai|कमाई|salary|vetan|वेतन/;
  const MONTH_HINT = /mahin|month|महीन|माह/;

  /* ---------- Parser: one small function per field ---------- */

  // Age from "17 saal", "age 17", "umar 17", "उम्र 17", "17 years" etc.
  function parseAge(t) {
    const m = /(?:^|[^a-z])(?:age|umar|umra)\s*:?\s*(\d{1,3})|उम्र\s*:?\s*(\d{1,3})/.exec(t)
      || /(\d{1,3})\s*(?:saal|sal|years?|yrs?|yr|साल|वर्ष)(?![a-z])/.exec(t);
    if (!m) return null;
    const n = Number(m[1] || m[2]);
    return n >= 1 && n <= 120 ? n : null;
  }

  // Gender: whichever gender keyword appears first in the text.
  function parseGender(t) {
    const f = firstIndex(t, FEMALE_KW);
    const m = firstIndex(t, MALE_KW);
    if (f < 0 && m < 0) return null;
    if (m < 0) return 'female';
    if (f < 0) return 'male';
    return f < m ? 'female' : 'male';
  }

  // Numeric class forms, tried in this order; group 1 is the class number.
  // Ages ("17 saal", "age 17", "17 years"), income and marks never match these.
  const CLASS_NUM_PATTERNS = [
    /(?:class|kaksha|std|standard|कक्षा)\s*:?\s*(\d{1,2})(?!\d)/,
    /(\d{1,2})\s*(?:class|kaksha|standard|कक्षा)(?![a-z])/,
    /(?:^|[^0-9.])(\d{1,2})\s*(?:th|st|nd|rd|vi|वीं|वी)(?![a-z])/,
    /(?:^|[^0-9.])(\d{1,2})\s*(?:mein|में)(?![a-z])/
  ];
  const ROMAN_VALUE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
  // Roman numerals only after a class word, or at the very start of the text (never a lone i/v/x there).
  const ROMAN_AFTER_KEYWORD = /(?:class|kaksha|std|standard|कक्षा)\s*(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)(?![a-z])/;
  const ROMAN_AT_START = /^\s*(xii|xi|ix|viii|vii|vi|iv|iii|ii)(?![a-z])/;

  // Class 1-12, "graduate", or 10 for ITI/diploma.
  function parseEducation(t) {
    for (let i = 0; i < CLASS_NUM_PATTERNS.length; i++) {
      const m = CLASS_NUM_PATTERNS[i].exec(t);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return Number(m[1]);
    }
    const roman = ROMAN_AFTER_KEYWORD.exec(t) || ROMAN_AT_START.exec(t);
    if (roman) return ROMAN_VALUE[roman[1]];
    for (let j = 0; j < CLASS_WORDS.length; j++) {
      if (hasAny(t, CLASS_WORDS[j][1])) return CLASS_WORDS[j][0];
    }
    if (GRAD_STEM.test(t) || hasAny(t, GRAD_KW)) return 'graduate';
    if (hasAny(t, ITI_KW)) return 10;
    return null;
  }

  // Caste category; ST is checked before SC so "anusuchit janjati" wins.
  function parseCategory(t) {
    for (let i = 0; i < CATEGORY_RULES.length; i++) {
      if (hasAny(t, CATEGORY_RULES[i][1])) return CATEGORY_RULES[i][0];
    }
    return null;
  }

  // true only when a minority keyword is present, otherwise null.
  function parseMinority(t) {
    return hasAny(t, MINORITY_KW) ? true : null;
  }

  // Multiplier for an amount unit word.
  function unitMultiplier(unit) {
    if (/lakh|lac|लाख/.test(unit)) return 100000;
    if (/crore|करोड़/.test(unit)) return 10000000;
    return 1000; // hazaar, thousand, k
  }

  // Annual family income in rupees, from "1.5 lakh", "150000", "1,50,000", "12k", etc.
  function parseIncome(t) {
    const re = /(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|लाख|crore|करोड़|hazaar|hazar|हज़ार|हजार|thousand|k)?(?![a-z])/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      const num = parseFloat(m[1].replace(/,/g, ''));
      if (isNaN(num)) continue;
      const end = m.index + m[0].length;
      // Skip ages and percentages.
      if (/^\s*(%|percent|pratishat|प्रतिशत|saal|sal|साल|years?|yrs?)/.test(t.slice(end, end + 12))) continue;
      let value = num;
      if (m[2]) {
        value = num * unitMultiplier(m[2]);
      } else {
        // Plain number: only accept if it is big enough and near an income word.
        const near = t.slice(Math.max(0, m.index - 25), end + 25);
        if (num < 1000 || !INCOME_HINT.test(near)) continue;
      }
      if (MONTH_HINT.test(t.slice(end, end + 15))) value *= 12; // monthly amount
      return Math.round(value);
    }
    // No digit amount found: try "dedh lakh" / "dhai lakh" words.
    const w = WORD_AMOUNT_RE.exec(t);
    if (!w) return null;
    const wEnd = w.index + w[0].length;
    let wValue = WORD_AMOUNT_LAKH[w[1] || w[2]] * 100000;
    if (MONTH_HINT.test(t.slice(wEnd, wEnd + 15))) wValue *= 12;
    return Math.round(wValue);
  }

  // Parent occupation: the rule whose keyword appears earliest in the text.
  function parseOccupation(t) {
    let best = null;
    let bestIdx = -1;
    OCCUPATION_RULES.forEach(function (rule) {
      const i = firstIndex(t, rule[1]);
      if (i >= 0 && (bestIdx < 0 || i < bestIdx)) {
        bestIdx = i;
        best = rule[0];
      }
    });
    return best;
  }

  // Widow in family: true or null.
  function parseWidow(t) {
    return hasAny(t, WIDOW_KW) ? true : null;
  }

  // Senior member in family: true or null.
  function parseSenior(t) {
    return hasAny(t, SENIOR_KW) ? true : null;
  }

  // Marks percentage 0-100, from "85%", "85 percent", "marks 85", "85 marks".
  function parseMarks(t) {
    const m = /(\d{1,3}(?:\.\d+)?)\s*(%|percent|pratishat|प्रतिशत)/.exec(t)
      || /(?:^|[^a-z])(?:marks|ank)\s*:?\s*(\d{1,3}(?:\.\d+)?)|अंक\s*:?\s*(\d{1,3}(?:\.\d+)?)/.exec(t)
      || /(\d{1,3}(?:\.\d+)?)\s*marks/.exec(t);
    if (!m) return null;
    const n = parseFloat(m[1] || m[2]);
    return n >= 0 && n <= 100 ? n : null;
  }

  // "85 percentile" -> "percentile"; plain percentages leave this null.
  function parseMarksKind(t) {
    return /\d\s*percentile/.test(t) ? 'percentile' : null;
  }

  // Value of the keyword that appears earliest in the text, from [[value, keywords], ...].
  function pickEarliest(t, rules) {
    let best = null;
    let bestIdx = -1;
    rules.forEach(function (rule) {
      const i = firstIndex(t, rule[1]);
      if (i >= 0 && (bestIdx < 0 || i < bestIdx)) {
        bestIdx = i;
        best = rule[0];
      }
    });
    return best;
  }

  // Rural or urban place: earliest keyword wins.
  function parsePlace(t) {
    return pickEarliest(t, [['rural', RURAL_KW], ['urban', URBAN_KW]]);
  }

  // Government or private school.
  function parseSchoolType(t) {
    return pickEarliest(t, [['government', GOVT_SCHOOL_KW], ['private', PRIVATE_SCHOOL_KW]]);
  }

  // Main parser. Never throws: any failure yields nulls for that field.
  function parseSituation(text) {
    const result = {
      age: null, gender: null, education_level: null, category: null,
      minority: null, income: null, occupation: null, widow_in_family: null,
      senior_in_family: null, marks_percent: null, marks_kind: null,
      place: null, school_type: null, state: 'UP'
    };
    const t = String(text || '').toLowerCase();
    const steps = {
      age: parseAge, gender: parseGender, education_level: parseEducation,
      category: parseCategory, minority: parseMinority, income: parseIncome,
      occupation: parseOccupation, widow_in_family: parseWidow,
      senior_in_family: parseSenior, marks_percent: parseMarks,
      marks_kind: parseMarksKind, place: parsePlace, school_type: parseSchoolType
    };
    Object.keys(steps).forEach(function (key) {
      try {
        result[key] = steps[key](t);
      } catch (e) {
        result[key] = null;
      }
    });
    return result;
  }

  /* ---------- Formatting ---------- */

  // 150000 -> "1.5 lakh"; smaller values -> "Rs 45,000".
  function formatLakh(n) {
    if (typeof n !== 'number' || isNaN(n)) return '';
    if (n >= 100000) return Number((n / 100000).toFixed(2)) + ' lakh';
    return 'Rs ' + n.toLocaleString('en-IN');
  }

  // Human text for a profile value in a reasoning row.
  function displayValue(field, v) {
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (field === 'income') return formatLakh(v);
    return String(v);
  }

  /* ---------- Eligibility engine ---------- */

  // Case-insensitive for strings, strict otherwise.
  function looseEqual(a, b) {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
  }

  function toBool(v) {
    return v === true || v === 'true' || v === 'yes';
  }

  // Result of one rule: "pass", "fail" or "unknown".
  function ruleResult(rule, profile) {
    const v = profile[rule.field];
    if (v === null || v === undefined || v === '') return 'unknown';
    const lim = rule.value;
    let ok;
    switch (rule.operator) {
      case '==': ok = looseEqual(v, lim); break;
      case '!=': ok = !looseEqual(v, lim); break;
      case '<=': case '>=': case '<': case '>': {
        const a = (rule.field === 'education_level' && v === 'graduate') ? 13 : Number(v);
        const b = Number(lim);
        if (isNaN(a) || isNaN(b)) return 'unknown';
        if (rule.operator === '<=') ok = a <= b;
        else if (rule.operator === '>=') ok = a >= b;
        else if (rule.operator === '<') ok = a < b;
        else ok = a > b;
        break;
      }
      case 'in':
        ok = Array.isArray(lim) && lim.some(function (x) { return looseEqual(x, v); });
        break;
      case 'is_true': ok = toBool(v); break;
      case 'is_false': ok = !toBool(v); break;
      default: return 'unknown';
    }
    return ok ? 'pass' : 'fail';
  }

  const OP_TEXT = {
    '==': 'must be', '!=': 'must not be', '<=': 'at most', '>=': 'at least',
    '<': 'below', '>': 'above', 'in': 'one of', 'is_true': 'yes', 'is_false': 'no'
  };

  // One line of reasoning for a rule, with symbol and plain-language text.
  function ruleRow(rule, result, profile) {
    const label = rule.label || rule.field;
    if (result === 'unknown') {
      return { result: result, text: '? ' + label + ': please check (we do not know this yet)' };
    }
    const symbol = result === 'pass' ? '\u2714 ' : '\u2716 ';
    const v = profile[rule.field];
    let body;
    if (rule.field === 'income' && (rule.operator === '<=' || rule.operator === '<')) {
      body = label + ': ' + formatLakh(v) + ' ' + rule.operator + ' ' + formatLakh(rule.value) + ' limit';
    } else {
      const lim = Array.isArray(rule.value) ? rule.value.join(', ') : rule.value;
      const needs = (OP_TEXT[rule.operator] || rule.operator);
      if (rule.operator === 'is_true' || rule.operator === 'is_false') {
        body = label + ': your value ' + displayValue(rule.field, v) + ' (needs ' + needs + ')';
      } else {
        body = label + ': your value ' + displayValue(rule.field, v) +
          ' (needs ' + needs + ' ' + displayValue(rule.field, lim) + ')';
      }
    }
    return { result: result, text: symbol + body };
  }

  /* ---------- Three-state engine helpers ---------- */

  // Amount text for reasons: "2 lakh" from 100000 up, "30,000" below that.
  function amountText(n) {
    return n >= 100000 ? formatLakh(n) : Number(n).toLocaleString('en-IN');
  }

  // Income limit for the profile's category when the scheme has income_limit_by_category.
  function effectiveRules(scheme, profile) {
    const rules = Array.isArray(scheme.rules) ? scheme.rules : [];
    let limit = null;
    const byCat = scheme.income_limit_by_category;
    if (byCat && typeof byCat === 'object' && isSet(profile.category) && isSet(byCat[profile.category])) {
      limit = byCat[profile.category];
    }
    const byPlace = scheme.income_limit_by_place;
    if (limit === null && byPlace && typeof byPlace === 'object' && isSet(profile.place) && isSet(byPlace[profile.place])) {
      limit = byPlace[profile.place];
    }
    if (limit === null) return rules;
    return rules.map(function (rule) {
      if (!rule || rule.field !== 'income') return rule;
      return Object.assign({}, rule, { value: limit });
    });
  }

  // Benefit per year for this profile. null means the amount is unknown (it varies).
  // stage_amounts (assumed shape: [{class_min, amount}]) picks the highest class_min <= profile class.
  function schemeAmount(scheme, profile) {
    if (Array.isArray(scheme.stage_amounts)) {
      const edu = profile.education_level;
      if (typeof edu !== 'number') return null;
      let best = null;
      scheme.stage_amounts.forEach(function (st) {
        if (!st || typeof st.class_min !== 'number' || typeof st.amount !== 'number') return;
        if (st.class_min <= edu && (best === null || st.class_min > best.class_min)) best = st;
      });
      return best ? best.amount : null;
    }
    const v = scheme.benefit_amount_per_year;
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // Plain reason for one failed rule, with the exact difference for numeric rules.
  function failReason(rule, value) {
    const label = rule.label || rule.field;
    if (rule.field === 'education_level') {
      return label + ' (you are in ' + (value === 'graduate' ? 'college' : 'Class ' + value) + ').';
    }
    const lim = rule.value;
    const isIncome = rule.field === 'income';
    const a = Number(value);
    const b = Number(lim);
    const numeric = !isNaN(a) && !isNaN(b);
    if (numeric && (rule.operator === '<=' || rule.operator === '<')) {
      const head = isIncome ? 'Income limit ' : label + ' limit ';
      return head + amountText(b) + ', your ' + (isIncome ? 'income' : 'value') + ' is ' +
        amountText(a - b) + ' higher.';
    }
    if (numeric && (rule.operator === '>=' || rule.operator === '>')) {
      return label + ' minimum ' + amountText(b) + ', your value is ' + amountText(b - a) + ' lower.';
    }
    if (rule.operator === 'in') {
      const list = Array.isArray(lim) ? lim.join(', ') : String(lim);
      return label + ': needs one of ' + list + '; your value is ' + displayValue(rule.field, value) + '.';
    }
    if (rule.operator === 'is_true' || rule.operator === 'is_false') {
      return label + ': must be ' + (rule.operator === 'is_true' ? 'yes' : 'no') + '.';
    }
    return label + ': ' + (OP_TEXT[rule.operator] || rule.operator) + ' ' + displayValue(rule.field, lim) +
      '; your value is ' + displayValue(rule.field, value) + '.';
  }

  // Three states: 'likely' (every rule passes), 'not_matched' (at least one rule fails),
  // 'could_be' (no rule fails, at least one is unknown). Unknown is never reported as 'likely'.
  function evaluateScheme(scheme, profile) {
    const rules = effectiveRules(scheme, profile);
    const rows = [];
    const reasons = [];
    const unknownRules = [];
    rules.forEach(function (rule) {
      const r = ruleResult(rule, profile);
      rows.push(ruleRow(rule, r, profile));
      if (r === 'fail') reasons.push(failReason(rule, profile[rule.field]));
      else if (r === 'unknown') unknownRules.push(rule);
    });
    let status = 'likely';
    if (reasons.length) status = 'not_matched';
    else if (unknownRules.length) status = 'could_be';
    return {
      status: status,
      rows: rows,
      reasons: reasons,
      unknownRules: unknownRules,
      amount: schemeAmount(scheme, profile)
    };
  }

  /* ---------- App state ---------- */

  // Field keys in display order, with chip labels and editor types.
  const CHIP_DEFS = [
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['female', 'male'] },
    { key: 'education_level', label: 'Class', type: 'edu' },
    { key: 'category', label: 'Category', type: 'select', options: ['SC', 'ST', 'OBC', 'General'] },
    { key: 'minority', label: 'Minority', type: 'bool' },
    { key: 'income', label: 'Family income (per year)', type: 'money' },
    { key: 'occupation', label: 'Parent occupation', type: 'select',
      options: ['Farmer', 'Labourer', 'Driver', 'Shopkeeper', 'Salaried'] },
    { key: 'widow_in_family', label: 'Widow in family', type: 'bool' },
    { key: 'senior_in_family', label: 'Senior in family', type: 'bool' },
    { key: 'marks_percent', label: 'Marks %', type: 'number' },
    { key: 'marks_kind', label: 'Marks type', type: 'select', options: ['percentile', 'percentage'] },
    { key: 'place', label: 'Place', type: 'select', options: ['rural', 'urban'] },
    { key: 'school_type', label: 'School type', type: 'select', options: ['government', 'private'] },
    { key: 'state', label: 'State', type: 'text' }
  ];

  // In-memory profile; chip edits and analyse both write here.
  let state = {};

  function emptyState() {
    const s = {};
    CHIP_DEFS.forEach(function (def) { s[def.key] = null; });
    s.state = 'UP';
    return s;
  }

  function hasKnownFields() {
    return CHIP_DEFS.some(function (def) {
      return def.key !== 'state' && state[def.key] !== null && state[def.key] !== undefined;
    });
  }

  // Display text for a chip value.
  function chipText(def, v) {
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (def.key === 'income') return formatLakh(v);
    return String(v);
  }

  // Parse user-typed text into a value for a field; null means invalid.
  function readEditorValue(def, el) {
    if (def.type === 'bool') return el.value === 'yes';
    if (def.type === 'select') return el.value || null;
    const raw = (el.value || '').trim();
    if (raw === '') return null;
    if (def.type === 'number' || def.type === 'money') {
      const cleaned = raw.replace(/,/g, '').toLowerCase();
      const m = /^(\d+(?:\.\d+)?)\s*(lakh|lac)?$/.exec(cleaned);
      if (!m) return null;
      const n = parseFloat(m[1]) * (m[2] ? 100000 : 1);
      return Math.round(n * 100) / 100;
    }
    if (def.type === 'edu') {
      if (/^graduate$/i.test(raw)) return 'graduate';
      const n = Number(raw);
      return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
    }
    return raw;
  }

  // Build an input element for editing one field.
  function makeEditor(def, current, onCommit, onCancel) {
    let el;
    if (def.type === 'select') {
      el = document.createElement('select');
      def.options.forEach(function (opt) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === current) o.selected = true;
        el.appendChild(o);
      });
    } else if (def.type === 'bool') {
      el = document.createElement('select');
      [['yes', 'Yes'], ['no', 'No']].forEach(function (pair) {
        const o = document.createElement('option');
        o.value = pair[0];
        o.textContent = pair[1];
        if ((pair[0] === 'yes') === (current === true)) o.selected = true;
        el.appendChild(o);
      });
    } else {
      el = document.createElement('input');
      el.type = 'text';
      el.value = current === null || current === undefined ? '' : String(current);
      el.setAttribute('aria-label', def.label);
    }
    el.classList.add('chip-editor');
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const v = readEditorValue(def, el);
        if (v === null) {
          el.classList.add('invalid');
          return;
        }
        onCommit(v);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        onCancel();
      }
    });
    return el;
  }

  /* ---------- Family model and family parser ---------- */

  const SELF = { id: 'self', role: 'self', name: null };
  const ROLE_LABEL = { self: 'You', father: 'Father', mother: 'Mother', sibling: 'Sibling', other: 'Other' };
  const ADD_ROLES = ['father', 'mother', 'sibling', 'other'];
  // Household-shared fields live in HOUSEHOLD only; the rest are per member.
  const SHARED_KEYS = ['income', 'category', 'state', 'minority'];
  const MEMBER_KEYS = ['age', 'gender', 'education_level', 'occupation',
    'widow_in_family', 'senior_in_family', 'marks_percent'];
  const MEMBER_DEFS = CHIP_DEFS.filter(function (def) { return MEMBER_KEYS.indexOf(def.key) >= 0; });

  // Smart follow-up: fields we may ask about, and the answers we try for each.
  const FOLLOW_FIELDS = ['category', 'marks_percent', 'minority', 'occupation',
    'widow_in_family', 'senior_in_family'];
  const FOLLOW_CANDIDATES = {
    category: ['SC', 'ST', 'OBC', 'General'],
    minority: [true, false],
    occupation: ['Farmer', 'Labourer', 'Driver', 'Shopkeeper', 'Salaried', 'Other'],
    widow_in_family: [true, false],
    senior_in_family: [true, false]
  };
  const MARKS_TEST_VALUES = [60, 75, 40];
  const FOLLOW_HUMAN = {
    category: 'caste category',
    marks_percent: 'marks percentage',
    minority: 'minority status',
    occupation: 'parent occupation',
    widow_in_family: 'widow status in the family',
    senior_in_family: 'senior citizen in the family'
  };

  // Saved family members (non-self only), loaded in init.
  let family = [];
  let idSeq = 0;

  function isSet(v) { return v !== null && v !== undefined; }

  function newId() {
    idSeq += 1;
    return Date.now().toString(36) + '-' + idSeq;
  }

  function newMember(role, name) {
    const m = { id: newId(), role: role, name: name || null };
    MEMBER_KEYS.forEach(function (k) { m[k] = null; });
    return m;
  }

  function saveFamily() {
    saveJSON(KEY_FAMILY, family);
  }

  function allMembers() {
    return [SELF].concat(family);
  }

  function findMember(id) {
    return family.find(function (m) { return m.id === id; }) || null;
  }

  function memberLabel(m) {
    const base = ROLE_LABEL[m.role] || 'Other';
    return m.name ? base + ' (' + m.name + ')' : base;
  }

  // A member counts once at least one of their own fields is known (self: any household field).
  function memberActive(m) {
    if (m.role === 'self') return hasKnownFields();
    return MEMBER_KEYS.some(function (k) { return isSet(m[k]); });
  }

  // Keep the first value for each member field; fill only the nulls from later values.
  function mergeFamily(existing, parsed) {
    const out = existing.slice();
    parsed.forEach(function (p) {
      let target = out.find(function (m) { return m.role === p.role; });
      if (!target) {
        target = newMember(p.role, null);
        out.push(target);
      }
      MEMBER_KEYS.forEach(function (k) {
        if (!isSet(target[k]) && isSet(p[k])) target[k] = p[k];
      });
    });
    return out;
  }

  // Family role keywords (Latin whole words, Devanagari substrings).
  const ROLE_RULES = [
    ['father', ['papa', 'pita', 'father', 'पापा', 'पिता']],
    ['mother', ['maa', 'mata', 'mother', 'माँ', 'मां', 'mummy', 'मम्मी']],
    ['sibling', ['bhai', 'behen', 'bahan', 'brother', 'sister', 'sibling', 'भाई', 'बहन']]
  ];

  // Role of one clause: the role keyword that appears earliest, or null.
  function roleOfClause(clause) {
    let best = null;
    let bestIdx = -1;
    ROLE_RULES.forEach(function (rule) {
      const i = firstIndex(clause, rule[1]);
      if (i >= 0 && (bestIdx < 0 || i < bestIdx)) {
        bestIdx = i;
        best = rule[0];
      }
    });
    return best;
  }

  // Words that show the speaker is talking about themselves.
  const SELF_KW = ['main', 'mai', 'mera', 'meri', 'mere', 'mujhe', 'i am', 'my',
    'मैं', 'मै', 'मेरा', 'मेरी', 'मेरे', 'मुझे'];
  const SIBLING_FEMALE_KW = ['behen', 'bahan', 'sister', 'बहन'];
  const SIBLING_MALE_KW = ['bhai', 'brother', 'भाई'];
  // Fields that belong to the person speaking (the rest are household-wide).
  const SELF_OWN_KEYS = ['age', 'gender', 'education_level', 'occupation',
    'widow_in_family', 'senior_in_family', 'marks_percent', 'marks_kind'];

  // Splits the text into per-person clause lists. A clause with a role word (papa, maa, behen...)
  // starts that role; a clause without one stays with the previous role in the same sentence,
  // unless it has a self word (main, mera...). A new sentence starts as "self".
  // Numbers such as 1.5 and 1,50,000 are never split.
  function roleSegments(text) {
    const t = String(text || '').toLowerCase();
    const sentences = t.split(/(?<!\d)\.(?!\d)|[;।\n]/);
    const parts = { self: [] };
    const roles = [];
    sentences.forEach(function (sentence) {
      let current = 'self';
      sentence.split(/(?<!\d),|,(?!\d)|\s+(?:aur|and)\s+/).forEach(function (clause) {
        if (!clause.trim()) return;
        let role = null;
        try { role = roleOfClause(clause); } catch (e) { role = null; }
        if (role) {
          current = role;
          if (roles.indexOf(role) < 0) roles.push(role);
        } else if (hasAny(clause, SELF_KW)) {
          current = 'self';
        }
        if (!parts[current]) parts[current] = [];
        parts[current].push(clause);
      });
    });
    return { parts: parts, roles: roles };
  }

  // Household fields come from the whole text; personal fields come only from the
  // clauses that are about the speaker, so a sibling's class never lands on "you".
  function parseSelfSituation(text) {
    const full = parseSituation(text);
    const seg = roleSegments(text);
    if (seg.roles.length === 0) return full;
    const own = parseSituation(seg.parts.self.join(', '));
    SELF_OWN_KEYS.forEach(function (k) { full[k] = own[k]; });
    return full;
  }

  // Family members named in the text: [{role, age, gender, education_level, occupation, ...}].
  // One entry per role; each reads only its own clauses.
  function parseFamilyFromText(text) {
    const seg = roleSegments(text);
    const out = [];
    seg.roles.forEach(function (role) {
      const m = newMember(role, null);
      const joined = (seg.parts[role] || []).join(', ');
      try {
        m.age = parseAge(joined);
        m.occupation = parseOccupation(joined);
        m.senior_in_family = parseSenior(joined);
        if (role === 'mother') m.widow_in_family = parseWidow(joined);
        m.education_level = parseEducation(joined);
        m.marks_percent = parseMarks(joined);
        let g = parseGender(joined);
        if (!g && role === 'father') g = 'male';
        if (!g && role === 'mother') g = 'female';
        if (!g && role === 'sibling') {
          if (hasAny(joined, SIBLING_FEMALE_KW)) g = 'female';
          else if (hasAny(joined, SIBLING_MALE_KW)) g = 'male';
        }
        m.gender = g;
      } catch (e) {
        /* keep nulls for this member */
      }
      out.push(m);
    });
    return out;
  }

  /* ---------- Rendering: chips ---------- */

  // Replace one chip with its editor; Enter saves, Escape restores.
  function startChipEdit(def, chipEl) {
    const editor = makeEditor(def, state[def.key],
      function (v) { setField(def.key, v); },
      function () { renderChips(); }
    );
    chipEl.textContent = '';
    chipEl.appendChild(editor);
    editor.focus();
  }

  function setField(key, value) {
    state[key] = value;
    saveJSON(KEY_FIELDS, state);
    renderAll();
  }

  function removeField(key) {
    setField(key, null);
  }

  function renderChips() {
    const box = document.getElementById('chips');
    if (!box) return;
    box.textContent = '';

    CHIP_DEFS.forEach(function (def) {
      const v = state[def.key];
      if (v === null || v === undefined) return;

      const chip = document.createElement('div');
      chip.className = 'chip';

      const label = document.createElement('span');
      label.className = 'chip-label';
      label.textContent = def.label + ':';

      const valueBtn = document.createElement('button');
      valueBtn.type = 'button';
      valueBtn.className = 'chip-value';
      valueBtn.textContent = chipText(def, v);
      valueBtn.setAttribute('aria-label', 'Edit ' + def.label);
      valueBtn.addEventListener('click', function () {
        startChipEdit(def, chip);
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'chip-remove';
      removeBtn.textContent = 'x';
      removeBtn.setAttribute('aria-label', 'Remove ' + def.label);
      removeBtn.addEventListener('click', function () { removeField(def.key); });

      chip.appendChild(label);
      chip.appendChild(valueBtn);
      chip.appendChild(removeBtn);
      box.appendChild(chip);
    });

    renderAddMissing(box);
  }

  // "Add missing detail": select a null field, then fill its value.
  function renderAddMissing(box) {
    const missing = CHIP_DEFS.filter(function (def) {
      return def.key !== 'state' && (state[def.key] === null || state[def.key] === undefined);
    });
    if (missing.length === 0) return;

    const row = document.createElement('div');
    row.className = 'add-missing';

    const title = document.createElement('label');
    title.textContent = 'Add missing detail: ';

    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- choose --';
    select.appendChild(placeholder);
    missing.forEach(function (def) {
      const o = document.createElement('option');
      o.value = def.key;
      o.textContent = def.label;
      select.appendChild(o);
    });
    title.appendChild(select);

    const slot = document.createElement('span');
    slot.className = 'add-slot';

    select.addEventListener('change', function () {
      const def = CHIP_DEFS.find(function (d) { return d.key === select.value; });
      slot.textContent = '';
      if (!def) return;
      const editor = makeEditor(def, null,
        function (v) { setField(def.key, v); },
        function () { select.value = ''; slot.textContent = ''; }
      );
      slot.appendChild(editor);
      editor.focus();
    });

    row.appendChild(title);
    row.appendChild(slot);
    box.appendChild(row);
  }

  /* ---------- Rendering: results ---------- */

  // Saved document ticks: {schemeId: {docIndex: true}}.
  function setDocTick(schemeId, index, checked) {
    const docs = loadJSON(KEY_DOCS, {});
    if (!docs[schemeId]) docs[schemeId] = {};
    if (checked) docs[schemeId][index] = true;
    else delete docs[schemeId][index];
    saveJSON(KEY_DOCS, docs);
  }

  function makeList(tag, items, className) {
    const list = document.createElement(tag);
    if (className) list.className = className;
    items.forEach(function (text) {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
    return list;
  }

  function makeDocList(scheme) {
    const list = document.createElement('ul');
    list.className = 'docs';
    const saved = loadJSON(KEY_DOCS, {})[scheme.id] || {};
    (scheme.documents || []).forEach(function (doc, i) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = saved[i] === true;
      box.addEventListener('change', function () {
        setDocTick(scheme.id, i, box.checked);
      });
      label.appendChild(box);
      label.appendChild(document.createTextNode(' ' + doc));
      li.appendChild(label);
      list.appendChild(li);
    });
    return list;
  }

  // Shows the Track button in its saved (tracked) or unsaved state.
  function setTrackButton(btn, tracked) {
    btn.textContent = tracked ? 'Tracked' : 'Track';
    btn.setAttribute('aria-pressed', tracked ? 'true' : 'false');
    btn.disabled = tracked;
  }

  // Amount line for a card or summary: the verified amount, or a note that it varies.
  function amountLine(evaluation) {
    return typeof evaluation.amount === 'number'
      ? 'Rs ' + evaluation.amount.toLocaleString('en-IN') + ' per year (approx)'
      : 'Amount varies, please confirm on the official site.';
  }

  // group is the member's {member, profile}; needed for the could-be quick questions.
  function makeCard(scheme, evaluation, group) {
    const card = document.createElement('article');
    card.className = 'card ' + (evaluation.status === 'likely' ? 'likely' : 'could-be');

    const h3 = document.createElement('h3');
    h3.textContent = scheme.name;
    card.appendChild(h3);

    const status = document.createElement('p');
    status.className = 'status';
    status.textContent = evaluation.status === 'likely'
      ? 'Likely eligible'
      : 'Could be eligible, tell us more';
    card.appendChild(status);

    const cat = document.createElement('p');
    cat.className = 'category';
    cat.textContent = 'Category: ' + scheme.category;
    card.appendChild(cat);

    const unknown = evaluation.rows
      .filter(function (row) { return row.result === 'unknown'; })
      .map(function (row) { return row.text.replace(/^\? /, '').split(':')[0]; });
    if (unknown.length) {
      const p = document.createElement('p');
      p.className = 'please-check';
      p.textContent = 'Please check: ' + unknown.join(', ');
      card.appendChild(p);
    }

    const benefit = document.createElement('p');
    benefit.textContent = scheme.benefit_text;
    card.appendChild(benefit);

    const amount = document.createElement('p');
    amount.className = 'amount';
    amount.textContent = amountLine(evaluation);
    card.appendChild(amount);

    if (scheme.verify_flag === true) {
      const verifyNote = document.createElement('p');
      verifyNote.className = 'verify-note';
      verifyNote.style.background = '#fff3cd';
      verifyNote.textContent = 'Limit/amount may vary, please confirm on the official site.';
      card.appendChild(verifyNote);
    }

    const whyHead = document.createElement('h4');
    whyHead.textContent = 'Why';
    card.appendChild(whyHead);
    card.appendChild(makeList('ul', evaluation.rows.map(function (row) { return row.text; }), 'reasons'));

    const docHead = document.createElement('h4');
    docHead.textContent = 'Documents to keep ready';
    card.appendChild(docHead);
    card.appendChild(makeDocList(scheme));

    const applyHead = document.createElement('h4');
    applyHead.textContent = 'How to apply';
    card.appendChild(applyHead);
    const steps = document.createElement('ol');
    (scheme.apply_steps || []).forEach(function (step) {
      const li = document.createElement('li');
      li.textContent = step;
      steps.appendChild(li);
    });
    card.appendChild(steps);

    const deadline = document.createElement('p');
    deadline.textContent = 'Deadline: ' + (scheme.deadline ? scheme.deadline : 'No fixed deadline listed');
    card.appendChild(deadline);

    const link = document.createElement('a');
    link.href = scheme.official_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Official website';
    card.appendChild(link);

    const verified = document.createElement('p');
    verified.textContent = 'Last verified: ' + scheme.last_verified;
    card.appendChild(verified);

    const fee = document.createElement('p');
    fee.className = 'fee';
    fee.textContent = 'Fee: Rs 0. If anyone asks for money, it is a red flag.';
    card.appendChild(fee);

    // Could-be cards: one quick question per unknown rule whose field we know how to ask.
    if (evaluation.status === 'could_be' && group) {
      const asks = document.createElement('div');
      asks.className = 'could-be-asks';
      const asked = {};
      evaluation.unknownRules.forEach(function (rule) {
        const key = rule.field;
        if (!FOLLOW_HUMAN[key] || asked[key] || isSet(group.profile[key])) return;
        asked[key] = true;
        const options = key === 'marks_percent' ? null : (FOLLOW_CANDIDATES[key] || []).map(function (v) {
          return { value: v, n: 1 };
        });
        asks.appendChild(makeQuestion(group.member, key, 1, options,
          'Tell us your ' + FOLLOW_HUMAN[key] + ' to check this scheme.'));
      });
      if (asks.childNodes.length) card.appendChild(asks);
    }

    const trackBtn = document.createElement('button');
    trackBtn.type = 'button';
    trackBtn.className = 'btn-secondary';
    setTrackButton(trackBtn, !!loadTracker()[scheme.id]);
    trackBtn.addEventListener('click', function () {
      const tracker = loadTracker();
      if (!tracker[scheme.id]) {
        tracker[scheme.id] = { status: 'not_started', deadline: null, savedAt: new Date().toISOString() };
        saveTracker(tracker);
      }
      setTrackButton(trackBtn, true);
      renderTracker();
    });
    card.appendChild(trackBtn);

    return card;
  }

  // Engine profile for a member: HOUSEHOLD for self; otherwise shared fields + own fields.
  function memberProfile(m) {
    if (m.role === 'self') return state;
    const p = {};
    SHARED_KEYS.forEach(function (k) { p[k] = state[k]; });
    MEMBER_KEYS.forEach(function (k) { p[k] = isSet(m[k]) ? m[k] : null; });
    return p;
  }

  /* ---------- Member matching ---------- */

  // Scheme id prefixes that are student schemes (category "Scholarship" also counts).
  const STUDENT_ID_PREFIXES = ['up-', 'pm-yasasvi', 'nmmss', 'csss', 'minority-post-matric', 'iti'];

  // Who a scheme is for: 'pension' | 'girl' | 'farmer' | 'student' | 'any'.
  // Checked in that order, so a rule table of ids and rule fields decides the audience.
  function schemeAudience(scheme) {
    const id = String(scheme.id || '');
    const rules = Array.isArray(scheme.rules) ? scheme.rules : [];
    const hasRule = function (field, value) {
      return rules.some(function (r) {
        return r && r.field === field && (value === undefined || looseEqual(r.value, value));
      });
    };
    if (scheme.category === 'Pension' || /^up-(old-age|widow)/.test(id)) return 'pension';
    if (id === 'kanya-sumangala' || hasRule('gender', 'female')) return 'girl';
    if (id === 'pm-kisan' || hasRule('occupation', 'Farmer')) return 'farmer';
    if (scheme.category === 'Scholarship' || STUDENT_ID_PREFIXES.some(function (p) { return id.indexOf(p) === 0; })) {
      return 'student';
    }
    return 'any';
  }

  // Studying: a class number or graduate, or under 25 with a known class.
  function isStudying(profile) {
    const edu = profile.education_level;
    if (typeof edu === 'number' || edu === 'graduate') return true;
    return isSet(profile.age) && Number(profile.age) < 25 && isSet(edu);
  }

  // The one member PM-KISAN is shown under: the first member (self first) whose occupation is Farmer.
  function farmerOwner() {
    return allMembers().find(function (m) { return memberProfile(m).occupation === 'Farmer'; }) || null;
  }

  // false = the scheme is skipped for this member (not listed as failed).
  function appliesToMember(scheme, member, profile) {
    switch (schemeAudience(scheme)) {
      case 'student':
        return isStudying(profile);
      case 'girl':
        return profile.gender === 'female' &&
          (isStudying(profile) || (isSet(profile.age) && Number(profile.age) <= 18));
      case 'pension': {
        if (isStudying(profile)) return false;
        const id = String(scheme.id || '');
        if (/widow/.test(id)) return profile.widow_in_family === true;
        return isSet(profile.age) && Number(profile.age) >= 60;
      }
      case 'farmer': {
        const owner = farmerOwner();
        return !!owner && owner.id === member.id;
      }
      default:
        return true;
    }
  }

  // Evaluate every active member against every scheme that applies to them.
  // Returns [{member, profile, results: [{scheme, evaluation}]}].
  function evaluateMembers() {
    const schemes = ACTIVE_SCHEMES;
    const groups = [];
    allMembers().forEach(function (m) {
      if (!memberActive(m)) return;
      const profile = memberProfile(m);
      const results = [];
      schemes.forEach(function (scheme) {
        if (!appliesToMember(scheme, m, profile)) return;
        results.push({ scheme: scheme, evaluation: evaluateScheme(scheme, profile) });
      });
      groups.push({ member: m, profile: profile, results: results });
    });
    return groups;
  }

  /* ---------- Rendering: missed money banner (Feature 1) ---------- */

  // Missed Money: sum of verified amounts over likely (member, scheme) pairs, each pair once.
  // Likely schemes with no known amount are counted separately as "amount varies".
  function renderMissed(groups) {
    const box = document.getElementById('missed-banner');
    if (!box) return;
    box.textContent = '';

    const pairs = [];
    const seen = {};
    let total = 0;
    let varies = 0;
    groups.forEach(function (g) {
      g.results.forEach(function (r) {
        if (r.evaluation.status !== 'likely') return;
        const key = g.member.id + '|' + r.scheme.id;
        if (seen[key]) return;
        seen[key] = true;
        pairs.push({ member: g.member, scheme: r.scheme, amount: r.evaluation.amount });
        if (typeof r.evaluation.amount === 'number') total += r.evaluation.amount;
        else varies += 1;
      });
    });

    if (pairs.length === 0) {
      const none = document.createElement('p');
      none.textContent = 'No likely schemes yet. Add details to see amounts.';
      box.appendChild(none);
      return;
    }

    const head = document.createElement('p');
    head.className = 'missed-total';
    head.textContent = 'At least Rs ' + total.toLocaleString('en-IN') +
      ' per year in verified amounts, plus ' + varies + ' scheme' + (varies === 1 ? '' : 's') +
      ' whose amount varies.';
    box.appendChild(head);

    const list = document.createElement('ul');
    list.className = 'missed-list';
    pairs.forEach(function (pair) {
      const li = document.createElement('li');
      li.textContent = pair.scheme.name + ' - ' +
        (typeof pair.amount === 'number' ? 'Rs ' + pair.amount.toLocaleString('en-IN') + ' per year' : 'amount varies') +
        ' (' + memberLabel(pair.member) + ')';
      list.appendChild(li);
    });
    box.appendChild(list);

    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'Amounts are approximate. Please confirm on the official website.';
    box.appendChild(note);
  }

  /* ---------- Rendering: family members (Feature 2) ---------- */

  function setFamilyField(id, key, value) {
    const m = findMember(id);
    if (!m) return;
    m[key] = value;
    saveFamily();
    renderAll();
  }

  function removeMember(id) {
    family = family.filter(function (m) { return m.id !== id; });
    saveFamily();
    renderAll();
  }

  // One member field shown as a chip; click the value to edit it (same editor as self chips).
  function makeMemberChip(m, def) {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const label = document.createElement('span');
    label.className = 'chip-label';
    label.textContent = def.label + ':';

    const valueBtn = document.createElement('button');
    valueBtn.type = 'button';
    valueBtn.className = 'chip-value';
    valueBtn.textContent = isSet(m[def.key]) ? chipText(def, m[def.key]) : 'add';
    valueBtn.setAttribute('aria-label', 'Edit ' + def.label + ' for ' + memberLabel(m));
    valueBtn.addEventListener('click', function () {
      const editor = makeEditor(def, m[def.key],
        function (v) { setFamilyField(m.id, def.key, v); },
        function () { renderAll(); }
      );
      chip.textContent = '';
      chip.appendChild(editor);
      editor.focus();
    });

    chip.appendChild(label);
    chip.appendChild(valueBtn);
    return chip;
  }

  function makeFamilyCard(m) {
    const card = document.createElement('div');
    card.className = 'family-card';

    const h = document.createElement('h3');
    h.textContent = memberLabel(m);
    card.appendChild(h);

    const fields = document.createElement('div');
    fields.className = 'family-fields';
    MEMBER_DEFS.forEach(function (def) { fields.appendChild(makeMemberChip(m, def)); });
    card.appendChild(fields);

    if (!memberActive(m)) {
      const note = document.createElement('p');
      note.className = 'muted';
      note.textContent = 'Add at least one detail to see this member\'s schemes.';
      card.appendChild(note);
    }

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'btn-secondary';
    rm.textContent = 'Remove';
    rm.setAttribute('aria-label', 'Remove ' + memberLabel(m));
    rm.addEventListener('click', function () { removeMember(m.id); });
    card.appendChild(rm);

    return card;
  }

  // Add form (role + optional name) above the cards. The Add button is #add-member-btn in index.html.
  function renderFamily() {
    const box = document.getElementById('family-list');
    if (!box) return;
    box.textContent = '';

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Your own details are the chips above.';

    const form = document.createElement('div');
    form.className = 'family-add';

    const roleSel = document.createElement('select');
    roleSel.id = 'family-role';
    roleSel.setAttribute('aria-label', 'Family member role');
    ADD_ROLES.forEach(function (role) {
      const o = document.createElement('option');
      o.value = role;
      o.textContent = ROLE_LABEL[role];
      roleSel.appendChild(o);
    });

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'family-name';
    nameInput.maxLength = 40;
    nameInput.placeholder = 'Name (optional)';
    nameInput.setAttribute('aria-label', 'Family member name');

    form.appendChild(roleSel);
    form.appendChild(nameInput);
    box.appendChild(hint);
    box.appendChild(form);

    family.forEach(function (m) { box.appendChild(makeFamilyCard(m)); });
  }

  // Reads the add form and pushes a new member with all per-member fields null.
  function addMemberFromForm() {
    const roleSel = document.getElementById('family-role');
    const nameInput = document.getElementById('family-name');
    const role = roleSel && ADD_ROLES.indexOf(roleSel.value) >= 0 ? roleSel.value : 'other';
    const name = nameInput ? nameInput.value.trim().slice(0, 40) : '';
    family.push(newMember(role, name));
    saveFamily();
    renderAll();
  }

  /* ---------- Rendering: smart follow-up (Feature 3a) ---------- */

  // Number of schemes that are not likely now but would become likely if key were set to candidate.
  function unlockCount(group, key, candidate) {
    const test = Object.assign({}, group.profile);
    test[key] = candidate;
    let n = 0;
    group.results.forEach(function (r) {
      if (r.evaluation.status === 'likely') return;
      if (evaluateScheme(r.scheme, test).status === 'likely') n++;
    });
    return n;
  }

  // Candidate answers that unlock at least one scheme: [{value, n}].
  function candidateList(group, key) {
    const values = key === 'marks_percent' ? MARKS_TEST_VALUES : FOLLOW_CANDIDATES[key];
    const out = [];
    values.forEach(function (v) {
      const n = unlockCount(group, key, v);
      if (n >= 1) out.push({ value: v, n: n });
    });
    return out;
  }

  // Household/self fields go to HOUSEHOLD; other fields go to that family member.
  function applyAnswer(member, key, value) {
    if (member.role === 'self' || SHARED_KEYS.indexOf(key) >= 0) setField(key, value);
    else setFamilyField(member.id, key, value);
  }

  function answerLabel(v) {
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  }

  function makeQuestion(member, key, n, options, lineText) {
    const q = document.createElement('div');
    q.className = 'follow-q';

    const line = document.createElement('p');
    line.textContent = lineText || ('If you tell us your ' + FOLLOW_HUMAN[key] + ', ' + n + ' more ' +
      (n === 1 ? 'scheme' : 'schemes') + ' may open.');
    q.appendChild(line);

    const row = document.createElement('div');
    row.className = 'follow-answers';

    if (key === 'marks_percent') {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.setAttribute('aria-label', 'Marks percentage');
      const setBtn = document.createElement('button');
      setBtn.type = 'button';
      setBtn.textContent = 'Set';
      setBtn.addEventListener('click', function () {
        const v = Number(input.value);
        if (input.value === '' || isNaN(v) || v < 0 || v > 100) {
          input.classList.add('invalid');
          return;
        }
        applyAnswer(member, key, Math.round(v * 100) / 100);
      });
      row.appendChild(input);
      row.appendChild(setBtn);
    } else {
      options.forEach(function (o) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = answerLabel(o.value);
        b.addEventListener('click', function () { applyAnswer(member, key, o.value); });
        row.appendChild(b);
      });
    }

    q.appendChild(row);
    return q;
  }

  // Questions for missing fields, kept only when they unlock at least one scheme.
  function renderFollowUp(groups) {
    const box = document.getElementById('follow-up');
    if (!box) return;
    box.textContent = '';

    const blocks = [];
    groups.forEach(function (g) {
      const qs = [];
      FOLLOW_FIELDS.forEach(function (key) {
        if (isSet(g.profile[key])) return;
        const options = candidateList(g, key);
        if (options.length === 0) return;
        const best = Math.max.apply(null, options.map(function (o) { return o.n; }));
        qs.push(makeQuestion(g.member, key, best, key === 'marks_percent' ? null : options));
      });
      if (qs.length) blocks.push({ member: g.member, qs: qs });
    });

    if (blocks.length === 0) return;

    const head = document.createElement('h2');
    head.textContent = 'Tell us more to find more schemes';
    box.appendChild(head);

    blocks.forEach(function (b) {
      const sec = document.createElement('div');
      sec.className = 'follow-member';
      const h = document.createElement('h3');
      h.textContent = memberLabel(b.member);
      sec.appendChild(h);
      b.qs.forEach(function (q) { sec.appendChild(q); });
      box.appendChild(sec);
    });
  }

  /* ---------- Rendering: not matched (Feature 3b) ---------- */

  // Not matched: one block per scheme listing each failed rule's reason (status 'not_matched').
  function renderNotMatched(groups) {
    const box = document.getElementById('not-matched');
    const wrap = document.getElementById('not-matched-wrap');
    if (!box) return;
    box.textContent = '';

    let count = 0;
    groups.forEach(function (g) {
      g.results.forEach(function (r) {
        if (r.evaluation.status !== 'not_matched') return;
        count++;
        const block = document.createElement('div');
        block.className = 'scheme-fail';
        const h = document.createElement('h3');
        h.textContent = r.scheme.name + ' (' + memberLabel(g.member) + ')';
        block.appendChild(h);
        r.evaluation.reasons.forEach(function (text) {
          const reason = document.createElement('p');
          reason.className = 'fail-reason';
          reason.textContent = text;
          block.appendChild(reason);
        });
        box.appendChild(block);
      });
    });

    if (wrap) wrap.hidden = count === 0;
  }

  /* ---------- Rendering: results grouped by member ---------- */

  function renderResults() {
    const section = document.getElementById('results');
    if (!section) return;

    // Clear only our own result blocks: the banner, follow-up and not-matched boxes live in this section.
    Array.prototype.slice.call(section.children).forEach(function (el) {
      if (el.classList.contains('member-group') || el.classList.contains('empty')) el.remove();
    });

    const groups = evaluateMembers();
    renderMissed(groups);
    renderFollowUp(groups);
    renderNotMatched(groups);

    if (groups.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'empty';
      msg.textContent = 'Add your details to see schemes';
      section.appendChild(msg);
      return;
    }

    groups.forEach(function (g) {
      const wrap = document.createElement('div');
      wrap.className = 'member-group';
      const h = document.createElement('h2');
      h.textContent = g.member.role === 'self' ? 'For you' : 'For ' + memberLabel(g.member);
      wrap.appendChild(h);

      const likely = g.results.filter(function (r) { return r.evaluation.status === 'likely'; });
      const couldBe = g.results.filter(function (r) { return r.evaluation.status === 'could_be'; });

      if (likely.length) {
        const sub = document.createElement('h3');
        sub.textContent = 'Likely eligible';
        wrap.appendChild(sub);
        likely.forEach(function (r) { wrap.appendChild(makeCard(r.scheme, r.evaluation, g)); });
      }

      if (couldBe.length) {
        const sub = document.createElement('h3');
        sub.textContent = 'Could be eligible, tell us more';
        wrap.appendChild(sub);
        couldBe.forEach(function (r) { wrap.appendChild(makeCard(r.scheme, r.evaluation, g)); });
      }

      if (!likely.length && !couldBe.length) {
        const none = document.createElement('p');
        none.className = 'muted';
        none.textContent = 'No likely or possible schemes for this member yet.';
        wrap.appendChild(none);
      }

      section.appendChild(wrap);
    });
  }

  /* ---------- Rendering: application tracker (Steps 2-3) ---------- */

  // Sort key: YYYY-MM-DD strings sort correctly; null deadlines sort last.
  function trackerSortKey(item) {
    return item.deadline ? item.deadline : '\uffff';
  }

  // Days until a YYYY-MM-DD deadline, counted from today's local midnight.
  // kind: 'none' (no valid deadline), 'overdue' (past), 'due-soon' (0-7 days), 'ok' (later).
  function dueInfo(deadlineStr) {
    if (typeof deadlineStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
      return { kind: 'none', days: null, text: 'No deadline set' };
    }
    const parts = deadlineStr.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { kind: 'overdue', days: days, text: 'Deadline passed' };
    if (days <= 7) return { kind: 'due-soon', days: days, text: 'Due in ' + days + ' days' };
    return { kind: 'ok', days: days, text: 'Deadline: ' + deadlineStr };
  }

  // Fills #applications-list with tracked schemes. Does nothing if the element is absent.
  function renderTracker() {
    const list = document.getElementById('applications-list');
    if (!list) return;
    const tracker = loadTracker();

    const items = Object.keys(tracker).map(function (id) {
      const entry = tracker[id] || {};
      const scheme = ACTIVE_SCHEMES.find(function (s) { return s.id === id; });
      const validStatus = TRACKER_STATUSES.some(function (s) { return s.value === entry.status; });
      return {
        id: id,
        name: scheme ? scheme.name : id,
        status: validStatus ? entry.status : 'not_started',
        deadline: typeof entry.deadline === 'string' && entry.deadline ? entry.deadline : null
      };
    });

    items.sort(function (a, b) {
      const ka = trackerSortKey(a);
      const kb = trackerSortKey(b);
      if (ka !== kb) return ka < kb ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    list.textContent = '';
    items.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'tracker-row';

      const info = dueInfo(item.deadline);
      let kind = info.kind;
      let text = info.text;
      if (item.status === 'approved' && (kind === 'due-soon' || kind === 'overdue')) {
        kind = 'ok';
        text = 'Deadline: ' + item.deadline;
      }
      if (kind === 'due-soon' || kind === 'overdue') row.classList.add(kind);

      const name = document.createElement('strong');
      name.textContent = item.name;
      row.appendChild(name);

      const sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Status for ' + item.name);
      TRACKER_STATUSES.forEach(function (s) {
        const opt = document.createElement('option');
        opt.value = s.value;
        opt.textContent = s.label;
        if (s.value === item.status) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', function () {
        const tr = loadTracker();
        if (!tr[item.id]) return;
        tr[item.id].status = sel.value;
        saveTracker(tr);
        renderTracker();
      });
      row.appendChild(sel);

      const date = document.createElement('input');
      date.type = 'date';
      date.value = item.deadline || '';
      date.setAttribute('aria-label', 'Deadline for ' + item.name);
      date.addEventListener('change', function () {
        const tr = loadTracker();
        if (!tr[item.id]) return;
        tr[item.id].deadline = date.value || null;
        saveTracker(tr);
        renderTracker();
      });
      row.appendChild(date);

      const dueText = document.createElement('span');
      dueText.className = 'due-text';
      dueText.textContent = text;
      row.appendChild(dueText);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-secondary';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () {
        const tr = loadTracker();
        delete tr[item.id];
        saveTracker(tr);
        renderTracker();
        renderResults();
      });
      row.appendChild(remove);

      list.appendChild(row);
    });
  }

  /* ---------- Deadline reminder banner ---------- */

  // Counts tracked schemes due within 7 days (not approved) and shows #deadline-banner.
  function renderDeadlineBanner() {
    const banner = document.getElementById('deadline-banner');
    if (!banner) return;
    const tracker = loadTracker();
    const count = Object.keys(tracker).filter(function (id) {
      const entry = tracker[id] || {};
      return entry.status !== 'approved' && dueInfo(entry.deadline).kind === 'due-soon';
    }).length;

    banner.textContent = '';
    if (count === 0) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    banner.textContent = count + ' application deadline(s) in the next 7 days.';
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'btn-secondary';
    openBtn.textContent = 'Open My Applications';
    openBtn.addEventListener('click', function () { showTab('applications'); });
    banner.appendChild(openBtn);
  }

  /* ---------- Printable summary (new tab) ---------- */

  // Builds the summary from the same evaluateMembers() output that renderResults uses.
  function openSummary() {
    const status = document.getElementById('summary-status');
    function setSummaryStatus(text) {
      if (status) status.textContent = text;
    }

    const win = window.open('', '_blank');
    if (!win) {
      setSummaryStatus('Pop-up blocked. Allow pop-ups for this page to download the summary.');
      return;
    }

    try {
      const doc = win.document;
      const now = new Date();
      const pad = function (n) { return String(n).padStart(2, '0'); };
      const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

      doc.title = "Claim What's Yours - Summary";
      const style = doc.createElement('style');
      style.textContent = 'body{background:#fff;color:#222;font-family:Arial,sans-serif;margin:24px;}' +
        'h1{font-size:22px;}h2{font-size:18px;margin-top:20px;}' +
        'li{margin-bottom:12px;}a{color:#0645ad;}' +
        '@media print{.no-print{display:none;}}';
      doc.head.appendChild(style);

      const toolbar = doc.createElement('div');
      toolbar.className = 'no-print';
      const printBtn = doc.createElement('button');
      printBtn.type = 'button';
      printBtn.textContent = 'Print';
      printBtn.addEventListener('click', function () { win.print(); });
      toolbar.appendChild(printBtn);
      doc.body.appendChild(toolbar);

      const root = doc.createElement('div');
      root.className = 'print-summary';

      const h1 = doc.createElement('h1');
      h1.textContent = "Claim What's Yours - Summary";
      root.appendChild(h1);

      const gen = doc.createElement('p');
      gen.textContent = 'Generated: ' + today;
      root.appendChild(gen);

      evaluateMembers().forEach(function (g) {
        const heading = doc.createElement('h2');
        heading.textContent = g.member.role === 'self' ? 'For you' : 'For ' + memberLabel(g.member);
        root.appendChild(heading);

        const likely = g.results.filter(function (r) { return r.evaluation.status === 'likely'; });
        if (likely.length === 0) {
          const none = doc.createElement('p');
          none.textContent = 'No likely-eligible schemes for this member.';
          root.appendChild(none);
          return;
        }

        const list = doc.createElement('ul');
        likely.forEach(function (r) {
          const scheme = r.scheme;
          const li = doc.createElement('li');

          const name = doc.createElement('strong');
          name.textContent = scheme.name;
          li.appendChild(name);

          const amt = doc.createElement('p');
          amt.textContent = amountLine(r.evaluation);
          li.appendChild(amt);

          const docsHead = doc.createElement('p');
          docsHead.textContent = 'Documents to keep ready:';
          li.appendChild(docsHead);
          const docs = doc.createElement('ul');
          (scheme.documents || []).forEach(function (d) {
            const di = doc.createElement('li');
            di.textContent = '[ ] ' + d;
            docs.appendChild(di);
          });
          li.appendChild(docs);

          if (typeof scheme.official_url === 'string' && /^https:\/\//.test(scheme.official_url)) {
            const a = doc.createElement('a');
            a.href = scheme.official_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = 'Official website';
            li.appendChild(a);
          }

          const verified = doc.createElement('p');
          verified.textContent = 'Last verified: ' + scheme.last_verified;
          li.appendChild(verified);

          list.appendChild(li);
        });
        root.appendChild(list);
      });

      const fee = doc.createElement('p');
      fee.textContent = 'Fee: Rs 0. If anyone asks for money, it is a red flag.';
      root.appendChild(fee);

      const footer = doc.createElement('footer');
      footer.textContent = DISCLAIMER;
      root.appendChild(footer);

      doc.body.appendChild(root);
      doc.close();
      setSummaryStatus('Summary opened in a new tab.');
    } catch (e) {
      setSummaryStatus('Could not build the summary. Please try again.');
    }
  }

  /* ---------- Tabs: Find schemes / My Applications ---------- */

  // name is 'find' or 'applications'; any other value shows the Find panel.
  function showTab(name) {
    const isApps = name === 'applications';
    const findPanel = document.getElementById('find-panel');
    const appsPanel = document.getElementById('applications-panel');
    const tabFind = document.getElementById('tab-find');
    const tabApps = document.getElementById('tab-applications');
    if (findPanel) findPanel.hidden = isApps;
    if (appsPanel) appsPanel.hidden = !isApps;
    if (tabFind) tabFind.setAttribute('aria-selected', isApps ? 'false' : 'true');
    if (tabApps) tabApps.setAttribute('aria-selected', isApps ? 'true' : 'false');
  }

  function renderAll() {
    renderChips();
    renderFamily();
    renderResults();
    renderTracker();
    renderDeadlineBanner();
  }

  /* ---------- Voice input (Feature 4) ---------- */

  function initVoice() {
    const mic = document.getElementById('mic');
    const langSel = document.getElementById('voice-lang');
    const status = document.getElementById('voice-status');
    const textarea = document.getElementById('situation');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    if (!SR) {
      if (mic) mic.disabled = true;
      setStatus('Voice input is not supported in this browser. Please type your situation.');
      return;
    }

    const savedLang = loadJSON(KEY_VOICE_LANG, null);
    if (langSel && typeof savedLang === 'string' &&
        Array.prototype.some.call(langSel.options, function (o) { return o.value === savedLang; })) {
      langSel.value = savedLang;
    }
    if (langSel) {
      langSel.addEventListener('change', function () { saveJSON(KEY_VOICE_LANG, langSel.value); });
    }
    if (!mic) return;

    mic.addEventListener('click', function () {
      let hadError = false;
      try {
        const recognition = new SR();
        recognition.lang = langSel ? langSel.value : 'hi-IN';
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onstart = function () {
          setStatus('Listening...');
          mic.classList.add('listening');
        };
        recognition.onresult = function (ev) {
          const first = ev.results && ev.results[0] && ev.results[0][0];
          const transcript = first ? String(first.transcript || '').trim() : '';
          if (!transcript || !textarea) return;
          let cur = textarea.value;
          if (cur && !/\s$/.test(cur)) cur += ' ';
          textarea.value = cur + transcript;
          saveJSON(KEY_SITUATION, textarea.value);
        };
        recognition.onerror = function () {
          hadError = true;
          setStatus('Could not hear you. Please try again or type your situation.');
        };
        recognition.onend = function () {
          mic.classList.remove('listening');
          if (!hadError) setStatus('');
        };
        recognition.start();
      } catch (e) {
        mic.classList.remove('listening');
        setStatus('Voice input could not start. Please type your situation.');
      }
    });
  }

  /* ---------- Full analysis, start over ---------- */

  // Clears every previous output block so nothing from an earlier analyse survives.
  function clearOutput() {
    ['missed-banner', 'family-list', 'follow-up', 'not-matched'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    // Scheme cards and empty notes sit in #results beside the buttons; remove only those.
    const section = document.getElementById('results');
    if (section) {
      Array.prototype.slice.call(section.children).forEach(function (el) {
        if (el.classList.contains('member-group') || el.classList.contains('empty')) el.remove();
      });
    }
  }

  // The one full re-run used by Analyse and Check eligibility. Rebuilds state and family
  // from the text only (no merge with the previous run), then re-renders everything.
  function runFullAnalysis(text) {
    const analyseBtn = document.getElementById('analyse');
    const voiceStatus = document.getElementById('voice-status');
    if (analyseBtn) {
      analyseBtn.disabled = true;
      analyseBtn.textContent = 'Analysing...';
    }
    if (voiceStatus) voiceStatus.textContent = 'Analysing...';
    try {
      saveJSON(KEY_SITUATION, text);
      clearOutput();
      state = parseSelfSituation(text);
      saveJSON(KEY_FIELDS, state);
      family = parseFamilyFromText(text);
      saveFamily();
      renderAll();
    } finally {
      if (analyseBtn) {
        analyseBtn.disabled = false;
        analyseBtn.textContent = 'Analyse';
      }
      if (voiceStatus) voiceStatus.textContent = '';
    }
  }

  // Clears the in-memory profile and saved inputs. Saved applications (cwy-tracker) are kept.
  function startOver() {
    const textarea = document.getElementById('situation');
    const hasData = (textarea && textarea.value.trim() !== '') || hasKnownFields() || family.length > 0;
    if (hasData && !window.confirm('Clear your details and start over?')) return;
    state = emptyState();
    family = [];
    [KEY_SITUATION, KEY_FIELDS, KEY_FAMILY, KEY_DOCS].forEach(function (key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        /* storage blocked: memory is already cleared */
      }
    });
    if (textarea) textarea.value = '';
    clearOutput();
    renderAll();
  }

  /* ---------- Startup ---------- */

  // Load saved family members, dropping anything malformed.
  function loadFamily() {
    const saved = loadJSON(KEY_FAMILY, []);
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(function (m) {
        return m && typeof m === 'object' && typeof m.id === 'string' &&
          typeof m.role === 'string' && m.role !== 'self';
      })
      .map(function (m) {
        const clean = {
          id: m.id,
          role: ROLE_LABEL[m.role] ? m.role : 'other',
          name: typeof m.name === 'string' ? m.name : null
        };
        MEMBER_KEYS.forEach(function (k) { clean[k] = isSet(m[k]) ? m[k] : null; });
        return clean;
      });
  }

  function init() {
    const textarea = document.getElementById('situation');
    const analyseBtn = document.getElementById('analyse');
    const recheckBtn = document.getElementById('recheck');
    const addMemberBtn = document.getElementById('add-member-btn');
    const disclaimer = document.getElementById('disclaimer-slot');

    if (disclaimer) disclaimer.textContent = DISCLAIMER;

    const privacy = document.getElementById('privacy-note');
    if (privacy) privacy.textContent = APP_CONFIG.privacyNote;

    // Restore saved text, saved fields and saved family members.
    const savedText = loadJSON(KEY_SITUATION, '');
    if (textarea && typeof savedText === 'string') textarea.value = savedText;
    state = Object.assign(emptyState(), loadJSON(KEY_FIELDS, {}));
    state.state = state.state || 'UP';
    family = loadFamily();

    if (analyseBtn) {
      analyseBtn.addEventListener('click', function () {
        runFullAnalysis(textarea ? textarea.value : '');
      });
    }

    if (recheckBtn) {
      recheckBtn.addEventListener('click', function () {
        const text = textarea ? textarea.value : '';
        if (text.trim() === '') {
          renderAll();
          return;
        }
        runFullAnalysis(text);
      });
    }

    // Start over button, placed right after Analyse in the input section.
    if (analyseBtn && analyseBtn.parentNode) {
      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn-secondary';
      startBtn.textContent = 'Start over';
      startBtn.addEventListener('click', startOver);
      analyseBtn.parentNode.insertBefore(startBtn, analyseBtn.nextSibling);
    }

    if (addMemberBtn) {
      addMemberBtn.addEventListener('click', addMemberFromForm);
    }

    const tabFind = document.getElementById('tab-find');
    const tabApps = document.getElementById('tab-applications');
    const summaryBtn = document.getElementById('download-summary');
    if (tabFind) tabFind.addEventListener('click', function () { showTab('find'); });
    if (tabApps) tabApps.addEventListener('click', function () { showTab('applications'); });
    if (summaryBtn) summaryBtn.addEventListener('click', function () { openSummary(); });

    initVoice();
    renderAll();
    renderDeadlineBanner();
  }

  document.addEventListener('DOMContentLoaded', init);

  // Test hook: the only global this file adds.
  if (typeof window !== 'undefined') {
    window.CWY_PARSER = { parseSituation: parseSituation, parseFamilyFromText: parseFamilyFromText };
  }
})();