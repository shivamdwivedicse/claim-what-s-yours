// parser.test.js - plain Node, no dependencies.
// Loads schemes.js and app.js into a vm context with a minimal stub DOM, fires the
// DOMContentLoaded hook, then checks the parser exposed as window.CWY_PARSER.
// Run with: node parser.test.js   (exit code 0 only if all cases pass)

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = __dirname;
const schemesSrc = fs.readFileSync(path.join(root, 'schemes.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// Minimal element stub: enough surface for app.js to run without a real DOM.
function makeStub() {
  return {
    textContent: '',
    value: '',
    children: [],
    style: {},
    classList: {
      add: function () {},
      remove: function () {},
      contains: function () { return false; },
      toggle: function () {}
    },
    appendChild: function (child) { this.children.push(child); return child; },
    addEventListener: function () {},
    remove: function () {},
    setAttribute: function () {},
    getAttribute: function () { return null; },
    focus: function () {}
  };
}

// In-memory localStorage.
function makeStorage() {
  const data = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

const captured = [];
const context = {
  console: console,
  localStorage: makeStorage(),
  document: {
    getElementById: function () { return makeStub(); },
    createElement: function () { return makeStub(); },
    querySelector: function () { return null; },
    addEventListener: function (type, fn) {
      if (type === 'DOMContentLoaded') captured.push(fn);
    }
  }
};
context.window = context; // no SpeechRecognition on window
vm.createContext(context);

vm.runInContext(schemesSrc, context, { filename: 'schemes.js' });
vm.runInContext(appSrc, context, { filename: 'app.js' });

// Fire the DOMContentLoaded hook. A stub-DOM error here does not stop the parser tests.
captured.forEach(function (fn) {
  try {
    fn();
  } catch (e) {
    console.log('note: DOMContentLoaded hook threw under stub DOM: ' + e.message);
  }
});

const P = context.window.CWY_PARSER;
if (!P) {
  console.log('FAIL setup: window.CWY_PARSER is not defined');
  process.exit(1);
}

const cases = [];
function addCase(name, fn) { cases.push({ name: name, fn: fn }); }

addCase('1. "Main 11th mein hu, UP se." -> education_level 11, state UP', function () {
  const r = P.parseSituation('Main 11th mein hu, UP se.');
  assert.strictEqual(r.education_level, 11);
  assert.strictEqual(r.state, 'UP');
});

addCase('2. "Main 17 saal ki ladki hu, 11th mein, UP se" -> age 17, female, class 11', function () {
  const r = P.parseSituation('Main 17 saal ki ladki hu, 11th mein, UP se');
  assert.strictEqual(r.age, 17);
  assert.strictEqual(r.gender, 'female');
  assert.strictEqual(r.education_level, 11);
});

addCase('3. "class 9 me hu" -> education_level 9', function () {
  const r = P.parseSituation('class 9 me hu');
  assert.strictEqual(r.education_level, 9);
});

addCase('4. "11वीं में पढ़ती हूँ" -> education_level 11', function () {
  const r = P.parseSituation('11वीं में पढ़ती हूँ');
  assert.strictEqual(r.education_level, 11);
});

addCase('5. "gyarvi mein hu" -> education_level 11', function () {
  const r = P.parseSituation('gyarvi mein hu');
  assert.strictEqual(r.education_level, 11);
});

addCase('6. "B.Tech first year" -> education_level "graduate"', function () {
  const r = P.parseSituation('B.Tech first year');
  assert.strictEqual(r.education_level, 'graduate');
});

addCase('7. "BA first year, UP se" -> education_level "graduate"', function () {
  const r = P.parseSituation('BA first year, UP se');
  assert.strictEqual(r.education_level, 'graduate');
});

addCase('8. "PG kar raha hu" -> education_level "graduate"', function () {
  const r = P.parseSituation('PG kar raha hu');
  assert.strictEqual(r.education_level, 'graduate');
});

addCase('9. "income 1.5 lakh, SC" -> income 150000, category SC', function () {
  const r = P.parseSituation('income 1.5 lakh, SC');
  assert.strictEqual(r.income, 150000);
  assert.strictEqual(r.category, 'SC');
});

addCase('10. "dedh lakh income, OBC" -> income 150000, category OBC', function () {
  const r = P.parseSituation('dedh lakh income, OBC');
  assert.strictEqual(r.income, 150000);
  assert.strictEqual(r.category, 'OBC');
});

addCase('11. "12 hazaar mahina, Muslim" -> income 144000, minority true', function () {
  const r = P.parseSituation('12 hazaar mahina, Muslim');
  assert.strictEqual(r.income, 144000);
  assert.strictEqual(r.minority, true);
});

addCase('12. "income 150000, gaon se, sarkari school" -> income 150000, place rural, school_type government', function () {
  const r = P.parseSituation('income 150000, gaon se, sarkari school');
  assert.strictEqual(r.income, 150000);
  assert.strictEqual(r.place, 'rural');
  assert.strictEqual(r.school_type, 'government');
});

addCase('13. "65% marks, class 10, General" -> marks_percent 65, education_level 10, category General', function () {
  const r = P.parseSituation('65% marks, class 10, General');
  assert.strictEqual(r.marks_percent, 65);
  assert.strictEqual(r.education_level, 10);
  assert.strictEqual(r.category, 'General');
});

addCase('14. "17 saal ki umar, 1.5 lakh" -> age 17, income 150000, education_level null', function () {
  const r = P.parseSituation('17 saal ki umar, 1.5 lakh');
  assert.strictEqual(r.age, 17);
  assert.strictEqual(r.income, 150000);
  assert.strictEqual(r.education_level, null);
});

addCase('15. "papa kisan hain aur maa vidhwa hain" -> father Farmer, mother widow_in_family true', function () {
  const family = P.parseFamilyFromText('papa kisan hain aur maa vidhwa hain');
  const father = family.find(function (m) { return m.role === 'father'; });
  const mother = family.find(function (m) { return m.role === 'mother'; });
  assert.ok(father, 'father member missing');
  assert.strictEqual(father.occupation, 'Farmer');
  assert.ok(mother, 'mother member missing');
  assert.strictEqual(mother.widow_in_family, true);
});

let failed = 0;
cases.forEach(function (c) {
  try {
    c.fn();
    console.log('PASS ' + c.name);
  } catch (e) {
    failed += 1;
    console.log('FAIL ' + c.name + '\n     ' + (e && e.message ? e.message : e));
  }
});

console.log('\n' + (cases.length - failed) + ' of ' + cases.length + ' passed');
process.exit(failed === 0 ? 0 : 1);
