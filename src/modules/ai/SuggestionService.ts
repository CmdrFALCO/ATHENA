import type { IAIService } from './AIService';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { SuggestedConnection } from '@/store';

export interface SuggestionConfig {
  confidenceThreshold: number;
  maxPerNote: number;
}

export interface ISuggestionService {
  generateForNote(
    noteId: string,
    config?: Partial<SuggestionConfig>
  ): Promise<SuggestedConnection[]>;

  generateForCanvas(
    visibleNoteIds: string[],
    config?: Partial<SuggestionConfig>
  ): Promise<SuggestedConnection[]>;
}

const DEFAULT_CONFIG: SuggestionConfig = {
  confidenceThreshold: 0.7,
  maxPerNote: 5,
};

export class SuggestionService implements ISuggestionService {
  private aiService: IAIService;
  private connectionAdapter: IConnectionAdapter;
  private hasLoggedNotConfigured = false;

  constructor(aiService: IAIService, connectionAdapter: IConnectionAdapter) {
    this.aiService = aiService;
    this.connectionAdapter = connectionAdapter;
  }

  async generateForNote(
    noteId: string,
    config?: Partial<SuggestionConfig>
  ): Promise<SuggestedConnection[]> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Check if AI service is configured - silently return empty if not
    if (!this.aiService.isConfigured()) {
      // Only log once to avoid console spam
      if (!this.hasLoggedNotConfigured) {
        console.log('[SuggestionService] AI not configured, suggestions disabled');
        this.hasLoggedNotConfigured = true;
      }
      return [];
    }
    // Reset the flag when AI becomes configured
    this.hasLoggedNotConfigured = false;

    try {
      // Find similar notes using the AI service
      const similarNotes = await this.aiService.findSimilarNotes(
        noteId,
        mergedConfig.maxPerNote + 10, // Request extra to allow for filtering
        mergedConfig.confidenceThreshold
      );

      if (similarNotes.length === 0) {
        return [];
      }

      // Get existing connections for the source note to filter them out
      const existingConnections = await this.connectionAdapter.getConnectionsFor(noteId);
      const connectedIds = new Set<string>();
      for (const conn of existingConnections) {
        connectedIds.add(conn.source_id);
        connectedIds.add(conn.target_id);
      }

      // Filter out already-connected notes and create suggestions
      const suggestions: SuggestedConnection[] = [];
      const timestamp = new Date().toISOString();

      for (const result of similarNotes) {
        // Skip if already connected
        if (connectedIds.has(result.entity_id)) {
          continue;
        }

        // Skip self-connections (shouldn't happen, but be safe)
        if (result.entity_id === noteId) {
          continue;
        }

        suggestions.push({
          id: `suggestion-${noteId}-${result.entity_id}-${Date.now()}`,
          sourceId: noteId,
          targetId: result.entity_id,
          similarity: result.similarity,
          generatedAt: timestamp,
          status: 'pending',
        });

        // Stop if we have enough suggestions
        if (suggestions.length >= mergedConfig.maxPerNote) {
          break;
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate suggestions for note:', error);
      return [];
    }
  }

  async generateForCanvas(
    visibleNoteIds: string[],
    config?: Partial<SuggestionConfig>
  ): Promise<SuggestedConnection[]> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    if (visibleNoteIds.length === 0) {
      return [];
    }

    // Generate suggestions for each visible note
    const allSuggestions: SuggestedConnection[] = [];
    const seenPairs = new Set<string>();

    for (const noteId of visibleNoteIds) {
      const noteSuggestions = await this.generateForNote(noteId, mergedConfig);

      for (const suggestion of noteSuggestions) {
        // Avoid duplicate suggestions (A->B and B->A)
        const pairKey = [suggestion.sourceId, suggestion.targetId].sort().join('-');
        if (seenPairs.has(pairKey)) {
          continue;
        }
        seenPairs.add(pairKey);

        // Only include suggestions where the target is also visible
        if (visibleNoteIds.includes(suggestion.targetId)) {
          allSuggestions.push(suggestion);
        }
      }
    }

    // Sort by similarity (highest first) and limit total suggestions
    allSuggestions.sort((a, b) => b.similarity - a.similarity);

    // Limit total suggestions to prevent canvas clutter
    const maxTotalSuggestions = Math.min(
      mergedConfig.maxPerNote * 3,
      20
    );

    return allSuggestions.slice(0, maxTotalSuggestions);
  }
}

// Singleton instance (created lazily when needed)
let instance: SuggestionService | null = null;

export function getSuggestionService(
  aiService: IAIService,
  connectionAdapter: IConnectionAdapter
): SuggestionService {
  if (!instance) {
    instance = new SuggestionService(aiService, connectionAdapter);
  }
  return instance;
}

export function resetSuggestionService(): void {
  instance = null;
}
