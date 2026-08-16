/* =========================================================================
   leaderboard.js — local, persistent, no server needed.
   Scores live in this browser's localStorage, so they survive a refresh
   but stay on the booth laptop.

   Two house rules:
     · places are labelled with the digits of π (3, 1, 4, 1, 5, 9 …) rather
       than 1, 2, 3 — the ordering is still just top-to-bottom
     · one row per person: playing again updates your existing entry
   ========================================================================= */
(function () {
  'use strict';

  const KEY = 'srm-pi-board-v1';
  const MAX_SHOWN = 7;   // keeps the footer button above the fold on a laptop

  const listEl   = document.getElementById('board');
  const emptyEl  = document.getElementById('boardEmpty');
  const toggleEl = document.getElementById('boardToggle');

  /* "3141592653…" — the badge for place k is PI_SEQ[k-1].
     First place keeps the decimal point so the column reads as π itself:
     3.  1  4  1  5  9  2 */
  const PI_SEQ = '3' + window.PI.decimals;
  function placeLabel(i) { return i === 0 ? '3.' : PI_SEQ[i]; }

  /* Identity is an id, never the timestamp: two people can finish inside the
     same millisecond, and then editing or deleting one would hit both. */
  let idSeq = 0;
  function uid() {
    return Date.now().toString(36) + '-' + (idSeq++).toString(36) +
           Math.random().toString(36).slice(2, 6);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      arr.forEach(function (r) { if (!r.id) r.id = uid(); });   // upgrade old saves
      return arr;
    } catch (e) { return []; }
  }
  function save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 200))); } catch (e) {}
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

  /* names are matched loosely so "Rifah " and "rifah" are the same person */
  function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  /* No practical limit on names — full names are welcome. The cap only
     exists so a pasted wall of text can't wreck the layout or the store. */
  const NAME_MAX = 60;
  function clean(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').slice(0, NAME_MAX) || 'Anonymous';
  }

  /**
   * Add a run. If this name is already on the board the existing row is
   * updated rather than duplicated, keeping whichever score is higher.
   * @returns {{entry:object, merged:boolean, improved:boolean}}
   */
  function add(name, score) {
    const who = clean(name);
    const arr = load();
    const i = arr.findIndex(function (r) { return norm(r.name) === norm(who); });

    let entry, merged = false, improved = true;
    if (i >= 0) {
      entry = arr[i];
      merged = true;
      improved = score > entry.score;
      entry.name = who;                       // keep their latest spelling
      if (improved) { entry.score = score; entry.t = Date.now(); }
    } else {
      entry = { id: uid(), name: who, score: score, t: Date.now() };
      arr.push(entry);
    }
    save(arr);
    render(entry.id);
    return { entry: entry, merged: merged, improved: improved };
  }

  /** what place would this score take, 1-based */
  function placeFor(score, ignoreName) {
    const skip = norm(ignoreName);
    return sorted().filter(function (r) {
      return r.score >= score && (!skip || norm(r.name) !== skip);
    }).length + 1;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  let expanded = false;      // showing everyone, or just the top few

  function render(highlightId) {
    const rows = sorted();
    if (rows.length <= MAX_SHOWN) expanded = false;

    listEl.innerHTML = '';
    emptyEl.hidden = rows.length > 0;
    listEl.classList.toggle('is-full', expanded);

    (expanded ? rows : rows.slice(0, MAX_SHOWN)).forEach(function (r, i) {
      const li = document.createElement('li');
      li.className = 'board-row r' + (i + 1);
      if (highlightId && r.id === highlightId) li.classList.add('is-new');
      li.setAttribute('aria-label', r.name + ', place ' + (i + 1) + ', ' + r.score + ' digits');
      li.innerHTML =
        /* the badge holds both: the π digit, and the real place that
           replaces it on hover */
        '<span class="bk-rank">' +
          '<i class="pi">' + placeLabel(i) + '</i>' +
          '<i class="pos">' + (i + 1) + '</i>' +
        '</span>' +
        '<span class="bk-name" title="' + escapeHtml(r.name) + '">' + escapeHtml(r.name) + '</span>' +
        '<span class="bk-bar"><i style="width:' +
          Math.max(6, Math.round(100 * r.score / Math.max(1, rows[0].score))) + '%"></i></span>' +
        '<span class="bk-score mono">' + r.score + '</span>';
      listEl.appendChild(li);
    });

    toggleEl.innerHTML = '';
    if (rows.length > MAX_SHOWN) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'board-more-btn';
      b.textContent = expanded
        ? '↑ Show the top ' + MAX_SHOWN + ' only'
        : 'See all ' + rows.length + ' players ↓';
      b.addEventListener('click', function () {
        expanded = !expanded;
        render();
        listEl.scrollTop = 0;
      });
      toggleEl.appendChild(b);
    }
    fadeCheck();
    document.dispatchEvent(new CustomEvent('board:change'));
  }

  /* only fade the bottom edge while there is more list below */
  function fadeCheck() {
    const more = listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop > 2;
    listEl.classList.toggle('has-more', expanded && more);
  }
  listEl.addEventListener('scroll', fadeCheck, { passive: true });

  /* a fresh visitor gets the short board back */
  document.addEventListener('slide:enter', function (e) {
    if (e.detail.id === 's-hero' && expanded) { expanded = false; render(); }
  });

  /* ======================================================================
     ADMIN
     ====================================================================== */
  const panel    = document.getElementById('adminPanel');
  const rowsEl   = document.getElementById('adminRows');
  const noneEl   = document.getElementById('adminNone');
  const addForm  = document.getElementById('adminAdd');
  const addName  = document.getElementById('adminName');
  const addScore = document.getElementById('adminScore');

  function patch(id, changes) {
    const arr = load();
    const i = arr.findIndex(function (r) { return r.id === id; });
    if (i < 0) return;
    Object.assign(arr[i], changes);
    save(arr);
    render();                        // refresh the public board only —
  }                                  // re-rendering admin would eat focus

  function removeEntry(id) {
    save(load().filter(function (r) { return r.id !== id; }));
    render();
    renderAdmin();
  }

  function renderAdmin() {
    const rows = sorted();
    rowsEl.innerHTML = '';
    noneEl.hidden = rows.length > 0;

    rows.forEach(function (r, i) {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML =
        '<span class="ar-place">' + placeLabel(i) + '</span>' +
        '<input class="ar-name" name="entry-name" value="' + escapeHtml(r.name) + '" aria-label="Name" />' +
        '<input class="ar-score" name="entry-score" type="number" min="0" max="1200" value="' + r.score + '" aria-label="Digits" />' +
        '<button class="ar-del" type="button" title="Remove" aria-label="Remove ' + escapeHtml(r.name) + '">✕</button>';

      row.querySelector('.ar-name').addEventListener('input', function () {
        patch(r.id, { name: clean(this.value) });
      });
      row.querySelector('.ar-score').addEventListener('input', function () {
        const v = Math.max(0, Math.min(1200, parseInt(this.value, 10) || 0));
        patch(r.id, { score: v });
      });
      row.querySelector('.ar-del').addEventListener('click', function () {
        removeEntry(r.id);
      });
      rowsEl.appendChild(row);
    });
  }

  function openAdmin() {
    renderAdmin();
    panel.hidden = false;
    window.Deck.goto('s-board');
    setTimeout(function () { addName.focus(); }, 400);
  }
  function closeAdmin() {
    panel.hidden = true;
    renderAdmin();
  }

  /* No on-screen way in: Ctrl+Shift+A only. */
  document.getElementById('adminClose').addEventListener('click', closeAdmin);

  document.getElementById('adminClear').addEventListener('click', function () {
    if (confirm('Clear every score on the leaderboard?')) {
      save([]);
      render();
      renderAdmin();
    }
  });

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const nm = addName.value.trim();
    if (!nm) { addName.focus(); return; }
    add(nm, Math.max(0, Math.min(1200, parseInt(addScore.value, 10) || 0)));
    addName.value = '';
    addScore.value = '';
    renderAdmin();
    addName.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      panel.hidden ? openAdmin() : closeAdmin();
    } else if (e.key === 'Escape' && !panel.hidden) {
      closeAdmin();
    }
  });

  render();

  window.Board = {
    add: add, best: best, render: render, all: sorted,
    placeFor: placeFor, openAdmin: openAdmin
  };
})();
