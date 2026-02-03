/**
 * DevilsAdvocateAgent — AI-powered critique agent (WP 9B.1)
 *
 * Stress-tests proposals before they enter the knowledge graph.
 * Generates counter-arguments, identifies blind spots, and adjusts
 * confidence scores based on weighted survival scoring.
 *
 * @module axiom/agents/DevilsAdvocateAgent
 */

import type { IAIBackend, GenerateResult } from '@/modules/ai/types';
import type { IAgent, AgentInput, AgentOutput } from './IAgent';
import type { PROPOSAL } from '../types/colorSets';
import type {
  CRITIQUE_RESULT,
  CounterArgument,
  RiskFactor,
  CritiqueBehaviorConfig,
} from '../types/critique';
import { calculateSurvivalScore, adjustConfidence } from '../types/critique';

/** Raw response shape expected from the LLM */
interface CritiqueRawResponse {
  counterArguments?: CounterArgument[];
  blindSpots?: string[];
  riskFactors?: RiskFactor[];
}

/** System prompt instructs the LLM to be thorough but constructive */
const CRITIQUE_SYSTEM_PROMPT = `You are a Devil's Advocate agent in the ATHENA knowledge management system.

Your role is to stress-test AI-generated proposals BEFORE they enter the knowledge graph. You are not hostile — you are thorough. Your goal is to catch:

- Vague or generic connections that don't add real value
- Factual claims that may be inaccurate or misleading
- Redundant information that already exists in the graph
- Missing context that would change the meaning
- Overly broad or overly narrow scope

Be specific and constructive. Reference actual proposal content in your arguments.

Assign survival scores honestly:
- 1.0 = No issue found, this is solid
- 0.7-0.9 = Minor concern, should proceed with note
- 0.4-0.6 = Moderate concern, needs human review
- 0.1-0.3 = Major concern, likely should not be committed
- 0.0 = Critical flaw, definitely should not be committed

Always return valid JSON. No markdown fences.`;

export class DevilsAdvocateAgent implements IAgent {
  readonly id = 'devils-advocate';
  readonly name = "Devil's Advocate";

  constructor(
    private aiBackend: IAIBackend,
    private config: CritiqueBehaviorConfig,
  ) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const { token } = input;
    const proposal = token.payload as PROPOSAL;
    const startTime = Date.now();

    const prompt =
      this.config.scope === 'batch'
        ? this.buildBatchPrompt(proposal)
        : this.buildIndividualPrompt(proposal);

    const response: GenerateResult = await this.aiBackend.generate(prompt, {
      systemPrompt: CRITIQUE_SYSTEM_PROMPT,
      temperature: this.config.temperature,
    });

    const critiqueRaw = this.parseResponse(response.text);

    // Limit counter-arguments to configured max
    if (critiqueRaw.counterArguments && critiqueRaw.counterArguments.length > this.config.maxCounterArguments) {
      critiqueRaw.counterArguments = critiqueRaw.counterArguments.slice(0, this.config.maxCounterArguments);
    }

    const counterArguments = critiqueRaw.counterArguments ?? [];
    const survivalScore = calculateSurvivalScore(counterArguments);

    // Compute max confidence from individual node/edge proposals
    const nodeConfidences = (proposal.nodes ?? []).map((n) => n.confidence ?? 0);
    const edgeConfidences = (proposal.edges ?? []).map((e) => e.confidence ?? 0);
    const maxConfidence = Math.max(0, ...nodeConfidences, ...edgeConfidences);
    const adjustedConf = adjustConfidence(maxConfidence, survivalScore);

    let recommendation: CRITIQUE_RESULT['recommendation'];
    if (survivalScore >= this.config.survivalThreshold) {
      recommendation = 'proceed';
    } else if (survivalScore >= this.config.rejectThreshold) {
      recommendation = 'reconsider';
    } else {
      recommendation = 'reject';
    }

    const durationMs = Date.now() - startTime;

    const result: CRITIQUE_RESULT = {
      proposalId: proposal.id,
      correlationId: proposal.correlationId,
      scope: this.config.scope,
      survived: recommendation === 'proceed',
      survivalScore,
      adjustedConfidence: adjustedConf,
      counterArguments,
      blindSpots: critiqueRaw.blindSpots ?? [],
      riskFactors: critiqueRaw.riskFactors ?? [],
      recommendation,
      critiquedAt: new Date().toISOString(),
      critiqueModel: response.model,
      durationMs,
    };

    return {
      result,
      tokensUsed: response.tokenCount?.total ?? 0,
      model: response.model,
    };
  }

  private buildBatchPrompt(proposal: PROPOSAL): string {
    const nodesSection = (proposal.nodes ?? [])
      .map((n) => `- [${n.id}] "${n.title}" (confidence: ${n.confidence})`)
      .join('\n');

    const edgesSection = (proposal.edges ?? [])
      .map((e) => `- [${e.id}] "${e.fromTitle}" —[${e.label}]→ "${e.toTitle}" (confidence: ${e.confidence})`)
      .join('\n');

    return `You are a critical analyst stress-testing a batch of proposed knowledge graph changes.

## Proposed Changes
### New Nodes (${proposal.nodes?.length ?? 0}):
${nodesSection || '(none)'}

### New Connections (${proposal.edges?.length ?? 0}):
${edgesSection || '(none)'}

## Your Task
Critique this batch as a whole. Look for:
1. **Systemic issues**: Do all connections follow the same weak pattern?
2. **Missing perspectives**: What important relationships are absent?
3. **Redundancy**: Are any proposed items near-duplicates of existing knowledge?
4. **Coherence**: Do the proposed changes form a coherent addition to the graph?
5. **Scope**: Are the proposals too broad or too narrow?

For each counter-argument, assign:
- target: "node" or "edge"
- targetId: the specific item ID
- targetLabel: a human-readable label for the item
- severity: "minor", "moderate", or "major"
- survivalScore: 0.0-1.0 (how well the item survives your challenge)

Return JSON:
{
  "counterArguments": [{ "target": "...", "targetId": "...", "targetLabel": "...", "argument": "...", "severity": "...", "survivalScore": 0.0 }],
  "blindSpots": ["..."],
  "riskFactors": [{ "category": "accuracy|completeness|coherence|redundancy|scope", "description": "...", "severity": "low|medium|high" }]
}`;
  }

  private buildIndividualPrompt(proposal: PROPOSAL): string {
    const nodesSection = (proposal.nodes ?? [])
      .map((n) => `- [${n.id}] "${n.title}": ${n.content?.substring(0, 200) ?? 'no content'} (confidence: ${n.confidence})`)
      .join('\n');

    const edgesSection = (proposal.edges ?? [])
      .map((e) => `- [${e.id}] "${e.fromTitle}" —[${e.label}]→ "${e.toTitle}": ${e.rationale ?? 'no rationale'} (confidence: ${e.confidence})`)
      .join('\n');

    return `You are a critical analyst stress-testing individual knowledge graph proposals.

## Proposed Changes
### Nodes:
${nodesSection || '(none)'}

### Connections:
${edgesSection || '(none)'}

## Your Task
Critique EACH item individually. For every proposed node and connection, ask:
1. **Accuracy**: Is this claim/relationship actually true?
2. **Specificity**: Is this too vague or generic to be useful?
3. **Novelty**: Does this add new information, or duplicate existing knowledge?
4. **Justification**: Is the connection type appropriate? Is the relationship meaningful?

For each counter-argument, assign:
- target: "node" or "edge"
- targetId: the specific item ID
- targetLabel: a human-readable label for the item
- severity: "minor", "moderate", or "major"
- survivalScore: 0.0-1.0 (how well the item survives your challenge; 1.0 = no issue found)

Items with no issues should still appear with survivalScore: 1.0.

Return JSON:
{
  "counterArguments": [{ "target": "...", "targetId": "...", "targetLabel": "...", "argument": "...", "severity": "...", "survivalScore": 0.0 }],
  "blindSpots": ["..."],
  "riskFactors": [{ "category": "accuracy|completeness|coherence|redundancy|scope", "description": "...", "severity": "low|medium|high" }]
}`;
  }

  /**
   * Parse LLM response, handling both raw JSON and markdown-fenced JSON.
   */
  private parseResponse(text: string): CritiqueRawResponse {
    // Try direct JSON parse first
    try {
      return JSON.parse(text) as CritiqueRawResponse;
    } catch {
      // Try extracting JSON from markdown fences
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        try {
          return JSON.parse(fenceMatch[1].trim()) as CritiqueRawResponse;
        } catch {
          // Fall through to empty result
        }
      }

      console.warn('[DevilsAdvocateAgent] Failed to parse critique response, returning empty result');
      return {
        counterArguments: [],
        blindSpots: [],
        riskFactors: [],
      };
    }
  }
}
