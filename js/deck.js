/* =========================================================================
   deck.js — the slide engine: navigation, transitions, chrome, idle reset.
   ========================================================================= */
(function () {
  'use strict';

  const deckEl = document.getElementById('deck');
  const slides = Array.from(deckEl.querySelectorAll('.slide'));
  const dotsEl = document.getElementById('dots');
  const fill   = document.getElementById('progressFill');
  const numEl  = document.getElementById('slideNum');
  const totEl  = document.getElementById('slideTotal');

  let index = 0;
  let animating = false;
  const stepHandlers = {};   // slideId -> { next(), prev() } returning bool

  /* ---------- build dot nav ---------- */
  slides.forEach(function (s, i) {
    const b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.setAttribute('aria-label', 'Go to ' + (s.dataset.label || 'slide ' + (i + 1)));
    b.innerHTML = '<i></i><span>' + (s.dataset.label || i + 1) + '</span>';
    b.addEventListener('click', function () { go(i); });
    dotsEl.appendChild(b);
  });
  const dots = Array.from(dotsEl.children);
  totEl.textContent = slides.length;

  /* ---------- core ---------- */
  function go(next, dir) {
    if (next < 0 || next >= slides.length || next === index) return;
    const from = slides[index];
    const to   = slides[next];
    const forward = typeof dir === 'number' ? dir > 0 : next > index;

    animating = true;
    stagger(to);
    from.classList.remove('is-active');
    from.classList.add(forward ? 'leave-left' : 'leave-right');
    to.classList.remove('leave-left', 'leave-right');
    to.classList.add('is-active', forward ? 'enter-right' : 'enter-left');

    // force reflow so the enter transform applies from the right side
    void to.offsetWidth;
    to.classList.remove('enter-right', 'enter-left');

    document.dispatchEvent(new CustomEvent('slide:leave', { detail: { id: from.id } }));

    index = next;
    sync();

    window.setTimeout(function () {
      from.classList.remove('leave-left', 'leave-right');
      animating = false;
      document.dispatchEvent(new CustomEvent('slide:enter', { detail: { id: to.id, index: index } }));
    }, 520);
  }

  /** stagger the entrance of everything tagged [data-anim] */
  function stagger(slide) {
    slide.querySelectorAll('[data-anim]').forEach(function (el, i) {
      el.style.animationDelay = (90 + i * 75) + 'ms';
    });
  }

  function sync() {
    const s = slides[index];
    document.documentElement.dataset.accent = s.dataset.accent || 'magenta';
    dots.forEach(function (d, i) { d.classList.toggle('on', i === index); });
    fill.style.transform = 'scaleX(' + ((index + 1) / slides.length) + ')';
    numEl.textContent = index + 1;
    document.body.dataset.slide = s.id;
  }

  function next() {
    const h = stepHandlers[slides[index].id];
    if (h && h.next && h.next() === true) return;   // sub-step consumed it
    go(index + 1, 1);
  }
  function prev() {
    const h = stepHandlers[slides[index].id];
    if (h && h.prev && h.prev() === true) return;
    go(index - 1, -1);
  }
  function goto(id) {
    const i = slides.findIndex(function (s) { return s.id === id; });
    if (i >= 0) go(i);
  }

  /* ---------- input ---------- */
  function typingInField(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  document.addEventListener('keydown', function (e) {
    if (typingInField(e)) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': e.preventDefault(); next(); break;
      case 'ArrowLeft':  case 'PageUp':   e.preventDefault(); prev(); break;
      case ' ':          e.preventDefault(); next(); break;
      case 'Home':       e.preventDefault(); go(0); break;
      case 'End':        e.preventDefault(); go(slides.length - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  /* wheel / trackpad, throttled */
  let wheelLock = 0;
  deckEl.addEventListener('wheel', function (e) {
    if (animating) return;
    const el = e.target.closest('.slide-inner, .scrollable');
    if (el && el.scrollHeight > el.clientHeight + 4) return;   // let it scroll
    if (Math.abs(e.deltaY) < 18) return;
    const now = Date.now();
    if (now - wheelLock < 700) return;
    wheelLock = now;
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  /* touch swipe */
  let tx = 0, ty = 0, tracking = false;
  deckEl.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  deckEl.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('prevBtn').addEventListener('click', prev);

  /* any [data-goto] / [data-next] button anywhere */
  document.addEventListener('click', function (e) {
    const g = e.target.closest('[data-goto]');
    if (g) { goto(g.dataset.goto); return; }
    if (e.target.closest('[data-next]')) next();
  });

  /* ---------- fullscreen ---------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else {
      document.exitFullscreen();
    }
  }
  document.getElementById('fsBtn').addEventListener('click', toggleFullscreen);

  /* ---------- idle reset (booth mode) ---------- */
  let idleTimer = null;
  function resetIdle() {
    const secs = (window.CONFIG && window.CONFIG.idleResetSeconds) || 0;
    document.body.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (!secs) return;
    idleTimer = setTimeout(function () {
      document.body.classList.add('is-idle');
      // never yank the screen away from someone mid-game
      if (!document.body.classList.contains('game-busy') && index !== 0) go(0);
    }, secs * 1000);
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, resetIdle, { passive: true });
  });

  /* ---------- boot ---------- */
  stagger(slides[0]);
  slides[0].classList.add('is-active');
  sync();
  resetIdle();
  setTimeout(function () {
    document.dispatchEvent(new CustomEvent('slide:enter', { detail: { id: slides[0].id, index: 0 } }));
  }, 60);

  window.Deck = {
    go: go, next: next, prev: prev, goto: goto,
    current: function () { return slides[index].id; },
    registerSteps: function (id, h) { stepHandlers[id] = h; }
  };
})();
