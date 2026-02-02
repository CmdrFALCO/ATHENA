/**
 * Chat Integration — Connects AXIOM to Phase 7 ChatService
 *
 * Implements the real `regenerateProposal` placeholder by calling
 * ChatService.regenerate() with structured feedback.
 *
 * @module axiom/integration/chatIntegration
 */

import type { PROPOSAL } from '../types/colorSets';
import type { CorrectionFeedback } from '../types/feedback';
import { formatFeedbackForLLM } from '../types/feedback';
import { getChatService, isChatServiceReady } from '@/modules/chat/services/ChatService';

/**
 * Regenerate a proposal using ChatService with structured feedback.
 *
 * If ChatService is not available (not initialized), returns a copy
 * of the proposal with incremented attempt as a graceful fallback.
 */
export async function regenerateWithFeedback(
  proposal: PROPOSAL,
  feedback: CorrectionFeedback[],
): Promise<PROPOSAL> {
  // Check if ChatService is available
  if (!isChatServiceReady()) {
    console.warn(
      '[AXIOM] ChatService not initialized — returning proposal copy with incremented attempt',
    );
    return {
      ...proposal,
      attempt: proposal.attempt + 1,
      feedbackHistory: [...proposal.feedbackHistory, ...feedback],
      generatedAt: new Date().toISOString(),
    };
  }

  const chatService = getChatService();

  // Format feedback for the LLM
  const feedbackPrompt = formatFeedbackForLLM(feedback);

  // Call the new regenerate method on ChatService
  const regeneratedProposal = await chatService.regenerate(
    proposal.correlationId,
    feedbackPrompt,
    {
      originalProposal: proposal,
      feedbackHistory: feedback,
      attempt: proposal.attempt + 1,
    },
  );

  // Ensure feedback history is accumulated
  return {
    ...regeneratedProposal,
    correlationId: proposal.correlationId, // CRITICAL: preserve correlation
    feedbackHistory: [...proposal.feedbackHistory, ...feedback],
  };
}
