// Check questions for the tutorials. Each has exactly one right answer and
// an explanation for every option; wrong answers are never scolded.

export const checks = {
  blockingPredict: {
    q: 'A is paired with the outcome many times. Then A and B together are paired with the same outcome. Which cue will B end up most like?',
    options: [
      { text: 'A cue that was never trained', correct: true, why: 'Right, in most animals and people: B gains little, because A already predicted the outcome. That is blocking. The rest of this tutorial is about why.' },
      { text: 'A, the pretrained cue', correct: false, why: 'B was paired with the outcome as often as A was in the second phase, so this is a fair guess. But animals learn little about B: A already predicted the outcome. That is blocking.' },
      { text: 'D, a cue trained with a new partner', correct: false, why: 'D, trained with a new cue C, is the comparison. Animals learn much more about D than about B, because nothing predicted the outcome on CD trials.' },
    ],
  },
  blockingWho: {
    q: 'In which model does blocking come from storing only what was unexpected on each trial?',
    options: [
      { text: 'MINERVA-AL', correct: true, why: 'Right. Each trace stores the event minus what memory expected, so on AB trials the outcome, already expected from A, is stored only faintly with B.' },
      { text: 'Rescorla-Wagner', correct: false, why: 'Rescorla-Wagner has no memory of trials. Its blocking comes from the shared error λ − ΣV, which A has already used up.' },
      { text: 'Pearce-Hall', correct: false, why: 'In Pearce-Hall, blocking comes from attention: with no surprise, attention to B fades after its first trial.' },
    ],
  },
  rwSum: {
    q: 'Why can no setting of Rescorla-Wagner\'s parameters produce negative patterning (A+, B+, AB−)?',
    options: [
      { text: 'The compound predicts the sum of its parts', correct: true, why: 'Right. AB predicts V_A + V_B. If A and B each predict the outcome, their sum predicts it even more, never less.' },
      { text: 'The learning rate is too small', correct: false, why: 'A bigger learning rate makes learning faster, but AB still predicts V_A + V_B, which is more than either part whenever both are positive.' },
      { text: 'Absent cues do not change', correct: false, why: 'That is why Rescorla-Wagner misses backward blocking. In negative patterning A and B are present on every AB trial.' },
    ],
  },
  rwLatent: {
    q: 'During pre-exposure (A with nothing after it), what is Rescorla-Wagner\'s error on each trial?',
    options: [
      { text: '0, so nothing changes', correct: true, why: 'Right. λ is 0 and V_A is 0, so λ − V_A = 0. Nothing is learned, and A is just as new afterwards as before. The model has nothing that pre-exposure can change.' },
      { text: 'Negative, so A becomes an inhibitor', correct: false, why: 'The error is 0 − 0 = 0, not negative. A would only go below zero if something already predicted the outcome.' },
      { text: '1, so A learns fast', correct: false, why: 'λ is 1 only on trials with the outcome. In pre-exposure nothing follows A, so λ is 0 and the error is 0 − 0 = 0.' },
    ],
  },
  sopOverlap: {
    q: 'In SOP, a cue gains the most strength on a trial when...',
    options: [
      { text: 'it and the US are both in A1 at the same moments', correct: true, why: 'Right. The gain is L⁺ times the overlap of the cue\'s A1 with the US\'s A1, added up over the moments of the trial.' },
      { text: 'the US arrives long after the cue ends', correct: false, why: 'By then the cue\'s elements have faded to A2, so there is almost no overlap in A1 and almost no gain. That is the trace conditioning result.' },
      { text: 'the US comes just before the cue', correct: false, why: 'Then the cue is active while the US is fading in A2, which is loss, not gain. Over many trials the cue becomes an inhibitor.' },
    ],
  },
  sopSpacing: {
    q: 'Why do trials packed close together teach less per trial in SOP?',
    options: [
      { text: 'The last trial is still active in A2', correct: true, why: 'Right. With a short gap, the US and the cue from the last trial are still in A2. Fewer US elements can go to A1, and the cue is in A1 while the US lingers in A2, which costs strength.' },
      { text: 'The learning rate falls when trials are close', correct: false, why: 'L⁺ and L⁻ never change. What changes is what is still active from the trial before.' },
      { text: 'The model forgets between trials', correct: false, why: 'SOP does not forget link strengths between trials. It is the reverse: a short gap leaves the last trial still active.' },
    ],
  },
  malStore: {
    q: 'In MINERVA-AL, the outcome was fully expected and it arrived. What does the new trace store about the outcome?',
    options: [
      { text: 'Almost nothing', correct: true, why: 'Right. The trace is the event minus the echo. If the echo already held the outcome, the difference is close to zero.' },
      { text: 'A full copy of the outcome', correct: false, why: 'That is MINERVA 2, which stores every event as it is. MINERVA-AL stores the event minus what was expected.' },
      { text: 'The opposite of the outcome', correct: false, why: 'That happens when the outcome is expected but does not arrive: the trace stores 0 minus the echo, the opposite of the outcome.' },
    ],
  },
  malBackward: {
    q: 'After AB+ training, A+ trials make B weaker in MINERVA-AL, though B never appears again. What do the A+ traces store in B\'s features?',
    options: [
      { text: 'The opposite of B', correct: true, why: 'Right. A brings back B from the AB traces, but B is absent, so the trace stores 0 minus the echo\'s B: the opposite of B. Later these traces count against B\'s echo.' },
      { text: 'Nothing: B was absent', correct: false, why: 'B\'s event features are 0, but the echo had B in it, because A brought it back. The discrepancy, 0 minus the echo, is the opposite of B.' },
      { text: 'A copy of B', correct: false, why: 'A copy of B would make B stronger, not weaker. The trace stores the event minus the echo, and the event has no B.' },
    ],
  },
  dpZero: {
    q: 'The cue and the outcome came together on 6 frames, the cue alone on 24, the outcome alone on 6, and nothing on 24. How strongly are they related?',
    options: [
      { text: 'Not at all: ΔP = 0', correct: true, why: 'Right. With the cue the outcome came 6 times in 30 (0.2); without it, 6 times in 30 (0.2). The difference is 0. Six pairings did not make a contingency.' },
      { text: 'Weakly: six pairings is something', correct: false, why: 'Six pairings feel like something, and that feeling is part of the outcome density story. But the outcome came just as often without the cue, so ΔP is 0.' },
      { text: 'Strongly: a and d together are 30 of 60', correct: false, why: 'Cells a and d are the frames where the cue and outcome agreed, but so would they in a stream with no relationship at all. Compare the two rows: 6/30 − 6/30 = 0.' },
    ],
  },
  odeWhere: {
    q: 'In the signal detection experiments, what did a common outcome change?',
    options: [
      { text: 'The criterion: people said "strong" more readily', correct: true, why: 'Right. Sensitivity to the contingency was the same with a rare or a common outcome. What moved was the cut-off for saying "strong".' },
      { text: 'Sensitivity: people saw the contingency more clearly', correct: false, why: 'That is the natural guess, but the data said otherwise: people told ΔP = 0.6 from ΔP = 0.4 equally well at both densities.' },
      { text: 'Nothing: the effect disappeared with a yes-or-no answer', correct: false, why: 'The effect was still there in the yes-or-no answers. It was in the criterion, not in sensitivity.' },
    ],
  },
  backwardWho: {
    q: 'Why can Rescorla-Wagner show no blocking at all in the backward order?',
    options: [
      { text: 'A cue that is absent does not change', correct: true, why: 'Right. Only cues present on a trial are updated. B\'s last frame is in the first phase, so nothing in the second phase can touch V_B.' },
      { text: 'The context takes all the error', correct: false, why: 'The context does learn, but that is not the reason. The rule updates only the cues present on a frame, and B is not there in the second phase.' },
      { text: 'Probabilistic outcomes stop learning', correct: false, why: 'Learning continues with probabilistic outcomes; V just wanders around its fixed point. The problem is that B is absent.' },
    ],
  },
  inputOutput: {
    q: 'A model shows the outcome density effect in its learning. The signal detection data put the effect in the criterion. What follows?',
    options: [
      { text: 'The model is placing in the input something the data place in the output', correct: true, why: 'Right. A learning model describes what is taken in; a rating adds a decision about how to report it. The two can be modelled separately, and the data suggest they should be.' },
      { text: 'The model is right and the signal detection analysis is wrong', correct: false, why: 'The two are not in competition over the same thing. The model has no decision stage at all, so it can only put the effect in learning. The data say that is the wrong place.' },
      { text: 'The model should be discarded', correct: false, why: 'Too strong. The same model may describe the input well. Adding a decision stage is the usual response, not throwing the learning rule away.' },
    ],
  },
};
