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
| `→` / `←` / `Space` | next / previous (`→` on the last slide loops back to the start) |
| `F` | fullscreen |
| `Home` / `End` | first / last slide |
| `0`–`9` | type digits (on the game slide) |
| `Enter` | bank your score |
| `Esc` | restart the run |
| `Ctrl` + `Shift` + `A` | open the leaderboard editor |

Swipe works on a touchscreen. The dots on the left jump straight to a slide.

On the **Archimedes** slide, `→` walks through the 6 sub-steps first, then
moves on to the next slide. Three of those steps draw an animation; the
**↻ Replay** button re-runs it, which is worth doing when a new group of
students walks up.

After 150 seconds of nobody touching anything, it returns to the opening
slide — handy when the stand is unattended. It will *not* interrupt someone
mid-game. Change or disable it with `idleResetSeconds` in `js/config.js`.

---

## The slides

1. **Hook** — "how many digits can you hold in your head?"
2. **The π Challenge** — type the digits, one mistake ends the run
3. **The Board** — leaderboard
4. **Where do the digits come from?** — Archimedes' polygon squeeze, 6 steps
5. **Or… just throw things** — Monte Carlo π
6. **What we actually do** — the club
7. **Come to a session** — when / where / who
8. **See you Sunday**

---

## Leaderboard

Scores are saved in the browser's `localStorage` on **that laptop only** —
they survive refreshes and reboots, but they don't sync anywhere. Use the
same browser profile all day, and don't run it in Incognito, or the scores
vanish.

Places are labelled with the **digits of π** — `3.` `1` `4` `1` `5` `9` `2`
— rather than 1, 2, 3, so the column reads as π down the page. The ranking is
still just top-to-bottom, and the top three keep their medal colours, so
nobody has to work it out.

Full names are fine; the row gives them the space and the bar shrinks to suit.

**Hover a row** and its π digit flips over to show that player's real place —
handy when someone asks "so where am I?".

The board shows the top 7. If more people have played, a **See all N players**
button under it opens the full list, which scrolls inside itself so the page
never grows. Going back to the opening slide collapses it again.

**One row per person.** Playing again updates your existing entry instead of
adding a second one, and your best score is the one that sticks — a worse
second attempt won't knock you down. Names are matched loosely, so trailing
spaces and capitalisation don't create a second row.

> Which also means two different students called Rifah would share a row.
> If that comes up, ask the second one for a surname initial, or fix it in
> the editor below.

### Editing the board

Press **Ctrl + Shift + A** from any slide. There is deliberately no button on
screen, so a visitor can't stumble into it — you'll want to remember the
shortcut. `Esc` or the same shortcut closes it. You can:

- change any name or score (saves as you type)
- remove an entry with ✕
- add an entry by hand — useful for seeding a target before doors open,
  or for the person whose name you spelled wrong
- clear the whole board (asks first)

Adding `Archimedes` with a score of `2` before the fair opens is a good
way to make the board feel alive from the first visitor.

---

## The digits are real

`js/pi.js` computes π to 1200 decimal places when the page loads, using
Machin's formula

```text
π = 16·arctan(1/5) − 4·arctan(1/239)
```

evaluated in BigInt integer arithmetic. Nothing is pasted in from a table —
which is a much better answer when someone at the stand asks "how do you know
those are the right digits?". It takes about 6 ms.

The Archimedes slide is likewise computing everything live from
`s' = √(2−2a)`; at 96 corners it reproduces Archimedes' own bounds
(3.14103 < π < 3.14271), and the slider goes to 201 million corners and
12 correct decimals before floating-point runs out.

### How that slide is pitched

The two bounds a student is asked to *work out* are the two that need nothing
but counting, so a Class 7 student can follow every number on screen:

- **outside** — the square box around the circle: `2+2+2+2 = 8`, so `π < 4`
- **inside** — the hexagon of six radii: `1+1+1+1+1+1 = 6`, so `π > 3`

Both are animated onto the diagram, side by side with a running total. There
is no Pythagoras, no apothem and no trigonometry anywhere in the derivation.

Only *after* `3 < π < 4` is on the board do we start doubling corners, and
from that point the slide is about **watching the trap close** rather than
following algebra — the coloured band on the number line shrinks onto π, and
the "digits confirmed" readout counts up. The recursion doing the work is in
the source if an older student asks.

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

```text
index.html          all 8 slides
css/style.css       everything visual
js/config.js        ← the file you edit
js/pi.js            computes π with BigInt
js/mathtex.js       KaTeX wrapper + offline fallback
js/deck.js          slide navigation, keyboard, swipe, idle reset
js/game.js          the digit challenge
js/leaderboard.js   localStorage scores + the board editor
js/archimedes.js    the 6-step polygon walkthrough + its animations
js/darts.js         Monte Carlo
js/backdrop.js      background digit rain
js/main.js          config → DOM, logo
assets/             put logo.png here
```
