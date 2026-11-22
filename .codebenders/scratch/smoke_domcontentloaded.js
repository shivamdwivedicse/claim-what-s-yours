const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = process.argv[2] || process.cwd();
let domHandler = null;
function mkEl() {
  return {
    textContent: '', innerHTML: '', value: '', className: '', disabled: false, options: [], children: [], style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, addEventListener() {},
    appendChild(c) { this.children.push(c); return c; }, removeChild() {}, focus() {}, remove() {}
  };
}
const els = {};
const document = {
  addEventListener(ev, fn) { if (ev === 'DOMContentLoaded') domHandler = fn; },
  getElementById(id) { return els[id] || (els[id] = mkEl()); },
  createElement() { return mkEl(); },
  createTextNode(t) { return { textContent: t }; }
};
const store = {};
const localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
const ctx = { console: console, document: document, localStorage: localStorage, window: {} };
ctx.window.document = document;
ctx.window.localStorage = localStorage;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'schemes.js'), 'utf8'), ctx, { filename: 'schemes.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), ctx, { filename: 'app.js' });
console.log('DOMContentLoaded callback captured:', typeof domHandler);
try {
  domHandler();
  console.log('DOMContentLoaded callback: NO THROW');
} catch (e) {
  console.log('DOMContentLoaded callback THREW:', e && e.stack);
}
console.log('SCHEMES.length:', vm.runInContext('SCHEMES.length', ctx));
console.log('typeof parseSituation (global):', vm.runInContext('typeof parseSituation', ctx));
console.log('typeof init (global):', vm.runInContext('typeof init', ctx));
