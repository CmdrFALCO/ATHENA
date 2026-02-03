/**
 * CPN Place definitions for the Critique Workflow (WP 9B.1)
 *
 * 2 new places extending the validation workflow:
 * - P_critiqued: intermediate place after critique, awaiting routing
 * - P_escalated: sink place for human intervention
 *
 * @module axiom/workflows/critiquePlaces
 */

import type { PlaceConfig } from '../types/place';
import { PLACE_IDS } from './types';

/** Post-critique decision point — token has CRITIQUE_RESULT in metadata */
export const P_critiqued: PlaceConfig = {
  id: PLACE_IDS.P_critiqued,
  name: 'Critiqued',
  description: 'Proposal has been critiqued, awaiting routing decision',
  acceptedColors: ['critiqued'],
};

/** Escalated — critique raised concerns, needs human decision */
export const P_escalated: PlaceConfig = {
  id: PLACE_IDS.P_escalated,
  name: 'Escalated',
  description: 'Critique raised concerns — needs human decision',
  isSink: true,
  acceptedColors: ['escalated'],
};

/** All critique places as an array */
export const CRITIQUE_PLACES: PlaceConfig[] = [
  P_critiqued,
  P_escalated,
];
