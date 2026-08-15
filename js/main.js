/* =========================================================================
   main.js — glue: config into the DOM, logo handling, KaTeX sweep.
   ========================================================================= */
(function () {
  'use strict';

  const C = window.CONFIG || {};

  /* ---- fill every [data-cfg] ---- */
  document.querySelectorAll('[data-cfg]').forEach(function (el) {
    const v = C[el.dataset.cfg];
    if (v) el.textContent = v;
  });
  document.title = (C.clubName || 'Math Club') + ' — the π Booth';

  /* ---- logo: use the file if it exists, otherwise keep the π ring ---- */
  ['brandLogoImg', 'joinLogoImg'].forEach(function (id) {
    const img = document.getElementById(id);
    if (!img || !C.logo) return;
    img.addEventListener('load', function () { img.closest('.logo-ring').classList.add('has-img'); });
    img.addEventListener('error', function () { img.remove(); });
    img.src = C.logo;
  });

  /* ---- render any static math left in the page ---- */
  window.MathTex.renderAll(document);

  /* ---- a small nod to the fact the digits are computed, not pasted ---- */
  const credit = document.querySelector('.end-credit');
  if (credit) {
    credit.textContent = window.PI.count + ' digits of π computed live in your browser ' +
      'with Machin\'s formula, in ' + window.PI.computeMs + ' ms. No lookup tables were harmed.';
  }

  /* ---- attract mode: nudge the next arrow when nobody's touching it ---- */
  if (C.attractMode !== false) document.body.classList.add('attract');

  document.body.classList.add('ready');
})();
