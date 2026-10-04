// Predict first: compare a student's sketched curve with the model's.
// A sketch is a map from trial number to predicted value. Between sketched
// trials the curve is a straight line; outside them it is undefined.

export function sketchPoints(sketch) {
  return Object.entries(sketch)
    .map(([t, v]) => [Number(t), v])
    .sort((a, b) => a[0] - b[0]);
}

// The sketch at every trial 0..n, or null where the student drew nothing.
export function interpolate(sketch, n) {
  const pts = sketchPoints(sketch);
  const out = new Array(n + 1).fill(null);
  if (!pts.length) return out;
  for (let i = 0; i < pts.length; i++) {
    const [t0, v0] = pts[i];
    if (t0 >= 0 && t0 <= n) out[t0] = v0;
    if (i + 1 < pts.length) {
      const [t1, v1] = pts[i + 1];
      for (let t = Math.max(0, t0 + 1); t < Math.min(t1, n + 1); t++) out[t] = v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
    }
  }
  return out;
}

// How far the sketch is from the model, over the trials the sketch covers.
// series: the model's prediction after each trial, 0..n.
// phases: [{ name, start, end }] from a Run.
export function compareSketch(sketch, series, phases) {
  const n = series.length - 1;
  const s = interpolate(sketch, n);
  let total = 0;
  let count = 0;
  let worst = null;
  for (let t = 0; t <= n; t++) {
    if (s[t] === null) continue;
    const d = Math.abs(s[t] - series[t]);
    total += d;
    count += 1;
    if (t > 0 && (!worst || d > worst.diff)) worst = { t, sketch: s[t], model: series[t], diff: d };
  }
  const phaseEnds = phases.map((p) => ({
    phase: p.name,
    t: p.end,
    sketch: s[p.end],
    model: series[p.end],
  }));
  const covered = s.map((v, t) => (v === null ? null : t)).filter((t) => t !== null);
  return {
    meanAbs: count ? total / count : null,
    worst,
    phaseEnds,
    coverage: covered.length ? [covered[0], covered[covered.length - 1]] : null,
    complete: covered.length ? covered[covered.length - 1] >= n : false,
  };
}

// A short verdict in plain words.
export function verdict(meanAbs, scale = 1) {
  if (meanAbs === null) return 'Sketch a line to compare it with the model.';
  const r = meanAbs / Math.max(scale, 1e-9);
  if (r < 0.05) return 'Very close: your sketch matches the model almost exactly.';
  if (r < 0.15) return 'Close: the shape is right, with small differences.';
  if (r < 0.3) return 'Partly right: look at where the lines part ways.';
  return 'Quite different from the model. That is useful: find where they part ways and read the equations there.';
}
