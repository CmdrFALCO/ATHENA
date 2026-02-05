/**
 * GeneratorAgent — WP 9B.8
 *
 * Takes user query + GraphRAG context + community summaries.
 * Calls the AI backend with a proposal-generating system prompt.
 * Returns raw proposals in athena-proposals JSON format.
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { ICouncilAgent, AgentInput, AgentOutput } from './types';
import { devSettings$ } from '@/config/devSettings';

const DEFAULT_GENERATOR_PROMPT = `You are The Scholar — the Generator agent in a Multi-Agent Council for ATHENA, a knowledge management system.

Your role is to analyze the user's query in the context of their existing knowledge graph and propose NEW knowledge nodes and connections.

## Your Task
1. Read the user's query carefully
2. Study the provided context from their knowledge graph
3. Study any community summaries for thematic context
4. Propose relevant knowledge nodes and connections

## Output Format
You MUST include a structured proposal block in your response. Use this exact format:

\`\`\`athena-proposals
{
  "nodes": [
    {
      "title": "Concept Name",
      "content": "Clear, atomic description of this concept. Self-contained and useful as a permanent note.",
      "suggestedConnections": ["Title of Related Note"],
      "confidence": 0.85
    }
  ],
  "edges": [
    {
      "fromTitle": "Source Concept",
      "toTitle": "Target Concept",
      "label": "relationship type",
      "rationale": "Why this connection exists",
      "confidence": 0.8
    }
  ]
}
\`\`\`

## Guidelines
- Propose selectively: only high-confidence concepts (>0.7)
- Each node should capture ONE clear, atomic concept
- Reference existing notes by title in suggestedConnections
- Explain connections with clear rationale
- Be thorough but avoid redundancy with existing knowledge`;

export class GeneratorAgent implements ICouncilAgent {
  readonly role = 'generator' as const;

  constructor(private aiBackend: IAIBackend) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    const systemPrompt =
      devSettings$.axiom.council?.agents?.generator?.systemPrompt?.peek() ||
      DEFAULT_GENERATOR_PROMPT;

    // Build the user prompt with context and community summaries
    let userPrompt = '';

    if (input.context) {
      userPrompt += `## Knowledge Graph Context\n${input.context}\n\n`;
    }

    userPrompt += `## User Query\n${input.query}`;

    const result = await this.aiBackend.generate(userPrompt, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    const durationMs = Date.now() - startTime;

    // Extract a one-line summary for the collapsed view
    const summary = this.extractSummary(result.text);

    return {
      rawResponse: result.text,
      summary,
      durationMs,
    };
  }

  private extractSummary(response: string): string {
    // Find the first non-empty line before the proposal block
    const lines = response.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('{')) {
        return trimmed.length > 100 ? trimmed.substring(0, 97) + '...' : trimmed;
      }
    }
    return 'Generated proposals';
  }
}
