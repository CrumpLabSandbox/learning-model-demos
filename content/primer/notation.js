// Notation map: the symbols on this site, in the original paper, and other
// forms students will meet in readings. Only forms that are common across
// sources are listed in the last column; check any one source before
// quoting it.

export const notation = [
  {
    idea: 'Change in strength on one trial',
    site: 'ΔV<sub>A</sub>',
    original: 'ΔV<sub>A</sub>',
    other: 'ΔV, ΔV<sub>i</sub>, ΔV<sub>A</sub><sup>n</sup>',
  },
  {
    idea: 'Strength of one cue',
    site: 'V<sub>A</sub>',
    original: 'V<sub>A</sub>',
    other: 'V<sub>i</sub>, w<sub>A</sub> (a "weight" in connectionist papers), V<sub>A</sub>(n)',
  },
  {
    idea: 'Total prediction of the cues present',
    site: 'ΣV',
    original: 'V<sub>AX</sub> for the compound of A and X, equal to V<sub>A</sub> + V<sub>X</sub>',
    other: 'V<sub>sum</sub>, V<sub>total</sub>, V<sub>T</sub>, ΣV<sub>i</sub>, Σ<sub>j</sub>V<sub>j</sub>',
  },
  {
    idea: 'Salience of a cue (a parameter)',
    site: 'α<sub>A</sub>',
    original: 'α<sub>A</sub>',
    other: 'α, α<sub>i</sub>; sometimes combined with β into one rate',
  },
  {
    idea: 'Learning rate for the outcome (a parameter)',
    site: 'β, with β<sup>−</sup> for trials without the outcome',
    original: 'β with a subscript for the outcome, such as β<sub>1</sub>',
    other: 'β<sup>+</sup> and β<sup>−</sup>; or a single combined rate written k, c, or η',
  },
  {
    idea: 'The most learning the outcome supports',
    site: 'λ',
    original: 'λ with a subscript for the outcome, such as λ<sub>1</sub>',
    other: 'λ, λ<sub>US</sub>; 0 on trials without the outcome',
  },
  {
    idea: 'Prediction error',
    site: 'λ − ΣV',
    original: 'λ<sub>1</sub> − V<sub>AX</sub>',
    other: '(λ − V<sub>sum</sub>), δ (delta, lower case), "surprise", "discrepancy"',
  },
  {
    idea: 'Which trial',
    site: 'V<sup>n</sup>, only when needed',
    original: 'not written; the rule applies on every trial',
    other: 'V<sub>n</sub>, V(n), V<sub>t</sub>, V(t)',
  },
  {
    idea: 'Applying the change',
    site: 'V<sub>A</sub> ← V<sub>A</sub> + ΔV<sub>A</sub>',
    original: 'described in words',
    other: 'V<sub>A</sub><sup>n+1</sup> = V<sub>A</sub><sup>n</sup> + ΔV<sub>A</sub><sup>n</sup>; V<sub>new</sub> = V<sub>old</sub> + ΔV',
  },
  {
    idea: 'Attention to a cue (attention models)',
    site: 'α<sub>A</sub>, starting at α<sup>0</sup>',
    original: 'α<sub>A</sub>, called associability',
    other: 'α<sub>A</sub><sup>n</sup> (on trial n), "associability", "attention"',
  },
  {
    idea: 'Mackintosh: is A the best predictor?',
    site: '|λ − V<sub>A</sub>| compared with |λ − ΣV<sub>others</sub>|',
    original: 'stated in words for A and "all other stimuli present"',
    other: '|λ − V<sub>X</sub>|, where X stands for all the other stimuli',
  },
  {
    idea: 'Pearce-Hall: attention from surprise',
    site: 'α<sub>A</sub> ← γ|λ − ΣV| + (1 − γ)α<sub>A</sub>',
    original: 'without γ in 1980 (attention equals the last surprise); γ added in 1982',
    other: 'α<sub>A</sub><sup>n</sup> = |λ<sup>n−1</sup> − ΣV<sup>n−1</sup>|',
  },
  {
    idea: 'Inhibitory strength',
    site: 'V̄<sub>A</sub>',
    original: 'V̄<sub>A</sub>',
    other: 'I<sub>A</sub>, V<sup>−</sup>, "inhibitory associative strength"',
  },
  {
    idea: 'Salience of a cue (Pearce-Hall)',
    site: 'S<sub>A</sub>',
    original: 'S<sub>A</sub>',
    other: 'intensity, β<sub>A</sub> in some sources',
  },
  {
    idea: 'How much of a stimulus is active (SOP)',
    site: 'p<sub>A1,A</sub>, p<sub>A2,US</sub>',
    original: 'p<sub>A1</sub> and p<sub>A2</sub> for each stimulus',
    other: 'pA1, pA2; "A1 activity"; sometimes the number of elements rather than the proportion',
  },
  {
    idea: 'Chance an element changes state on one moment (SOP)',
    site: 'p<sub>1</sub>, p<sub>d1</sub>, p<sub>d2</sub>, and p<sub>2</sub> for calling up',
    original: 'p<sub>1</sub>, pd<sub>1</sub>, pd<sub>2</sub>, p<sub>2</sub>',
    other: 'rates rather than chances when time runs continuously',
  },
  {
    idea: 'Learning rates for excitation and inhibition (SOP)',
    site: 'L<sup>+</sup>, L<sup>−</sup>',
    original: 'L<sup>+</sup>, L<sup>−</sup>',
    other: 'separate excitatory and inhibitory strengths V<sup>+</sup> and V<sup>−</sup>',
  },
  {
    idea: 'How well a probe brings back the outcome (MINERVA-AL)',
    site: 'O|P, with O for the outcome',
    original: 'X|P, with X for the outcome',
    other: 'retrieval, recall, expectancy',
  },
  {
    idea: 'A memory trace and the echo (MINERVA-AL)',
    site: 'M<sub>ij</sub> (feature j of trace i), C<sub>j</sub> and the scaled C′<sub>j</sub>',
    original: 'M<sub>ij</sub>, C<sub>j</sub>, C′<sub>j</sub>',
    other: 'T<sub>ij</sub> for a trace in Hintzman (1986); the echo\'s content and its intensity',
  },
];
