const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('schemes.js', 'utf8');
const SCHEMES = vm.runInNewContext(src + "\n;SCHEMES", {});
console.log('SCHEMES.length=' + SCHEMES.length);
for (const s of SCHEMES) console.log(s.id + ' last_verified=' + s.last_verified);
