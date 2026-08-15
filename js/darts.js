/* =========================================================================
   darts.js — Monte Carlo π.
   Square of side 2, circle of radius 1 inside it.
     area of circle / area of square = π/4
   so the fraction of uniformly random points landing inside the circle
   converges on π/4. Multiply by 4 and wait.
   ========================================================================= */
(function () {
  'use strict';

  const cv = document.getElementById('dartCanvas');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const PAD = 14;
  const R = (W - PAD * 2) / 2;
  const CX = W / 2, CY = H / 2;

  const elTotal = document.getElementById('dTotal');
  const elHits  = document.getElementById('dHits');
  const elEst   = document.getElementById('dEst');
  const elMath  = document.getElementById('dartMath');

  let total = 0, hits = 0, auto = false, rafId = null;

  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 3;
    ctx.strokeStyle = css('--ink');
    ctx.strokeRect(PAD, PAD, R * 2, R * 2);
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  function reset() {
    total = 0; hits = 0;
    frame();
    update();
  }

  function throwDarts(count) {
    const inC = css('--accent') || '#A6F224';
    const outC = css('--ink') || '#14082e';
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      const inside = x * x + y * y <= 1;
      if (inside) hits++;
      total++;
      ctx.fillStyle = inside ? inC : outC;
      ctx.globalAlpha = inside ? 0.85 : 0.45;
      ctx.beginPath();
      ctx.arc(CX + x * R, CY + y * R, total > 4000 ? 1.4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    update();
  }

  function update() {
    elTotal.textContent = total.toLocaleString();
    elHits.textContent = hits.toLocaleString();
    elEst.textContent = total ? (4 * hits / total).toFixed(5) : '—';

    const M = window.MathTex;
    elMath.innerHTML =
      M.tex('\\frac{\\text{circle}}{\\text{square}} = \\frac{\\pi r^{2}}{(2r)^{2}} = \\frac{\\pi}{4}', true) +
      M.tex('\\pi \\approx 4 \\times \\frac{' + hits + '}{' + (total || 1) + '}' +
            (total ? ' = ' + (4 * hits / total).toFixed(5) : ''), true);
  }

  function loop() {
    if (!auto) return;
    throwDarts(120);
    rafId = requestAnimationFrame(loop);
  }

  document.querySelectorAll('[data-throw]').forEach(function (b) {
    b.addEventListener('click', function () { throwDarts(+b.dataset.throw); });
  });
  const autoBtn = document.getElementById('dartAuto');
  autoBtn.addEventListener('click', function () {
    auto = !auto;
    autoBtn.textContent = auto ? 'Pause ❚❚' : 'Auto ▶';
    autoBtn.classList.toggle('is-on', auto);
    if (auto) loop(); else cancelAnimationFrame(rafId);
  });
  document.getElementById('dartReset').addEventListener('click', function () {
    auto = false;
    autoBtn.textContent = 'Auto ▶';
    autoBtn.classList.remove('is-on');
    cancelAnimationFrame(rafId);
    reset();
  });

  /* stop the loop when the slide isn't on screen */
  document.addEventListener('slide:leave', function (e) {
    if (e.detail.id === 's-darts' && auto) {
      auto = false;
      autoBtn.textContent = 'Auto ▶';
      autoBtn.classList.remove('is-on');
      cancelAnimationFrame(rafId);
    }
  });
  document.addEventListener('slide:enter', function (e) {
    if (e.detail.id === 's-darts' && total === 0) { frame(); update(); }
  });

  reset();
})();
