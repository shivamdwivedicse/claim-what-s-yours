/* Scheme admin screen. Edits go to localStorage key "cwy-schemes-override"
   as a JSON array of full scheme objects; the main app reads that key first. */
(function () {
  'use strict';

  var OVERRIDE_KEY = 'cwy-schemes-override';
  var FIELDS = ['age', 'gender', 'education_level', 'category', 'minority', 'income',
    'occupation', 'widow_in_family', 'senior_in_family', 'marks_percent', 'marks_kind',
    'place', 'school_type', 'state'];
  var OPERATORS = ['==', '!=', '<=', '>=', '<', '>', 'in', 'is_true', 'is_false'];
  var NUMERIC_FIELDS = ['age', 'education_level', 'income', 'marks_percent'];
  var BOOLEAN_FIELDS = ['minority', 'widow_in_family', 'senior_in_family'];

  var data = [];          // working copy of all schemes (not saved until "Save changes")
  var panelOpen = false;  // true while the edit form is shown
  var editIndex = -1;     // index of the scheme being edited; -1 = new scheme
  var f = {};             // form controls for the open panel
  var ruleRows = [];      // rule row controls for the open panel
  var el = {};            // page elements

  /* ---------- small helpers ---------- */

  function makeEl(tag, text, cls) {
    var node = document.createElement(tag);
    if (text !== undefined && text !== null) { node.textContent = text; }
    if (cls) { node.className = cls; }
    return node;
  }

  function makeBtn(text, onClick, cls) {
    var b = makeEl('button', text, cls || 'adm-btn');
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function setStatus(msg, isError) {
    el.status.textContent = msg;
    el.status.className = isError ? 'status error' : 'status ok';
  }

  function fail(msg) {
    setStatus(msg, true);
    return null;
  }

  function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function todayLocal() {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function toLines(text) {
    return text.split(/\r?\n/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s !== ''; });
  }

  function valueToText(v) {
    if (v === null || v === undefined) { return ''; }
    if (Array.isArray(v)) { return v.join(', '); }
    return String(v);
  }

  function blankScheme() {
    return {
      id: 'new-scheme-' + Date.now().toString(36),
      name: '',
      category: '',
      benefit_text: '',
      benefit_amount_per_year: 0,
      rules: [],
      documents: [],
      apply_steps: [],
      deadline: null,
      official_url: 'https://',
      last_verified: todayLocal(),
      fee: 0
    };
  }

  /* ---------- storage ---------- */

  function readOverride() {
    try {
      var raw = window.localStorage.getItem(OVERRIDE_KEY);
      if (raw === null) { return null; }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      setStatus('Saved edits could not be read (' + e.message + '). Showing built-in data.', true);
      return null;
    }
  }

  function builtInData() {
    return typeof SCHEMES !== 'undefined' ? copy(SCHEMES) : [];
  }

  function loadData() {
    var saved = readOverride();
    return saved ? saved : builtInData();
  }

  function persist() {
    try {
      window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      var quota = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (quota) {
        setStatus('Storage quota exceeded. Nothing was saved; remove some text and try again.', true);
      } else {
        setStatus('Storage is unavailable in this browser (' + (e && e.message) + '). Nothing was saved.', true);
      }
      return false;
    }
  }

  function saveAll() {
    if (panelOpen) {
      setStatus('Finish the open scheme first: click Save scheme or Cancel.', true);
      return;
    }
    if (persist()) {
      setStatus('Saved. The main app will use these values on its next load or refresh.');
    }
  }

  function resetAll() {
    if (!window.confirm('Reset all scheme data to the built-in values? Your saved edits will be removed.')) { return; }
    try {
      window.localStorage.removeItem(OVERRIDE_KEY);
    } catch (e) {
      setStatus('Could not clear saved edits: ' + e.message, true);
      return;
    }
    closePanel();
    data = builtInData();
    renderList();
    setStatus('Reset to built-in data. The main app will use it on its next load or refresh.');
  }

  /* ---------- scheme list ---------- */

  function renderList() {
    el.list.textContent = '';
    if (!data.length) {
      el.list.appendChild(makeEl('p', 'No schemes. Click Add scheme to create one.'));
      return;
    }
    data.forEach(function (s, i) {
      var row = makeEl('div', '', 'scheme-row');
      var info = makeEl('div', '', 'scheme-info');
      info.appendChild(makeEl('strong', s.name || '(no name)'));
      info.appendChild(makeEl('span', s.id));
      info.appendChild(makeEl('span', 'Last verified: ' + (s.last_verified || 'never')));
      var actions = makeEl('div', '', 'scheme-actions');
      actions.appendChild(makeBtn('Edit', function () { if (guardNotBusy()) { openPanel(i); } }, 'adm-btn adm-small'));
      actions.appendChild(makeBtn('Mark verified today', function () { markVerified(i); }, 'adm-btn adm-small'));
      actions.appendChild(makeBtn('Delete', function () { deleteScheme(i); }, 'adm-btn adm-small'));
      row.appendChild(info);
      row.appendChild(actions);
      el.list.appendChild(row);
    });
  }

  function guardNotBusy() {
    if (panelOpen) {
      setStatus('Finish the open scheme first: click Save scheme or Cancel.', true);
      return false;
    }
    return true;
  }

  function addScheme() {
    if (guardNotBusy()) { openPanel(-1); }
  }

  function markVerified(i) {
    data[i].last_verified = todayLocal();
    if (panelOpen && editIndex === i) { f.verified.value = data[i].last_verified; }
    renderList();
    setStatus('Marked "' + (data[i].name || data[i].id) + '" verified today (' + data[i].last_verified + '). Click Save changes to store it.');
  }

  function deleteScheme(i) {
    var name = data[i].name || data[i].id;
    if (!window.confirm('Delete "' + name + '"? Click Save changes afterwards to keep the deletion.')) { return; }
    data.splice(i, 1);
    if (panelOpen) {
      if (editIndex === i) { closePanel(); }
      else if (editIndex > i) { editIndex -= 1; }
    }
    renderList();
    setStatus('Deleted "' + name + '" on this page. Click Save changes to store it.');
  }

  /* ---------- edit panel ---------- */

  function closePanel() {
    panelOpen = false;
    editIndex = -1;
    f = {};
    ruleRows = [];
    el.panel.textContent = '';
    el.panel.hidden = true;
  }

  function openPanel(index) {
    var base = index === -1 ? blankScheme() : data[index];
    panelOpen = true;
    editIndex = index;
    buildForm(copy(base), index === -1);
    el.panel.hidden = false;
    setStatus(index === -1 ? 'New scheme: fill in the form and click Save scheme.' : 'Editing "' + (base.name || base.id) + '".');
    f.name.focus();
  }

  function labelled(text, control, wide) {
    var wrap = makeEl('label', '', wide ? 'field wide' : 'field');
    wrap.appendChild(makeEl('span', text));
    wrap.appendChild(control);
    return wrap;
  }

  function textInput(value, type) {
    var input = makeEl('input');
    input.type = type || 'text';
    input.value = value === null || value === undefined ? '' : String(value);
    return input;
  }

  function textArea(lines) {
    var t = makeEl('textarea');
    t.rows = 4;
    t.value = lines.join('\n');
    return t;
  }

  function select(list, current) {
    var sel = makeEl('select');
    var items = list.slice();
    if (current && items.indexOf(current) === -1) { items.push(current); }
    items.forEach(function (v) {
      var o = makeEl('option', v);
      o.value = v;
      if (v === current) { o.selected = true; }
      sel.appendChild(o);
    });
    return sel;
  }

  function buildForm(s, isNew) {
    el.panel.textContent = '';
    f = {};
    ruleRows = [];

    f.id = textInput(s.id);
    f.id.readOnly = !isNew;
    f.name = textInput(s.name);
    f.category = textInput(s.category);
    f.benefit = makeEl('textarea');
    f.benefit.rows = 3;
    f.benefit.value = s.benefit_text || '';
    f.amount = textInput(s.benefit_amount_per_year, 'number');
    f.amount.min = '0';
    f.amount.step = 'any';
    f.deadline = textInput(s.deadline);
    f.url = textInput(s.official_url, 'url');
    f.verified = textInput(s.last_verified, 'date');
    f.docs = textArea(s.documents || []);
    f.steps = textArea(s.apply_steps || []);

    var grid = makeEl('div', '', 'form-grid');
    grid.appendChild(labelled('ID', f.id));
    grid.appendChild(labelled('Name', f.name));
    grid.appendChild(labelled('Category', f.category));
    grid.appendChild(labelled('Benefit amount per year (Rs, empty = varies)', f.amount));
    grid.appendChild(labelled('Benefit text', f.benefit, true));
    grid.appendChild(labelled('Deadline (text, empty = none)', f.deadline));
    grid.appendChild(labelled('Official URL (must start with https://)', f.url));
    grid.appendChild(labelled('Last verified (YYYY-MM-DD)', f.verified));
    grid.appendChild(labelled('Documents (one per line)', f.docs, true));
    grid.appendChild(labelled('Apply steps (one per line)', f.steps, true));
    el.panel.appendChild(grid);

    el.panel.appendChild(makeEl('h3', 'Eligibility rules'));
    f.rules = makeEl('div', '', 'rules');
    el.panel.appendChild(f.rules);
    (s.rules || []).forEach(addRuleRow);

    var actions = makeEl('div', '', 'actions');
    actions.appendChild(makeBtn('Add rule', function () {
      addRuleRow({ field: FIELDS[0], operator: '==', value: '', label: '' });
    }));
    actions.appendChild(makeBtn('Save scheme', saveDraft, 'adm-btn adm-primary'));
    actions.appendChild(makeBtn('Cancel', function () {
      closePanel();
      setStatus('Edit cancelled.');
    }));
    el.panel.appendChild(actions);
  }

  function addRuleRow(rule) {
    var wrap = makeEl('div', '', 'rule-row');
    var entry = {
      wrap: wrap,
      field: select(FIELDS, rule.field),
      operator: select(OPERATORS, rule.operator),
      value: textInput(valueToText(rule.value)),
      label: textInput(rule.label)
    };
    entry.value.placeholder = 'value (comma-separated for in)';
    entry.label.placeholder = 'label shown to user';
    wrap.appendChild(labelled('Field', entry.field));
    wrap.appendChild(labelled('Operator', entry.operator));
    wrap.appendChild(labelled('Value', entry.value));
    wrap.appendChild(labelled('Label', entry.label));
    wrap.appendChild(makeBtn('Remove', function () { removeRuleRow(entry); }, 'adm-btn adm-small'));
    ruleRows.push(entry);
    f.rules.appendChild(wrap);
  }

  function removeRuleRow(entry) {
    ruleRows = ruleRows.filter(function (r) { return r !== entry; });
    f.rules.removeChild(entry.wrap);
  }

  // Converts the text typed in a rule row into the stored value. Throws on bad input.
  function parseRuleValue(field, operator, raw) {
    var text = raw.trim();
    if (operator === 'is_true' || operator === 'is_false') { return null; }
    if (operator === 'in') {
      return text.split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s !== ''; });
    }
    if (NUMERIC_FIELDS.indexOf(field) !== -1) {
      var n = Number(text);
      if (text === '' || !isFinite(n)) { throw new Error('"' + field + '" needs a number value.'); }
      return n;
    }
    if (BOOLEAN_FIELDS.indexOf(field) !== -1 && operator === '==') {
      if (text !== 'true' && text !== 'false') { throw new Error('"' + field + '" needs true or false.'); }
      return text === 'true';
    }
    return text;
  }

  function saveDraft() {
    var id = f.id.value.trim();
    var name = f.name.value.trim();
    var verified = f.verified.value.trim();
    var amountText = f.amount.value.trim();
    var amount = Number(amountText);
    var url = f.url.value.trim();

    if (!id) { return fail('ID is required.'); }
    if (data.some(function (s, i) { return s.id === id && i !== editIndex; })) {
      return fail('ID "' + id + '" is already used by another scheme.');
    }
    if (!name) { return fail('Name is required.'); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(verified)) { return fail('Last verified must be a date (YYYY-MM-DD).'); }
    if (amountText !== '' && (!isFinite(amount) || amount < 0)) {
      return fail('Benefit amount per year must be a number, 0 or more, or empty if it varies.');
    }
    if (url.indexOf('https://') !== 0) { return fail('Official URL must start with https://'); }

    var rules = [];
    try {
      ruleRows.forEach(function (r) {
        var field = r.field.value;
        var operator = r.operator.value;
        rules.push({
          field: field,
          operator: operator,
          value: parseRuleValue(field, operator, r.value.value),
          label: r.label.value.trim()
        });
      });
    } catch (e) {
      return fail('Rule problem: ' + e.message);
    }

    // Start from the existing scheme so extra fields (verify_flag, stage_amounts, ...) are kept.
    var scheme = Object.assign(editIndex === -1 ? {} : copy(data[editIndex]), {
      id: id,
      name: name,
      category: f.category.value.trim(),
      benefit_text: f.benefit.value.trim(),
      benefit_amount_per_year: amountText === '' ? null : amount,
      rules: rules,
      documents: toLines(f.docs.value),
      apply_steps: toLines(f.steps.value),
      deadline: f.deadline.value.trim() || null,
      official_url: url,
      last_verified: verified,
      fee: 0
    });

    if (editIndex === -1) { data.push(scheme); }
    else { data[editIndex] = scheme; }
    closePanel();
    renderList();
    setStatus('Scheme "' + name + '" updated on this page. Click Save changes to store it.');
    return null;
  }

  /* ---------- init ---------- */

  function init() {
    el.list = document.getElementById('scheme-list');
    el.panel = document.getElementById('edit-panel');
    el.status = document.getElementById('status');
    el.add = document.getElementById('add-scheme');
    el.save = document.getElementById('save-changes');
    el.reset = document.getElementById('reset-data');

    var missing = Object.keys(el).filter(function (k) { return !el[k]; });
    if (missing.length) {
      console.error('admin.js: missing page elements: ' + missing.join(', '));
      return;
    }

    el.add.addEventListener('click', addScheme);
    el.save.addEventListener('click', saveAll);
    el.reset.addEventListener('click', resetAll);

    data = loadData();
    closePanel();
    renderList();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
