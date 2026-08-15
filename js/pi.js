/* =========================================================================
   pi.js — computes the digits of π in the browser, exactly.

   No lookup table: we evaluate Machin's formula (1706)

        π = 16·arctan(1/5) − 4·arctan(1/239)

   in scaled BigInt arithmetic, using the Gregory series

        arctan(1/x) = 1/x − 1/(3x³) + 1/(5x⁵) − …

   Every digit shown in this presentation therefore gets derived on the
   spot, which is a much better story to tell than "I pasted them in".
   ========================================================================= */
(function () {
  'use strict';

  function arctanInv(x, unity) {
    const bx = BigInt(x);
    const bx2 = bx * bx;
    let power = unity / bx;      // 1/x  (scaled)
    let sum = power;
    let n = 1n;
    let sign = -1n;
    while (power !== 0n) {
      power = power / bx2;       // 1/x^(2n+1)
      sum += sign * (power / (2n * n + 1n));
      sign = -sign;
      n += 1n;
    }
    return sum;
  }

  function computePi(digits) {
    const guard = 12;                                  // absorb truncation
    const unity = 10n ** BigInt(digits + guard);
    const pi = 16n * arctanInv(5, unity) - 4n * arctanInv(239, unity);
    const s = pi.toString();                           // "3141592653..."
    return s[0] + '.' + s.slice(1, digits + 1);
  }

  const DIGITS = 1200;
  const t0 = performance.now();
  const PI_STRING = computePi(DIGITS);                 // "3.14159..."

  window.PI = {
    /** "3.14159265358979..." */
    string: PI_STRING,
    /** just the decimals: "14159265358979..." */
    decimals: PI_STRING.slice(2),
    /** how many decimals we hold */
    count: DIGITS,
    /** ms it took to derive them — fun to show off */
    computeMs: +(performance.now() - t0).toFixed(1),
    /** decimal at 1-based position n */
    at: function (n) { return PI_STRING[n + 1]; }
  };
})();
