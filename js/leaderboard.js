/* =========================================================================
   leaderboard.js — local, persistent, no server needed.
   Scores live in this browser's localStorage, so they survive a refresh
   but stay on the booth laptop.
   ========================================================================= */
(function () {
  'use strict';

  const KEY = 'srm-pi-board-v1';
  const MAX_SHOWN = 8;

  const listEl  = document.getElementById('board');
  const emptyEl = document.getElementById('boardEmpty');

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 60))); } catch (e) {}
  }

  function sorted() {
    return load().sort(function (a, b) {
      return b.score - a.score || a.t - b.t;   // earlier ties rank higher
    });
  }

  function best() {
    const s = sorted();
    return s.length ? s[0] : null;
  }

  function add(name, score) {
    const arr = load();
    const entry = {
      name: (name || 'Anonymous').trim().slice(0, 14) || 'Anonymous',
      score: score,
      t: Date.now()
    };
    arr.push(entry);
    save(arr);
    render(entry.t);
    return entry;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(highlightT) {
    const rows = sorted();
    listEl.innerHTML = '';
    emptyEl.hidden = rows.length > 0;

    rows.slice(0, MAX_SHOWN).forEach(function (r, i) {
      const li = document.createElement('li');
      li.className = 'board-row r' + (i + 1);
      if (highlightT && r.t === highlightT) li.classList.add('is-new');
      li.innerHTML =
        '<span class="bk-rank">' + (i + 1) + '</span>' +
        '<span class="bk-name">' + escapeHtml(r.name) + '</span>' +
        '<span class="bk-bar"><i style="width:' +
          Math.max(6, Math.round(100 * r.score / Math.max(1, rows[0].score))) + '%"></i></span>' +
        '<span class="bk-score mono">' + r.score + '</span>';
      listEl.appendChild(li);
    });

    // total plays footnote
    if (rows.length > MAX_SHOWN) {
      const li = document.createElement('li');
      li.className = 'board-more';
      li.textContent = '+ ' + (rows.length - MAX_SHOWN) + ' more attempts today';
      listEl.appendChild(li);
    }
    document.dispatchEvent(new CustomEvent('board:change'));
  }

  document.getElementById('boardReset').addEventListener('click', function () {
    if (confirm('Clear every score on the leaderboard?')) {
      save([]);
      render();
    }
  });

  render();

  window.Board = { add: add, best: best, render: render, all: sorted };
})();
