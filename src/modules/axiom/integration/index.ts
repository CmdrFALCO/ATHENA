/**
 * AXIOM Integration Layer — Barrel Export
 *
 * Connects AXIOM to Phase 5A (Validation), Phase 7 (Chat), and the Knowledge Graph.
 *
 * @module axiom/integration
 */

// Validation Integration (Phase 5A)
export { validateProposal } from './validationIntegration';

// Chat Integration (Phase 7)
export { regenerateWithFeedback } from './chatIntegration';

// Graph Integration (Knowledge Graph)
export { commitToGraph, setGraphAdapters, hasGraphAdapters } from './graphIntegration';
