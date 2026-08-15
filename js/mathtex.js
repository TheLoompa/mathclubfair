/* =========================================================================
   mathtex.js — thin wrapper over KaTeX.

   The school hall may not have wifi. If KaTeX never loads we quietly fall
   back to a Unicode rendering instead of dumping raw LaTeX on screen, so
   the presentation still reads fine offline.
   ========================================================================= */
(function () {
  'use strict';

  function katexReady() {
    return typeof window.katex !== 'undefined';
  }

  /* Crude but effective LaTeX → Unicode for the offline case.
     Order matters: sizing commands go first so \left doesn't get eaten by
     the \le rule, and the whole list runs several times so nested groups
     (\sqrt{...\tfrac{a}{b}...}) unwrap from the inside out. */
  const UNI = [
    [/\\left|\\right|\\!|\\displaystyle/g, ''],
    [/\\underbrace\{([^{}]*)\}/g, '$1'],
    [/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)'],
    [/\\sqrt\{([^{}]*)\}/g, '√($1)'],
    [/\\text\{([^{}]*)\}/g, '$1'],
    [/\\mathrm\{([^{}]*)\}/g, '$1'],
    [/\\times/g, '×'], [/\\cdot/g, '·'], [/\\div/g, '÷'],
    [/\\approx/g, '≈'],
    [/\\Longrightarrow|\\Rightarrow|\\implies/g, '⟹'],
    [/\\ne(?![a-zA-Z])/g, '≠'],
    [/\\le(?![a-zA-Z])/g, '≤'],
    [/\\ge(?![a-zA-Z])/g, '≥'],
    [/\\pi(?![a-zA-Z])/g, 'π'], [/\\theta/g, 'θ'], [/\\alpha/g, 'α'],
    [/\\sin/g, 'sin'], [/\\cos/g, 'cos'], [/\\tan/g, 'tan'],
    [/\\quad|\\qquad/g, '   '], [/\\[;,:]/g, ' '],
    [/\^\{?2\}?/g, '²'], [/\^\{?3\}?/g, '³'],
    [/\^\{([^{}]*)\}/g, '^$1'],
    [/_\{([^{}]*)\}/g, '_$1'],
    [/\\\\/g, '\n']
  ];

  function toUnicode(tex) {
    let s = tex;
    for (let pass = 0; pass < 4; pass++) {
      const before = s;
      UNI.forEach(function (p) { s = s.replace(p[0], p[1]); });
      if (s === before) break;
    }
    return s.replace(/[{}]/g, '');
  }

  /**
   * Render TeX to an HTML string.
   * @param {string} tex
   * @param {boolean} display  block-style (centred, bigger) if true
   */
  function tex(str, display) {
    if (katexReady()) {
      try {
        return window.katex.renderToString(str, {
          displayMode: !!display,
          throwOnError: false,
          strict: false
        });
      } catch (e) { /* fall through */ }
    }
    return '<span class="tex-fallback' + (display ? ' display' : '') + '">' +
           toUnicode(str).replace(/\n/g, '<br>') + '</span>';
  }

  /** Render every <span class="math" data-tex="..."> inside root. */
  function renderAll(root) {
    (root || document).querySelectorAll('.math[data-tex]').forEach(function (el) {
      if (el.dataset.rendered === '1') return;
      el.innerHTML = tex(el.dataset.tex, el.dataset.display === '1');
      el.dataset.rendered = '1';
    });
  }

  window.MathTex = { tex: tex, renderAll: renderAll, ready: katexReady };
})();
