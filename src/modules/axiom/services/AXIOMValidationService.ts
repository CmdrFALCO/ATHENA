/**
 * AXIOMValidationService — AXIOM-powered validation with corrective feedback loop
 *
 * Implements IValidationService using the CPN workflow:
 * validate -> decide -> retry/accept/reject loop
 *
 * For full graph validation, delegates to the existing runValidation().
 * For proposal validation, runs the AXIOM workflow with real integrations.
 *
 * @module axiom/services/AXIOMValidationService
 */

import { observe } from '@legendapp/state';
import type { IValidationService } from '@/modules/validation/interfaces/IValidationService';
import type { Violation, ViolationResolution, ViolationFocusType } from '@/modules/validation/types';
import type { ValidationReport, ValidationOptions } from '@/modules/validation/types';
import type { PROPOSAL } from '../types/colorSets';
import type { WorkflowResult } from '../workflows/types';
import { PLACE_IDS } from '../workflows/types';
import { createValidationNet, wireValidationNet, createProposalToken } from '../workflows/validationNet';
import { createDefaultEngine } from '../index';
import { AXIOMEngine } from '../engine/AXIOMEngine';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import {
  validationState$,
  runValidation,
  dismissViolation,
  applyViolationFix,
} from '@/modules/validation/store';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import { devSettings$ } from '@/config/devSettings';
import { validateProposal } from '../integration/validationIntegration';
import { regenerateWithFeedback } from '../integration/chatIntegration';
import { commitToGraph } from '../integration/graphIntegration';

export class AXIOMValidationService implements IValidationService {
  private engine: AXIOMEngine | null = null;
  private isInitialized = false;
  private connectionAdapter: IConnectionAdapter | null = null;

  /**
   * Set the connection adapter for auto-fix operations.
   */
  setConnectionAdapter(adapter: IConnectionAdapter): void {
    this.connectionAdapter = adapter;
  }

  /**
   * Ensure the engine is initialized with the validation workflow.
   */
  private ensureInitialized(): void {
    if (this.isInitialized && this.engine) return;

    // Create engine from devSettings
    this.engine = createDefaultEngine();

    // Create and wire the validation net with real implementations
    const net = createValidationNet({
      placeholders: {
        validateProposal,
        regenerateProposal: regenerateWithFeedback,
        commitProposal: commitToGraph,
      },
    });
    wireValidationNet(this.engine, net);

    this.isInitialized = true;
  }

  /**
   * Run validation and return a report.
   *
   * For full graph validation, delegates to runValidation() (Phase 5A).
   * AXIOM is for proposal validation with the feedback loop.
   */
  async validate(options?: ValidationOptions): Promise<ValidationReport> {
    // Full graph validation delegates to existing implementation
    return runValidation(options);
  }

  /**
   * Get current violations (from last validation run).
   */
  getViolations(): Violation[] {
    return validationState$.violations.get();
  }

  /**
   * Get violations for a specific entity/connection/cluster.
   */
  getViolationsFor(focusType: ViolationFocusType, focusId: string): Violation[] {
    const violations = validationState$.violations.get();
    return violations.filter(
      (v) => v.focusType === focusType && v.focusId === focusId,
    );
  }

  /**
   * Mark a violation as resolved.
   */
  resolveViolation(violationId: string, resolution: ViolationResolution): void {
    if (resolution.type === 'dismissed' || resolution.type === 'wont_fix') {
      dismissViolation(violationId);
    }
  }

  /**
   * Attempt to auto-fix a violation.
   */
  async applyFix(violationId: string): Promise<boolean> {
    if (!this.connectionAdapter) {
      console.error(
        '[AXIOM] connectionAdapter not set. Call setConnectionAdapter() during app initialization.',
      );
      return false;
    }
    return applyViolationFix(violationId, this.connectionAdapter);
  }

  /**
   * Subscribe to violation changes.
   */
  onViolationsChanged(callback: (violations: Violation[]) => void): () => void {
    return observe(validationState$.violations, ({ value }) => {
      const violations = (value ?? []).filter((v): v is Violation => v !== undefined);
      callback(violations);
    });
  }

  /**
   * Check if validation is currently running.
   */
  isValidating(): boolean {
    return validationState$.isValidating.get() || axiomState$.isRunning.get();
  }

  /**
   * Get the last validation report (or null if never run).
   */
  getLastReport(): ValidationReport | null {
    return validationState$.lastReport.get();
  }

  /**
   * Process a chat proposal through the AXIOM workflow.
   *
   * This is the main entry point for AI-generated proposals.
   * Runs the full validate -> decide -> retry/accept/reject loop.
   */
  async processProposal(proposal: PROPOSAL): Promise<WorkflowResult> {
    this.ensureInitialized();

    if (!this.engine) {
      throw new Error('[AXIOM] Engine not initialized');
    }

    // Reset engine for new workflow
    this.engine.reset();

    // Re-wire since reset clears places/transitions
    this.isInitialized = false;
    this.ensureInitialized();

    const maxRetries = devSettings$.axiom.workflow.maxRetries.peek();

    // Create token for this proposal
    const token = createProposalToken(proposal, { maxRetries });

    // Add to proposals place
    this.engine.addToken(PLACE_IDS.P_proposals, token);

    // Update UI state
    axiomActions.startWorkflow(proposal.correlationId);
    axiomActions.updateTokenPlacement(token._meta.id, PLACE_IDS.P_proposals);

    try {
      // Run workflow to completion
      await this.engine.run();

      // Determine final result by inspecting where tokens ended up
      const result = this.buildWorkflowResult(token._meta.id);

      // Record stats
      axiomActions.recordWorkflowComplete(
        result.success,
        result.totalRetries,
      );

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      axiomActions.setLastError(error);

      return {
        success: false,
        finalPlace: 'unknown',
        totalSteps: this.engine.steps,
        totalRetries: 0,
        feedbackHistory: [],
        transitionHistory: [],
      };
    } finally {
      axiomActions.stopWorkflow();
    }
  }

  /**
   * Build a WorkflowResult by inspecting the final token state.
   */
  private buildWorkflowResult(tokenId: string): WorkflowResult {
    if (!this.engine) {
      return {
        success: false,
        finalPlace: 'unknown',
        totalSteps: 0,
        totalRetries: 0,
        feedbackHistory: [],
        transitionHistory: [],
      };
    }

    // Find the token across all places
    const token = this.engine.findToken(tokenId);

    if (!token) {
      return {
        success: false,
        finalPlace: 'unknown',
        totalSteps: this.engine.steps,
        totalRetries: 0,
        feedbackHistory: [],
        transitionHistory: [],
      };
    }

    const finalPlace = token._meta.currentPlace;
    const success = finalPlace === PLACE_IDS.P_committed;

    return {
      success,
      finalPlace,
      totalSteps: this.engine.steps,
      totalRetries: token.retryCount,
      feedbackHistory: token.feedbackHistory,
      transitionHistory: token._meta.transitionHistory,
    };
  }

  /**
   * Get the current engine instance (for debugging).
   */
  getEngine(): AXIOMEngine | null {
    return this.engine;
  }
}

/**
 * Singleton instance.
 */
export const axiomValidationService = new AXIOMValidationService();
