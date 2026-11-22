const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const store = new Map();
const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const listeners = {}, els = {};
function makeEl(id) {
  const el = {
    id, textContent: '', innerHTML: '', value: '', hidden: false, disabled: false, style: {}, children: [], handlers: {},
    classList: { _s: new Set(), add(...a) { a.forEach(x => this._s.add(x)); }, remove(...a) { a.forEach(x => this._s.delete(x)); },
      toggle(x, f) { const on = f === undefined ? !this._s.has(x) : !!f; on ? this._s.add(x) : this._s.delete(x); return on; },
      contains(x) { return this._s.has(x); } },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); return c; },
    addEventListener(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); },
    querySelector() { return makeEl('(q)'); }, querySelectorAll() { return []; },
    setAttribute() {}, removeAttribute() {}, focus() {}, remove() {},
  };
  return el;
}
const document = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  querySelector() { return makeEl('(q)'); }, querySelectorAll() { return []; },
  createElement() { return makeEl('(new)'); }, createTextNode(t) { const n = makeEl('#text'); n.textContent = String(t); return n; },
  addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
  body: makeEl('body'),
};
const c = { document, localStorage, console, setTimeout: fn => { fn(); return 0; }, clearTimeout() {} };
c.window = c;
vm.createContext(c);
function texts(el, tag) {
  const out = [];
  (function walk(n) {
    if (!n) return;
    if (n.textContent && String(n.textContent).trim()) out.push(tag + ': ' + String(n.textContent).trim());
    (n.children || []).forEach(walk);
  })(el);
  return out;
}
function step(n, text) {
  els.situation.value = text;
  const hs = (els.analyse.handlers.click || []);
  if (!hs.length) throw new Error('no click handler on #analyse');
  hs.forEach(f => f({ target: els.analyse, preventDefault() {} }));
  console.log('STEP ' + n + ' input: ' + JSON.stringify(text));
  console.log('STEP ' + n + ' cwy-fields JSON: ' + (store.get('cwy-fields') ?? null));
  console.log('STEP ' + n + ' cwy-family JSON: ' + (store.get('cwy-family') ?? null));
  ['family-list', 'results'].forEach(id => {
    const el = els[id];
    if (!el) { console.log('STEP ' + n + ' ' + id + ': element not created'); return; }
    texts(el, id).forEach(s => console.log('STEP ' + n + ' ' + s));
    if (el.innerHTML) console.log('STEP ' + n + ' ' + id + ' innerHTML length ' + String(el.innerHTML).length);
  });
}
try {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'schemes.js'), 'utf8'), c, { filename: 'schemes.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), c, { filename: 'app.js' });
  (listeners.DOMContentLoaded || []).forEach(fn => fn({}));
  console.log('analyse click handlers: ' + (els.analyse.handlers.click || []).length);
  step(1, 'Main 17 saal ki ladki hu, 11th mein, UP se, papa kisan hain, maa vidhwa hain, family income 1.5 lakh, hum OBC hain.');
  const fam1 = JSON.parse(store.get('cwy-family') || '[]');
  console.log('STEP 1 stored family array length: ' + fam1.length);
  fam1.forEach((m, i) => { if (/father|mother/i.test(JSON.stringify(m))) console.log('STEP 1 member ' + i + ' ' + JSON.stringify(m).slice(0, 300) + ' | scholarship mention: ' + /scholarship/i.test(JSON.stringify(m))); });
  step(2, 'Main 11th mein hu, UP se.');
  const f2 = JSON.parse(store.get('cwy-family') || '[]');
  const f2txt = ['family-list', 'results'].map(id => { const el = els[id]; return el ? id + ' ' + texts(el, id).join(' || ') + ' ' + String(el.innerHTML || '') : ''; }).join(' ');
  console.log('STEP 2 stored family array length: ' + f2.length + ' relations: ' + JSON.stringify(f2.map(m => m.relation || m.role || m.name)));
  console.log('STEP 2 Father/Mother in family-list or results: ' + /Father|Mother/.test(f2txt));
  const f1 = JSON.parse(store.get('cwy-fields') || '{}');
  console.log('STEP 2 education_level: ' + JSON.stringify(f1.education_level));
} catch (e) {
  console.log('HARNESS THREW: ' + (e && e.name) + ' - ' + (e && e.message));
  if (e && e.stack) console.log(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exitCode = 1;
}
