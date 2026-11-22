const fs = require('fs'), vm = require('vm');
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
function names(el) {
  const out = [];
  (function walk(n) {
    if (!n) return;
    if (n.textContent && String(n.textContent).trim()) out.push(String(n.textContent).trim());
    (n.children || []).forEach(walk);
  })(el);
  if (el && el.innerHTML) out.push('[innerHTML] ' + String(el.innerHTML).slice(0, 400));
  return out.map(s => s.slice(0, 160)).slice(0, 60);
}
function analyse(label, text) {
  els.situation.value = text;
  const hs = (els.analyse.handlers.click || []);
  if (!hs.length) throw new Error('no click handler on #analyse');
  hs.forEach(f => f({ target: els.analyse, preventDefault() {} }));
  console.log('=== ' + label + ' | input: ' + JSON.stringify(text));
  console.log('cwy-fields:', store.get('cwy-fields') ?? null);
  console.log('cwy-family:', store.get('cwy-family') ?? null);
  console.log('#results text:', JSON.stringify(names(els.results)));
  console.log('#family-list text:', JSON.stringify(names(els['family-list'])));
}
try {
  vm.runInContext(fs.readFileSync('schemes.js', 'utf8'), c, { filename: 'schemes.js' });
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), c, { filename: 'app.js' });
  (listeners.DOMContentLoaded || []).forEach(fn => fn({}));
  console.log('DOMContentLoaded listeners:', (listeners.DOMContentLoaded || []).length, '| analyse click handlers:', (els.analyse.handlers.click || []).length);
  analyse('RUN A (girl input, substitute text)', 'Main 17 saal ki ladki hoon, UP se.');
  analyse('RUN B (no reset expected)', 'Main 11th mein hu, UP se.');
  analyse('RUN C (Devanagari class)', '11\u0935\u0940\u0902 \u092e\u0947\u0902 \u092a\u0922\u093c\u0924\u0940 \u0939\u0942\u0901');
} catch (e) {
  console.log('HARNESS THREW:', e && e.name, '-', e && e.message);
  if (e && e.stack) console.log(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exitCode = 1;
}

