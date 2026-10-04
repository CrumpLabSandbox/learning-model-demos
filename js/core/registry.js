// Every model on the site, in course order, with where its pages live.
// Pages that compare models (the comparison page, the phenomenon table, the
// slides) read this list, so a new model appears everywhere once it is here.

import * as rw from '../models/rescorla-wagner.js';
import * as mackintosh from '../models/mackintosh.js';
import * as pearceHall from '../models/pearce-hall.js';
import * as sop from '../models/sop.js';
import * as minervaAL from '../models/minerva-al.js';

export const MODELS = [rw, mackintosh, pearceHall, sop, minervaAL];

export const byId = (id) => MODELS.find((m) => m.id === id);

// Paths from the site root.
export const pageOf = (m) => `models/${m.id}.html`;
export const deckOf = (m) => `decks/${m.id}.html`;
