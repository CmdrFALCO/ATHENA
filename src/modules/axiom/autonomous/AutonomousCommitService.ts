/**
 * Autonomous Commit Service — WP 9B.2, extended WP 9B.3
 *
 * Core decision logic: evaluate proposals against confidence gates,
 * scope rules, and rate limits. Auto-commit high-confidence proposals
 * with full provenance and revert capability.
 *
 * This is a post-workflow decision layer — the AXIOM CPN workflow
 * stays unchanged. Autonomous mode intercepts the commit action
 * after the workflow completes.
 *
 * WP 9B.3 additions:
 * - Multi-factor confidence scoring with 8 factors
 * - Strategy-based graph coherence and threshold adjustment
 * - Floor veto (any single factor below minimum forces review)
 * - Dynamic threshold adjustment based on historical patterns
 * - Falls back to SimpleConfidenceCalculator when config says 'simple'
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

// WP 9B.3: Multi-factor confidence imports
import type { MultiFactorConfidenceCalculator } from './confidence/MultiFactorConfidenceCalculator';
import type { SourceTrustEvaluator } from './confidence/SourceTrustEvaluator';
import type { IGraphCoherenceStrategy } from './confidence/IGraphCoherenceStrategy';
import type { EmbeddingSimilarityEvaluator } from './confidence/EmbeddingSimilarityEvaluator';
import type { NoveltyDetector } from './confidence/NoveltyDetector';
import type { IThresholdAdjuster } from './confidence/IThresholdAdjuster';
import type { ConfidenceFactors, ConfidenceResult, AdjustedThresholds } from './confidence/types';
import type { AXIOMEventBridge } from '../events/AXIOMEventBridge';
import type { ReviewQueueReason } from '../events/types';

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

/**
 * WP 9B.3: Multi-factor confidence evaluation stack.
 * Optional — only used when calculator mode is 'multi_factor'.
 */
export interface MultiFactorStack {
  calculator: MultiFactorConfidenceCalculator;
  sourceTrustEvaluator: SourceTrustEvaluator;
  coherenceStrategy: IGraphCoherenceStrategy;
  embeddingSimilarityEvaluator: EmbeddingSimilarityEvaluator;
  noveltyDetector: NoveltyDetector;
  thresholdAdjuster: IThresholdAdjuster;
}

export class AutonomousCommitService {
  /** Adapters for revert operations — injected externally */
  private noteAdapter: INoteAdapter | null = null;
  private connectionAdapter: IConnectionAdapter | null = null;

  /** WP 9B.3: Multi-factor confidence stack (null = use simple calculator) */
  private multiFactorStack: MultiFactorStack | null = null;

  /** WP 9B.4: Event bridge for review queue notifications */
  private eventBridge: AXIOMEventBridge | null = null;

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
   * WP 9B.3: Set the multi-factor confidence stack.
   * When set, evaluate() uses multi-factor scoring instead of simple.
   */
  setMultiFactorStack(stack: MultiFactorStack): void {
    this.multiFactorStack = stack;
  }

  /**
   * WP 9B.4: Set the event bridge for review queue notifications.
   */
  setEventBridge(bridge: AXIOMEventBridge): void {
    this.eventBridge = bridge;
  }

  /**
   * Evaluate a completed AXIOM workflow result and decide whether to
   * auto-commit, queue for review, or auto-reject.
   */
  async evaluate(
    proposal: PROPOSAL,
    workflowResult: WorkflowResult,
    config: AutonomousConfig,
    resource?: { url?: string; type?: string } | null,
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

    // 3. Choose calculator mode
    if (this.multiFactorStack) {
      return this.evaluateMultiFactor(proposal, workflowResult, config, resource);
    }

    // Fallback: simple confidence calculation (WP 9B.2 behavior)
    return this.evaluateSimple(proposal, workflowResult, config);
  }

  /**
   * WP 9B.3: Multi-factor confidence evaluation path.
   */
  private async evaluateMultiFactor(
    proposal: PROPOSAL,
    workflowResult: WorkflowResult,
    config: AutonomousConfig,
    resource?: { url?: string; type?: string } | null,
  ): Promise<AutonomousDecision> {
    const stack = this.multiFactorStack!;

    // Build all 8 factors
    const factors = await this.buildMultiFactors(
      proposal,
      workflowResult,
      stack,
      resource,
    );

    // Calculate confidence with floor veto
    const result = stack.calculator.calculate(factors);

    // Get dynamically adjusted thresholds
    const thresholds = await stack.thresholdAdjuster.adjust({
      autoAcceptEntity: config.thresholds.autoAcceptEntity,
      autoAcceptConnection: config.thresholds.autoAcceptConnection,
      autoRejectBelow: config.thresholds.autoRejectBelow,
    });

    // Build legacy factors for backward compatibility
    const legacyFactors = this.toLegacyFactors(factors, proposal, workflowResult);

    // Floor veto: force review regardless of score
    if (result.hasFloorVeto) {
      const vetoNames = result.vetoFactors.join(', ');
      return {
        action: 'queue_for_review',
        confidence: result.score,
        factors: legacyFactors,
        reason: `Floor veto triggered by: ${vetoNames}`,
        confidenceResult: result,
      };
    }

    // Auto-reject check
    if (result.score < thresholds.autoRejectBelow) {
      return {
        action: 'auto_reject',
        confidence: result.score,
        factors: legacyFactors,
        reason: `Confidence ${result.score.toFixed(2)} below auto-reject threshold ${thresholds.autoRejectBelow.toFixed(2)}`,
        confidenceResult: result,
      };
    }

    // Determine threshold (entities vs connections)
    const hasEntities = proposal.nodes && proposal.nodes.length > 0;
    const threshold = hasEntities
      ? thresholds.autoAcceptEntity
      : thresholds.autoAcceptConnection;

    // Below auto-accept → queue for review
    if (result.score < threshold) {
      return {
        action: 'queue_for_review',
        confidence: result.score,
        factors: legacyFactors,
        reason: `Confidence ${result.score.toFixed(2)} below auto-accept threshold ${threshold.toFixed(2)}${thresholds.wasAdjusted ? ' (adjusted)' : ''}`,
        confidenceResult: result,
      };
    }

    // Critique requirement check
    if (config.scope.requireCritique) {
      const critiqueSurvival = this.extractCritiqueSurvival(workflowResult);
      if (critiqueSurvival === null) {
        return {
          action: 'queue_for_review',
          confidence: result.score,
          factors: legacyFactors,
          reason: 'Critique required but was not run',
          confidenceResult: result,
        };
      }
    }

    // Rate limit check
    const rateCheck = await this.rateLimiter.canCommit(config);
    if (!rateCheck.allowed) {
      return {
        action: 'rate_limited',
        confidence: result.score,
        factors: legacyFactors,
        reason: rateCheck.reason!,
        confidenceResult: result,
      };
    }

    // All gates passed → auto-commit
    return {
      action: 'auto_commit',
      confidence: result.score,
      factors: legacyFactors,
      reason: `Confidence ${result.score.toFixed(2)} meets threshold ${threshold.toFixed(2)}${thresholds.wasAdjusted ? ' (adjusted)' : ''}`,
      confidenceResult: result,
    };
  }

  /**
   * WP 9B.2 fallback: Simple confidence evaluation path.
   */
  private async evaluateSimple(
    proposal: PROPOSAL,
    workflowResult: WorkflowResult,
    config: AutonomousConfig,
  ): Promise<AutonomousDecision> {
    const factors = this.buildFactors(proposal, workflowResult);
    const confidence = this.confidenceCalculator.calculate(factors);

    // Auto-reject check
    if (confidence < config.thresholds.autoRejectBelow) {
      return {
        action: 'auto_reject',
        confidence,
        factors,
        reason: `Confidence ${confidence.toFixed(2)} below auto-reject threshold ${config.thresholds.autoRejectBelow}`,
      };
    }

    // Determine threshold (entities vs connections)
    const hasEntities = proposal.nodes && proposal.nodes.length > 0;
    const threshold = hasEntities
      ? config.thresholds.autoAcceptEntity
      : config.thresholds.autoAcceptConnection;

    // Below auto-accept → queue for review
    if (confidence < threshold) {
      return {
        action: 'queue_for_review',
        confidence,
        factors,
        reason: `Confidence ${confidence.toFixed(2)} below auto-accept threshold ${threshold}`,
      };
    }

    // Critique requirement check
    if (config.scope.requireCritique && factors.critiqueSurvival === null) {
      return {
        action: 'queue_for_review',
        confidence,
        factors,
        reason: 'Critique required but was not run',
      };
    }

    // Rate limit check
    const rateCheck = await this.rateLimiter.canCommit(config);
    if (!rateCheck.allowed) {
      return {
        action: 'rate_limited',
        confidence,
        factors,
        reason: rateCheck.reason!,
      };
    }

    // All gates passed → auto-commit
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
      confidence_result: decision.confidenceResult,
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

  /**
   * WP 9B.4: Record a provenance entry for a queued-for-review decision.
   * The entity is NOT committed to the graph — it awaits human approval.
   */
  async recordPendingReview(
    proposal: PROPOSAL,
    decision: AutonomousDecision,
    config: AutonomousConfig,
  ): Promise<AutoCommitProvenance> {
    const provenance: AutoCommitProvenance = {
      id: generateId(),
      target_type: (proposal.nodes?.length ?? 0) > 0 ? 'entity' : 'connection',
      target_id: proposal.nodes?.[0]?.id || proposal.edges?.[0]?.id || '',
      source: 'chat_proposal',
      correlation_id: proposal.correlationId || generateId(),
      confidence: decision.confidence,
      confidence_factors: decision.factors,
      validations_passed: [],
      critique_survival: decision.factors.critiqueSurvival ?? undefined,
      created_at: new Date().toISOString(),
      config_snapshot: { thresholds: config.thresholds },
      review_status: 'pending_review',
      can_revert: false,
      confidence_result: decision.confidenceResult,
    };

    await this.provenanceAdapter.record(provenance);

    // Emit review:queued event
    this.emitReviewQueued(provenance.id, decision);

    return provenance;
  }

  /**
   * WP 9B.4: Emit a review:queued event via event bridge.
   */
  private emitReviewQueued(provenanceId: string, decision: AutonomousDecision): void {
    if (!this.eventBridge) return;

    const reason = this.classifyQueueReason(decision);

    this.eventBridge.emit({
      type: 'review:queued',
      timestamp: new Date().toISOString(),
      data: {
        provenanceId,
        reason,
        confidence: decision.confidence,
      },
    });
  }

  /**
   * WP 9B.4: Classify the queue reason from the decision's reason string.
   */
  private classifyQueueReason(decision: AutonomousDecision): ReviewQueueReason {
    const r = decision.reason.toLowerCase();
    if (r.includes('floor veto')) return 'floor_veto';
    if (r.includes('rate limit')) return 'rate_limited';
    if (r.includes('validation')) return 'validation_failed';
    if (r.includes('blocked') || r.includes('not in allowed')) return 'scope_restricted';
    return 'low_confidence';
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

  /**
   * WP 9B.3: Build all 8 multi-factor confidence scores.
   */
  private async buildMultiFactors(
    proposal: PROPOSAL,
    workflowResult: WorkflowResult,
    stack: MultiFactorStack,
    resource?: { url?: string; type?: string } | null,
  ): Promise<ConfidenceFactors> {
    // Extract basic data
    const nodeConfs = (proposal.nodes || []).map((n) => n.confidence ?? 0);
    const edgeConfs = (proposal.edges || []).map((e) => e.confidence ?? 0);
    const allConfs = [...nodeConfs, ...edgeConfs];
    const extractionClarity =
      allConfs.length > 0 ? Math.max(...allConfs) : 0.5;

    // Run evaluators in parallel where possible
    const sourceId = proposal.edges?.[0]?.source ?? proposal.nodes?.[0]?.id ?? '';
    const targetId = proposal.edges?.[0]?.target ?? '';
    const connectionType = proposal.edges?.[0]?.label;
    const proposalTitle = proposal.nodes?.[0]?.title ?? '';
    const proposalContent = proposal.nodes?.[0]?.content;

    const [sourceQuality, graphCoherence, embeddingSimilarity, noveltyResult] =
      await Promise.all([
        Promise.resolve(stack.sourceTrustEvaluator.evaluate(resource, !resource)),
        sourceId && targetId
          ? stack.coherenceStrategy.evaluate(sourceId, targetId, connectionType)
          : Promise.resolve(0.5), // No connection to evaluate
        sourceId && targetId
          ? stack.embeddingSimilarityEvaluator.evaluateConnection(sourceId, targetId)
          : sourceId
            ? stack.embeddingSimilarityEvaluator.evaluateEntity(sourceId)
            : Promise.resolve(0.5),
        proposalTitle
          ? stack.noveltyDetector.evaluate(proposalTitle, proposalContent)
          : Promise.resolve({ score: 1.0 }),
      ]);

    // Validation score
    const validationScore = workflowResult.success ? 1.0 : 0.0;

    // Critique survival
    const critiqueSurvivalRaw = this.extractCritiqueSurvival(workflowResult);
    const critiqueSurvival = critiqueSurvivalRaw ?? 0.5; // Default to neutral if not run

    return {
      sourceQuality,
      extractionClarity,
      graphCoherence,
      embeddingSimilarity,
      noveltyScore: noveltyResult.score,
      validationScore,
      critiqueSurvival,
      invarianceScore: null, // Stub for WP 9B.5
    };
  }

  /**
   * Convert multi-factor scores to legacy ConfidenceSnapshot for backward compat.
   */
  private toLegacyFactors(
    factors: ConfidenceFactors,
    proposal: PROPOSAL,
    workflowResult: WorkflowResult,
  ): ConfidenceSnapshot {
    const nodeConfs = (proposal.nodes || []).map((n) => n.confidence ?? 0);
    const edgeConfs = (proposal.edges || []).map((e) => e.confidence ?? 0);
    const allConfs = [...nodeConfs, ...edgeConfs];
    const proposalConfidence =
      allConfs.length > 0 ? Math.max(...allConfs) : 0;

    return {
      proposalConfidence,
      validationScore: factors.validationScore,
      critiqueSurvival: this.extractCritiqueSurvival(workflowResult),
      noveltyScore: factors.noveltyScore,
    };
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

    // noveltyScore: placeholder 1.0 (WP 9B.3 adds real duplicate detection via multi-factor path)
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
