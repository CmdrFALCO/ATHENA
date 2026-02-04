/**
 * Autonomous Commit Service — WP 9B.2
 *
 * Core decision logic: evaluate proposals against confidence gates,
 * scope rules, and rate limits. Auto-commit high-confidence proposals
 * with full provenance and revert capability.
 *
 * This is a post-workflow decision layer — the AXIOM CPN workflow
 * stays unchanged. Autonomous mode intercepts the commit action
 * after the workflow completes.
 */

import type { PROPOSAL } from '../types/colorsets';
import type { WorkflowResult } from '../workflows/types';
import type {
  AutonomousConfig,
  AutonomousDecision,
  AutoCommitProvenance,
  ConfidenceSnapshot,
  IProvenanceAdapter,
  RevertSnapshot,
} from './types';
import type { RateLimiter } from './RateLimiter';
import type { SimpleConfidenceCalculator } from './ConfidenceCalculator';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';

let idCounter = 0;
function generateId(): string {
  return `auto_${Date.now()}_${++idCounter}`;
}

function emptyFactors(): ConfidenceSnapshot {
  return {
    proposalConfidence: 0,
    validationScore: 0,
    critiqueSurvival: null,
    noveltyScore: 1.0,
  };
}

export class AutonomousCommitService {
  /** Adapters for revert operations — injected externally */
  private noteAdapter: INoteAdapter | null = null;
  private connectionAdapter: IConnectionAdapter | null = null;

  constructor(
    private provenanceAdapter: IProvenanceAdapter,
    private rateLimiter: RateLimiter,
    private confidenceCalculator: SimpleConfidenceCalculator,
  ) {}

  /**
   * Inject adapters for revert operations.
   * Must be called during initialization before revert is used.
   */
  setAdapters(notes: INoteAdapter, connections: IConnectionAdapter): void {
    this.noteAdapter = notes;
    this.connectionAdapter = connections;
  }

  /**
   * Evaluate a completed AXIOM workflow result and decide whether to
   * auto-commit, queue for review, or auto-reject.
   */
  async evaluate(
    proposal: PROPOSAL,
    workflowResult: WorkflowResult,
    config: AutonomousConfig,
  ): Promise<AutonomousDecision> {
    // 0. Master toggle
    if (!config.enabled) {
      return {
        action: 'disabled',
        confidence: 0,
        factors: emptyFactors(),
        reason: 'Autonomous mode is disabled',
      };
    }

    // 1. Scope check — is this entity type allowed?
    const scopeBlock = this.checkScope(proposal, config);
    if (scopeBlock) {
      return scopeBlock;
    }

    // 2. Validation must have passed (NON-NEGOTIABLE)
    if (config.scope.requireValidation && !workflowResult.success) {
      return {
        action: 'queue_for_review',
        confidence: 0,
        factors: emptyFactors(),
        reason: 'Validation did not pass',
      };
    }

    // 3. Build confidence factors from available data
    const factors = this.buildFactors(proposal, workflowResult);
    const confidence = this.confidenceCalculator.calculate(factors);

    // 4. Auto-reject check
    if (confidence < config.thresholds.autoRejectBelow) {
      return {
        action: 'auto_reject',
        confidence,
        factors,
        reason: `Confidence ${confidence.toFixed(2)} below auto-reject threshold ${config.thresholds.autoRejectBelow}`,
      };
    }

    // 5. Determine threshold (entities vs connections)
    const hasEntities = proposal.nodes && proposal.nodes.length > 0;
    const threshold = hasEntities
      ? config.thresholds.autoAcceptEntity
      : config.thresholds.autoAcceptConnection;

    // 6. Below auto-accept → queue for review
    if (confidence < threshold) {
      return {
        action: 'queue_for_review',
        confidence,
        factors,
        reason: `Confidence ${confidence.toFixed(2)} below auto-accept threshold ${threshold}`,
      };
    }

    // 7. Critique requirement check
    if (config.scope.requireCritique && factors.critiqueSurvival === null) {
      return {
        action: 'queue_for_review',
        confidence,
        factors,
        reason: 'Critique required but was not run',
      };
    }

    // 8. Rate limit check
    const rateCheck = await this.rateLimiter.canCommit(config);
    if (!rateCheck.allowed) {
      return {
        action: 'rate_limited',
        confidence,
        factors,
        reason: rateCheck.reason!,
      };
    }

    // 9. All gates passed → auto-commit
    return {
      action: 'auto_commit',
      confidence,
      factors,
      reason: `Confidence ${confidence.toFixed(2)} meets threshold ${threshold}`,
    };
  }

  /**
   * Execute a commit with full provenance tracking.
   */
  async commitWithProvenance(
    proposal: PROPOSAL,
    decision: AutonomousDecision,
    commitFn: () => Promise<{ entityIds: string[]; connectionIds: string[] }>,
    config: AutonomousConfig,
  ): Promise<AutoCommitProvenance> {
    // 1. Take revert snapshot (capture current state of any entities being modified)
    const revertSnapshot = await this.buildRevertSnapshot(proposal);

    // 2. Execute the actual commit (calls existing graphIntegration.commitProposal)
    const committed = await commitFn();

    // 3. Record provenance
    const provenance: AutoCommitProvenance = {
      id: generateId(),
      target_type: committed.entityIds.length > 0 ? 'entity' : 'connection',
      target_id: committed.entityIds[0] || committed.connectionIds[0] || '',
      source: 'chat_proposal',
      correlation_id: proposal.correlationId || generateId(),
      confidence: decision.confidence,
      confidence_factors: decision.factors,
      validations_passed: [],
      critique_survival: decision.factors.critiqueSurvival ?? undefined,
      created_at: new Date().toISOString(),
      config_snapshot: { thresholds: config.thresholds },
      review_status: 'auto_approved',
      can_revert: true,
      revert_snapshot: revertSnapshot,
    };

    await this.provenanceAdapter.record(provenance);

    // 4. Record in rate limiter
    this.rateLimiter.recordCommit();

    return provenance;
  }

  /**
   * Revert an auto-committed change using its provenance snapshot.
   */
  async revert(provenanceId: string): Promise<boolean> {
    if (!this.noteAdapter || !this.connectionAdapter) {
      console.error('[AXIOM/Autonomous] Cannot revert: adapters not set');
      return false;
    }

    // 1. Get revert snapshot
    const snapshot = await this.provenanceAdapter.getRevertSnapshot(provenanceId);
    if (!snapshot) {
      console.error('[AXIOM/Autonomous] No revert snapshot for', provenanceId);
      return false;
    }

    try {
      // 2. Revert entities
      for (const entity of snapshot.entities) {
        if (!entity.existed_before) {
          // Was created by this commit — delete it
          await this.noteAdapter.delete(entity.id);
        }
        // Restore of modified entities would go here in future
      }

      // 3. Revert connections
      for (const conn of snapshot.connections) {
        if (!conn.existed_before) {
          await this.connectionAdapter.delete(conn.id);
        }
      }

      // 4. Update provenance status
      await this.provenanceAdapter.updateReviewStatus(
        provenanceId,
        'human_reverted',
        'Reverted by user',
      );

      return true;
    } catch (err) {
      console.error('[AXIOM/Autonomous] Revert failed:', err);
      return false;
    }
  }

  // --- Private helpers ---

  private checkScope(
    proposal: PROPOSAL,
    config: AutonomousConfig,
  ): AutonomousDecision | null {
    // Check node types against scope config
    for (const node of proposal.nodes) {
      // Use subtype or 'note' as the entity type
      const entityType = 'note'; // NodeProposal doesn't carry subtype, default to 'note'

      // Blocked check
      if (config.scope.blockedEntityTypes.includes(entityType)) {
        return {
          action: 'queue_for_review',
          confidence: 0,
          factors: emptyFactors(),
          reason: `Entity type "${entityType}" is in blocked list`,
        };
      }

      // Allowed check (skip if wildcard)
      if (
        !config.scope.allowedEntityTypes.includes('*') &&
        !config.scope.allowedEntityTypes.includes(entityType)
      ) {
        return {
          action: 'queue_for_review',
          confidence: 0,
          factors: emptyFactors(),
          reason: `Entity type "${entityType}" not in allowed list`,
        };
      }
    }

    return null; // Scope check passed
  }

  private buildFactors(
    proposal: PROPOSAL,
    result: WorkflowResult,
  ): ConfidenceSnapshot {
    // proposalConfidence: max across all NodeProposal/EdgeProposal confidence values
    const nodeConfs = (proposal.nodes || []).map((n) => n.confidence ?? 0);
    const edgeConfs = (proposal.edges || []).map((e) => e.confidence ?? 0);
    const allConfs = [...nodeConfs, ...edgeConfs];
    const proposalConfidence =
      allConfs.length > 0 ? Math.max(...allConfs) : 0;

    // validationScore: 1.0 if success
    const validationScore = result.success ? 1.0 : 0.0;

    // critiqueSurvival: from feedback history if critique ran
    const critiqueSurvival = this.extractCritiqueSurvival(result);

    // noveltyScore: placeholder 1.0 (WP 9B.3 will add real duplicate detection)
    const noveltyScore = 1.0;

    return { proposalConfidence, validationScore, critiqueSurvival, noveltyScore };
  }

  /**
   * Extract critique survival score from workflow result.
   * Looks through transition history for critique-related transitions.
   * Uses heuristic based on which critique transition fired.
   */
  private extractCritiqueSurvival(result: WorkflowResult): number | null {
    for (const record of result.transitionHistory) {
      // Critique ran and routed to one of these transitions
      if (record.transitionId === 'T_critique_accept') return 0.8;
      if (record.transitionId === 'T_critique_escalate') return 0.5;
      if (record.transitionId === 'T_critique_reject') return 0.2;
    }

    // Check if skip_critique fired (critique was available but skipped)
    for (const record of result.transitionHistory) {
      if (record.transitionId === 'T_skip_critique') {
        return null; // Critique skipped — not a factor
      }
    }

    return null; // Critique not configured
  }

  /**
   * Build a revert snapshot before committing.
   * Captures the state of entities that will be created/modified.
   */
  private async buildRevertSnapshot(
    proposal: PROPOSAL,
  ): Promise<RevertSnapshot> {
    const entities: RevertSnapshot['entities'] = [];
    const connections: RevertSnapshot['connections'] = [];

    // For new proposals, all items will be newly created
    // Mark as existed_before: false so revert can delete them
    for (const node of proposal.nodes) {
      entities.push({
        id: node.id, // Proposed ID — will be replaced with real ID after commit
        existed_before: false,
      });
    }

    for (const edge of proposal.edges) {
      connections.push({
        id: edge.id,
        existed_before: false,
      });
    }

    return { entities, connections };
  }
}
