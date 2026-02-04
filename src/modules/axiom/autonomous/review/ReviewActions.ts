/**
 * ReviewActions — WP 9B.4
 *
 * Business logic for review queue decisions: approve, reject,
 * edit-and-approve, bulk operations. Integrates with ProvenanceAdapter
 * and AXIOMEventBridge.
 *
 * Pending-review items are NOT committed to the graph — they exist
 * only as provenance records. Approve updates the status to 'human_confirmed'.
 * Reject updates the status to 'human_reverted'.
 */

import type { IProvenanceAdapter, ReviewStatus } from '../types';
import type { AXIOMEventBridge } from '../../events/AXIOMEventBridge';
import type { AutonomousCommitService } from '../AutonomousCommitService';

export class ReviewActions {
  constructor(
    private provenanceAdapter: IProvenanceAdapter,
    private eventBridge: AXIOMEventBridge | null,
    private commitService: AutonomousCommitService | null,
  ) {}

  /**
   * Approve a pending item. Changes status to 'human_confirmed'.
   * Pending items are NOT committed to the graph — they were held for review.
   * The actual entity creation is left to the caller (e.g., via proposal re-commit).
   */
  async approve(provenanceId: string): Promise<void> {
    await this.provenanceAdapter.updateReviewStatus(
      provenanceId,
      'human_confirmed',
      'Approved via review queue',
    );

    this.emitDecided(provenanceId, 'human_confirmed');
  }

  /**
   * Reject a pending item. Changes status to 'human_reverted'.
   * If the entity/connection was already committed (e.g., auto_approved items
   * being reverted), attempt revert. For pending_review items, just update status.
   */
  async reject(provenanceId: string, reason?: string): Promise<void> {
    // Check if this item was previously committed (has revert snapshot)
    const snapshot = await this.provenanceAdapter.getRevertSnapshot(provenanceId);

    if (snapshot && this.commitService) {
      // Entity was committed — revert it
      await this.commitService.revert(provenanceId);
    } else {
      // Entity was never committed (pending_review) — just update status
      await this.provenanceAdapter.updateReviewStatus(
        provenanceId,
        'human_reverted',
        reason ?? 'Rejected via review queue',
      );
    }

    this.emitDecided(provenanceId, 'human_reverted');
  }

  /**
   * Edit an entity's title/description inline, then approve.
   * Since pending_review items aren't committed, we update the provenance
   * review_note with the edits and mark as confirmed.
   */
  async editAndApprove(
    provenanceId: string,
    edits: { title?: string; description?: string },
  ): Promise<void> {
    const editSummary = Object.entries(edits)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');

    await this.provenanceAdapter.updateReviewStatus(
      provenanceId,
      'human_confirmed',
      `Edited & approved: ${editSummary}`,
    );

    this.emitDecided(provenanceId, 'human_confirmed');
  }

  /**
   * Bulk approve multiple items.
   */
  async bulkApprove(
    provenanceIds: string[],
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (const id of provenanceIds) {
      try {
        await this.approve(id);
        succeeded++;
      } catch (err) {
        console.error('[AXIOM/Review] Bulk approve failed for', id, err);
        failed++;
      }
    }

    this.emitBatchDecided(succeeded, 'human_confirmed');
    return { succeeded, failed };
  }

  /**
   * Bulk reject multiple items.
   */
  async bulkReject(
    provenanceIds: string[],
    reason?: string,
  ): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;

    for (const id of provenanceIds) {
      try {
        await this.reject(id, reason);
        succeeded++;
      } catch (err) {
        console.error('[AXIOM/Review] Bulk reject failed for', id, err);
        failed++;
      }
    }

    this.emitBatchDecided(succeeded, 'human_reverted');
    return { succeeded, failed };
  }

  private emitDecided(provenanceId: string, decision: 'human_confirmed' | 'human_reverted'): void {
    if (!this.eventBridge) return;

    this.eventBridge.emit({
      type: 'review:decided',
      timestamp: new Date().toISOString(),
      data: { provenanceId, decision },
    });
  }

  private emitBatchDecided(count: number, decision: 'human_confirmed' | 'human_reverted'): void {
    if (!this.eventBridge || count === 0) return;

    this.eventBridge.emit({
      type: 'review:batch_decided',
      timestamp: new Date().toISOString(),
      data: { count, decision },
    });
  }
}
