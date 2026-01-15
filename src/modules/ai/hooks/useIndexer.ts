import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from '@legendapp/state/react';
import { IndexerService, type IndexerStatus, type IndexerConfig } from '../IndexerService';
import { useOptionalAI } from '../AIContext';
import { useAdapters } from '@/adapters';
import { devSettings$ } from '@/config';
import { DEFAULT_AI_SETTINGS, type AISettings } from '../types';

const DEFAULT_INDEXER_STATUS: IndexerStatus = {
  isRunning: false,
  mode: 'idle',
  queue: [],
  processed: 0,
  failed: 0,
  lastIndexedAt: null,
  currentEntityId: null,
};

export interface UseIndexerResult {
  status: IndexerStatus;
  onNoteSaved: (noteId: string, content: string) => void;
  indexNote: (noteId: string) => Promise<boolean>;
  indexAll: () => Promise<{ success: number; failed: number }>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isEnabled: boolean;
}

export function useIndexer(): UseIndexerResult {
  const ai = useOptionalAI();
  const adapters = useAdapters();

  // Get primitive values from devSettings to avoid object reference issues
  const enableAI = useSelector(() => devSettings$.flags.enableAI.get());
  const aiBackend = useSelector(() => devSettings$.flags.aiBackend.get());

  // Get AI settings (suggestions.trigger)
  const aiSettings: AISettings = {
    ...DEFAULT_AI_SETTINGS,
    enabled: enableAI,
    provider: aiBackend,
  };

  const indexerRef = useRef<IndexerService | null>(null);
  const [status, setStatus] = useState<IndexerStatus>(DEFAULT_INDEXER_STATUS);

  const isEnabled = aiSettings.enabled && aiSettings.provider !== 'none';
  const triggerMode = aiSettings.suggestions.trigger;

  // Initialize indexer
  useEffect(() => {
    if (!ai?.service || !adapters.embeddings || !adapters.notes) {
      indexerRef.current = null;
      return;
    }

    const indexer = new IndexerService(ai.service, adapters.embeddings, adapters.notes, {
      trigger: triggerMode,
      debounceMs: 2000,
      batchSize: 5,
      idleDelayMs: 3000,
    } satisfies Partial<IndexerConfig>);

    indexer.setStatusCallback(setStatus);
    indexerRef.current = indexer;

    // Start continuous mode if configured and AI is enabled
    if (triggerMode === 'continuous' && isEnabled) {
      indexer.startContinuousMode();
    }

    return () => {
      indexer.stop();
      indexerRef.current = null;
    };
  }, [ai?.service, adapters.embeddings, adapters.notes, triggerMode, isEnabled]);

  // Update config when settings change
  useEffect(() => {
    indexerRef.current?.updateConfig({
      trigger: triggerMode,
    });
  }, [triggerMode]);

  // Callback for when a note is saved
  const onNoteSaved = useCallback(
    (noteId: string, content: string) => {
      if (!isEnabled) return;
      indexerRef.current?.onNoteSaved(noteId, content);
    },
    [isEnabled]
  );

  // Manual index single note
  const indexNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (!isEnabled) return false;
      return (await indexerRef.current?.indexNote(noteId)) ?? false;
    },
    [isEnabled]
  );

  // Index all unembedded notes
  const indexAll = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!isEnabled) return { success: 0, failed: 0 };
    return (await indexerRef.current?.indexAllUnembedded()) ?? { success: 0, failed: 0 };
  }, [isEnabled]);

  // Pause/resume for user activity detection
  const pause = useCallback(() => {
    indexerRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    indexerRef.current?.resume();
  }, []);

  const stop = useCallback(() => {
    indexerRef.current?.stop();
  }, []);

  return {
    status,
    onNoteSaved,
    indexNote,
    indexAll,
    pause,
    resume,
    stop,
    isEnabled,
  };
}

// Optional hook that returns null when outside of the proper context
export function useOptionalIndexer(): UseIndexerResult | null {
  try {
    return useIndexer();
  } catch {
    return null;
  }
}
