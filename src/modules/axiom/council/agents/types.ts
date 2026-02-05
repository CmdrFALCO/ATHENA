/**
 * WP 9B.8: Council Agent Interfaces
 *
 * Each council agent takes an AgentInput and returns an AgentOutput.
 * Agent-specific inputs are provided via optional fields.
 */

import type { AgentRole } from '../types';

export interface ICouncilAgent {
  role: AgentRole;
  execute(input: AgentInput): Promise<AgentOutput>;
}

export interface AgentInput {
  query: string;
  context: string;
  /** For critic: generator's raw output */
  previousProposals?: string;
  /** For synthesizer: critic's raw output */
  critique?: string;
}

export interface AgentOutput {
  rawResponse: string;
  /** One-line summary for collapsed view */
  summary: string;
  durationMs: number;
}
