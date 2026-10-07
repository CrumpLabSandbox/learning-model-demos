// Stream presets for the streamed-trial page: the contingency matrices used
// in the papers, written as designs. Each frame of a stream is one trial;
// the context Z stands for the stream itself, so `+` is the outcome with no
// cue and `-` is a frame with nothing on it.
//
// Each preset: id, title, design, cues (the cues a participant can be asked
// about, in the order square, triangle), deltaP per cue (what the design
// should give; a test checks it), pOutcome (the outcome density, for single
// cue streams), source, and a one-line note.

export const streams = [
  {
    id: 'zero-low',
    title: 'ΔP = 0, outcome rare (P(O) = 0.2)',
    design: 'Stream: 6 A+, 24 A-, 6 +, 24 -, random\nContext: Z',
    cues: ['A'],
    deltaP: { A: 0 },
    pOutcome: 0.2,
    source: 'Crump, Hannah, Allan & Hord (2007), Figure 2',
    note: 'No contingency: the outcome is just as likely with the cue as without it, and it is rare.',
  },
  {
    id: 'zero-high',
    title: 'ΔP = 0, outcome common (P(O) = 0.8)',
    design: 'Stream: 24 A+, 6 A-, 24 +, 6 -, random\nContext: Z',
    cues: ['A'],
    deltaP: { A: 0 },
    pOutcome: 0.8,
    source: 'Crump et al. (2007), Figure 2',
    note: 'No contingency again, but the outcome is common. Most people rate this stream higher than the rare one.',
  },
  {
    id: 'positive-low',
    title: 'ΔP = 0.47, outcome rare (P(O) = 0.33)',
    design: 'Stream: 17 A+, 13 A-, 3 +, 27 -, random\nContext: Z',
    cues: ['A'],
    deltaP: { A: 0.4667 },
    pOutcome: 0.3333,
    source: 'Crump et al. (2007), Figure 2',
    note: 'A positive contingency: the outcome follows the cue on 17 of 30 frames and comes on 3 of 30 frames without it.',
  },
  {
    id: 'positive-high',
    title: 'ΔP = 0.47, outcome common (P(O) = 0.67)',
    design: 'Stream: 27 A+, 3 A-, 13 +, 17 -, random\nContext: Z',
    cues: ['A'],
    deltaP: { A: 0.4667 },
    pOutcome: 0.6667,
    source: 'Crump et al. (2007), Figure 2',
    note: 'The same contingency as the stream above, with a common outcome.',
  },
  {
    id: 'negative',
    title: 'ΔP = −0.47 (P(O) = 0.5)',
    design: 'Stream: 8 A+, 22 A-, 22 +, 8 -, random\nContext: Z',
    cues: ['A'],
    deltaP: { A: -0.4667 },
    pOutcome: 0.5,
    source: 'After Allan, Hannah, Crump & Siegel (2008), Experiment 2',
    note: 'A negative contingency: the outcome is less likely when the cue is there.',
  },
  {
    id: 'companion-perfect',
    title: 'Two cues: target ΔP = 0.5, companion ΔP = 1.0',
    design: 'Stream: 18 AB+, 6 A+, 6 B-, 18 -, random\nContext: Z',
    cues: ['B', 'A'],
    deltaP: { B: 0.5, A: 1 },
    source: 'Hannah, Crump, Allan & Siegel (2009), Table 3, companion 1.0',
    note: 'The square (B) is the target. The triangle (A) is followed by the circle every time it appears.',
  },
  {
    id: 'companion-useless',
    title: 'Two cues: target ΔP = 0.5, companion ΔP = 0',
    design: 'Stream: 9 AB+, 9 B+, 3 A+, 3 +, 3 AB-, 3 B-, 9 A-, 9 -, random\nContext: Z',
    cues: ['B', 'A'],
    deltaP: { B: 0.5, A: 0 },
    source: 'Hannah et al. (2009), Table 3, companion 0.0',
    note: 'The same target contingency as above, but the triangle (A) predicts nothing.',
  },
];

export const streamById = (id) => streams.find((s) => s.id === id);
