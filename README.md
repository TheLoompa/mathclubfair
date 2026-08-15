# SRM Mathematics Club — the π Booth

An 8-slide interactive presentation for the club fair stand.
Vanilla HTML/CSS/JS. No build step, no server required.

Open `index.html` in Chrome and press **F** for fullscreen.

---

## Before the fair — the 3 things you must edit

Everything lives in **`js/config.js`**:

```js
room:         'Room [ROOM NO.]',      // ← put the real room number
firstSession: '[FIRST SESSION DATE]', // ← put the real date
logo:         'assets/logo.png',      // ← drop your logo in assets/
```

The placeholders show up in square brackets on the slides, so you'll notice
if you forget. The logo is cropped to a circle automatically; a square image
works best. If the file isn't there, a π placeholder ring is shown instead.

---

## Driving it

| Key | Does |
|---|---|
| `→` / `←` / `Space` | next / previous |
| `F` | fullscreen |
| `Home` / `End` | first / last slide |
| `0`–`9` | type digits (on the game slide) |
| `Enter` | bank your score |
| `Esc` | restart the run |

Swipe works on a touchscreen. The dots on the left jump straight to a slide.

On the **Archimedes** slide, `→` walks through the 7 sub-steps first, then
moves on to the next slide.

After 150 seconds of nobody touching anything, it returns to the opening
slide — handy when the stand is unattended. It will *not* interrupt someone
mid-game. Change or disable it with `idleResetSeconds` in `js/config.js`.

---

## The slides

1. **Hook** — "how many digits can you hold in your head?"
2. **The π Challenge** — type the digits, one mistake ends the run
3. **The Board** — leaderboard
4. **Where do the digits come from?** — Archimedes' polygon squeeze, 7 steps
5. **Or… just throw things** — Monte Carlo π
6. **What we actually do** — the club
7. **Come to a session** — when / where / who
8. **See you Sunday**

---

## Leaderboard

Scores are saved in the browser's `localStorage` on **that laptop only** —
they survive refreshes and reboots, but they don't sync anywhere.

- Clear the board with the small ↻ button under it (asks first).
- Use the same browser profile all day, and don't run it in Incognito, or
  the scores vanish.

If you'd rather start the day with a target already on the board, open the
console and run:

```js
Board.add('Archimedes', 2); Board.render();
```

---

## The digits are real

`js/pi.js` computes π to 1200 decimal places when the page loads, using
Machin's formula

```
π = 16·arctan(1/5) − 4·arctan(1/239)
```

evaluated in BigInt integer arithmetic. Nothing is pasted in from a table —
which is a much better answer when someone at the stand asks "how do you know
those are the right digits?". It takes about 6 ms.

The Archimedes slide is likewise computing everything live from
`s' = √(2−2a)`; at 96 sides it reproduces Archimedes' own bounds
(3.14103 < π < 3.14271), and it will keep doubling to ~400 million sides and
12 correct decimals before floating-point runs out.

---

## Running it without wifi

The hall may not have internet. Two things load from a CDN:

1. **KaTeX** (the maths typesetting)
2. **Google Fonts**

Both degrade gracefully — the maths falls back to Unicode and the fonts to
system ones — but it looks noticeably worse. To make it fully offline:

```bash
# from the project folder
curl -L https://github.com/KaTeX/KaTeX/releases/download/v0.16.11/katex.tar.gz | tar xz
mv katex vendor-katex
```

then in `index.html` swap the two CDN URLs for:

```html
<link rel="stylesheet" href="vendor-katex/katex.min.css" />
<script defer src="vendor-katex/katex.min.js"></script>
```

**Test it with the wifi actually switched off before the day.**

---

## Files

```
index.html          all 8 slides
css/style.css       everything visual
js/config.js        ← the file you edit
js/pi.js            computes π with BigInt
js/mathtex.js       KaTeX wrapper + offline fallback
js/deck.js          slide navigation, keyboard, swipe, idle reset
js/game.js          the digit challenge
js/leaderboard.js   localStorage scores
js/archimedes.js    the 7-step polygon walkthrough
js/darts.js         Monte Carlo
js/backdrop.js      background digit rain
js/main.js          config → DOM, logo
assets/             put logo.png here
```
