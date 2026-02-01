/**
 * ProposalAcceptService - Orchestrates proposal acceptance flow
 * WP 7.5 - Proposal Cards UI
 *
 * Handles:
 * - Creating notes from node proposals
 * - Creating connections from edge proposals
 * - Refreshing application state after creation
 * - Running validation to catch constraint violations
 */

import type { NodeProposal, EdgeProposal } from '../types';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { Block } from '@/shared/types';
import { appState$ } from '@/store/state';
import { runValidation } from '@/modules/validation/store';
import type { Violation } from '@/modules/validation/types';
import { preferenceActions } from '@/modules/ai/preferences/preferenceActions';

export interface AcceptNodeResult {
  noteId: string;
  connectionIds: string[];
  validationWarnings: Violation[];
}

export interface AcceptEdgeResult {
  connectionId: string;
  validationWarnings: Violation[];
}

export interface ProposalAdapters {
  notes: INoteAdapter;
  connections: IConnectionAdapter;
}

export class ProposalAcceptService {
  constructor(private adapters: ProposalAdapters) {}

  /**
   * Accept a node proposal: create note, create suggested connections, refresh state, run validation
   */
  async acceptNode(proposal: NodeProposal): Promise<AcceptNodeResult> {
    const { notes: noteAdapter, connections: connectionAdapter } = this.adapters;
    const connectionIds: string[] = [];

    // 1. Create the note
    const note = await noteAdapter.create({
      type: 'note',
      subtype: 'ai-generated',
      title: proposal.title,
      content: this.contentToTiptap(proposal.content),
      metadata: {
        source: 'chat-proposal',
        confidence: proposal.confidence,
      },
      position_x: 0,
      position_y: 0,
    });

    // 2. Create suggested connections (as green/AI-suggested)
    for (const targetRef of proposal.suggestedConnections) {
      const targetId = await this.resolveNoteReference(targetRef);

      // Skip self-connections and unresolved references
      if (!targetId || targetId === note.id) continue;

      try {
        const connection = await connectionAdapter.create({
          source_id: note.id,
          target_id: targetId,
          source_type: 'entity',
          target_type: 'entity',
          type: 'semantic',
          color: 'green', // AI-suggested = green
          label: null, // No label for suggested connections
          created_by: 'ai',
          confidence: proposal.confidence,
        });
        connectionIds.push(connection.id);
      } catch (err) {
        // Log but don't fail the whole operation
        console.warn(`Failed to create suggested connection to ${targetRef}:`, err);
      }
    }

    // 3. Refresh main application state
    await this.refreshState();

    // 4. Run validation and collect warnings
    const validationWarnings = await this.runValidationForNode(note.id);

    // 5. Record preference signal (WP 8.4)
    await preferenceActions.recordNodeAccept(proposal);

    return {
      noteId: note.id,
      connectionIds,
      validationWarnings,
    };
  }

  /**
   * Accept an edge proposal: create connection, refresh state, run validation
   */
  async acceptEdge(
    proposal: EdgeProposal & { fromId: string; toId: string }
  ): Promise<AcceptEdgeResult> {
    const { connections: connectionAdapter } = this.adapters;

    // 1. Create the connection
    const connection = await connectionAdapter.create({
      source_id: proposal.fromId,
      target_id: proposal.toId,
      source_type: 'entity',
      target_type: 'entity',
      type: 'semantic',
      color: 'green', // AI-suggested = green
      label: proposal.label,
      created_by: 'ai',
      confidence: proposal.confidence,
    });

    // 2. Refresh state
    await this.refreshState();

    // 3. Run validation
    const validationWarnings = await this.runValidationForConnection(connection.id);

    // 4. Record preference signal (WP 8.4)
    await preferenceActions.recordEdgeAccept(proposal);

    return {
      connectionId: connection.id,
      validationWarnings,
    };
  }

  /**
   * Convert plain text content to Tiptap Block[] structure
   */
  private contentToTiptap(text: string): Block[] {
    // Split by paragraphs and create Tiptap block structure
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

    if (paragraphs.length === 0) {
      return [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: text || '' }],
        },
      ];
    }

    return paragraphs.map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p.trim() }],
    }));
  }

  /**
   * Resolve a note reference (ID or title) to an ID
   */
  private async resolveNoteReference(ref: string): Promise<string | null> {
    // If it looks like a UUID, use directly
    if (ref.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Verify it exists
      const note = await this.adapters.notes.getById(ref);
      return note ? ref : null;
    }

    // Otherwise search by title (case-insensitive)
    const notes = await this.adapters.notes.getAll();
    const match = notes.find((n) => n.title.toLowerCase() === ref.toLowerCase());
    return match?.id || null;
  }

  /**
   * Refresh application state to reflect new entities/connections
   */
  private async refreshState(): Promise<void> {
    // Refresh notes
    const notes = await this.adapters.notes.getAll();
    const notesMap: Record<string, (typeof notes)[0]> = {};
    for (const note of notes) {
      notesMap[note.id] = note;
    }
    appState$.entities.notes.set(notesMap);
    appState$.entities.lastSync.set(new Date().toISOString());

    // Refresh connections
    const connections = await this.adapters.connections.getAll();
    const connectionsMap: Record<string, (typeof connections)[0]> = {};
    for (const conn of connections) {
      connectionsMap[conn.id] = conn;
    }
    appState$.connections.items.set(connectionsMap);
    appState$.connections.lastSync.set(new Date().toISOString());
  }

  /**
   * Run validation and return any warnings/errors for the new node
   */
  private async runValidationForNode(nodeId: string): Promise<Violation[]> {
    try {
      // Run full validation (will update validation store)
      const report = await runValidation();

      // Get violations specific to this node
      return report.violations.filter((v) => v.focusId === nodeId);
    } catch (err) {
      console.warn('Validation failed after node accept:', err);
      return [];
    }
  }

  /**
   * Run validation and return any warnings/errors for the new connection
   */
  private async runValidationForConnection(connectionId: string): Promise<Violation[]> {
    try {
      const report = await runValidation();

      return report.violations.filter((v) => v.focusId === connectionId);
    } catch (err) {
      console.warn('Validation failed after edge accept:', err);
      return [];
    }
  }
}
