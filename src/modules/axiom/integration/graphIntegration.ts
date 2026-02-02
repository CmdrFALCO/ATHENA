/**
 * Graph Integration — Commits accepted proposals to the knowledge graph
 *
 * Implements the real `commitProposal` placeholder by creating
 * entities and connections via adapter interfaces.
 *
 * @module axiom/integration/graphIntegration
 */

import type { PROPOSAL } from '../types/colorSets';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import { appState$ } from '@/store/state';
import { runValidation } from '@/modules/validation/store';

// Adapter injection — set during app initialization
let noteAdapter: INoteAdapter | null = null;
let connectionAdapter: IConnectionAdapter | null = null;

/**
 * Inject adapters for graph operations.
 * Must be called during app initialization before AXIOM processes proposals.
 */
export function setGraphAdapters(
  notes: INoteAdapter,
  connections: IConnectionAdapter,
): void {
  noteAdapter = notes;
  connectionAdapter = connections;
}

/**
 * Check if graph adapters have been set.
 */
export function hasGraphAdapters(): boolean {
  return noteAdapter !== null && connectionAdapter !== null;
}

/**
 * Commit a verified proposal to the knowledge graph.
 *
 * Creates nodes first (to get real IDs), then edges with resolved IDs.
 * Refreshes app state and runs post-commit validation.
 */
export async function commitToGraph(proposal: PROPOSAL): Promise<void> {
  if (!noteAdapter || !connectionAdapter) {
    throw new Error(
      '[AXIOM] Graph adapters not set. Call setGraphAdapters() during app initialization.',
    );
  }

  // Track proposed → real ID mappings for edge resolution
  const createdIds = new Map<string, string>();

  // 1. Create nodes first
  for (const node of proposal.nodes) {
    try {
      const entity = await noteAdapter.create({
        type: 'note',
        subtype: 'ai-generated',
        title: node.title,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: node.content }],
          },
        ],
        metadata: {
          source: 'axiom-commit',
          ai_generated: true,
          axiom_correlation_id: proposal.correlationId,
          axiom_attempt: proposal.attempt,
          confidence: node.confidence,
        },
        position_x: 0,
        position_y: 0,
      });
      createdIds.set(node.id, entity.id);
    } catch (err) {
      console.error(`[AXIOM] Failed to create node "${node.title}":`, err);
    }
  }

  // 2. Create edges with resolved IDs
  for (const edge of proposal.edges) {
    // Resolve IDs: use fromId/toId if provided, otherwise look up created IDs by title
    const fromId = edge.fromId ?? createdIds.get(edge.fromTitle) ?? resolveExistingId(edge.fromTitle);
    const toId = edge.toId ?? createdIds.get(edge.toTitle) ?? resolveExistingId(edge.toTitle);

    if (!fromId || !toId) {
      console.warn(
        `[AXIOM] Cannot resolve edge: ${edge.fromTitle} -> ${edge.toTitle}`,
      );
      continue;
    }

    try {
      await connectionAdapter.create({
        source_id: fromId,
        target_id: toId,
        source_type: 'entity',
        target_type: 'entity',
        type: 'semantic',
        color: 'green',
        label: edge.label,
        confidence: edge.confidence,
        created_by: 'ai',
      });
    } catch (err) {
      console.error(
        `[AXIOM] Failed to create edge "${edge.fromTitle}" -> "${edge.toTitle}":`,
        err,
      );
    }
  }

  // 3. Refresh application state
  await refreshAppState();

  // 4. Run post-commit validation
  try {
    await runValidation();
  } catch (err) {
    console.warn('[AXIOM] Post-commit validation failed:', err);
  }
}

/**
 * Try to resolve an entity ID from existing notes by title.
 */
function resolveExistingId(title: string): string | undefined {
  const notes = appState$.entities.notes.peek();
  for (const note of Object.values(notes)) {
    if (note.title.toLowerCase() === title.toLowerCase()) {
      return note.id;
    }
  }
  return undefined;
}

/**
 * Refresh application state from adapters after commit.
 */
async function refreshAppState(): Promise<void> {
  if (!noteAdapter || !connectionAdapter) return;

  try {
    // Refresh notes
    const notes = await noteAdapter.getAll();
    const notesMap: Record<string, (typeof notes)[0]> = {};
    for (const note of notes) {
      notesMap[note.id] = note;
    }
    appState$.entities.notes.set(notesMap);
    appState$.entities.lastSync.set(new Date().toISOString());

    // Refresh connections
    const connections = await connectionAdapter.getAll();
    const connectionsMap: Record<string, (typeof connections)[0]> = {};
    for (const conn of connections) {
      connectionsMap[conn.id] = conn;
    }
    appState$.connections.items.set(connectionsMap);
    appState$.connections.lastSync.set(new Date().toISOString());
  } catch (err) {
    console.error('[AXIOM] Failed to refresh app state after commit:', err);
  }
}
