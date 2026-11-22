/* characters.js - two original cartoon guides, Raju (boy) and Asha (girl), as inline SVG.
   Use: CWY_GUIDE.svg('raju', 'wave') returns an SVG string.
   Expressions: wave, point, think, cheer.
   Any element with data-guide="raju:wave" is filled automatically on page load. */
(function () {
  'use strict';

  var SKIN = '#f0b48a';

  function arm(x1, y1, x2, y2, cls, style) {
    var g = '<g' + (cls ? ' class="' + cls + '"' : '') + '>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + style.sleeve + '" stroke-width="17" stroke-linecap="round"/>' +
      '<circle cx="' + x2 + '" cy="' + y2 + '" r="9" fill="' + SKIN + '"/>' +
      '</g>';
    return g;
  }

  function mouth(expr) {
    if (expr === 'cheer') {
      return '<path d="M86 93 Q100 118 114 93 Z" fill="#7a2e1e"/><path d="M93 106 Q100 112 107 106 Q100 103 93 106 Z" fill="#e87a7a"/>';
    }
    if (expr === 'think') {
      return '<path d="M92 101 Q100 96 108 101" stroke="#7a2e1e" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }
    return '<path d="M88 96 Q100 109 112 96" stroke="#7a2e1e" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }

  function extras(expr) {
    if (expr === 'think') {
      return '<g fill="#fff" stroke="#e6d3c3" stroke-width="2"><circle cx="150" cy="40" r="5"/><circle cx="160" cy="26" r="7"/>' +
        '<ellipse cx="176" cy="12" rx="16" ry="12"/></g><text x="176" y="17" text-anchor="middle" font-size="15" font-weight="800" fill="#e8591a" font-family="Nunito,sans-serif">?</text>';
    }
    if (expr === 'cheer') {
      var star = function (x, y, s) {
        return '<path class="sparkle" transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill="#f2c14e"/>';
      };
      return star(30, 30, 1) + star(172, 28, 1.2) + star(18, 100, .8) + star(184, 96, .9);
    }
    return '';
  }

  function build(name, expr) {
    var girl = name === 'asha';
    var kurta = girl ? '#2e9c8a' : '#e8591a';
    var legs = girl ? '#f2c14e' : '#2f3e66';
    var hair = girl ? '#2a1b14' : '#1f1a17';
    var style = { sleeve: kurta };
    expr = expr || 'wave';

    var leftArm, rightArm;
    if (expr === 'cheer') {
      leftArm = arm(68, 138, 42, 88, 'arm-cheer-l', style);
      rightArm = arm(132, 138, 158, 88, 'arm-cheer-r', style);
    } else {
      leftArm = arm(68, 138, 52, 196, '', style);
      if (expr === 'point') rightArm = arm(132, 138, 174, 118, '', style);
      else if (expr === 'think') rightArm = arm(132, 138, 118, 108, '', style);
      else rightArm = arm(132, 138, 160, 90, 'arm-wave', style);
    }

    var hairBack = girl
      ? '<ellipse cx="55" cy="112" rx="9" ry="23" fill="' + hair + '" transform="rotate(14 55 112)"/>' +
        '<ellipse cx="145" cy="112" rx="9" ry="23" fill="' + hair + '" transform="rotate(-14 145 112)"/>' +
        '<circle cx="52" cy="92" r="6" fill="#e8591a"/><circle cx="148" cy="92" r="6" fill="#e8591a"/>'
      : '';

    var body = girl
      ? '<path d="M66 128 Q100 116 134 128 L141 220 Q100 232 59 220 Z" fill="' + kurta + '"/>' +
        '<path d="M66 132 Q100 156 134 132" stroke="#f2c14e" stroke-width="11" fill="none" stroke-linecap="round"/>'
      : '<path d="M66 128 Q100 116 134 128 L140 220 Q100 232 60 220 Z" fill="' + kurta + '"/>' +
        '<path d="M88 124 L100 144 L112 124" stroke="#fff" stroke-width="3" fill="none"/>' +
        '<circle cx="100" cy="162" r="2.6" fill="#fff"/><circle cx="100" cy="178" r="2.6" fill="#fff"/>' +
        '<path d="M70 126 L120 214" stroke="#7a4a2b" stroke-width="7" opacity=".85"/>';

    var hairTop = girl
      ? '<path d="M57 76 Q58 34 100 32 Q142 34 143 76 Q130 52 100 52 Q70 52 57 76 Z" fill="' + hair + '"/>' +
        '<circle cx="100" cy="62" r="2.6" fill="#e8591a"/>'
      : '<path d="M58 74 Q60 36 100 34 Q142 36 142 74 Q128 54 100 54 Q72 54 58 74 Z" fill="' + hair + '"/>';

    return '<svg class="guide-svg" viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      (girl ? 'Asha' : 'Raju') + ' the guide">' +
      '<ellipse cx="100" cy="263" rx="46" ry="7" fill="#000" opacity=".08"/>' +
      '<rect x="76" y="205" width="20" height="50" rx="9" fill="' + legs + '"/><rect x="104" y="205" width="20" height="50" rx="9" fill="' + legs + '"/>' +
      '<ellipse cx="86" cy="257" rx="14" ry="6" fill="#222"/><ellipse cx="114" cy="257" rx="14" ry="6" fill="#222"/>' +
      hairBack + body + leftArm + rightArm +
      '<circle cx="60" cy="82" r="8" fill="' + SKIN + '"/><circle cx="140" cy="82" r="8" fill="' + SKIN + '"/>' +
      '<circle cx="100" cy="78" r="41" fill="' + SKIN + '"/>' + hairTop +
      '<path d="M78 68 Q86 63 94 68" stroke="' + hair + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M106 68 Q114 63 122 68" stroke="' + hair + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<g class="blink"><ellipse cx="86" cy="80" rx="4.6" ry="5.6" fill="#222"/><ellipse cx="114" cy="80" rx="4.6" ry="5.6" fill="#222"/>' +
      '<circle cx="87.6" cy="78" r="1.6" fill="#fff"/><circle cx="115.6" cy="78" r="1.6" fill="#fff"/></g>' +
      '<circle cx="76" cy="95" r="6" fill="#f08a7a" opacity=".45"/><circle cx="124" cy="95" r="6" fill="#f08a7a" opacity=".45"/>' +
      mouth(expr) + extras(expr) +
      '</svg>';
  }

  function fill(root) {
    var nodes = (root || document).querySelectorAll('[data-guide]');
    Array.prototype.forEach.call(nodes, function (el) {
      var parts = String(el.getAttribute('data-guide')).split(':');
      el.innerHTML = build(parts[0], parts[1] || 'wave');
    });
  }

  window.CWY_GUIDE = { svg: build, fill: fill };
  document.addEventListener('DOMContentLoaded', function () { fill(); });
})();