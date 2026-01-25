/**
 * useMentions - Hook for @mention parsing and note search
 * WP 7.6 - Spatial Awareness
 *
 * Provides fuzzy search over notes for autocomplete suggestions
 * when the user types @ in the chat input.
 */

import { useMemo, useCallback } from 'react';
import { useNotes } from '@/store/hooks';
import { chatActions } from '../store/chatActions';

export interface MentionSuggestion {
  id: string;
  title: string;
  type: string;
}

interface UseMentionsOptions {
  /** Maximum number of suggestions to show */
  maxSuggestions?: number;
  /** Minimum query length before searching */
  minQueryLength?: number;
}

/**
 * Hook for managing @mentions in chat input
 *
 * @param query - The current search query (text after @)
 * @param options - Configuration options
 * @returns suggestions array and addToContext function
 */
export function useMentions(
  query: string,
  options: UseMentionsOptions = {}
): { suggestions: MentionSuggestion[]; addToContext: (nodeId: string) => void } {
  const { maxSuggestions = 8, minQueryLength = 0 } = options;
  const notes = useNotes();

  const suggestions = useMemo((): MentionSuggestion[] => {
    // Return empty if query too short (but allow empty query to show recent)
    if (query.length < minQueryLength && query.length > 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();

    // If no query, show recent notes (by updated_at)
    if (!lowerQuery) {
      return notes
        .slice() // Clone to avoid mutating
        .sort((a, b) => {
          const aDate = a.updated_at || a.created_at || '';
          const bDate = b.updated_at || b.created_at || '';
          return bDate.localeCompare(aDate);
        })
        .slice(0, maxSuggestions)
        .map((note) => ({
          id: note.id,
          title: note.title,
          type: note.type,
        }));
    }

    // Score notes by relevance to query
    const scored = notes.map((note) => {
      const title = note.title.toLowerCase();
      let score = 0;

      // Exact match at start gets highest score
      if (title.startsWith(lowerQuery)) {
        score = 100;
      }
      // Word boundary match
      else if (title.includes(` ${lowerQuery}`)) {
        score = 80;
      }
      // Contains match
      else if (title.includes(lowerQuery)) {
        score = 60;
      }
      // Fuzzy: all characters in order
      else if (fuzzyMatch(lowerQuery, title)) {
        score = 40;
      }

      return { note, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map((s) => ({
        id: s.note.id,
        title: s.note.title,
        type: s.note.type,
      }));
  }, [notes, query, maxSuggestions, minQueryLength]);

  const addToContext = useCallback((nodeId: string) => {
    chatActions.addToContext(nodeId);
  }, []);

  return { suggestions, addToContext };
}

/**
 * Simple fuzzy match: all characters of query appear in target in order
 */
function fuzzyMatch(query: string, target: string): boolean {
  let queryIndex = 0;

  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === query.length;
}
