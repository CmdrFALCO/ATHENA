/**
 * AXIOM guards barrel export
 *
 * @module axiom/guards
 */

// Composition helpers
export { hasMinTokens, hasColor, allOf, anyOf, not } from './helpers';

// Termination guards
export { canRetry, shouldEscalate, maxStepsReached } from './termination';

// Validation workflow guards
export {
  isValid,
  hasErrors,
  hasWarningsOnly,
  tokenCanRetry,
  tokenShouldEscalate,
  allLevelsPassed,
  levelPassed,
} from './validation';

// Schema guards (Level 1)
export {
  nodesHaveRequiredFields,
  edgesHaveRequiredFields,
  schemaValid,
} from './schema';

// Constraint guards (Level 2)
export {
  noSelfLoops,
  noDuplicateEdges,
  referencedNodesExist,
} from './constraints';

// Semantic guards (Level 3 — stubs)
export {
  semanticallyRelevant,
  contentCoherent,
  notDuplicate,
} from './semantic';
