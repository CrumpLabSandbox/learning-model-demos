// Every model's equation spec, by model id, for pages that need a spec
// without knowing which model they are showing (the decks and tutorials
// draw a model's figure with data-figure="<id>").
import * as rw from './rescorla-wagner.js';
import * as mackintosh from './mackintosh.js';
import * as pearceHall from './pearce-hall.js';
import * as sop from './sop.js';
import * as pearce from './pearce.js';
import * as delamater from './delamater.js';
import * as minervaAL from './minerva-al.js';

export const SPECS = {
  'rescorla-wagner': rw,
  mackintosh,
  'pearce-hall': pearceHall,
  sop,
  pearce,
  delamater,
  'minerva-al': minervaAL,
};
