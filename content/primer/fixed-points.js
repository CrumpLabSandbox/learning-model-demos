// Worked examples: where Rescorla-Wagner learning stops.
// Learning stops when every ΔV is zero. Setting the update rule to zero and
// solving gives the values the strengths approach, without running a single
// trial. The primer shows each step, then runs the real model to check.

import { math, mo, mn, row, paren, RW } from '../../js/ui/mathml.js';

const { V, dV, alpha, beta, lambda } = RW;
const eq = (...p) => math(...p);

export const cases = [
  {
    id: 'single',
    title: 'One cue, always reinforced',
    design: 'Training: 300 A+',
    cues: ['A'],
    solve: (p) => ({ A: p.lambda }),
    steps: [
      {
        words: 'Start from the update rule for A. A is the only cue, so the total prediction is just V_A.',
        math: eq(dV('A'), mo('='), alpha('A'), beta(), paren(lambda(), mo('−'), V('A'))),
      },
      {
        words: 'Learning has stopped when the change is zero. Set ΔV_A to 0.',
        math: eq(mn(0), mo('='), alpha('A'), beta(), paren(lambda(), mo('−'), V('A'))),
      },
      {
        words: 'A product is zero only if one of its parts is zero. α_A and β are not zero, so the bracket must be.',
        math: eq(mn(0), mo('='), lambda(), mo('−'), V('A')),
      },
      {
        words: 'Add V_A to both sides. A ends up predicting exactly λ. Notice that α and β dropped out: they change how fast A gets there, not where it ends.',
        math: eq(V('A'), mo('='), lambda()),
      },
    ],
  },
  {
    id: 'compound',
    title: 'Two cues trained together',
    design: 'Training: 300 AB+',
    cues: ['A', 'B'],
    solve: (p) => {
      const s = p.alpha_A + p.alpha_B;
      return { A: (p.lambda * p.alpha_A) / s, B: (p.lambda * p.alpha_B) / s };
    },
    steps: [
      {
        words: 'A and B are always together, so the total prediction is V_A + V_B. Here is the rule for A.',
        math: eq(dV('A'), mo('='), alpha('A'), beta(), paren(lambda(), mo('−'), row(V('A'), mo('+'), V('B')))),
      },
      {
        words: 'Set the change to zero. As before, the bracket must be zero.',
        math: eq(mn(0), mo('='), lambda(), mo('−'), V('A'), mo('−'), V('B')),
      },
      {
        words: 'So the two strengths add up to λ. They share it. This is overshadowing: neither cue alone gets all of λ.',
        math: eq(V('A'), mo('+'), V('B'), mo('='), lambda()),
      },
      {
        words: 'How do they share it? On every trial A and B see the same error, so their changes are always in the ratio of their saliences. They start at 0, so their strengths keep that ratio.',
        math: eq(
          `<mfrac>${V('A')}${V('B')}</mfrac>`,
          mo('='),
          `<mfrac>${alpha('A')}${alpha('B')}</mfrac>`,
        ),
      },
      {
        words: 'Put the two facts together and solve. The more salient cue takes the bigger share.',
        math: eq(
          V('A'),
          mo('='),
          lambda(),
          mo('×'),
          `<mfrac>${alpha('A')}${row(alpha('A'), mo('+'), alpha('B'))}</mfrac>`,
        ),
      },
    ],
  },
  {
    id: 'inhibition',
    title: 'A+ trials mixed with AX− trials',
    design: 'Training: 300 A+, 300 AX-',
    cues: ['A', 'X'],
    solve: (p) => ({ A: p.lambda, X: -p.lambda }),
    steps: [
      {
        words: 'There are two kinds of trial, so there are two conditions. Learning stops only when both kinds of trial produce no change.',
        math: eq(dV('A'), mo('='), mn(0), mtextSpace(), mo('and'), mtextSpace(), dV('X'), mo('='), mn(0)),
      },
      {
        words: 'On A+ trials only A is present and λ is the outcome. This is the one-cue case again.',
        math: eq(mn(0), mo('='), lambda(), mo('−'), V('A'), mspace(), mo('⇒'), mspace(), V('A'), mo('='), lambda()),
      },
      {
        words: 'On AX− trials the outcome is absent, so λ is 0 and the total prediction is V_A + V_X.',
        math: eq(mn(0), mo('='), mn(0), mo('−'), paren(V('A'), mo('+'), V('X'))),
      },
      {
        words: 'Put in V_A = λ from the A+ trials and solve for X.',
        math: eq(V('X'), mo('='), mo('−'), lambda()),
      },
      {
        words: 'X ends below zero: it predicts the outcome will not happen. That is what makes X a conditioned inhibitor.',
        math: eq(V('A'), mo('+'), V('X'), mo('='), lambda(), mo('−'), lambda(), mo('='), mn(0)),
      },
    ],
  },
];

function mspace() {
  return '<mspace width="0.6em"/>';
}
function mtextSpace() {
  return '<mspace width="0.4em"/>';
}

