/* =========================================================================
   archimedes.js — how humans actually found the digits of π.

   Written for a mixed Class 7–12 audience, so the two bounds a student is
   asked to *derive* are the two that need nothing but counting:

     OUTSIDE  the square box around the circle .... 2+2+2+2 = 8  → π < 4
     INSIDE   the hexagon of six radii ............ 1+1+1+1+1+1 = 6 → π > 3

   No Pythagoras, no apothem, no trigonometry — every number on those two
   steps is something you can point at on the diagram. Only after "3 < π < 4"
   is established do we start doubling corners, and from then on the point is
   watching the trap close rather than following the algebra.

   Geometry behind the doubling (unit circle, r = 1, so C = 2π):
     s = side of the inscribed n-gon,  a = sqrt(1 - (s/2)^2)
     lower = n·s/2                  upper = lower / a
     s' = sqrt(2 - 2a), evaluated as s/sqrt(2 + 2a) for numerical stability.
   ========================================================================= */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('archSvg');

  const elTitle   = document.getElementById('archTitle');
  const elBody    = document.getElementById('archBody');
  const elMath    = document.getElementById('archMath');
  const elBounds  = document.getElementById('archBounds');
  const elSides   = document.getElementById('archSidesRow');
  const elLocked  = document.getElementById('archLocked');
  const elPips    = document.getElementById('archPips');
  const elStepNo  = document.getElementById('archStepNum');
  const elStepTot = document.getElementById('archStepTot');
  const btnPrev   = document.getElementById('archPrev');
  const btnNext   = document.getElementById('archNext');
  const btnDbl    = document.getElementById('archDouble');
  const btnReplay = document.getElementById('archReplay');
  const slider    = document.getElementById('archSlider');

  const bN = document.getElementById('bN');
  const bLow = document.getElementById('bLow');
  const bHigh = document.getElementById('bHigh');
  const bLocked = document.getElementById('bLocked');
  const nlBand = document.getElementById('nlBand');

  const M = window.MathTex;
  const PI = Math.PI;

  /* ---------------- state ---------------- */
  let step = 0;
  let n = 6, s = 1;
  let morph = null;          // {fromS, t} during a doubling
  let animT = 1;             // 0→1 progress of the current step's animation
  let animRaf = null;
  let animPending = false;   // first frame drawn, waiting to be on screen
  let dblTimer = null;

  function apothem(side) { return Math.sqrt(Math.max(0, 1 - side * side / 4)); }
  function lower(nn, ss) { return nn * ss / 2; }
  function upper(nn, ss) { return lower(nn, ss) / apothem(ss); }
  function fmt(x, d) { return x.toFixed(d === undefined ? 7 : d); }

  /* ---------------- animation driver ---------------- */
  function stopAnim() {
    if (animRaf) cancelAnimationFrame(animRaf);
    animRaf = null;
  }
  function runAnim(ms, done) {
    stopAnim();
    const t0 = performance.now();
    (function tick(now) {
      /* clamp low as well as high: a rAF timestamp can be marginally
         earlier than the performance.now() taken just before it */
      animT = Math.max(0, Math.min(1, (now - t0) / ms));
      drawCurrent();
      if (animT < 1) animRaf = requestAnimationFrame(tick);
      else { animRaf = null; if (done) done(); }
    })(t0);
  }

  /* ---------------- svg helpers ---------------- */
  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  /* label sizes live here, not in CSS — see the note in style.css */
  const LAB_SCALE = { side: 1.2, big: 1.35, sum: 1.4, cap: 0.82 };

  function txt(g, x, y, str, cls, u, anchor) {
    let k = 1;
    (cls || '').split(/\s+/).forEach(function (c) { if (LAB_SCALE[c]) k = LAB_SCALE[c]; });
    const t = el('text', {
      class: 'ac-lab ' + (cls || ''), x: x, y: y,
      'text-anchor': anchor || 'middle', 'font-size': 0.125 * u * k
    });
    t.textContent = str;
    g.appendChild(t);
    return t;
  }
  function pt(k, count, r) {
    const a = 2 * PI * k / count;
    return [r * Math.sin(a), -r * Math.cos(a)];
  }
  function polyPoints(count, radii) {
    const out = [];
    for (let k = 0; k < count; k++) {
      const p = pt(k, count, typeof radii === 'function' ? radii(k) : radii);
      out.push(p[0].toFixed(5) + ',' + p[1].toFixed(5));
    }
    return out.join(' ');
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  /* =======================================================================
     SCENES
     ======================================================================= */

  /* --- 1. unrolling the circle: π is "a bit more than 3 diameters" ---
     The timeline is split so nothing has to pop into existence: the circle
     unrolls over the first 82%, then the captions fade up over the rest. */
  function sceneUnroll(g, u) {
    const R = 1, cy = -1.75;
    const t = ease(Math.min(1, animT / 0.82));
    const fade = Math.max(0, Math.min(1, (animT - 0.82) / 0.16));
    const C = 2 * PI * R;
    const D = 6;                                   // three whole diameters

    g.appendChild(el('circle', { class: 'ac-circle faint', cx: 0, cy: cy, r: R }));
    g.appendChild(el('line', { class: 'ac-diam', x1: -R, y1: cy, x2: R, y2: cy }));
    txt(g, 0, cy - 0.12, 'across = 2', 'accent', u);

    /* the traced arc — dash lengths are in user units, see style.css */
    const sw = 0.035 * u;
    g.appendChild(el('circle', {
      class: 'ac-trace', cx: 0, cy: cy, r: R, 'stroke-width': sw,
      'stroke-dasharray': (C * t) + ' ' + (C + 1),
      transform: 'rotate(-90 0 ' + cy + ')'
    }));
    /* the last stretch — the part past three diameters — in the other colour */
    if (C * t > D) {
      g.appendChild(el('circle', {
        class: 'ac-trace bit', cx: 0, cy: cy, r: R, 'stroke-width': sw,
        'stroke-dasharray': (C * t - D) + ' ' + (C + 1), 'stroke-dashoffset': -D,
        transform: 'rotate(-90 0 ' + cy + ')'
      }));
    }

    /* rolling dot */
    const th = 2 * PI * t;
    g.appendChild(el('circle', { class: 'ac-dot', cx: R * Math.sin(th), cy: cy - R * Math.cos(th), r: 0.075 }));

    /* the unrolled line, same length as the arc */
    const y = 1.25, x0 = -PI;
    g.appendChild(el('line', { class: 'ac-rule', x1: x0, y1: y, x2: x0 + C, y2: y }));
    g.appendChild(el('line', {
      class: 'ac-trace', 'stroke-width': sw,
      x1: x0, y1: y, x2: x0 + Math.min(D, C * t), y2: y
    }));
    if (C * t > D) {
      g.appendChild(el('line', {
        class: 'ac-trace bit', 'stroke-width': sw,
        x1: x0 + D, y1: y, x2: x0 + C * t, y2: y
      }));
    }

    /* each whole diameter that has been laid down */
    for (let k = 0; k < 3; k++) {
      const a = x0 + 2 * k, b = a + 2;
      if (C * t <= (b - x0) - 2) continue;             // not reached yet
      const shown = Math.min(b, x0 + C * t);
      g.appendChild(el('line', { class: 'ac-tick', x1: a, y1: y - 0.22, x2: a, y2: y + 0.22 }));
      if (shown >= b - 0.001) {
        g.appendChild(el('line', { class: 'ac-tick', x1: b, y1: y - 0.22, x2: b, y2: y + 0.22 }));
        txt(g, (a + b) / 2, y + 0.55, String(k + 1), 'big', u);
      }
    }
    /* labels fade up rather than appearing */
    const bitIn = Math.max(0, Math.min(1, (C * t - D) / (C - D)));
    if (bitIn > 0) {
      txt(g, x0 + D + (C - D) / 2, y - 0.42, 'a bit', 'bit', u).setAttribute('opacity', bitIn);
    }
    if (fade > 0) {
      txt(g, 0, y + 1.5, '3 diameters, and a bit more.', '', u).setAttribute('opacity', fade);
      txt(g, 0, y + 1.95, 'That "and a bit" is what π is.', 'accent', u).setAttribute('opacity', fade);
    }
  }

  /* --- 2. the trap: one shape outside, one inside --- */
  function sceneTrap(g, u) {
    g.appendChild(el('rect', { class: 'ac-out', x: -1, y: -1, width: 2, height: 2 }));
    g.appendChild(el('polygon', { class: 'ac-in', points: polyPoints(6, 1) }));
    g.appendChild(el('circle', { class: 'ac-circle', cx: 0, cy: 0, r: 1 }));
    txt(g, 0, -1.14, 'too big', 'accent', u);
    txt(g, 0, 0.06, 'too small', 'hot', u);
  }

  /* --- 3. the box: 2+2+2+2 = 8 --- */
  function sceneBox(g, u) {
    const done = Math.floor(animT * 4 + 1e-9);
    const partial = animT * 4 - done;

    g.appendChild(el('circle', { class: 'ac-circle', cx: 0, cy: 0, r: 1 }));
    g.appendChild(el('rect', { class: 'ac-ghost', x: -1, y: -1, width: 2, height: 2 }));
    g.appendChild(el('line', { class: 'ac-diam', x1: -1, y1: 0, x2: 1, y2: 0 }));
    txt(g, 0, -0.1, '2', 'accent', u);

    /* corners of the box, walked clockwise from the top-left */
    const V = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
    const LAB = [[0, -1.22], [1.32, 0.05], [0, 1.38], [-1.32, 0.05]];
    for (let i = 0; i < 4; i++) {
      const f = i < done ? 1 : (i === done ? partial : 0);
      if (f <= 0) continue;
      const a = V[i], b = V[i + 1];
      g.appendChild(el('line', {
        class: 'ac-side', x1: a[0], y1: a[1],
        x2: a[0] + (b[0] - a[0]) * f, y2: a[1] + (b[1] - a[1]) * f
      }));
      if (f >= 1) txt(g, LAB[i][0], LAB[i][1], '2', 'side', u);
    }

    const sides = Math.max(0, Math.min(4, Math.floor(animT * 4 + 1e-9)));
    txt(g, 0, 1.75, sides ? '2' + ' + 2'.repeat(sides - 1) + '  =  ' + (sides * 2) : '', 'sum', u);
  }

  /* --- 4. the hexagon: 1+1+1+1+1+1 = 6 --- */
  function sceneHex(g, u) {
    const done = Math.floor(animT * 6 + 1e-9);
    const partial = animT * 6 - done;

    g.appendChild(el('circle', { class: 'ac-circle', cx: 0, cy: 0, r: 1 }));

    for (let k = 0; k < 6; k++) {
      const f = k < done ? 1 : (k === done ? partial : 0);
      if (f <= 0) continue;
      const A = pt(k, 6, 1), B = pt(k + 1, 6, 1);
      const tri = el('polygon', {
        class: 'ac-tri', opacity: Math.min(1, f * 2),
        points: '0,0 ' + A + ' ' + (A[0] + (B[0] - A[0]) * f) + ',' + (A[1] + (B[1] - A[1]) * f)
      });
      g.appendChild(tri);
      if (f >= 1) {
        const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        txt(g, m[0] * 1.30, m[1] * 1.30 + 0.04, '1', 'side', u);
      }
    }

    /* the first triangle carries the explanation */
    if (done >= 1) {
      const A = pt(0, 6, 1), B = pt(1, 6, 1);
      g.appendChild(el('line', { class: 'ac-radius', x1: 0, y1: 0, x2: A[0], y2: A[1] }));
      g.appendChild(el('line', { class: 'ac-radius', x1: 0, y1: 0, x2: B[0], y2: B[1] }));
      g.appendChild(el('path', {
        class: 'ac-arc',
        d: 'M 0,-0.26 A 0.26 0.26 0 0 1 ' + (0.26 * Math.sin(PI / 3)) + ',' + (-0.26 * Math.cos(PI / 3))
      }));
      txt(g, 0.20, -0.36, '60°', '', u);
      txt(g, -0.17, -0.58, '1', 'accent', u);
      txt(g, 0.53, -0.05, '1', 'accent', u);
    }

    const total = Math.max(0, Math.min(6, Math.floor(animT * 6 + 1e-9)));
    txt(g, 0, 1.62, total ? '1' + ' + 1'.repeat(total - 1) + '  =  ' + total : '', 'sum', u);
  }

  /* --- 5 & 6. polygons closing in on the circle --- */
  function scenePolys(g, u, opts) {
    const drawN = Math.min(n, 240);
    const scaled = drawN !== n;
    const a = apothem(s);

    g.appendChild(el('polygon', {
      class: 'ac-out solid',
      opacity: morph ? 0.25 : 1,
      points: polyPoints(drawN, scaled ? 1 / apothem(2 * Math.sin(PI / drawN)) : 1 / a)
    }));
    g.appendChild(el('circle', { class: 'ac-circle', cx: 0, cy: 0, r: 1 }));

    let innerR = 1;
    if (morph) {
      const a0 = apothem(morph.fromS);
      innerR = function (k) { return k % 2 === 0 ? 1 : a0 + (1 - a0) * morph.t; };
    }
    g.appendChild(el('polygon', { class: 'ac-in', points: polyPoints(drawN, innerR) }));

    /* mark the corners that have just been added */
    if (morph && drawN <= 48) {
      for (let k = 1; k < drawN; k += 2) {
        const p = pt(k, drawN, typeof innerR === 'function' ? innerR(k) : innerR);
        g.appendChild(el('circle', { class: 'ac-newdot', cx: p[0], cy: p[1], r: 0.045 }));
      }
    }
    if (opts && opts.caption) txt(g, 0, 1.28, opts.caption, 'cap', u);
  }

  /* ---------------- the renderer ---------------- */
  function drawCurrent() {
    const st = STEPS[step];
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const vb = st.viewBox || '-1.35 -1.35 2.7 2.7';
    svg.setAttribute('viewBox', vb);
    const u = parseFloat(vb.split(' ')[2]) / 2.7;    // label scale for this box

    const g = el('g', {});
    svg.appendChild(g);

    let caption = null;
    if (st.scene === 'polys' && n > 240) {
      caption = 'drawing 240 of ' + n.toLocaleString() + ' corners';
    }
    ({
      unroll: sceneUnroll, trap: sceneTrap, box: sceneBox,
      hex: sceneHex, polys: scenePolys
    })[st.scene](g, u, { caption: caption });
  }

  /* ---------------- doubling ---------------- */
  function stepDouble() {
    const a = apothem(s);
    const prev = s;
    s = s / Math.sqrt(2 + 2 * a);
    n *= 2;
    return prev;
  }
  function setGeometry(target) {
    n = 6; s = 1; morph = null;
    while (n < target) stepDouble();
  }
  function doublings() { return Math.round(Math.log2(n / 6)); }

  function doubleSides(animate) {
    if (n > 6 * Math.pow(2, 25)) return;
    const prev = stepDouble();
    if (animate && n <= 192) {
      morph = { fromS: prev, t: 0 };
      const t0 = performance.now();
      (function tick(now) {
        const p = Math.max(0, Math.min(1, (now - t0) / 520));
        morph.t = ease(p);
        drawCurrent();
        if (p < 1) requestAnimationFrame(tick);
        else { morph = null; drawCurrent(); }
      })(t0);
    } else {
      drawCurrent();
    }
    syncSlider();
    updateBounds();
  }
  function syncSlider() { slider.value = doublings(); }

  /* ---------------- the number line ---------------- */
  const NL_MIN = 2.88, NL_MAX = 4.12;
  function nlPos(v) { return ((v - NL_MIN) / (NL_MAX - NL_MIN)) * 100; }

  (function placeTicks() {
    [['nlT3', 3], ['nlT4', 4], ['nlTpi', PI]].forEach(function (d) {
      document.getElementById(d[0]).style.left = nlPos(d[1]) + '%';
    });
    [['nlL3', 3], ['nlL4', 4], ['nlLpi', PI]].forEach(function (d) {
      document.getElementById(d[0]).style.left = nlPos(d[1]) + '%';
    });
  })();

  function commonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  }

  function updateBounds() {
    const st = STEPS[step];
    if (!st.bounds) return;

    let lo, hi, sides;
    if (st.bounds === 'box')      { lo = null; hi = 4;    sides = 4; }
    else if (st.bounds === 'simple') { lo = 3; hi = 4;    sides = 6; }
    else                          { lo = lower(n, s); hi = upper(n, s); sides = n; }

    bN.textContent = sides.toLocaleString();
    const dp = st.bounds === 'poly' ? 9 : 0;
    bLow.textContent  = lo === null ? '—' : fmt(lo, dp);
    bHigh.textContent = fmt(hi, dp);

    /* the band on the number line: π lives somewhere in here */
    const l = nlPos(lo === null ? NL_MIN : lo);
    const r = nlPos(hi);
    nlBand.style.left = Math.max(0, l) + '%';
    nlBand.style.width = 'max(7px, ' + Math.max(0, r - l) + '%)';

    if (st.bounds === 'poly') {
      const pre = commonPrefix(fmt(lo, 12), fmt(hi, 12));
      const digits = Math.max(0, pre.replace('3.', '').length);
      bLocked.innerHTML = '<em>' + (pre.length >= 2 ? pre : '3.') + '</em>' +
        '<span class="unknown">' + '?'.repeat(Math.max(0, 10 - digits)) + '</span>' +
        '<span class="lockcount">' + digits + ' decimal' + (digits === 1 ? '' : 's') + '</span>';
    }
    btnDbl.disabled = n > 6 * Math.pow(2, 25);
    liveMath();
  }

  /* =======================================================================
     THE SCRIPT
     ======================================================================= */
  const STEPS = [
    {
      title: 'What π actually is.',
      scene: 'unroll', viewBox: '-3.6 -3.5 7.2 7.2', anim: 5200, replay: true,
      body: '<p>Take any circle. Measure straight across it, then unroll the edge and lay it out flat.</p>' +
            '<p>The edge is always <b>3 whole widths, plus a little left over</b>. For every. Circle. Ever. ' +
            'That number is <em>π</em>.</p>',
      math: function () {
        return M.tex('\\text{distance around} = \\pi \\times \\text{distance across}', true);
      }
    },
    {
      title: 'So how long is "a little left over"?',
      scene: 'trap',
      body: '<p>A ruler measures straight lines. A circle has none, so we cheat: we squash it between two shapes that <b>are</b> made of straight lines.</p>' +
            '<p>One that\'s <em>too big</em>, and one that\'s <em>too small</em>. Then π has nowhere to hide.</p>' +
            '<p class="arch-aside">From here on the circle is <b>2 units across</b>, so the distance around it is exactly <b>2π</b>. Halve whatever we measure and we get π.</p>'
    },
    {
      title: 'Too big: put the circle in a box.',
      scene: 'box', viewBox: '-1.78 -1.62 3.56 3.56', anim: 3400, bounds: 'box', replay: true,
      body: '<p>The square just fits around the circle, so each side is as wide as the circle: <b>2</b>.</p>' +
            '<p>Add the four sides up. The circle is tucked inside the box, so the way around the circle must be <b>shorter</b> than the way around the box.</p>',
      math: function () {
        return M.tex('2 + 2 + 2 + 2 = 8', true) +
               M.tex('2\\pi < 8', true) +
               '<div class="math-punch">' + M.tex('\\pi < 4', true) + '</div>';
      }
    },
    {
      title: 'Too small: six triangles.',
      scene: 'hex', viewBox: '-1.68 -1.55 3.36 3.36', anim: 4200, bounds: 'simple', replay: true,
      body: '<p>Now go inside. Mark six points evenly around the circle and join them up.</p>' +
            '<p>Each slice has a <b>60°</b> corner at the centre and two sides that are both radii, so all three sides are equal. ' +
            'Every edge of the hexagon is exactly <em>one radius</em>: <b>1</b>.</p>' +
            '<p>The hexagon is inside, so it must be <b>shorter</b> than the circle.</p>',
      math: function () {
        return M.tex('1 + 1 + 1 + 1 + 1 + 1 = 6', true) +
               M.tex('2\\pi > 6', true) +
               '<div class="math-punch">' + M.tex('3 < \\pi < 4', true) + '</div>';
      }
    },
    {
      title: 'Now close the gap.',
      scene: 'polys', bounds: 'poly', targetN: 12,
      body: '<p>Six corners is a loose fit. So add more: put a new corner in the middle of every edge and push it out until it touches the circle.</p>' +
            '<p>The inside shape grows a little. The outside shape shrinks a little. Both hug the circle tighter, and the gap where π could be hiding gets smaller.</p>' +
            '<p class="arch-aside">Archimedes did this by hand, in fractions, around <b>250 BC</b>, and kept going to <b>96 corners</b>.</p>'
    },
    {
      title: 'Watch π appear.',
      scene: 'polys', bounds: 'poly', play: true,
      body: '<p>Drag the slider. Every step doubles the corners, and the two numbers close in on π from both sides.</p>' +
            '<p>Watch the digits at the bottom stop changing; once both ends agree on a digit, that digit is <b>certain</b>.</p>',
      liveMath: true
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

  /**
   * @param {number} i
   * @param {boolean} [quiet]  set the step up but hold its animation until the
   *                           slide is actually on screen (see animPending)
   */
  function setStep(i, quiet) {
    if (i < 0 || i >= STEPS.length) return;
    const st = STEPS[i];
    const cameFrom = step;
    step = i;
    stopAnim();
    clearTimeout(dblTimer);

    /* park the geometry where this step expects it */
    let animateDouble = false;
    if (st.targetN !== undefined) {
      if (st.targetN === 12 && n === 6 && cameFrom < i) animateDouble = true;
      else if (n !== st.targetN) setGeometry(st.targetN);
    } else if (st.play && n < 12) {
      setGeometry(12);
    } else if (st.scene !== 'polys') {
      setGeometry(6);
    }

    elTitle.textContent = st.title;
    elBody.innerHTML = st.body || '';
    elMath.innerHTML = st.math ? st.math() : '';
    M.renderAll(elBody);

    document.getElementById('archLegend').hidden = !(st.scene === 'polys' || st.scene === 'trap');
    elBounds.hidden = !st.bounds;
    elSides.hidden = !st.play;
    elLocked.hidden = st.bounds !== 'poly';
    btnReplay.hidden = !st.replay;
    elStepNo.textContent = i + 1;
    Array.from(elPips.children).forEach(function (p, k) {
      p.classList.toggle('on', k === i);
      p.classList.toggle('done', k < i);
    });
    btnNext.textContent = i === STEPS.length - 1 ? 'Next slide →' : 'Next step →';

    syncSlider();
    animT = st.anim ? 0 : 1;
    drawCurrent();
    updateBounds();
    animPending = false;
    if (st.anim) {
      if (quiet) animPending = true;      // first frame is drawn; play it later
      else runAnim(st.anim);
    }
    if (animateDouble && !quiet) {
      dblTimer = setTimeout(function () { if (step === i && n === 6) doubleSides(true); }, 420);
    }

    elBody.classList.remove('pop'); void elBody.offsetWidth; elBody.classList.add('pop');
  }

  /* ---------------- live arithmetic on the play step ---------------- */
  function liveMath() {
    if (!STEPS[step].liveMath) return;
    const lo = lower(n, s), hi = upper(n, s);
    elMath.innerHTML =
      M.tex('\\text{inside}\\;\\div 2 = ' + fmt(lo, 9), true) +
      M.tex('\\text{outside} \\div 2 = ' + fmt(hi, 9), true);
  }

  /* ---------------- controls ---------------- */
  btnNext.addEventListener('click', function () {
    if (step < STEPS.length - 1) setStep(step + 1);
    else window.Deck.next();
  });
  btnPrev.addEventListener('click', function () {
    if (step > 0) setStep(step - 1);
    else window.Deck.prev();
  });
  btnReplay.addEventListener('click', function () {
    const st = STEPS[step];
    if (st.anim) { animT = 0; runAnim(st.anim); }
  });
  btnDbl.addEventListener('click', function () { doubleSides(true); liveMath(); });
  slider.addEventListener('input', function () {
    setGeometry(6 * Math.pow(2, +slider.value));
    drawCurrent();
    updateBounds();
    liveMath();
  });

  /* arrow keys drive the sub-steps while this slide is up */
  window.Deck.registerSteps('s-arch', {
    next: function () { if (step < STEPS.length - 1) { setStep(step + 1); return true; } return false; },
    prev: function () { if (step > 0) { setStep(step - 1); return true; } return false; }
  });

  /* Going back to the opening slide starts a fresh visit, so the walkthrough
     rewinds to step 1 right then — while this slide is off screen — rather
     than when it is next shown. Rewinding on arrival would leave the old step
     visible for the length of the slide transition, which reads as a glitch.
     The step's animation is held back until the slide really is on screen. */
  document.addEventListener('slide:enter', function (e) {
    if (e.detail.id === 's-hero') {
      stopAnim();
      if (step !== 0) setStep(0, true);
      else if (STEPS[0].anim) { animT = 0; drawCurrent(); animPending = true; }
      return;
    }
    if (e.detail.id !== 's-arch') return;
    const st = STEPS[step];
    if (animPending) { animPending = false; runAnim(st.anim); return; }
    if (st.anim && animT >= 1) { animT = 0; runAnim(st.anim); }
  });
  document.addEventListener('slide:leave', function (e) {
    if (e.detail.id === 's-arch') stopAnim();
  });

  setStep(0);
})();
