/* =========================================================================
   archimedes.js — an interactive walk through Archimedes' polygon squeeze.

   Geometry used throughout (unit circle, r = 1, so C = 2π):
     s   = side of the inscribed regular n-gon
     a   = apothem = sqrt(1 - (s/2)^2)          (centre → middle of a side)
     inscribed perimeter    P_in  = n·s          → lower bound  = n·s/2
     circumscribed polygon  = inscribed scaled by 1/a
     circumscribed perimeter P_out = P_in / a    → upper bound  = P_in/(2a)

   Doubling (the whole trick):
     s' = sqrt(2 - 2a)
   which we evaluate in the algebraically equal but numerically stable form
     s' = s / sqrt(2 + 2a)
   so the bounds keep improving past n ≈ 10^7 instead of drowning in
   floating-point cancellation.
   ========================================================================= */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('archSvg');

  const elTitle  = document.getElementById('archTitle');
  const elBody   = document.getElementById('archBody');
  const elMath   = document.getElementById('archMath');
  const elBounds = document.getElementById('archBounds');
  const elPips   = document.getElementById('archPips');
  const elStepNo = document.getElementById('archStepNum');
  const elStepTot= document.getElementById('archStepTot');
  const btnPrev  = document.getElementById('archPrev');
  const btnNext  = document.getElementById('archNext');
  const btnDbl   = document.getElementById('archDouble');

  const bN = document.getElementById('bN');
  const bLow = document.getElementById('bLow');
  const bHigh = document.getElementById('bHigh');
  const bLocked = document.getElementById('bLocked');
  const sqFill = document.getElementById('sqFill');

  const M = window.MathTex;

  /* ---------------- state ---------------- */
  let step = 0;
  let n = 6, s = 1;          // hexagon: side = radius
  let morph = null;          // {fromS, t} while animating a doubling
  let dblTimer = null;       // pending "auto-double" from step 6

  function apothem(side) { return Math.sqrt(Math.max(0, 1 - side * side / 4)); }
  function lower(nn, ss) { return nn * ss / 2; }
  function upper(nn, ss) { return lower(nn, ss) / apothem(ss); }
  function fmt(x, d) { return x.toFixed(d === undefined ? 7 : d); }

  /** tiny sides need scientific notation or they read as zero */
  function texNum(x) {
    if (x >= 1e-4) return fmt(x, 9);
    const parts = x.toExponential(6).split('e');
    return parts[0] + '\\times 10^{' + Number(parts[1]) + '}';
  }

  /* ---------------- drawing ---------------- */
  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pt(k, count, r) {
    const t = 2 * Math.PI * k / count;
    return [r * Math.sin(t), -r * Math.cos(t)];
  }
  function polyPoints(count, radii) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const p = pt(k, count, typeof radii === 'function' ? radii(k) : radii);
      out.push(p[0].toFixed(5) + ',' + p[1].toFixed(5));
    }
    return out.join(' ');
  }

  /**
   * @param {object} o  {showPolys, showOuter, showDiameter, triangle, construct}
   */
  function draw(o) {
    o = o || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const g = el('g', {});
    svg.appendChild(g);

    // the circle itself
    g.appendChild(el('circle', { class: 'ac-circle', cx: 0, cy: 0, r: 1 }));

    if (o.showDiameter) {
      g.appendChild(el('line', { class: 'ac-diam', x1: -1, y1: 0, x2: 1, y2: 0 }));
      const lab = el('text', { class: 'ac-lab', x: 0, y: -0.08, 'text-anchor': 'middle' });
      lab.textContent = 'd = 2';
      g.appendChild(lab);
      const c = el('text', { class: 'ac-lab accent', x: 0, y: -1.13, 'text-anchor': 'middle' });
      c.textContent = 'C = 2π';
      g.appendChild(c);
    }

    if (o.showPolys) {
      const drawN = Math.min(n, 240);
      const scaled = drawN !== n;                 // too many sides to draw honestly
      let innerR, outerR;

      if (morph) {
        // odd-index vertices push out from the edge midpoint to the circle
        const a0 = apothem(morph.fromS);
        innerR = function (k) { return k % 2 === 0 ? 1 : a0 + (1 - a0) * morph.t; };
      } else {
        innerR = 1;
      }
      const a = apothem(s);
      outerR = 1 / a;

      if (o.showOuter) {
        g.appendChild(el('polygon', {
          class: 'ac-out',
          opacity: morph ? 0.25 : 1,
          points: polyPoints(drawN, scaled ? 1 / apothem(2 * Math.sin(Math.PI / drawN)) : outerR)
        }));
      }
      g.appendChild(el('polygon', { class: 'ac-in', points: polyPoints(drawN, innerR) }));

      if (o.spokes !== false && drawN <= 24) {
        for (let k = 0; k < drawN; k++) {
          const p = pt(k, drawN, 1);
          g.appendChild(el('line', { class: 'ac-spoke', x1: 0, y1: 0, x2: p[0], y2: p[1] }));
        }
      }
    }

    /* the "why a hexagon" equilateral triangle */
    if (o.triangle) {
      const A = pt(0, 6, 1), B = pt(1, 6, 1);
      g.appendChild(el('polygon', { class: 'ac-tri', points: '0,0 ' + A + ' ' + B }));
      g.appendChild(el('path', {
        class: 'ac-arc',
        d: 'M ' + (0.22 * Math.sin(0)) + ',' + (-0.22) + ' A 0.22 0.22 0 0 1 ' +
           (0.22 * Math.sin(Math.PI / 3)) + ',' + (-0.22 * Math.cos(Math.PI / 3))
      }));
      const t60 = el('text', { class: 'ac-lab', x: 0.12, y: -0.3, 'text-anchor': 'middle' });
      t60.textContent = '60°';
      g.appendChild(t60);
      [[A, 'A', 0, -0.1], [B, 'B', 0.12, 0.02]].forEach(function (d) {
        const t = el('text', { class: 'ac-lab', x: d[0][0] + d[2], y: d[0][1] + d[3], 'text-anchor': 'middle' });
        t.textContent = d[1];
        g.appendChild(t);
      });
      ['r = 1'].forEach(function () {
        const t = el('text', { class: 'ac-lab accent', x: -0.03, y: -0.55, 'text-anchor': 'end' });
        t.textContent = 'r=1';
        g.appendChild(t);
      });
      const sl = el('text', { class: 'ac-lab accent', x: 0.62, y: -0.78, 'text-anchor': 'middle' });
      sl.textContent = 's=1';
      g.appendChild(sl);
    }

    /* the apothem, for the circumscribed step */
    if (o.apothem) {
      const A = pt(0, 6, 1), B = pt(1, 6, 1);
      const Mx = (A[0] + B[0]) / 2, My = (A[1] + B[1]) / 2;
      g.appendChild(el('line', { class: 'ac-apo', x1: 0, y1: 0, x2: Mx, y2: My }));
      g.appendChild(el('circle', { class: 'ac-node', cx: Mx, cy: My, r: 0.035 }));
      const t = el('text', { class: 'ac-lab accent', x: Mx + 0.2, y: My - 0.06, 'text-anchor': 'middle' });
      t.textContent = 'a';
      g.appendChild(t);
    }

    /* the doubling construction: A, B, M, C */
    if (o.construct) {
      const A = pt(0, 6, 1), B = pt(1, 6, 1);
      const Mx = (A[0] + B[0]) / 2, My = (A[1] + B[1]) / 2;
      const mLen = Math.hypot(Mx, My);
      const C = [Mx / mLen, My / mLen];

      g.appendChild(el('line', { class: 'ac-cons dash', x1: 0, y1: 0, x2: C[0], y2: C[1] }));
      g.appendChild(el('line', { class: 'ac-cons', x1: A[0], y1: A[1], x2: B[0], y2: B[1] }));
      g.appendChild(el('line', { class: 'ac-cons hot', x1: A[0], y1: A[1], x2: C[0], y2: C[1] }));
      g.appendChild(el('line', { class: 'ac-cons hot', x1: C[0], y1: C[1], x2: B[0], y2: B[1] }));

      /* right-angle mark at M, between OM and AB */
      const u1 = [Mx / mLen, My / mLen];                       // M → C
      const u2 = [(B[0] - Mx) / (0.5), (B[1] - My) / (0.5)];   // M → B (|MB| = s/2 = .5)
      const q = 0.075;
      g.appendChild(el('polyline', {
        class: 'ac-right',
        points: [
          (Mx + q * u1[0]) + ',' + (My + q * u1[1]),
          (Mx + q * (u1[0] + u2[0])) + ',' + (My + q * (u1[1] + u2[1])),
          (Mx + q * u2[0]) + ',' + (My + q * u2[1])
        ].join(' ')
      }));

      [[A, 'A', -0.14, -0.03], [B, 'B', 0.14, 0.05], [[Mx, My], 'M', 0.10, 0.15],
       [C, 'C', 0.12, -0.10], [[0, 0], 'O', -0.10, 0.10]].forEach(function (d) {
        g.appendChild(el('circle', { class: 'ac-node', cx: d[0][0], cy: d[0][1], r: 0.032 }));
        const t = el('text', { class: 'ac-lab', x: d[0][0] + d[2], y: d[0][1] + d[3], 'text-anchor': 'middle' });
        t.textContent = d[1];
        g.appendChild(t);
      });
      /* "s" tucked inside the polygon, "s'" pushed outside the circle */
      const sl = el('text', { class: 'ac-lab accent', x: 0.26, y: -0.66, 'text-anchor': 'middle' });
      sl.textContent = 's';
      g.appendChild(sl);
      const nl = el('text', { class: 'ac-lab hot', x: 0.30, y: -1.09, 'text-anchor': 'middle' });
      nl.textContent = "s'";
      g.appendChild(nl);
    }

    if (o.caption) {
      const t = el('text', { class: 'ac-caption', x: 0, y: 1.27, 'text-anchor': 'middle' });
      t.textContent = o.caption;
      g.appendChild(t);
    }
  }

  /* ---------------- doubling ---------------- */
  /** the arithmetic, on its own */
  function stepDouble() {
    const a = apothem(s);
    const prevS = s;
    s = s / Math.sqrt(2 + 2 * a);               // stable form of sqrt(2-2a)
    n *= 2;
    return prevS;
  }

  /** jump straight to a given number of sides, no animation */
  function setGeometry(target) {
    n = 6; s = 1; morph = null;
    while (n < target) stepDouble();
  }

  function doubleSides(animate) {
    const prevS = stepDouble();

    if (animate && n <= 192) {
      morph = { fromS: prevS, t: 0 };
      const t0 = performance.now();
      (function tick(now) {
        const p = Math.min(1, (now - t0) / 480);
        morph.t = 1 - Math.pow(1 - p, 3);
        drawCurrent();
        if (p < 1) requestAnimationFrame(tick);
        else { morph = null; drawCurrent(); }
      })(t0);
    } else {
      drawCurrent();
    }
    updateBounds();
  }

  function drawCurrent() {
    const st = STEPS[step];
    const v = Object.assign({}, st.visual || {});
    if (st.play && n > 240) v.caption = 'drawing 240 of ' + n.toLocaleString() + ' sides';
    draw(v);
  }

  /* ---------------- bounds panel ---------------- */
  function commonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  }

  function updateBounds() {
    const lo = lower(n, s), hi = upper(n, s);
    bN.textContent = n.toLocaleString();
    bLow.textContent = fmt(lo, 9);
    bHigh.textContent = fmt(hi, 9);

    const pre = commonPrefix(fmt(lo, 12), fmt(hi, 12));
    const digits = Math.max(0, pre.replace('3.', '').length);
    const shown = pre.length >= 2 ? pre : '3.';
    bLocked.innerHTML = '<em>' + shown + '</em>' +
      '<span class="unknown">' + '?'.repeat(Math.max(0, 10 - digits)) + '</span>' +
      '<span class="lockcount">' + digits + ' decimal' + (digits === 1 ? '' : 's') + '</span>';

    // squeeze bar: how tight is the trap, on a log scale
    const width = Math.max(1e-16, hi - lo);
    const frac = Math.min(1, Math.max(0, (Math.log10(0.5) - Math.log10(width)) / 16));
    sqFill.style.width = (frac * 100).toFixed(1) + '%';

    if (STEPS[step].liveMath) {
      elMath.innerHTML =
        M.tex('\\tfrac{1}{2}P_{\\text{in}} = \\tfrac{' + n + ' \\times ' + texNum(s) + '}{2} = ' + fmt(lo, 9), true) +
        M.tex('\\tfrac{1}{2}P_{\\text{out}} = \\dfrac{' + fmt(lo, 9) + '}{' + fmt(apothem(s), 12) + '} = ' + fmt(hi, 9), true);
    }
    btnDbl.disabled = n > 6 * Math.pow(2, 28);
  }

  /* ---------------- the script ---------------- */
  const STEPS = [
    {
      title: 'A circle has no straight edges.',
      body: '<p>π is just a ratio: circumference divided by diameter. Defining it is easy. <b>Measuring</b> it is not — you can\'t lay a ruler along a curve.</p>' +
            '<p>So set the radius to 1. The diameter is 2, and the circumference becomes exactly <b>2π</b>. Now we only need to measure one curved line.</p>',
      math: function () { return M.tex('\\pi=\\frac{C}{d}=\\frac{C}{2}\\quad\\Longrightarrow\\quad C=2\\pi', true); },
      visual: { showDiameter: true, caption: 'r = 1' },
      bounds: false
    },
    {
      title: 'Archimedes\' idea: trap it.',
      body: '<p>Around 250 BC Archimedes had the move. If you can\'t measure the curve, <b>sandwich</b> it between two shapes made of straight lines: one polygon inside the circle, one outside.</p>' +
            '<p>The inside one is too short. The outside one is too long. π is stuck in between — and we can measure both.</p>',
      math: function () { return M.tex('P_{\\text{in}} < 2\\pi < P_{\\text{out}} \\quad\\Longrightarrow\\quad \\tfrac{1}{2}P_{\\text{in}} < \\pi < \\tfrac{1}{2}P_{\\text{out}}', true); },
      visual: { showPolys: true, showOuter: true, spokes: false },
      targetN: 6
    },
    {
      title: 'Start with a hexagon — it\'s free.',
      body: '<p>Draw lines from the centre to two neighbouring corners. The angle between them is <b>360° ÷ 6 = 60°</b>, and both lines are radii, so the other two angles are equal — 60° each.</p>' +
            '<p>The triangle is equilateral. So each side of the hexagon <b>equals the radius</b>. No trigonometry needed.</p>',
      math: function () {
        return M.tex('s_6 = r = 1', true) +
               M.tex('P_{\\text{in}} = 6 \\times 1 = 6 \\;<\\; 2\\pi \\quad\\Longrightarrow\\quad \\pi > 3', true);
      },
      visual: { showPolys: true, showOuter: false, triangle: true },
      targetN: 6
    },
    {
      title: 'The outer hexagon costs one square root.',
      body: '<p>The outside polygon is the inside one <b>inflated</b> until its edges just kiss the circle. The inside edges sit at distance <em>a</em> from the centre — the <b>apothem</b> — so blowing the shape up by <em>1/a</em> pushes them out to distance 1.</p>' +
            '<p>Same shape, bigger. So its perimeter is bigger by exactly the same factor.</p>',
      math: function () {
        return M.tex('a_6=\\sqrt{1-\\left(\\tfrac{s}{2}\\right)^{2}}=\\sqrt{1-0.25}=0.8660254', true) +
               M.tex('P_{\\text{out}}=\\frac{P_{\\text{in}}}{a}=\\frac{6}{0.8660254}=6.9282032', true) +
               M.tex('\\Longrightarrow\\quad 3 < \\pi < 3.4641016', true);
      },
      visual: { showPolys: true, showOuter: true, apothem: true },
      targetN: 6
    },
    {
      title: 'Now squeeze: double the corners.',
      body: '<p>Take one side <b>AB</b> of the polygon. Let <b>M</b> be its midpoint and <b>C</b> the point of the circle straight out beyond it. Then <b>AC</b> is one side of a polygon with twice as many corners.</p>' +
            '<p>Two uses of Pythagoras, and the mess collapses:</p>',
      math: function () {
        return M.tex('OM = a = \\sqrt{1-\\tfrac{s^{2}}{4}}\\;,\\qquad MC = 1 - a', true) +
               M.tex("s'^{\\,2} = AM^{2} + MC^{2} = \\tfrac{s^{2}}{4} + (1-a)^{2}", true) +
               M.tex("= \\underbrace{\\tfrac{s^{2}}{4} + a^{2}}_{=\\,1} + 1 - 2a = 2 - 2a", true) +
               '<div class="math-punch">' + M.tex("s' = \\sqrt{2-2a}", true) + '</div>';
      },
      visual: { showPolys: true, showOuter: false, construct: true, spokes: false },
      targetN: 6, noBounds: true
    },
    {
      title: 'Do it once, with real numbers.',
      body: '<p>Hexagon → 12-gon. Every number below is one you could get on a cheap calculator; Archimedes did it with fractions, by hand.</p>',
      math: function () {
        return M.tex('a = \\sqrt{1-\\tfrac{1^{2}}{4}} = 0.8660254', true) +
               M.tex("s_{12} = \\sqrt{2-2(0.8660254)} = \\sqrt{0.2679492} = 0.5176381", true) +
               M.tex('\\tfrac{1}{2}P_{\\text{in}} = \\tfrac{12 \\times 0.5176381}{2} = 3.1058286', true) +
               M.tex('\\tfrac{1}{2}P_{\\text{out}} = \\tfrac{3.1058286}{0.9659258} = 3.2153903', true) +
               '<div class="math-punch">' + M.tex('3.105 < \\pi < 3.216', true) + '</div>';
      },
      visual: { showPolys: true, showOuter: true, spokes: false },
      targetN: 12, noBounds: true
    },
    {
      title: 'Your turn. Keep doubling.',
      body: '<p>Same two lines of arithmetic, over and over. Watch the trap close and the digits lock in one at a time.</p>' +
            '<p class="arch-aside">Archimedes stopped at <b>96 sides</b> and wrote <span class="math" data-tex="3\\tfrac{10}{71} < \\pi < 3\\tfrac{1}{7}"></span> — correct to two decimals, using no decimals at all.</p>',
      liveMath: true,
      visual: { showPolys: true, showOuter: true, spokes: false },
      play: true
    }
  ];

  elStepTot.textContent = STEPS.length;
  STEPS.forEach(function (_, i) {
    const p = document.createElement('button');
    p.className = 'pip';
    p.type = 'button';
    p.setAttribute('aria-label', 'Step ' + (i + 1));
    p.addEventListener('click', function () { setStep(i); });
    elPips.appendChild(p);
  });

  function setStep(i) {
    if (i < 0 || i >= STEPS.length) return;
    const st = STEPS[i];
    const cameFrom = step;
    step = i;
    clearTimeout(dblTimer);          // no stale animation from a step we skipped past

    /* park the geometry where this step expects it */
    let animateDouble = false;
    if (st.targetN !== undefined) {
      if (st.targetN === 12 && n === 6 && cameFrom < i) animateDouble = true;
      else if (n !== st.targetN) setGeometry(st.targetN);
    } else if (n < 12) {
      setGeometry(12);                       // free play opens at the 12-gon
    }

    elTitle.textContent = st.title;
    elBody.innerHTML = st.body || '';
    elMath.innerHTML = st.math ? st.math() : '';
    M.renderAll(elBody);

    /* the two derivation-heavy steps get the panel to themselves */
    elBounds.hidden = i < 1 || st.noBounds === true;
    btnDbl.hidden = !st.play;
    elStepNo.textContent = i + 1;
    Array.from(elPips.children).forEach(function (p, k) {
      p.classList.toggle('on', k === i);
      p.classList.toggle('done', k < i);
    });

    btnPrev.disabled = false;
    btnNext.textContent = i === STEPS.length - 1 ? 'Next slide →' : 'Next step →';

    drawCurrent();
    updateBounds();
    if (animateDouble) {
      dblTimer = setTimeout(function () { if (step === i && n === 6) doubleSides(true); }, 260);
    }

    elBody.classList.remove('pop'); void elBody.offsetWidth; elBody.classList.add('pop');
  }

  btnNext.addEventListener('click', function () {
    if (step < STEPS.length - 1) setStep(step + 1);
    else window.Deck.next();
  });
  btnPrev.addEventListener('click', function () {
    if (step > 0) setStep(step - 1);
    else window.Deck.prev();
  });
  btnDbl.addEventListener('click', function () { doubleSides(true); });

  /* arrow keys drive the sub-steps while this slide is up */
  window.Deck.registerSteps('s-arch', {
    next: function () { if (step < STEPS.length - 1) { setStep(step + 1); return true; } return false; },
    prev: function () { if (step > 0) { setStep(step - 1); return true; } return false; }
  });

  let booted = false;
  document.addEventListener('slide:enter', function (e) {
    if (e.detail.id !== 's-arch' || booted) return;
    booted = true;
    setStep(0);
  });

  // first paint so the slide isn't blank if someone jumps straight to it
  setStep(0);
})();
