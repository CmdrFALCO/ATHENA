// Types
export type {
  SimilarityWeights,
  SimilarityScores,
  NoteReference,
  CandidateStatus,
  MergeCandidate,
  MergeContentStrategy,
  MergeOptions,
  MergeResult,
  ScanProgress,
} from './types';

// Algorithms
export { jaroWinklerSimilarity, levenshteinSimilarity, computeSimilarityScores } from './algorithms';

// Adapter
export { SQLiteMergeCandidateAdapter, type IMergeCandidateAdapter } from './adapters/MergeCandidateAdapter';

// Services
export { SimilarityService } from './services/SimilarityService';
export { MergeService } from './services/MergeService';

// Store
export { similarityState$ } from './store/similarityState';
export { similarityActions, initSimilarityServices } from './store/similarityActions';

// Hooks
export { useMergeCandidates, useSimilaritySettings, useMerge, useSimilarityPanel } from './hooks';

// Components
export { MergeCandidatesPanel } from './components';
