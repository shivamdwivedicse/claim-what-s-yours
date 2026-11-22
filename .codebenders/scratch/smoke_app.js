const fs = require('fs');
const vm = require('vm');
const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
const listeners = {};
const document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
  body: { appendChild() {} },
};
const c = { document, localStorage, console };
c.window = c;
vm.createContext(c);
vm.runInContext(fs.readFileSync('schemes.js', 'utf8'), c, { filename: 'schemes.js' });
vm.runInContext(fs.readFileSync('app.js', 'utf8'), c, { filename: 'app.js' });
console.log('DOMContentLoaded listeners captured:', (listeners.DOMContentLoaded || []).length);
console.log('SCHEMES type:', typeof c.SCHEMES, Array.isArray(c.SCHEMES) ? c.SCHEMES.length : '');
try {
  (listeners.DOMContentLoaded || []).forEach(fn => fn({}));
  console.log('DOMContentLoaded callback: NO THROW');
} catch (e) {
  console.log('DOMContentLoaded callback THREW:', e && e.name, '-', e && e.message);
  if (e && e.stack) console.log(e.stack.split('\n').slice(0, 4).join('\n'));
}
