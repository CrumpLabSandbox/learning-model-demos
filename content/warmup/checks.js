// Practice questions for the maths warm-up. Each has a hint, and every
// answer explains itself, so getting one wrong is part of learning.

export const checks = {
  decimals: {
    q: 'Which is bigger: 0.5 or 0.25?',
    hint: 'Think of money: 0.5 of a dollar is 50 cents, and 0.25 of a dollar is 25 cents.',
    options: [
      { text: '0.5', correct: true, why: 'Yes. 0.5 is a half and 0.25 is a quarter, and a half is more. The number of digits does not matter; what matters is how far along the line it is.' },
      { text: '0.25', correct: false, why: '0.25 has more digits, but it is smaller: a quarter instead of a half. Picture both on the bar above.' },
      { text: 'They are the same', correct: false, why: '0.5 is half-way along and 0.25 is a quarter of the way. Move the slider to each to see the difference.' },
    ],
  },
  negatives: {
    q: 'Which is further below zero: −0.5 or −0.2?',
    hint: 'Picture temperatures: is −5 degrees or −2 degrees colder?',
    options: [
      { text: '−0.5', correct: true, why: 'Yes. −0.5 is half-way down to −1; −0.2 is only a little below zero. Below zero, a bigger number after the minus sign means further down.' },
      { text: '−0.2', correct: false, why: '−0.2 is closer to zero. −0.5 is further below, like −5 degrees being colder than −2.' },
    ],
  },
  gaps: {
    q: 'You are at 0.3 and the goal is 1. How big is the gap?',
    hint: 'The gap is where you want to be minus where you are: 1 − 0.3.',
    options: [
      { text: '0.7', correct: true, why: 'Yes. 1 − 0.3 = 0.7. It is positive, so you need to go up.' },
      { text: '1.3', correct: false, why: 'That adds them. The gap is the difference: goal minus where you are, 1 − 0.3 = 0.7.' },
      { text: '−0.7', correct: false, why: 'Right size, wrong direction. Goal minus where you are is 1 − 0.3 = +0.7: you need to go up, so it is positive.' },
    ],
  },
  fractions: {
    q: 'What is 0.5 × 0.6?',
    hint: 'Multiplying by 0.5 means "take half of". What is half of 0.6?',
    options: [
      { text: '0.3', correct: true, why: 'Yes. Taking half of 0.6 gives 0.3. Multiplying by a number less than 1 always gives a smaller answer.' },
      { text: '1.1', correct: false, why: 'That adds them. Multiplying by 0.5 takes half: half of 0.6 is 0.3.' },
      { text: '3.0', correct: false, why: 'Multiplying by a number smaller than 1 makes things smaller, not bigger. Half of 0.6 is 0.3.' },
    ],
  },
  adding: {
    q: 'Add up 0.6, 0.3 and −0.2.',
    hint: 'First 0.6 + 0.3. Then adding −0.2 is the same as taking away 0.2.',
    options: [
      { text: '0.7', correct: true, why: 'Yes. 0.6 + 0.3 = 0.9, then adding −0.2 takes 0.2 away: 0.7.' },
      { text: '1.1', correct: false, why: 'That treats −0.2 as +0.2. A negative number pulls the total down: 0.9 − 0.2 = 0.7.' },
      { text: '0.9', correct: false, why: 'That leaves out the −0.2. Include it: 0.9 − 0.2 = 0.7.' },
    ],
  },
  graphs: {
    q: 'Use the slider on the graph. After which trial does the line first go above 0.5?',
    hint: 'Move the trial slider one step at a time and watch the value.',
    options: [
      { text: 'Trial 4', correct: true, why: 'Yes. After trial 3 it is 0.488, just under half; after trial 4 it is 0.590.' },
      { text: 'Trial 2', correct: false, why: 'After trial 2 the value is 0.360, still under 0.5. Keep stepping.' },
      { text: 'Trial 10', correct: false, why: 'By trial 10 it is well above 0.5. It first passes 0.5 earlier: look around trials 3 and 4.' },
    ],
  },
  recipe: {
    q: 'An empty glass. Each pour fills half of the empty space. How full is it after 2 pours?',
    hint: 'First pour: half of the empty glass. Second pour: half of what is still empty.',
    options: [
      { text: '0.75 (three quarters)', correct: true, why: 'Yes. The first pour fills 0.5. Half the gap is left, 0.5, and the second pour fills half of that, 0.25. Total 0.75.' },
      { text: '1 (full)', correct: false, why: 'Each pour only fills half of the empty space, so the glass never quite gets full. After two pours it is 0.5 + 0.25 = 0.75.' },
      { text: '0.5 (half)', correct: false, why: 'That is after one pour. The second pour adds half of the remaining 0.5, which is 0.25, giving 0.75.' },
    ],
  },
};
