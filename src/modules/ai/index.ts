export * from './types';
export { getAIService, resetAIService, type IAIService } from './AIService';
export { AIProvider, useAI, useAIStatus, useOptionalAI } from './AIContext';
export { GeminiBackend } from './backends';
export { useEmbeddings, useOptionalEmbeddings, type UseEmbeddingsResult } from './hooks';
export { useIndexer, useOptionalIndexer, type UseIndexerResult } from './hooks';
export { useIdleDetection, type IdleDetectionOptions } from './hooks';
export { useSimilarNotes, useOptionalSimilarNotes, type SimilarNote, type UseSimilarNotesResult } from './hooks';
export {
  IndexerService,
  type IndexerStatus,
  type IndexerConfig,
} from './IndexerService';
