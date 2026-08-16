/* =========================================================================
   game.js — the π digit challenge.
   ========================================================================= */
(function () {
  'use strict';

  const BEST_KEY = 'srm-pi-best-v1';

  const screenEl  = document.getElementById('gameScreen');
  const typedEl   = document.getElementById('typedDigits');
  const scoreEl   = document.getElementById('gameScore');
  const bestEl    = document.getElementById('gameBest');
  const recordEl  = document.getElementById('gameRecord');
  const keypad    = document.getElementById('keypad');
  const overlay   = document.getElementById('gameOver');
  const ovBadge   = document.getElementById('ovBadge');
  const ovTitle   = document.getElementById('ovTitle');
  const ovDetail  = document.getElementById('ovDetail');
  const ovScore   = document.getElementById('ovScore');
  const nameInput = document.getElementById('playerName');
  const form      = document.getElementById('scoreForm');

  let typed = '';
  let over  = false;

  function personalBest() {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  }
  function setPersonalBest(v) {
    if (v > personalBest()) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }
  }

  function ordinal(k) {
    const suffix = ['th', 'st', 'nd', 'rd'], v = k % 100;
    return k + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  }

  function refreshMeta() {
    scoreEl.textContent = typed.length;
    bestEl.textContent = personalBest();
    const b = window.Board && window.Board.best();
    recordEl.textContent = b ? b.score + ' · ' + b.name : '—';
  }

  function renderTyped(wrongChar) {
    let html = '';
    for (let i = 0; i < typed.length; i++) {
      const gap = (i + 1) % 5 === 0 ? ' gap' : '';
      html += '<b class="d' + gap + '">' + typed[i] + '</b>';
    }
    if (wrongChar) html += '<b class="d bad">' + wrongChar + '</b>';
    typedEl.innerHTML = html;
    // keep the newest digit in view on long runs
    screenEl.scrollTop = screenEl.scrollHeight;
  }

  function reset() {
    typed = '';
    over = false;
    overlay.hidden = true;
    screenEl.classList.remove('is-wrong');
    document.body.classList.remove('game-busy');
    renderTyped();
    refreshMeta();
  }

  function push(digit) {
    if (over) return;
    const expected = window.PI.decimals[typed.length];
    if (digit === expected) {
      typed += digit;
      document.body.classList.add('game-busy');
      renderTyped();
      scoreEl.textContent = typed.length;
      screenEl.classList.remove('is-right');
      void screenEl.offsetWidth;
      screenEl.classList.add('is-right');
      if (typed.length % 10 === 0) burst();
    } else {
      fail(digit, expected);
    }
  }

  function burst() {
    screenEl.classList.remove('milestone');
    void screenEl.offsetWidth;
    screenEl.classList.add('milestone');
  }

  function fail(got, expected) {
    over = true;
    renderTyped(got);
    screenEl.classList.add('is-wrong');
    finish(false, got, expected);
  }

  function bank() {
    if (over) return;
    over = true;
    finish(true);
  }

  function finish(voluntary, got, expected) {
    const n = typed.length;
    setPersonalBest(n);
    document.body.classList.remove('game-busy');

    ovScore.textContent = n;
    ovBadge.textContent = voluntary ? '✓' : '✕';
    ovBadge.className = 'ov-badge ' + (voluntary ? 'good' : 'bad');

    if (voluntary) {
      ovTitle.textContent = n === 0 ? 'Nothing banked' : 'Banked!';
      ovDetail.innerHTML = n === 0
        ? 'Come on, give it a go!'
        : 'Next digit was <b class="mono">' + window.PI.decimals[n] + '</b>, if you were curious.';
    } else {
      ovTitle.textContent = 'So close!';
      ovDetail.innerHTML = 'You said <b class="mono bad">' + got +
        '</b>, but it was <b class="mono good">' + expected + '</b>.';
    }

    if (n > 0) {
      ovDetail.innerHTML += '<br><span class="ov-rank">That would put you <b>' +
        ordinal(window.Board.placeFor(n)) + '</b> on the board.</span>';
    }

    overlay.hidden = false;
    setTimeout(function () { if (n > 0) nameInput.focus(); }, 380);
    refreshMeta();
  }

  /* ---------- input ---------- */
  keypad.addEventListener('click', function (e) {
    const b = e.target.closest('button[data-key]');
    if (!b) return;
    const k = b.dataset.key;
    if (k === 'restart') reset();
    else if (k === 'done') bank();
    else push(k);
    b.classList.remove('tapped'); void b.offsetWidth; b.classList.add('tapped');
  });

  document.addEventListener('keydown', function (e) {
    if (window.Deck.current() !== 's-game') return;
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Escape') { overlay.hidden = true; reset(); }
      return;
    }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); push(e.key); }
    else if (e.key === 'Enter')  { e.preventDefault(); bank(); }
    else if (e.key === 'Escape') { e.preventDefault(); reset(); }
    else if (e.key === 'Backspace') { e.preventDefault(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const n = typed.length;
    if (n <= 0) { reset(); return; }
    window.Board.add(nameInput.value, n);
    nameInput.value = '';
    reset();
    window.Deck.goto('s-board');
  });

  document.getElementById('ovRetry').addEventListener('click', reset);

  document.addEventListener('slide:enter', function (e) {
    /* back to the opening slide = a fresh visitor: clear the run AND any
       score overlay left hanging. Done here, while the game slide is off
       screen, so nothing is seen disappearing. */
    if (e.detail.id === 's-hero') { reset(); return; }
    /* arriving on the game slide mid-overlay (e.g. tabbing to the board and
       back) leaves it alone so a half-typed name survives */
    if (e.detail.id === 's-game') { if (!overlay.hidden) return; reset(); }
  });
  document.addEventListener('board:change', refreshMeta);

  reset();
})();
