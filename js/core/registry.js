// Every model on the site, in course order, with where its pages live.
// Pages that compare models (the comparison page, the phenomenon table, the
// slides) read this list, so a new model appears everywhere once it is here.

import * as rw from '../models/rescorla-wagner.js';
import * as mackintosh from '../models/mackintosh.js';
import * as pearceHall from '../models/pearce-hall.js';
import * as sop from '../models/sop.js';
import * as minervaAL from '../models/minerva-al.js';
import * as pearce from '../models/pearce.js';

export const MODELS = [rw, mackintosh, pearceHall, sop, minervaAL, pearce];

// One line on each model for the models page and the landing page: the
// idea in plain words, and what it is known for explaining or missing.
export const INFO = {
  'rescorla-wagner': {
    authors: 'Rescorla & Wagner',
    idea: 'Learning from surprise: every cue present shares one prediction error.',
    explains: 'Explains blocking, overshadowing, and conditioned inhibition. Fails on latent inhibition and negative patterning.',
  },
  mackintosh: {
    authors: 'Mackintosh',
    idea: 'Attention rises for the best predictor of the outcome, and each cue learns from its own error.',
    explains: 'Explains blocking through attention. Misses conditioned inhibition and, with the proportional rule, overshadowing.',
  },
  'pearce-hall': {
    authors: 'Pearce & Hall',
    idea: 'Attention follows recent surprise; cues learn excitatory and inhibitory strength separately.',
    explains: 'Explains latent inhibition and blocking. Misses backward blocking and negative patterning.',
  },
  sop: {
    authors: 'Wagner',
    idea: 'Learning moment by moment, from what is active in memory at the same time as the outcome.',
    explains: 'Explains timing inside and between trials: the CS-US interval, trial spacing, backward conditioning.',
  },
  'minerva-al': {
    authors: 'Jamieson, Crump & Hannah',
    idea: 'Learning without associations: store every trial, and expect what similar trials brought.',
    explains: 'Explains backward blocking and negative patterning. Misses unblocking and the timing effects.',
  },
  pearce: {
    authors: 'Pearce',
    idea: 'The whole pattern of cues on a trial learns as one unit, and lends its strength to similar patterns.',
    explains: 'Explains negative patterning, one-trial overshadowing, and external inhibition. Misses latent inhibition and the timing effects.',
  },
};

export const byId = (id) => MODELS.find((m) => m.id === id);

// Paths from the site root.
export const pageOf = (m) => `models/${m.id}.html`;
export const deckOf = (m) => `decks/${m.id}.html`;
