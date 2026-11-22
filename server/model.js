'use strict';
/* Run: npm run models
   Prints the Gemini models your key can use. Pick one with "flash" in the name and put it in .env as GEMINI_MODEL=... */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const KEY = (process.env.GEMINI_API_KEY || '').trim();
const BASE = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
if (!KEY) { console.log('No GEMINI_API_KEY found in server/.env'); process.exit(1); }
fetch(BASE + '/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': KEY } })
  .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
  .then(function (x) {
    if (x.status !== 200) { console.log('Google said HTTP ' + x.status + ': ' + String((x.body.error && x.body.error.message) || '').slice(0, 200)); return; }
    const names = (x.body.models || [])
      .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1; })
      .map(function (m) { return m.name.replace(/^models\//, ''); })
      .filter(function (n) { return /flash/i.test(n) && !/image|tts|live|audio|embed/i.test(n); });
    console.log('Models your key can use (flash family):');
    names.forEach(function (n) { console.log('  ' + n); });
    if (!names.length) console.log('  (none found)');
  })
  .catch(function (e) { console.log('Could not reach Google: ' + (e && e.cause && e.cause.code ? e.cause.code : e.message)); });