/**
 * Zod schemas for proposal validation
 * WP 7.4 - Knowledge Extraction Parser
 *
 * Defines schemas for validating AI-generated proposal JSON.
 * Raw schemas represent AI output (no ID/status).
 * Full types with ID/status are in ../types/index.ts.
 */

import { z } from 'zod';

/**
 * Schema for raw AI proposal output (before we add IDs and status)
 */
export const RawNodeProposalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  suggestedConnections: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
});

export const RawEdgeProposalSchema = z.object({
  fromTitle: z.string().min(1, 'fromTitle is required'),
  toTitle: z.string().min(1, 'toTitle is required'),
  label: z.string().default('related to'),
  rationale: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.8),
});

export const RawProposalsSchema = z.object({
  nodes: z.array(RawNodeProposalSchema).default([]),
  edges: z.array(RawEdgeProposalSchema).default([]),
});

export type RawNodeProposal = z.infer<typeof RawNodeProposalSchema>;
export type RawEdgeProposal = z.infer<typeof RawEdgeProposalSchema>;
export type RawProposals = z.infer<typeof RawProposalsSchema>;

/**
 * Format Zod errors into a readable string for LLM feedback
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
    .join('\n');
}
