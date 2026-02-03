/**
 * Agent interface for AXIOM workflow agents (WP 9B.1)
 *
 * Agents perform async work within transitions (e.g., LLM calls).
 * Each agent has a typed execute() method.
 *
 * @module axiom/agents/IAgent
 */

import type { AetherToken } from '../types/token';

export interface IAgent {
  readonly id: string;
  readonly name: string;
  execute(input: AgentInput): Promise<AgentOutput>;
}

export interface AgentInput {
  token: AetherToken<unknown>;
}

export interface AgentOutput {
  result: unknown;
  tokensUsed: number;
  model: string;
}
