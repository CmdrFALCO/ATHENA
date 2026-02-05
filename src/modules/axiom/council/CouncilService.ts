/**
 * CouncilService — Main orchestrator for the Multi-Agent Council
 * WP 9B.8
 *
 * Coordinates Generator → Critic → Synthesizer pipeline.
 * Emits CouncilEvents for progressive UI updates.
 * Returns KnowledgeProposals in the same format as ChatService.
 *
 * Singleton pattern matching ChatService and GlobalQueryService.
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { KnowledgeProposals } from '@/modules/chat/types';
import { extractProposals } from '@/modules/chat/services/ProposalParser';
import type { CouncilSession, AgentRole, CritiqueAnnotation } from './types';
import type { ICouncilAdapter } from '@/adapters/sqlite/SQLiteCouncilAdapter';
import { GeneratorAgent } from './agents/GeneratorAgent';
import { CriticAgent } from './agents/CriticAgent';
import { SynthesizerAgent } from './agents/SynthesizerAgent';
import { councilActions } from './councilActions';
import { councilState$ } from './councilState';
import { getCommunityDetectionService } from '@/modules/community/CommunityDetectionService';
import { devSettings$ } from '@/config/devSettings';

export class CouncilService {
  private generator: GeneratorAgent;
  private critic: CriticAgent;
  private synthesizer: SynthesizerAgent;

  constructor(
    private aiBackend: IAIBackend,
    private councilAdapter: ICouncilAdapter | null,
  ) {
    this.generator = new GeneratorAgent(aiBackend);
    this.critic = new CriticAgent(aiBackend);
    this.synthesizer = new SynthesizerAgent(aiBackend);
  }

  /**
   * Run a full council session.
   * Returns KnowledgeProposals compatible with chatActions.addMessage({ proposals }).
   */
  async runSession(
    query: string,
    contextText: string,
    contextNodeIds: string[],
  ): Promise<{
    proposals: KnowledgeProposals | null;
    councilConfidence: number;
    councilNotes: string[];
    displayContent: string;
  }> {
    // Guard: only one session at a time
    if (councilState$.activeSession.running.peek()) {
      throw new Error('A council session is already running');
    }

    const sessionId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    const agentTimings: Record<AgentRole, number> = {
      generator: 0,
      critic: 0,
      synthesizer: 0,
    };

    councilActions.startCouncil(sessionId);

    // Enrich context with community summaries
    const enrichedContext = await this.enrichWithCommunities(contextText, contextNodeIds);

    let generatorResponse = '';
    let criticResponse = '';
    let synthesizerResponse = '';
    let councilNotes: string[] = [];
    let proposals: KnowledgeProposals | null = null;
    let councilConfidence = 0;

    try {
      // ==============================
      // 1. Generator
      // ==============================
      if (!councilState$.activeSession.running.peek()) {
        throw new Error('Council cancelled');
      }

      councilActions.onCouncilEvent({ type: 'agent_start', agent: 'generator' });

      const genOutput = await this.generator.execute({
        query,
        context: enrichedContext,
      });

      generatorResponse = genOutput.rawResponse;
      agentTimings.generator = genOutput.durationMs;

      councilActions.onCouncilEvent({
        type: 'agent_complete',
        agent: 'generator',
        durationMs: genOutput.durationMs,
        summary: genOutput.summary,
      });

      // ==============================
      // 2. Critic
      // ==============================
      if (!councilState$.activeSession.running.peek()) {
        throw new Error('Council cancelled');
      }

      councilActions.onCouncilEvent({ type: 'agent_start', agent: 'critic' });

      let criticOutput;
      try {
        criticOutput = await this.critic.execute({
          query,
          context: enrichedContext,
          previousProposals: generatorResponse,
        });

        criticResponse = criticOutput.rawResponse;
        agentTimings.critic = criticOutput.durationMs;

        councilActions.onCouncilEvent({
          type: 'agent_complete',
          agent: 'critic',
          durationMs: criticOutput.durationMs,
          summary: criticOutput.summary,
        });
      } catch (err) {
        // Fail-safe: if critic fails, pass generator proposals through
        console.warn('[CouncilService] Critic failed, falling back:', err);
        criticResponse = '[Critic agent failed — proposals passed through without critique]';
        councilNotes.push('Critic agent failed; proposals were not critiqued');

        councilActions.onCouncilEvent({
          type: 'agent_complete',
          agent: 'critic',
          durationMs: 0,
          summary: 'Failed — skipped',
        });
      }

      // ==============================
      // 3. Synthesizer
      // ==============================
      if (!councilState$.activeSession.running.peek()) {
        throw new Error('Council cancelled');
      }

      councilActions.onCouncilEvent({ type: 'agent_start', agent: 'synthesizer' });

      const synthOutput = await this.synthesizer.execute({
        query,
        context: enrichedContext,
        previousProposals: generatorResponse,
        critique: criticResponse,
      });

      synthesizerResponse = synthOutput.rawResponse;
      agentTimings.synthesizer = synthOutput.durationMs;

      councilActions.onCouncilEvent({
        type: 'agent_complete',
        agent: 'synthesizer',
        durationMs: synthOutput.durationMs,
        summary: synthOutput.summary,
      });

      // ==============================
      // 4. Parse synthesizer output
      // ==============================
      const parseResult = extractProposals(synthesizerResponse);
      if (parseResult.success && parseResult.proposals) {
        proposals = parseResult.proposals;
      }

      // Extract council notes from synthesizer response
      councilNotes = [
        ...councilNotes,
        ...this.extractCouncilNotes(synthesizerResponse),
      ];

      // ==============================
      // 5. Compute councilVetted score
      // ==============================
      const annotations = this.critic.parseAnnotations(criticResponse);
      councilConfidence = this.computeCouncilVettedScore(annotations);

      // ==============================
      // 6. T_emit guard check: has proposals?
      // ==============================
      const totalDurationMs = Date.now() - startTime;

      if (proposals && (proposals.nodes.length > 0 || proposals.edges.length > 0)) {
        const droppedCount = this.countDropped(generatorResponse, proposals);

        councilActions.onCouncilEvent({
          type: 'proposals_ready',
          proposals,
          councilNotes,
        });

        // Persist session
        const session: CouncilSession = {
          id: sessionId,
          correlationId,
          query,
          contextNodeIds,
          generatorResponse,
          criticResponse,
          synthesizerResponse,
          proposalsCount: proposals.nodes.length + proposals.edges.length,
          droppedCount,
          totalDurationMs,
          agentTimings,
          councilNotes,
          createdAt: new Date().toISOString(),
        };

        await this.persistSession(session);

        councilActions.onCouncilEvent({
          type: 'council_complete',
          sessionId,
        });

        const displayContent = this.formatDisplayContent(proposals, councilConfidence, councilNotes, totalDurationMs);

        return { proposals, councilConfidence, councilNotes, displayContent };
      } else {
        // T_emit guard blocked — no proposals
        const reason = proposals
          ? 'All proposals were dropped during synthesis'
          : 'Synthesizer produced no valid proposals';

        councilActions.onCouncilEvent({
          type: 'council_empty',
          reason,
        });

        councilActions.onCouncilEvent({
          type: 'council_complete',
          sessionId,
        });

        // Still persist the session for auditing
        const session: CouncilSession = {
          id: sessionId,
          correlationId,
          query,
          contextNodeIds,
          generatorResponse,
          criticResponse,
          synthesizerResponse,
          proposalsCount: 0,
          droppedCount: 0,
          totalDurationMs,
          agentTimings,
          councilNotes: [...councilNotes, reason],
          createdAt: new Date().toISOString(),
        };

        await this.persistSession(session);

        return {
          proposals: null,
          councilConfidence: 0,
          councilNotes: [...councilNotes, reason],
          displayContent: `The Multi-Agent Council reviewed your query but ${reason.toLowerCase()}.`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      councilActions.onCouncilEvent({
        type: 'council_error',
        error: errorMessage,
      });

      throw error;
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Compute councilVetted confidence score from critique annotations.
   * 1.0 = critic accepted all
   * 0.7 = some challenged but synthesizer resolved
   * 0.5 = synthesizer preserved despite concerns
   * 0.3 = majority rejected
   */
  private computeCouncilVettedScore(annotations: CritiqueAnnotation[]): number {
    if (annotations.length === 0) {
      // No annotations (critic failed or returned nothing) — neutral
      return 0.7;
    }

    const total = annotations.length;
    const accepts = annotations.filter((a) => a.verdict === 'accept').length;
    const challenges = annotations.filter((a) => a.verdict === 'challenge').length;
    const rejects = annotations.filter((a) => a.verdict === 'reject').length;

    if (accepts === total) return 1.0;
    if (rejects === 0) return 0.7; // Some challenged but none rejected
    if (rejects < total / 2) return 0.5; // Minority rejected
    return 0.3; // Majority rejected
  }

  /** Enrich context with community summaries for relevant nodes. */
  private async enrichWithCommunities(
    contextText: string,
    contextNodeIds: string[],
  ): Promise<string> {
    if (contextNodeIds.length === 0) return contextText;

    try {
      const communityService = getCommunityDetectionService();
      if (!communityService) return contextText;

      const stats = await communityService.getStats();
      if (stats.totalCommunities === 0) return contextText;

      const hierarchy = await communityService.getHierarchy();
      if (!hierarchy) return contextText;

      // Find communities containing our context nodes
      const relevantCommunityIds = new Set<string>();
      for (const nodeId of contextNodeIds) {
        const communityIds = hierarchy.entityToCommunities.get(nodeId);
        if (communityIds) {
          for (const cid of communityIds) {
            relevantCommunityIds.add(cid);
          }
        }
      }

      if (relevantCommunityIds.size === 0) return contextText;

      // Collect summaries from level 0 (leaf) communities
      const allCommunities = Array.from(hierarchy.levels.values()).flat();
      const summaries: string[] = [];

      for (const community of allCommunities) {
        if (relevantCommunityIds.has(community.id) && community.summary) {
          summaries.push(
            `**${community.keywords?.join(', ') || 'Cluster'}** (Level ${community.level}): ${community.summary}`,
          );
        }
      }

      if (summaries.length === 0) return contextText;

      return `## Community Context\nThe following themes are relevant to the selected knowledge:\n${summaries.join('\n\n')}\n\n${contextText}`;
    } catch (err) {
      console.warn('[CouncilService] Community enrichment failed:', err);
      return contextText;
    }
  }

  /** Extract council notes from synthesizer response text. */
  private extractCouncilNotes(response: string): string[] {
    const notes: string[] = [];

    // Look for lines starting with "- " before the proposal block
    const proposalBlockStart = response.indexOf('```athena-proposals');
    const textBefore = proposalBlockStart >= 0
      ? response.substring(0, proposalBlockStart)
      : response;

    const lines = textBefore.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && trimmed.length > 3) {
        notes.push(trimmed.substring(2));
      }
    }

    return notes;
  }

  /** Count how many proposals the generator made that got dropped. */
  private countDropped(
    generatorResponse: string,
    finalProposals: KnowledgeProposals,
  ): number {
    const genResult = extractProposals(generatorResponse);
    if (!genResult.success || !genResult.proposals) return 0;

    const genCount =
      genResult.proposals.nodes.length + genResult.proposals.edges.length;
    const finalCount =
      finalProposals.nodes.length + finalProposals.edges.length;

    return Math.max(0, genCount - finalCount);
  }

  /** Format a human-readable summary for the chat message. */
  private formatDisplayContent(
    proposals: KnowledgeProposals,
    confidence: number,
    notes: string[],
    durationMs: number,
  ): string {
    const nodeCount = proposals.nodes.length;
    const edgeCount = proposals.edges.length;
    const parts: string[] = [];

    if (nodeCount > 0) parts.push(`${nodeCount} node${nodeCount !== 1 ? 's' : ''}`);
    if (edgeCount > 0) parts.push(`${edgeCount} connection${edgeCount !== 1 ? 's' : ''}`);

    let content = `The Multi-Agent Council reviewed your query and produced ${parts.join(' and ')} (consensus: ${Math.round(confidence * 100)}%, ${(durationMs / 1000).toFixed(1)}s).`;

    if (notes.length > 0) {
      content += '\n\n**Council Notes:**\n' + notes.map((n) => `- ${n}`).join('\n');
    }

    return content;
  }

  /** Persist a session, logging errors without throwing. */
  private async persistSession(session: CouncilSession): Promise<void> {
    councilActions.addPastSession(session);

    if (this.councilAdapter) {
      try {
        await this.councilAdapter.save(session);
      } catch (err) {
        console.warn('[CouncilService] Session persistence failed:', err);
      }
    }
  }

  /** Load past sessions from persistence into state. */
  async loadPastSessions(limit = 10): Promise<void> {
    if (!this.councilAdapter) return;

    try {
      const maxSessions = devSettings$.axiom.council?.ui?.maxPastSessions?.peek() ?? limit;
      const sessions = await this.councilAdapter.getRecent(maxSessions);
      councilActions.setPastSessions(sessions);
    } catch (err) {
      console.warn('[CouncilService] Failed to load past sessions:', err);
    }
  }
}

// ============================================
// Singleton Management
// ============================================

let councilServiceInstance: CouncilService | null = null;

export function initCouncilService(
  aiBackend: IAIBackend,
  adapter: ICouncilAdapter | null,
): CouncilService {
  councilServiceInstance = new CouncilService(aiBackend, adapter);

  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).__ATHENA_COUNCIL__ = councilServiceInstance;
  }

  console.log('[CouncilService] Initialized');
  return councilServiceInstance;
}

export function getCouncilService(): CouncilService | null {
  return councilServiceInstance;
}

export function isCouncilServiceReady(): boolean {
  return councilServiceInstance !== null;
}
