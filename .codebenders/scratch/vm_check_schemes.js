const vm = require("vm");
const fs = require("fs");
const code = fs.readFileSync("schemes.js", "utf8");
const ctx = { console: console };
vm.createContext(ctx);
vm.runInContext(code + "\n;this.__S = (typeof SCHEMES !== 'undefined') ? SCHEMES : undefined;", ctx);
const S = ctx.__S;
if (!Array.isArray(S)) { console.log("SCHEMES not an array:", typeof S); process.exit(2); }
console.log("SCHEMES.length=" + S.length);
const hits = S.filter(s => /aadhaar/i.test(JSON.stringify([s.documents, s.apply_steps])));
console.log("aadhaar_matches=" + hits.length);
console.log("aadhaar_scheme_ids=" + hits.map(s => s.id || s.name).join(", "));
