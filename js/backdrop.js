/* =========================================================================
   backdrop.js — the drifting digits behind everything, plus the hero strip.
   ========================================================================= */
(function () {
  'use strict';

  const host = document.getElementById('bdDigits');
  const digits = window.PI.decimals;

  /* a sparse rain of real π digits */
  const COLS = 9;
  for (let i = 0; i < COLS; i++) {
    const col = document.createElement('span');
    col.className = 'bd-col';
    col.style.left = (i * (100 / COLS) + Math.random() * 3) + '%';
    col.style.animationDuration = (26 + Math.random() * 26).toFixed(1) + 's';
    col.style.animationDelay = (-Math.random() * 40).toFixed(1) + 's';
    col.style.fontSize = (11 + Math.random() * 9).toFixed(0) + 'px';
    const start = Math.floor(Math.random() * 900);
    col.textContent = digits.slice(start, start + 40).split('').join('\n');
    host.appendChild(col);
  }

  /* hero: the first digits, revealed one by one */
  const strip = document.getElementById('heroDigits');
  const shown = '3.' + digits.slice(0, 44);
  shown.split('').forEach(function (ch, i) {
    const b = document.createElement('b');
    b.textContent = ch;
    b.style.animationDelay = (0.5 + i * 0.045).toFixed(2) + 's';
    strip.appendChild(b);
  });
})();
