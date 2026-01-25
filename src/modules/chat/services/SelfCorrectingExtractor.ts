/**
 * Self-Correcting Extractor - Recovery path for malformed proposals
 * WP 7.4 - Knowledge Extraction Parser
 *
 * When the fast extraction path fails due to malformed JSON,
 * this extractor asks the LLM to fix its own errors based
 * on the error message. Based on PageIndex's fix_incorrect_toc pattern.
 */

import type { IAIService } from '@/modules/ai';
import type { KnowledgeProposals } from '../types';
import { extractProposals, hasProposalBlock } from './ProposalParser';

/**
 * Result of self-correcting extraction
 */
export interface SelfCorrectionResult {
  proposals: KnowledgeProposals | null;
  success: boolean;
  iterations: number;
  finalError?: string;
}

/**
 * Prompt for asking the LLM to fix malformed proposals
 */
const CORRECTION_PROMPT = `The previous response contained a malformed athena-proposals block that failed to parse.

Error details:
{error}

Original attempt:
\`\`\`
{rawJson}
\`\`\`

Please provide a corrected version. Output ONLY the fixed JSON inside an athena-proposals code block:

\`\`\`athena-proposals
{
  "nodes": [...],
  "edges": [...]
}
\`\`\`

Requirements:
- nodes[].title: non-empty string (required)
- nodes[].content: non-empty string (required)
- nodes[].suggestedConnections: array of strings (optional, defaults to [])
- nodes[].confidence: number 0-1 (optional, defaults to 0.8)
- edges[].fromTitle: non-empty string (required)
- edges[].toTitle: non-empty string (required)
- edges[].label: string (optional, defaults to "related to")
- edges[].rationale: string (optional, defaults to "")
- edges[].confidence: number 0-1 (optional, defaults to 0.8)

Output only the corrected JSON block, nothing else.`;

/**
 * Self-correcting extractor that retries with LLM feedback
 *
 * Based on PageIndex's fix_incorrect_toc pattern:
 * - Try to parse
 * - On failure, ask LLM to fix based on error message
 * - Retry up to maxIterations times
 */
export class SelfCorrectingExtractor {
  private aiService: IAIService;
  private maxIterations: number;

  constructor(
    aiService: IAIService,
    options: { maxIterations?: number } = {}
  ) {
    this.aiService = aiService;
    this.maxIterations = options.maxIterations ?? 3;
  }

  /**
   * Extract proposals with self-correction on failure
   *
   * @param aiResponse - Original AI response
   * @returns Extraction result with iteration count
   */
  async extract(aiResponse: string): Promise<SelfCorrectionResult> {
    // First, try the fast path
    let result = extractProposals(aiResponse);

    if (result.success) {
      return {
        proposals: result.proposals,
        success: true,
        iterations: 1,
      };
    }

    // If no proposal block at all, nothing to correct
    if (!hasProposalBlock(aiResponse)) {
      return {
        proposals: null,
        success: true,
        iterations: 1,
      };
    }

    // Self-correction loop
    let lastError = result.error || 'Unknown error';
    let lastRawJson = result.rawJson || '';
    let iterations = 1;

    while (iterations < this.maxIterations) {
      iterations++;

      console.log(`[SelfCorrectingExtractor] Attempt ${iterations}/${this.maxIterations}`);

      // Ask LLM to fix the error
      const correctionPrompt = CORRECTION_PROMPT
        .replace('{error}', lastError)
        .replace('{rawJson}', lastRawJson);

      try {
        const generateResult = await this.aiService.generate(correctionPrompt, {
          temperature: 0.3, // Lower temperature for more precise correction
          maxTokens: 1024,
        });

        // Try to parse the corrected response
        result = extractProposals(generateResult.text);

        if (result.success) {
          console.log(`[SelfCorrectingExtractor] Success on attempt ${iterations}`);
          return {
            proposals: result.proposals,
            success: true,
            iterations,
          };
        }

        // Update error for next iteration
        lastError = result.error || 'Unknown error';
        lastRawJson = result.rawJson || lastRawJson;

      } catch (error) {
        console.warn(`[SelfCorrectingExtractor] AI call failed:`, error);
        lastError = error instanceof Error ? error.message : 'AI call failed';
      }
    }

    // Exhausted retries
    console.warn(`[SelfCorrectingExtractor] Failed after ${iterations} attempts`);
    return {
      proposals: null,
      success: false,
      iterations,
      finalError: lastError,
    };
  }
}

// Singleton instance (initialized lazily with provided AIService)
let extractorInstance: SelfCorrectingExtractor | null = null;
let extractorAIService: IAIService | null = null;

export function getSelfCorrectingExtractor(aiService: IAIService): SelfCorrectingExtractor {
  // Reset if different AI service provided
  if (extractorInstance && extractorAIService !== aiService) {
    extractorInstance = null;
  }

  if (!extractorInstance) {
    extractorInstance = new SelfCorrectingExtractor(aiService);
    extractorAIService = aiService;
  }

  return extractorInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSelfCorrectingExtractor(): void {
  extractorInstance = null;
  extractorAIService = null;
}
