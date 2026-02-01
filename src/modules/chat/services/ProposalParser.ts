/**
 * Proposal Parser - Fast extraction path
 * WP 7.4 - Knowledge Extraction Parser
 *
 * Extracts athena-proposals JSON blocks from AI responses.
 * This is the "fast path" for well-formed JSON.
 * For malformed JSON, see SelfCorrectingExtractor.
 */

import type { KnowledgeProposals, EdgeProposal } from '../types';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import { RawProposalsSchema, formatZodErrors } from './proposalSchema';
import { preferenceActions } from '@/modules/ai/preferences/preferenceActions';

/**
 * Regex to find the athena-proposals code block
 * Matches: ```athena-proposals ... ``` with optional whitespace
 */
const PROPOSAL_BLOCK_REGEX = /```athena-proposals\s*([\s\S]*?)```/;

/**
 * Result of extraction attempt
 */
export interface ExtractionResult {
  success: boolean;
  proposals: KnowledgeProposals | null;
  error?: string;
  rawJson?: string;
}

/**
 * Extract proposals from AI response (fast path - single attempt)
 *
 * @param aiResponse - Full AI response text
 * @returns Extraction result with proposals or error
 */
export function extractProposals(aiResponse: string): ExtractionResult {
  // 1. Find the proposal block
  const match = aiResponse.match(PROPOSAL_BLOCK_REGEX);
  if (!match || !match[1]) {
    return {
      success: true, // No proposals is not an error
      proposals: null,
    };
  }

  const jsonString = match[1].trim();

  // 2. Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    return {
      success: false,
      proposals: null,
      error: `JSON parse error: ${message}`,
      rawJson: jsonString,
    };
  }

  // 3. Validate with Zod schema
  const validation = RawProposalsSchema.safeParse(parsed);
  if (!validation.success) {
    return {
      success: false,
      proposals: null,
      error: `Schema validation failed:\n${formatZodErrors(validation.error)}`,
      rawJson: jsonString,
    };
  }

  const raw = validation.data;

  // 4. Transform to full proposals with IDs and status
  const proposals: KnowledgeProposals = {
    nodes: raw.nodes.map(node => ({
      id: crypto.randomUUID(),
      title: node.title,
      content: node.content,
      suggestedConnections: node.suggestedConnections,
      confidence: node.confidence,
      status: 'pending' as const,
    })),
    edges: raw.edges.map(edge => ({
      id: crypto.randomUUID(),
      fromTitle: edge.fromTitle,
      toTitle: edge.toTitle,
      fromId: undefined,
      toId: undefined,
      label: edge.label,
      rationale: edge.rationale,
      confidence: edge.confidence,
      status: 'pending' as const,
    })),
  };

  // 5. Return null if no valid proposals
  if (proposals.nodes.length === 0 && proposals.edges.length === 0) {
    return {
      success: true,
      proposals: null,
    };
  }

  return {
    success: true,
    proposals,
  };
}

/**
 * Remove the proposal block from response for cleaner display
 *
 * @param aiResponse - Full AI response text
 * @returns Response with proposal block removed
 */
export function stripProposalBlock(aiResponse: string): string {
  return aiResponse.replace(PROPOSAL_BLOCK_REGEX, '').trim();
}

/**
 * Check if response contains a proposal block
 */
export function hasProposalBlock(aiResponse: string): boolean {
  return PROPOSAL_BLOCK_REGEX.test(aiResponse);
}

/**
 * Resolve proposal titles to existing node IDs
 *
 * This connects AI proposals to the existing knowledge graph by:
 * 1. Matching edge fromTitle/toTitle to existing notes
 * 2. Matching suggestedConnections to existing notes
 *
 * Uses case-insensitive matching.
 *
 * @param proposals - Proposals with titles
 * @param noteAdapter - Adapter to fetch notes
 * @param resourceAdapter - Adapter to fetch resources (optional)
 * @returns Proposals with resolved IDs
 */
export async function resolveProposalReferences(
  proposals: KnowledgeProposals,
  noteAdapter: INoteAdapter,
  resourceAdapter?: IResourceAdapter
): Promise<KnowledgeProposals> {
  // Build title -> ID map from existing notes
  const allNotes = await noteAdapter.getAll();
  const titleToId = new Map<string, string>();

  for (const note of allNotes) {
    titleToId.set(note.title.toLowerCase(), note.id);
  }

  // Optionally include resources
  if (resourceAdapter) {
    const allResources = await resourceAdapter.getAll();
    for (const resource of allResources) {
      // Don't overwrite notes with same name
      const key = resource.name.toLowerCase();
      if (!titleToId.has(key)) {
        titleToId.set(key, resource.id);
      }
    }
  }

  // Create a deep copy to avoid mutating original
  const resolved: KnowledgeProposals = {
    nodes: proposals.nodes.map(node => ({
      ...node,
      // Resolve suggestedConnections titles to IDs where possible
      suggestedConnections: node.suggestedConnections.map(title => {
        const id = titleToId.get(title.toLowerCase());
        return id || title; // Keep title if not found
      }),
    })),
    edges: proposals.edges.map(edge => ({
      ...edge,
      fromId: titleToId.get(edge.fromTitle.toLowerCase()),
      toId: titleToId.get(edge.toTitle.toLowerCase()),
    })),
  };

  return resolved;
}

/**
 * Apply learned confidence adjustments to proposals (WP 8.4)
 *
 * Uses historical accept/reject patterns to adjust AI confidence scores.
 * Safe to call even when preference learning is disabled (returns original proposals).
 */
export async function applyLearnedAdjustments(
  proposals: KnowledgeProposals
): Promise<KnowledgeProposals> {
  const adjustedNodes = await Promise.all(
    proposals.nodes.map(async (node) => {
      const adjustment = await preferenceActions.adjustNodeConfidence(
        node.confidence
      );
      return { ...node, confidence: adjustment.adjusted };
    })
  );

  const adjustedEdges = await Promise.all(
    proposals.edges.map(async (edge) => {
      const adjustment = await preferenceActions.adjustConnectionConfidence(
        edge.confidence
      );
      return { ...edge, confidence: adjustment.adjusted };
    })
  );

  return {
    nodes: adjustedNodes,
    edges: adjustedEdges,
  };
}

/**
 * Check if an edge proposal can be created
 * (both endpoints must resolve to existing nodes OR be proposed nodes)
 */
export function canCreateEdge(
  edge: EdgeProposal,
  proposedNodeTitles: string[]
): { canCreate: boolean; reason?: string } {
  const fromResolved = edge.fromId !== undefined;
  const toResolved = edge.toId !== undefined;

  const fromIsProposed = proposedNodeTitles.some(
    t => t.toLowerCase() === edge.fromTitle.toLowerCase()
  );
  const toIsProposed = proposedNodeTitles.some(
    t => t.toLowerCase() === edge.toTitle.toLowerCase()
  );

  const fromValid = fromResolved || fromIsProposed;
  const toValid = toResolved || toIsProposed;

  if (!fromValid && !toValid) {
    return {
      canCreate: false,
      reason: `Neither "${edge.fromTitle}" nor "${edge.toTitle}" exist in knowledge base`,
    };
  }

  if (!fromValid) {
    return {
      canCreate: false,
      reason: `"${edge.fromTitle}" not found in knowledge base`,
    };
  }

  if (!toValid) {
    return {
      canCreate: false,
      reason: `"${edge.toTitle}" not found in knowledge base`,
    };
  }

  return { canCreate: true };
}
