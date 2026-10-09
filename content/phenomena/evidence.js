// The evidence for each phenomenon, on its own terms: how well established
// the finding is, which papers show it, and how the experiments that measured
// it were run. One entry per phenomenon in index.js, by id. The phenomenon
// pages (phenomena/<id>.html) are rendered from these entries.
//
// Everything here is written from the papers in TrainingPapers/Phenomena/
// (gitignored), not from memory. An entry with strength 'unwritten' has not
// been written yet: its page says so and shows only what the preset carries.
//
// Each entry:
//   strength   one of STRENGTH's keys
//   basis      what the judgement rests on, in a sentence or two (required
//              unless unwritten), naming the species and preparations
//   finding    optional: the finding in plain words, fuller than the one line
//              on the cards (which is used when this is absent)
//   references [{ authors, year, title, source, doi?, supports }]: the key
//              papers in a consistent format, each with the sentence or two
//              it supports
//   designs    [{ study, design, cues?, measured, controls, results?, notes? }]:
//              how the original and the best later studies were run, with the
//              design in the site's notation beside the prose, what the cue
//              letters were, and the paper's own numbers as a small table
//              (results: { caption, columns, rows })
//   preset     how the site's preset relates to those designs and what it
//              leaves out
//   notes      optional: where the empirical picture is mixed, say so here

// The fixed vocabulary for how well established a finding is. Each judgement
// cites what it rests on (basis).
export const STRENGTH = {
  robust: { label: 'Robust', plain: 'Replicated many times, across species and preparations.' },
  established: { label: 'Established', plain: 'Replicated, but in a narrow range of preparations or with known boundary conditions.' },
  qualified: { label: 'Qualified', plain: 'Real, but depends on conditions that the page names.' },
  disputed: { label: 'Disputed', plain: 'Replication failures or live disagreement, with the sides named.' },
  unwritten: { label: 'Not yet assessed', plain: 'The evidence has not been written up from the papers yet.' },
};

const unwritten = () => ({ strength: 'unwritten', references: [], designs: [] });

export const evidence = {
  acquisition: unwritten(),
  extinction: unwritten(),
  salience: unwritten(),
  blocking: {
    strength: 'established',
    basis:
      'One chapter so far, Kamin (1969), reporting a programme of over 1200 rats in more than 110 groups, all in one preparation: conditioned suppression of bar-pressing (the CER) in hooded rats, with a noise and a light as the cues and a brief shock as the outcome. Within that preparation the block was complete, it was symmetrical (prior conditioning to the light blocked the noise just as the noise blocked the light), and it survived a shorter cue, a stronger shock, and noise offset in place of noise onset. Kamin reports that Jenkins found the same with pigeons in a food-reinforced discrimination, but gives no data for it. The judgement rises to robust when papers from other laboratories and preparations are added.',
    finding:
      'After a cue has been trained to predict the outcome, adding a second cue alongside it and continuing to reinforce the pair leaves the second cue with little or no power of its own: the pretrained cue blocks learning about the added one. The animal does notice the new cue, and the first compound trial leaves a small trace, but the compound trials after it add nothing. If the outcome is already fully predicted, pairing a cue with it is not enough.',
    references: [
      {
      authors: 'Kamin, L. J.',
      year: 1969,
      title: 'Predictability, surprise, attention, and conditioning',
      source: 'In B. A. Campbell & R. M. Church (Eds.), Punishment and aversive behavior (pp. 279–296). New York: Appleton-Century-Crofts',
      supports: 'The basic blocking experiment and its three controls, the lift in suppression on the first compound trial, the savings test showing that only the first compound trial leaves a trace, the boundary conditions, and the account of blocking as the outcome no longer being surprising.',
    },
    ],
    designs: [
      {
        study: 'Kamin (1969), the basic experiment (p. 282)',
        design: 'Pretraining: 16 A+\nCompound: 8 AB+\nTest: B',
        cues: 'A was an 80 dB white noise and B the house light coming on, each lasting 3 minutes and ending in a 0.5 second, 1 mA shock. Four trials a day. Separate groups of 8 to 20 rats for each treatment.',
        measured:
          'Suppression of bar-pressing for food. The suppression ratio is B / (A + B), where B is the number of presses during the cue and A the number in the 3 minutes before it: .50 means the cue has no effect, and the ratio falls toward .00 as the cue comes to predict the shock. The score is the median ratio on a single unreinforced test trial with the light alone.',
        controls:
          'Group G had the same eight compound trials with no pretraining, and shows what the light normally gains from them. Group A had the same trials as the blocking group in the opposite order, so the two differ only in sequence. Group 2-B had noise alone throughout and never saw the light, so its test shows what the light does to a rat that has learned nothing about it.',
        results: {
          caption: 'Median suppression ratio to the light on the test trial (Kamin, 1969, p. 282).',
          columns: ['Group', 'First', 'Then', 'Test', 'Ratio'],
          rows: [
            ['B (blocking)', 'Noise, 16 trials', 'Noise + light, 8 trials', 'Light', '.45'],
            ['G (no pretraining)', '', 'Noise + light, 8 trials', 'Light', '.05'],
            ['A (reversed order)', 'Noise + light, 8 trials', 'Noise, 16 trials', 'Light', '.25'],
            ['2-B (never saw the light)', '', 'Noise, 24 trials', 'Light', '.44'],
          ],
        },
        notes:
          'The blocked group\'s .45 is indistinguishable from the .44 of rats that never saw the light: the eight compound trials had produced no conditioning to the light at all. Group A is less suppressed than Group G because four days passed between its last compound trial and the test, which Kamin\'s control groups showed to be a recency effect; it works against the blocking comparison, so the A versus B difference is a conservative one.',
      },
      {
        study: 'Kamin (1969), the first compound trial (p. 285)',
        design: 'Pretraining: 16 A+\nCompound: 1 AB+',
        measured:
          'The suppression ratio on the first compound trial itself, before its outcome could matter, compared with the ratio on the last noise-alone trial, in 153 rats pooled from every experiment with this start.',
        controls: 'Each rat is its own control: the sixteenth noise trial against the seventeenth, on which the light was added.',
        results: {
          caption: 'Median suppression ratio, 153 rats (Kamin, 1969, p. 285).',
          columns: ['Trial', 'Ratio'],
          rows: [
            ['Noise trial 16', '.02'],
            ['First noise + light trial', '.15'],
            ['Second noise + light trial (when the first was reinforced)', '.02'],
          ],
        },
        notes:
          'Suppression lifted on the trial the light was added (106 rats were less suppressed, 17 more, 30 the same) and was back to its floor on the next. So the rats noticed the new cue; the block is not a failure to perceive it.',
      },
      {
        study: 'Kamin (1969), the savings test (pp. 290–292)',
        design: 'Pretraining: 16 A+\nCompound: 8 AB+\nAlone: 4 B+',
        measured:
          'Instead of one unreinforced test, four reinforced trials with the light alone at the end, scoring how fast suppression to the light is acquired. Savings is a more sensitive test of transfer than a single test trial.',
        controls:
          'Group 2-B had 24 noise trials and no light before the four light trials. Group 2-N had the light on the first compound trial only, then seven more noise trials, so it differs from 2-B on one trial.',
        results: {
          caption: 'Median suppression ratio over the four light trials (Kamin, 1969, pp. 291–292).',
          columns: ['Group', 'First', 'Then', 'Then', 'Ratio'],
          rows: [
            ['2-A', 'Noise, 16', 'Noise + light, 8', 'Light, 4', '.28'],
            ['2-N', 'Noise, 16', 'Noise + light, 1, then noise, 7', 'Light, 4', '.28'],
            ['2-B', '', 'Noise, 24', 'Light, 4', '.38'],
          ],
        },
        notes:
          'Both groups that had seen the light on the noise learned the light faster than the group that had not, on trials 2, 3, and 4. But one compound trial gave as much savings as eight: whatever the light gained, it gained on the first compound trial, and the seven after it added nothing.',
      },
    ],
    preset:
      'The preset follows Group B with the control built into the same design: A is pretrained for 20 trials, then AB and a fresh compound CD are each reinforced 20 times, and the question is B against D. Kamin used 16 and 8 trials, four a day, a separate group of rats for every treatment, and a single unreinforced test trial; the within-design control CD stands in for his Group G. The preset leaves out the measure (the models give a strength, the experiment a suppression ratio), the lift in suppression on the first compound trial, the recency effect that made his Group A look worse than Group G, and the gaps of days between phases. Its criterion, B below half the outcome value and below D, is looser than Kamin\'s result: in his data the block was complete, .45 against .44 for rats that never saw the light, so a model that gives B a small but real strength is being generous to itself.',
    notes:
      'Kamin reports the boundary conditions from the same programme (p. 286). The block stays complete however many compound trials are given, but it is only partial if pretraining stops before suppression to A has reached its floor, and the amount of blocking rises smoothly with the amount of pretraining. Extinguishing A before the compound trials removes the block; extinguishing it afterwards does not. More intense A, more blocking, though intensity and the level of suppression reached are confounded. The effect was unchanged by a 1-minute cue, a 3 mA shock, or noise offset in place of onset.',
  },
  unblocking: {
    strength: 'established',
    basis:
      'The same chapter as blocking, Kamin (1969), in the same preparation: conditioned suppression in hooded rats with a noise, a light, and a shock. Two different ways of making the outcome surprising again both removed the block: a stronger shock when the compound trials began, and an extra, unpredicted shock a few seconds after each compound trial. Each rests on one experiment with its controls. The judgement rises to robust when other laboratories and preparations are added.',
    finding:
      'Blocking depends on the outcome being already predicted. If the outcome changes when the second cue is added, so that something about it is surprising again, the added cue is learned about after all. Kamin showed this by raising the shock from 1 mA to 4 mA on the compound trials, and separately by adding an unpredicted extra shock 5 seconds after each compound trial.',
    references: [
      {
      authors: 'Kamin, L. J.',
      year: 1969,
      title: 'Predictability, surprise, attention, and conditioning',
      source: 'In B. A. Campbell & R. M. Church (Eds.), Punishment and aversive behavior (pp. 279–296). New York: Appleton-Century-Crofts',
      supports: 'Unblocking by a stronger shock on the compound trials (Groups B, 2-M, and 3-U) and by an unpredicted extra shock after each compound trial, with the controls showing that it is the change, not the strong shock, that removes the block.',
    },
    ],
    designs: [
      {
        study: 'Kamin (1969), a bigger shock on the compound trials (p. 292)',
        design: 'Pretraining: 16 A+\nCompound: 8 AB+(4)\nTest: B',
        cues: 'A an 80 dB noise, B the house light, as in the blocking experiment. The shock was 1 mA in pretraining and 4 mA on the compound trials for the unblocking group.',
        measured: 'Median suppression ratio to the light on a single unreinforced test trial (.50 is no effect, near .00 full suppression).',
        controls:
          'Group B is the standard blocking group with 1 mA throughout. Group 3-U had the 4 mA shock throughout, from the first noise trial, so it tells whether a strong shock on the compound trials removes the block by itself or only the change does.',
        results: {
          caption: 'Median suppression ratio to the light on the test trial (Kamin, 1969, p. 292).',
          columns: ['Group', 'First', 'Then', 'Test', 'Ratio'],
          rows: [
            ['B (blocking, 1 mA throughout)', 'Noise, 16, 1 mA', 'Noise + light, 8, 1 mA', 'Light', '.45'],
            ['2-M (shock raised for the compound)', 'Noise, 16, 1 mA', 'Noise + light, 8, 4 mA', 'Light', '.14'],
            ['3-U (4 mA throughout)', 'Noise, 8, 4 mA', 'Noise + light, 8, 4 mA', 'Light', '.36'],
          ],
        },
        notes:
          'Group 2-M was significantly more suppressed than Group B; Group 3-U was not, and differed from 2-M. It is the change of shock between the phases that removes the block, not the strong shock itself.',
      },
      {
        study: 'Kamin (1969), an extra unpredicted shock after each compound trial (pp. 293–294)',
        design: 'Pretraining: 16 A+\nCompound: 8 AB+\nTest: B',
        cues: 'As in the blocking experiment, with the usual 1 mA shock at the end of every trial; on each compound trial a second 1 mA, 0.5 second shock was given 5 seconds after the first.',
        measured: 'Median suppression ratio to the light on a single unreinforced test trial.',
        controls:
          'Naive rats conditioned to the light or the noise with the extra shock from the outset acquired at the same rate as rats without it, so the extra shock does not act as a bigger outcome. Other controls showed it did not make rats suppress to new stimuli in general.',
        results: {
          caption: 'Median suppression ratio to the light on the test trial (Kamin, 1969, p. 294).',
          columns: ['Group', 'Compound trials', 'Ratio'],
          rows: [
            ['Blocking (Group B)', 'Noise + light, 8, shock', '.45'],
            ['Extra shock', 'Noise + light, 8, shock, then an unpredicted shock 5 s later', '.08'],
          ],
        },
        notes:
          'The block was removed entirely. Kamin could not tell whether the extra shock helps the compound trial before it or the one after it, and proposed experiments to decide; the site\'s design notation has no way to write an outcome that arrives after a trial with no cue, so this version is not in the preset.',
      },
    ],
    preset:
      'The preset follows the bigger-shock experiment, with the control in the same design: A and C are pretrained, then AB is reinforced with a doubled outcome and CD with the ordinary one, and the question is whether B escapes the block that D suffers. Kamin raised the shock fourfold, from 1 mA to 4 mA, with separate groups of rats; the preset doubles the outcome value instead and runs 20 trials a phase. The preset leaves out Group 3-U, the strong outcome throughout; a student can write it (set the outcome to 2 in both phases) and see that for every model a constant outcome blocks just as well, which is Kamin\'s point. It also leaves out the extra-shock version and the measure.',
  },
  overshadowing: unwritten(),
  'conditioned-inhibition': {
    strength: 'established',
    basis:
      'One paper so far, Rescorla (1969): two experiments, 80 male rats in all, in one preparation, conditioned suppression of bar-pressing (the CER) with a tone, a flashing light, and a brief shock. The two experiments use the two different measures of inhibition, retardation and summation, and both come out the same way: a tone that signalled a shock-free period became an inhibitor, and the more shock there was at other times, the stronger the inhibitor (p < .01 in each experiment). The paper cites Hammond\'s differential-CER results and Pavlov\'s procedure as agreeing; they are not in the folder. The judgement rises to robust when other laboratories and preparations are added.',
    finding:
      'A cue that signals that the outcome will not happen, when it otherwise would, becomes a conditioned inhibitor: it works against the outcome. Pavlov made inhibitors by reinforcing a cue alone and never reinforcing it in a compound with another cue, which is the site\'s preset. Rescorla (1969) made them with a negative contingency, a tone during and after which shocks that fell freely at other times were simply left out, and showed two things: the inhibitor is detectable by two independent tests, and it is graded, stronger the more shock the tone was protecting the animal from. Rescorla argues that an inhibitor should pass both tests: slower to turn into a signal for the outcome (retardation), and able to cut the response to a cue that does predict it (summation), because either test alone can be passed by a cue that is merely ignored or merely distracting.',
    references: [
      {
        authors: 'Rescorla, R. A.',
        year: 1969,
        title: 'Conditioned inhibition of fear resulting from negative CS-US contingencies',
        source: 'Journal of Comparative and Physiological Psychology, 67, 504–509',
        supports: 'Experiment 1, the retardation test: tones with a negative contingency to shock were slower to become fear signals, in proportion to the contingency, against random-shock and new-tone controls. Experiment 2, the summation test: the same tones cut the suppression to a trained light, again in proportion. Also the argument that an inhibitor should pass both tests.',
      },
    ],
    designs: [
      {
        study: 'Rescorla (1969), Experiment 1: the retardation test (pp. 505–507)',
        design: 'Inhibition: 60 X-, 72 +, 170 -, random\nAcquisition: 12 X+, 12 X-, random\nContext: Z',
        cues: 'X was a 750 Hz tone of 2 minutes; the outcome a 0.5 second, 1 mA shock through the floor. In the notation, + on its own is a shock with no tone, - a 2-minute stretch with neither, and Z the chamber. The lines above are Group 0-4: five 2-hour sessions with 12 tones each and shocks at a rate of 0.4 per 2 minutes, except that every shock due during a tone or in the 2 minutes after it was left out.',
        measured:
          'How fast the tone then became a fear signal, in six daily sessions of four tones with two of the four ending in shock. The suppression ratio is A / (A + B), responses during the tone against the 2 minutes before it; .50 means no fear, and it falls toward 0 as the tone comes to predict shock. Forty-eight rats, eight to a group.',
        controls:
          'Groups 4-4 and 1-1 had the same tones and the same shock rates with the shocks falling at random, during the tone as often as anywhere, the "truly random" control. Groups 0-4 light and 0-1 light had the negative contingency arranged for a flashing light instead, so the tone was new to them when acquisition began. Group 0-1 is the same as 0-4 with a quarter of the shocks (0.1 per 2 minutes; in the notation 60 X-, 18 +, 222 -).',
        results: {
          caption: 'Median suppression ratio to the tone on each acquisition day, read from Figure 1 (Rescorla, 1969, p. 506) to about .02.',
          columns: ['Group', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'],
          rows: [
            ['0-4 (tone safe, 0.4 shocks per 2 min)', '.53', '.50', '.43', '.36', '.20', '.10'],
            ['0-1 (tone safe, 0.1 per 2 min)', '.51', '.43', '.26', '.12', '.09', '.03'],
            ['4-4 (random, 0.4)', '.38', '.09', '.09', '.02', '.02', '.02'],
            ['1-1 (random, 0.1)', '.49', '.20', '.22', '.11', '.07', '.02'],
            ['0-4 light (tone new)', '.48', '.14', '.09', '.06', '.00', '.02'],
            ['0-1 light (tone new)', '.46', '.26', '.04', '.04', '.02', '.02'],
          ],
        },
        notes:
          'Group 0-4 was the slowest, reliably behind 4-4 and 0-4 light (p < .01) and behind 0-1 (p < .02); 0-1 was behind 0-1 light (p < .01) but behind 1-1 only on day 2. The four control groups did not differ. Rescorla notes that the comparison with the light groups could be latent inhibition, since those rats had never heard the tone, so the decisive comparison is 0-4 against 0-1: the same tones, more shock in their absence, more inhibition.',
      },
      {
        study: 'Rescorla (1969), Experiment 2: the summation test (pp. 507–508)',
        design: 'Inhibition: 60 X-, 144 +, 96 -, random\nLight: 6 A+, 6 A-, random\nTest: A, AX\nContext: Z',
        cues: 'X the same 2-minute tone, A a flashing houselight (twice a second), the shock as before. The lines above are Group 0-8, shocks at 0.8 per 2 minutes except during and after the tone; Groups 0-4 and 0-1 had 0.4 and 0.1, and Group 0-0 had no shock at all. Thirty-two rats, eight to a group.',
        measured:
          'After the tone phase, three days of four light trials with two ending in shock made the light a fear signal for every group. Then two test sessions with no shocks, two light-alone and two light-plus-tone trials each: the mean suppression ratio to the light alone against the light with the tone added.',
        controls:
          'Group 0-0, which had the tones with no shock anywhere, so the tone had nothing to be safe from. The light alone is each group\'s own baseline, and it was equally and strongly suppressed in all four groups.',
        results: {
          caption: 'Mean suppression ratio on the two test days, read from Figure 2 (Rescorla, 1969, p. 508) to about .01.',
          columns: ['Group', 'Light alone', 'Light + tone'],
          rows: [
            ['0-0 (no shock)', '.02', '.05'],
            ['0-1', '.10', '.18'],
            ['0-4', '.07', '.22'],
            ['0-8', '.07', '.26'],
          ],
        },
        notes:
          'Adding the tone lifted suppression in every group that had shock, and the lift grew with the shock rate the tone had been safe from (Kruskal-Wallis H = 13.59, p < .01). The tone from Group 0-0 did almost nothing, so the effect is not a novel stimulus distracting the rat; it is what the tone had come to mean.',
      },
    ],
    preset:
      'The preset is Pavlov\'s procedure, A+ with AX-, which Rescorla treats as a special case of a negative contingency: shock is less likely after X than at any other time in the session, with the difference that in the preset every shock is signalled by A. The site tests X with the summation half of Rescorla\'s standard only: AX must come out well below A, and X alone must predict little or less than nothing. It does not run the retardation test. A student can: after the training line, add "Retardation: 20 X+, 20 B+" and compare how fast X and a new cue B climb. The preset also leaves out the graded result, that more shock in X\'s absence makes a stronger inhibitor; the contingency presets on the streamed-trial page are the place to see that. And it leaves out the measure: Rescorla\'s inhibitor lifts a suppression ratio from about .07 to .22, while the models give X a strength below zero, a number no animal shows directly.',
    notes:
      'Rescorla\'s warning applies to the site\'s badge. A cue can pass the summation test by distracting the animal and fail it by being ignored, and a model can pass it with a negative strength that it would also carry into a retardation test, or not. Which models would pass both tests is not something the table reports; the Rescorla-Wagner page\'s card and the Pearce-Hall model\'s separate inhibitory strength are the places to look.',
  },
  'latent-inhibition': {
    strength: 'qualified',
    basis:
      'The founding paper only, Lubow and Moore (1959): sixteen animals, four sheep and four goats in each of two experiments, with a flashing light and a turning rotor as the cues and a shock to the foreleg as the outcome, leg flexion the response. Each animal was pre-exposed to one cue and then conditioned to both, alternated, so the comparison is within the animal. In Experiment I the pre-exposed cue was slower in six of eight animals and the difference was significant (p < .01); in Experiment II it was slower in five of eight and the difference fell short (.10 > p > .05). Pooling both experiments, the effect was carried by the light (37.4 against 19.8 trials, p < .02): pre-exposure to the rotor did nothing (22.0 against 23.9). So the effect is real in this paper but depends on the cue, and the sample is small. The judgement will be revised when the later literature, which is large, is added to the folder.',
    finding:
      'A cue that has been presented several times with nothing following it is slower to become a signal for the outcome than a cue the animal has not met before. Lubow and Moore called it latent inhibition because the pre-exposure leaves no visible mark until conditioning starts, and then shows up as a decrement. They had expected the opposite: in the latent learning and sensory preconditioning traditions, unreinforced exposure was supposed to help.',
    references: [
      {
        authors: 'Lubow, R. E., & Moore, A. U.',
        year: 1959,
        title: 'Latent inhibition: The effect of nonreinforced pre-exposure to the conditional stimulus',
        source: 'Journal of Comparative and Physiological Psychology, 52, 415–419',
        supports: 'The two experiments that named the effect: ten unreinforced presentations of one cue, then conditioning to that cue and a novel one alternated, with the pre-exposed cue slower to reach criterion. Also the failed test of a competing-response account (Experiment II) and the finding that the effect held for the light but not the rotor.',
      },
    ],
    designs: [
      {
        study: 'Lubow and Moore (1959), Experiment I (pp. 415–417)',
        design: 'Pre-exposure: 10 A-\nConditioning: 30 A+, 30 B+',
        cues: 'A and B were a 60 W bulb flashing once a second and a two-bladed rotor turning once a second, both 2 feet to the animal\'s right and each with some sound; which one was pre-exposed was balanced across animals. Each lasted 10 seconds, with 30 seconds to 2.5 minutes between them. The outcome was an 11 V shock to the right foreleg, and the response a flexion of that leg during the cue.',
        measured:
          'Trials to criterion: the number of reinforced presentations of each cue before its tenth conditioned response. In conditioning the two cues were alternated, the pre-exposed one first for half the animals, and both continued until the slower had reached criterion, so both were presented equally often. The notation alternates the two cues by default, as the experiment did; its 30 trials stand for a number that varied from 12 to 57 per animal.',
        controls:
          'Within the animal: the novel cue, conditioned at the same time and alternated with the pre-exposed one, is the control. The authors note that this works against the effect, since the animal makes the same response to both cues and the cues share a modality, so transfer between them is as positive as it can be.',
        results: {
          caption: 'Trials to the tenth conditioned response, Experiment I (Lubow & Moore, 1959, Table 1).',
          columns: ['Animal', 'Pre-exposed cue', 'Pre-exposed', 'Novel', 'Difference'],
          rows: [
            ['Goat, F', 'Light', '57', '25', '32'],
            ['Goat, F', 'Rotor', '12', '13', '−1'],
            ['Goat, M', 'Light', '16', '14', '2'],
            ['Goat, M', 'Rotor', '24', '14', '10'],
            ['Sheep, F', 'Light', '25', '22', '3'],
            ['Sheep, F', 'Rotor', '28', '24', '4'],
            ['Sheep, M', 'Light', '31', '29', '2'],
            ['Sheep, M', 'Rotor', '13', '14', '−1'],
            ['Mean', '', '25.8', '19.4', '6.4'],
          ],
        },
        notes: 'Six of eight animals were slower to the pre-exposed cue; Wilcoxon T = 2, p < .01, two-tailed. One goat accounts for half the mean difference.',
      },
      {
        study: 'Lubow and Moore (1959), Experiment II (p. 417)',
        design: 'Pre-exposure: 10 A-\nConditioning: 30 A+, 30 B+',
        cues: 'As in Experiment I, with eight new animals, but the shock went to the left foreleg while the cues stayed on the animal\'s right.',
        measured: 'Trials to the tenth conditioned response for each cue, as before.',
        controls:
          'The same within-animal control. The experiment was designed to test an explanation: if pre-exposure teaches a head turn toward the cue that stiffens the right leg, moving the shock to the left leg should turn the decrement into a gain. It did not.',
        results: {
          caption: 'Trials to the tenth conditioned response, Experiment II (Lubow & Moore, 1959, Table 2).',
          columns: ['Animal', 'Pre-exposed cue', 'Pre-exposed', 'Novel', 'Difference'],
          rows: [
            ['Goat, F', 'Light', '85', '45', '40'],
            ['Goat, F', 'Rotor', '25', '20', '5'],
            ['Goat, M', 'Light', '26', '27', '−1'],
            ['Goat, M', 'Rotor', '16', '18', '−2'],
            ['Sheep, F', 'Light', '22', '17', '5'],
            ['Sheep, F', 'Rotor', '30', '32', '−2'],
            ['Sheep, M', 'Light', '37', '12', '15'],
            ['Sheep, M', 'Rotor', '28', '23', '5'],
            ['Mean', '', '33.6', '24.3', '8.1'],
          ],
        },
        notes:
          'The same direction as Experiment I, but not significant (.10 > p > .05). Across both experiments the pre-exposed light took 37.4 trials against 19.8 for the novel light (p < .02), while the pre-exposed rotor took 22.0 against 23.9 for the novel rotor, no difference. The authors could not identify a competing response and left the mechanism open.',
      },
    ],
    preset:
      'The preset keeps the shape of the experiment, pre-exposure to A and then conditioning to A and a new cue B, and compares the two cues trial for trial, as the within-animal design does. It differs in the numbers: 30 pre-exposures rather than 10, and a fixed 15 conditioning trials per cue rather than training to a criterion of ten responses, which took 12 to 85 trials. It adds a context cue Z, because several models can only make pre-exposure do anything through the context; the animals did stand in the same room for 15 minutes before the first cue, which is context exposure of a kind the notation cannot write. It leaves out what the paper found most interesting: that the effect was there for the light and not for the rotor, which no model on the site can represent, since none knows one cue from another except by salience.',
    notes:
      'Treat the one-line version on the cards with care. In this paper the effect is modest (6 to 8 trials on a mean of about 20 to 30), one animal in each experiment carries much of it, and it is absent for one of the two cues. The paper is the origin of the name, not the strongest demonstration of the effect.',
  },
  'backward-blocking': unwritten(),
  'negative-patterning': unwritten(),
  'trial-spacing': unwritten(),
  'cs-us-interval': unwritten(),
  'backward-conditioning': unwritten(),
  'us-preexposure': unwritten(),
  contingency: unwritten(),
  'outcome-density': unwritten(),
  'one-phase-blocking': unwritten(),
  'probabilistic-blocking': unwritten(),
  'acquired-equivalence': unwritten(),
  biconditional: unwritten(),
  'feature-positive': unwritten(),
};

// A reference in one consistent format: Authors (year). Title. Source.
export function formatReference(r) {
  return `${r.authors} (${r.year}). ${r.title}. ${r.source}.`;
}
