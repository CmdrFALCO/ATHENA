/**
 * SynthesizerAgent — WP 9B.8
 *
 * Takes generator's proposals + critic's annotations.
 * Produces refined proposals in athena-proposals format.
 * Includes councilNotes explaining what changed.
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { ICouncilAgent, AgentInput, AgentOutput } from './types';
import { devSettings$ } from '@/config/devSettings';

const DEFAULT_SYNTHESIZER_PROMPT = `You are The Mediator — the Synthesizer agent in a Multi-Agent Council for ATHENA, a knowledge management system.

Your role is to take the Generator's proposals and the Critic's feedback, then produce a final refined set of proposals that addresses all valid concerns.

## Your Task
1. Read the original proposals from The Scholar (Generator)
2. Read the critique from The Challenger (Critic)
3. For each proposal:
   - If accepted by critic: keep as-is (minor refinements OK)
   - If challenged: address the objections and refine
   - If rejected: drop unless you can salvage with significant changes
4. Produce the final proposal set

## Output Format
Include TWO sections in your response:

### 1. Council Notes
Start with a brief summary of changes made, as a list:
- "Kept node X as-is (critic accepted)"
- "Refined node Y: reduced confidence, clarified content per critic feedback"
- "Dropped edge Z: insufficient evidence as noted by critic"

### 2. Final Proposals
Then include the refined proposals in athena-proposals format:

\`\`\`athena-proposals
{
  "nodes": [
    {
      "title": "Concept Name",
      "content": "Refined description addressing critic feedback. [Council Note: refined from original based on critique]",
      "suggestedConnections": ["Related Note"],
      "confidence": 0.85
    }
  ],
  "edges": [
    {
      "fromTitle": "Source",
      "toTitle": "Target",
      "label": "relationship",
      "rationale": "Refined rationale. [Council Note: strengthened evidence per critique]",
      "confidence": 0.8
    }
  ]
}
\`\`\`

## Guidelines
- Preserve accepted proposals — don't over-edit what's already good
- Address ALL critic objections marked as "blocking" or "concern"
- Adjust confidence scores based on critique (lower if concerns remain)
- Include [Council Note: ...] in content/rationale to explain changes
- If all proposals are rejected, return empty nodes/edges arrays
- Be decisive — don't hedge. Either include a refined version or drop it`;

export class SynthesizerAgent implements ICouncilAgent {
  readonly role = 'synthesizer' as const;

  constructor(private aiBackend: IAIBackend) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    const systemPrompt =
      devSettings$.axiom.council?.agents?.synthesizer?.systemPrompt?.peek() ||
      DEFAULT_SYNTHESIZER_PROMPT;

    let userPrompt = '';

    if (input.context) {
      userPrompt += `## Existing Knowledge Context\n${input.context}\n\n`;
    }

    userPrompt += `## Original User Query\n${input.query}\n\n`;
    userPrompt += `## Generator's Proposals\n${input.previousProposals ?? '(none)'}\n\n`;
    userPrompt += `## Critic's Evaluation\n${input.critique ?? '(no critique available)'}`;

    const result = await this.aiBackend.generate(userPrompt, {
      systemPrompt,
      temperature: 0.5,
      maxTokens: 4096,
    });

    const durationMs = Date.now() - startTime;

    const summary = this.extractSummary(result.text);

    return {
      rawResponse: result.text,
      summary,
      durationMs,
    };
  }

  private extractSummary(response: string): string {
    // Count proposals in the output
    const nodeMatches = response.match(/"title"\s*:/g);
    const edgeMatches = response.match(/"fromTitle"\s*:/g);
    const nodeCount = nodeMatches?.length ?? 0;
    const edgeCount = edgeMatches?.length ?? 0;

    if (nodeCount === 0 && edgeCount === 0) {
      return 'No proposals survived synthesis';
    }

    const parts: string[] = [];
    if (nodeCount > 0) parts.push(`${nodeCount} node${nodeCount !== 1 ? 's' : ''}`);
    if (edgeCount > 0) parts.push(`${edgeCount} edge${edgeCount !== 1 ? 's' : ''}`);
    return `Synthesized ${parts.join(' and ')}`;
  }
}
