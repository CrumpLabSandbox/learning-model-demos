// Number formatting shared by the equation panel, table, and chart.

// Computed quantities: always three decimals, so students can check the
// arithmetic by hand with consistent rounding.
export function fmt(x, dp = 3) {
  if (x === undefined || x === null || Number.isNaN(x)) return '–';
  const r = Number(x.toFixed(dp));
  if (Object.is(r, -0) || r === 0) return (0).toFixed(dp);
  return r.toFixed(dp);
}

// Values set by a person (parameters, outcome magnitudes): shown exactly as
// set, without padding zeros, so 0.3 reads as 0.3 and 1 reads as 1.
export function fmtExact(x) {
  if (x === undefined || x === null || Number.isNaN(x)) return '–';
  return String(Number(x.toFixed(4)));
}

// Minus sign for display (U+2212), which lines up with plus in equations.
export function signed(text) {
  return String(text).replace(/^-/, '−');
}
