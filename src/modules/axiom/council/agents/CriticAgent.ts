/**
 * CriticAgent — WP 9B.8
 *
 * Takes generator's raw output, evaluates each proposal,
 * returns structured CritiqueAnnotation[] parsed from JSON.
 * Fail-safe: if JSON parse fails, treats all proposals as 'accept'.
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { ICouncilAgent, AgentInput, AgentOutput } from './types';
import { devSettings$ } from '@/config/devSettings';

const DEFAULT_CRITIC_PROMPT = `You are The Challenger — the Critic agent in a Multi-Agent Council for ATHENA, a knowledge management system.

Your role is to rigorously evaluate proposals from The Scholar (Generator agent). You are the adversarial voice that ensures only high-quality, well-supported knowledge enters the graph.

## Your Task
1. Review each proposed node and edge from the Generator
2. For each proposal, provide a verdict and structured critique
3. Be thorough but fair — reject only when justified

## Output Format
Return a JSON array of critique annotations. Use this exact format:

\`\`\`json
[
  {
    "proposalIndex": 0,
    "verdict": "accept",
    "objections": [],
    "severity": "minor",
    "suggestion": null
  },
  {
    "proposalIndex": 1,
    "verdict": "challenge",
    "objections": ["Overlaps significantly with existing note 'X'", "Confidence seems too high for speculative claim"],
    "severity": "concern",
    "suggestion": "Merge with existing note or reduce confidence to 0.6"
  },
  {
    "proposalIndex": 2,
    "verdict": "reject",
    "objections": ["No evidence in context to support this connection", "Edge rationale is circular"],
    "severity": "blocking",
    "suggestion": "Remove this edge entirely"
  }
]
\`\`\`

## Verdict Meanings
- **accept**: Proposal is sound, well-supported, and adds value
- **challenge**: Proposal has merit but needs refinement or has concerns
- **reject**: Proposal is unsupported, redundant, or harmful to graph quality

## Severity Levels
- **minor**: Small issue, can be accepted as-is
- **concern**: Worth addressing but not a deal-breaker
- **blocking**: Must be resolved before acceptance

## Guidelines
- Evaluate EVERY proposal (nodes and edges, in order)
- Check for redundancy with existing knowledge in context
- Verify connections have sufficient evidence
- Flag speculative claims with appropriate severity
- Be specific in objections — vague criticism is not helpful`;

export class CriticAgent implements ICouncilAgent {
  readonly role = 'critic' as const;

  constructor(private aiBackend: IAIBackend) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    const systemPrompt =
      devSettings$.axiom.council?.agents?.critic?.systemPrompt?.peek() ||
      DEFAULT_CRITIC_PROMPT;

    let userPrompt = '';

    if (input.context) {
      userPrompt += `## Existing Knowledge Context\n${input.context}\n\n`;
    }

    userPrompt += `## Original User Query\n${input.query}\n\n`;
    userPrompt += `## Proposals to Evaluate\n${input.previousProposals ?? '(none)'}`;

    const result = await this.aiBackend.generate(userPrompt, {
      systemPrompt,
      temperature: 0.3,
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
    // Try to count verdicts from the JSON
    try {
      const parsed = this.parseAnnotations(response);
      const accepts = parsed.filter((a) => a.verdict === 'accept').length;
      const challenges = parsed.filter((a) => a.verdict === 'challenge').length;
      const rejects = parsed.filter((a) => a.verdict === 'reject').length;
      const parts: string[] = [];
      if (accepts > 0) parts.push(`${accepts} accepted`);
      if (challenges > 0) parts.push(`${challenges} challenged`);
      if (rejects > 0) parts.push(`${rejects} rejected`);
      return parts.length > 0 ? parts.join(', ') : 'Critique complete';
    } catch {
      return 'Critique complete';
    }
  }

  /**
   * Parse CritiqueAnnotation[] from the critic's response.
   * Exported for use by CouncilService.
   */
  parseAnnotations(response: string): Array<{
    proposalIndex: number;
    verdict: 'accept' | 'challenge' | 'reject';
    objections: string[];
    severity: 'blocking' | 'concern' | 'minor';
    suggestion?: string;
  }> {
    // Try to find JSON in the response (with or without markdown fences)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();

    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed.map((item, i) => ({
          proposalIndex: typeof item.proposalIndex === 'number' ? item.proposalIndex : i,
          verdict: ['accept', 'challenge', 'reject'].includes(item.verdict)
            ? item.verdict
            : 'accept',
          objections: Array.isArray(item.objections) ? item.objections : [],
          severity: ['blocking', 'concern', 'minor'].includes(item.severity)
            ? item.severity
            : 'minor',
          suggestion: item.suggestion ?? undefined,
        }));
      }
    } catch {
      // Fall through to fail-safe
    }

    // Fail-safe: if parsing fails, accept everything with a warning
    console.warn('[CriticAgent] Failed to parse critique annotations, defaulting to accept-all');
    return [];
  }
}
