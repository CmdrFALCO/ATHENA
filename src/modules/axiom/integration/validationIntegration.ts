/**
 * Validation Integration — Connects AXIOM to Phase 5A RulesEngine
 *
 * Implements the real `validateProposal` placeholder by:
 * 1. Converting proposal nodes/edges into temporary Entity/Connection objects
 * 2. Merging with existing graph data from appState$
 * 3. Running the RulesEngine against the merged context
 * 4. Mapping results to VALIDATION_RESULT with level pass/fail analysis
 *
 * @module axiom/integration/validationIntegration
 */

import type { PROPOSAL, VALIDATION_RESULT } from '../types/colorSets';
import type { Entity } from '@/shared/types/entities';
import type { Connection } from '@/shared/types/connections';
import { appState$ } from '@/store/state';
import { rulesEngine } from '@/modules/validation/engine/RulesEngine';
import { buildValidationContext } from '@/modules/validation/engine/ContextBuilder';
import { registerMvpRules } from '@/modules/validation/rules';

// Track if rules have been registered (matches pattern in validationActions.ts)
let rulesRegistered = false;

function ensureRulesRegistered(): void {
  if (!rulesRegistered) {
    registerMvpRules();
    rulesRegistered = true;
  }
}

/** Level 1 (Schema/Structure) rules */
const LEVEL_1_RULES = new Set(['orphan-note', 'self-loop']);

/** Level 2 (Constraints) rules */
const LEVEL_2_RULES = new Set(['duplicate-connection', 'bidirectional-connection']);

// Level 3 (Semantic/Quality) rules: 'weakly-connected', 'stale-suggestion'
// Any rule not in L1/L2 defaults to level 3 in mapRuleToLevel()

/**
 * Map a rule ID to its validation level.
 */
function mapRuleToLevel(ruleId: string): 1 | 2 | 3 {
  if (LEVEL_1_RULES.has(ruleId)) return 1;
  if (LEVEL_2_RULES.has(ruleId)) return 2;
  return 3;
}

/**
 * Convert a NodeProposal into a temporary Entity for validation.
 */
function proposalNodeToEntity(
  node: PROPOSAL['nodes'][number],
): Entity {
  const now = new Date().toISOString();
  return {
    id: node.id,
    type: 'note',
    subtype: 'ai-generated',
    title: node.title,
    content: [{ type: 'paragraph', content: [{ type: 'text', text: node.content }] }],
    metadata: {
      source: 'axiom-proposal',
      confidence: node.confidence,
    },
    created_at: now,
    updated_at: now,
    valid_at: now,
    invalid_at: null,
    position_x: 0,
    position_y: 0,
  };
}

/**
 * Convert an EdgeProposal into a temporary Connection for validation.
 */
function proposalEdgeToConnection(
  edge: PROPOSAL['edges'][number],
): Connection {
  const now = new Date().toISOString();
  return {
    id: edge.id,
    source_id: edge.fromId ?? edge.fromTitle,
    target_id: edge.toId ?? edge.toTitle,
    source_type: 'entity',
    target_type: 'entity',
    type: 'semantic',
    color: 'green',
    label: edge.label,
    confidence: edge.confidence,
    created_by: 'ai',
    created_at: now,
    valid_at: now,
    invalid_at: null,
  };
}

/**
 * Validate a proposal using Phase 5A RulesEngine.
 *
 * Creates temporary entities/connections from the proposal, merges them
 * with the existing graph, and runs validation rules against the combined set.
 */
export async function validateProposal(
  proposal: PROPOSAL,
): Promise<VALIDATION_RESULT> {
  ensureRulesRegistered();

  const startTime = Date.now();

  // Get existing graph data from app state
  const existingEntities = Object.values(appState$.entities.notes.get());
  const existingConnections = Object.values(appState$.connections.items.get());
  const existingClusters = Object.values(appState$.clusters.items.get());

  // Convert proposal items to temporary entities/connections
  const proposalEntities = proposal.nodes.map(proposalNodeToEntity);
  const proposalConnections = proposal.edges.map(proposalEdgeToConnection);

  // Merge existing + proposed
  const allEntities = [...existingEntities, ...proposalEntities];
  const allConnections = [...existingConnections, ...proposalConnections];

  // Build validation context with indexes
  const context = buildValidationContext({
    entities: allEntities,
    connections: allConnections,
    clusters: existingClusters,
    clusterMembers: [],
  });

  // Run evaluation
  const { violations } = rulesEngine.evaluate(context);

  // Filter violations to only those affecting proposed items
  const proposalEntityIds = new Set(proposal.nodes.map((n) => n.id));
  const proposalEdgeIds = new Set(proposal.edges.map((e) => e.id));
  const proposalViolations = violations.filter(
    (v) => proposalEntityIds.has(v.focusId) || proposalEdgeIds.has(v.focusId),
  );

  // Determine level pass/fail
  const level1Violations = proposalViolations.filter(
    (v) => mapRuleToLevel(v.ruleId) === 1 && v.severity === 'error',
  );
  const level2Violations = proposalViolations.filter(
    (v) => mapRuleToLevel(v.ruleId) === 2 && v.severity === 'error',
  );
  const level3Violations = proposalViolations.filter(
    (v) => mapRuleToLevel(v.ruleId) === 3 && v.severity === 'error',
  );

  const valid = proposalViolations.filter((v) => v.severity === 'error').length === 0;

  return {
    proposalId: proposal.id,
    valid,
    level1Passed: level1Violations.length === 0,
    level2Passed: level2Violations.length === 0,
    level3Passed: level3Violations.length === 0,
    violations: proposalViolations,
    validatedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}
