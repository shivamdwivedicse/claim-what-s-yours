const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const schemesSrc = fs.readFileSync(path.join(root, 'schemes.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const domListeners = {};
function makeEl() {
  const classes = new Set();
  return {
    textContent: '',
    className: '',
    style: {},
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c) => (classes.has(c) ? classes.delete(c) : classes.add(c)),
    },
    appendChild() {},
    addEventListener() {},
    setAttribute() {},
  };
}

const body = makeEl();
const document = {
  getElementById: () => null,
  createElement: () => makeEl(),
  querySelector: () => null,
  body,
  addEventListener: (type, cb) => { domListeners[type] = cb; },
};
body.appendChild = () => {};

const ctx = {
  document,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  console,
};
ctx.window = ctx;
vm.createContext(ctx);

vm.runInContext(schemesSrc, ctx, { filename: 'schemes.js' });
vm.runInContext(appSrc, ctx, { filename: 'app.js' });

console.log('DOMContentLoaded recorded: ' + (typeof domListeners.DOMContentLoaded));
if (domListeners.DOMContentLoaded) {
  try {
    domListeners.DOMContentLoaded();
    console.log('DOMContentLoaded ran with no error');
  } catch (e) {
    console.log('DOMContentLoaded error: ' + (e && e.message));
  }
}

console.log('CWY_PARSER present: ' + Boolean(ctx.window.CWY_PARSER));
const parse = ctx.window.CWY_PARSER.parseSituation;

const text1 = 'Main 17 saal ki ladki hu, 11th mein, UP se, papa kisan hain, maa vidhwa hain, family income 1.5 lakh, hum OBC hain.';
const r1 = parse(text1);
console.log('RESULT1=' + JSON.stringify(r1));

const keys = [
  'state', 'education_level', 'category', 'income', 'gender', 'age', 'occupation',
  'minority', 'widow_in_family', 'marks_percent', 'school_type', 'previous_marks_percent',
  'other_scholarship', 'other_pension', 'girls_in_family', 'children_in_family',
  'course_type', 'minority_students_in_family', 'is_income_tax_payer', 'is_govt_employee',
  'attendance_percent', 'selection_test_percent',
];
for (const k of keys) {
  const own = Object.prototype.hasOwnProperty.call(r1, k);
  console.log(k + ' own=' + own + ' value=' + JSON.stringify(own ? r1[k] : undefined));
}

const r2 = parse('Main 11th mein hu, UP se.');
console.log('RESULT2=' + JSON.stringify(r2));
