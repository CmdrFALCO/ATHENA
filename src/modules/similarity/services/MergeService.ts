import type { IMergeCandidateAdapter } from '../adapters/MergeCandidateAdapter';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IClusterAdapter } from '@/adapters/IClusterAdapter';
import type { MergeOptions, MergeResult } from '../types';

export class MergeService {
  constructor(
    private candidateAdapter: IMergeCandidateAdapter,
    private noteAdapter: INoteAdapter,
    private connectionAdapter: IConnectionAdapter,
    private clusterAdapter: IClusterAdapter
  ) {}

  /**
   * Execute merge: absorb secondary note into primary.
   */
  async merge(candidateId: string, options: MergeOptions): Promise<MergeResult> {
    const {
      primaryNoteId,
      secondaryNoteId,
      contentStrategy,
      transferConnections,
      transferClusters,
    } = options;

    try {
      const primaryNote = await this.noteAdapter.getById(primaryNoteId);
      const secondaryNote = await this.noteAdapter.getById(secondaryNoteId);

      if (!primaryNote || !secondaryNote) {
        return {
          success: false,
          survivorId: primaryNoteId,
          mergedId: secondaryNoteId,
          connectionsTransferred: 0,
          clustersUpdated: 0,
          error: 'Note not found',
        };
      }

      let connectionsTransferred = 0;
      let clustersUpdated = 0;

      // 1. Handle content strategy
      if (contentStrategy === 'keep_secondary') {
        await this.noteAdapter.update(primaryNoteId, {
          content: secondaryNote.content,
        });
      } else if (contentStrategy === 'concatenate') {
        const mergedContent = this.mergeContent(primaryNote.content, secondaryNote.content);
        await this.noteAdapter.update(primaryNoteId, { content: mergedContent });
      }
      // 'keep_primary' and 'manual' don't change content

      // 2. Transfer connections from secondary to primary
      if (transferConnections) {
        const secondaryConnections = await this.connectionAdapter.getConnectionsFor(secondaryNoteId);

        for (const conn of secondaryConnections) {
          const newSourceId =
            conn.source_id === secondaryNoteId ? primaryNoteId : conn.source_id;
          const newTargetId =
            conn.target_id === secondaryNoteId ? primaryNoteId : conn.target_id;

          // Skip self-loops
          if (newSourceId === newTargetId) continue;

          // Check if an equivalent connection already exists
          const existing = await this.connectionAdapter.getConnectionsBetween(
            newSourceId,
            newTargetId
          );
          if (existing.length > 0) continue;

          await this.connectionAdapter.create({
            source_id: newSourceId,
            target_id: newTargetId,
            source_type: conn.source_type,
            target_type: conn.target_type,
            type: conn.type,
            color: conn.color,
            label: conn.label,
            confidence: conn.confidence,
            created_by: conn.created_by,
          });
          connectionsTransferred++;
        }

        // Delete old connections on the secondary note
        for (const conn of secondaryConnections) {
          await this.connectionAdapter.delete(conn.id);
        }
      }

      // 3. Transfer cluster memberships
      if (transferClusters) {
        const secondaryClusters = await this.clusterAdapter.getClustersForEntity(secondaryNoteId);

        for (const cluster of secondaryClusters) {
          const primaryClusters = await this.clusterAdapter.getClustersForEntity(primaryNoteId);
          const alreadyMember = primaryClusters.some((c) => c.id === cluster.id);

          if (!alreadyMember) {
            await this.clusterAdapter.addMember(cluster.id, primaryNoteId, 'participant');
            clustersUpdated++;
          }

          await this.clusterAdapter.removeMember(cluster.id, secondaryNoteId);
        }
      }

      // 4. Soft-delete the secondary note
      await this.noteAdapter.delete(secondaryNoteId);

      // 5. Mark this candidate as merged
      await this.candidateAdapter.updateStatus(candidateId, 'merged');

      // 6. Clean up any other candidates involving the deleted note
      await this.candidateAdapter.deleteForNote(secondaryNoteId);

      return {
        success: true,
        survivorId: primaryNoteId,
        mergedId: secondaryNoteId,
        connectionsTransferred,
        clustersUpdated,
      };
    } catch (error) {
      return {
        success: false,
        survivorId: primaryNoteId,
        mergedId: secondaryNoteId,
        connectionsTransferred: 0,
        clustersUpdated: 0,
        error: error instanceof Error ? error.message : 'Merge failed',
      };
    }
  }

  async reject(candidateId: string): Promise<void> {
    await this.candidateAdapter.updateStatus(candidateId, 'rejected');
  }

  /**
   * Merge Tiptap JSON content by appending doc2 content blocks after doc1.
   */
  private mergeContent(content1: unknown, content2: unknown): unknown {
    const doc1 = typeof content1 === 'string' ? JSON.parse(content1) : content1;
    const doc2 = typeof content2 === 'string' ? JSON.parse(content2) : content2;

    const separator = {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'bold' }],
          text: '--- Merged content ---',
        },
      ],
    };

    return {
      type: 'doc',
      content: [...(doc1?.content || []), separator, ...(doc2?.content || [])],
    };
  }
}
