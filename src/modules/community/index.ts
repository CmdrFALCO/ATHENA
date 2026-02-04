/**
 * Community Detection Module — WP 9B.7
 * Hierarchical Louvain clustering with LLM summaries and global queries.
 */

// Types
export type {
  Community,
  CommunityHierarchy,
  CommunitySearchResult,
  CommunityDetectionConfig,
  CommunityStats,
  IClusteringAlgorithm,
} from './types';

// Algorithms
export { LouvainAlgorithm } from './algorithms/LouvainAlgorithm';

// Services
export { GraphConverter } from './GraphConverter';
export { CommunitySummaryService } from './CommunitySummaryService';
export {
  CommunityDetectionService,
  initCommunityDetectionService,
  getCommunityDetectionService,
} from './CommunityDetectionService';
export { CommunitySearchService } from './CommunitySearchService';
export {
  GlobalQueryService,
  initGlobalQueryService,
  getGlobalQueryService,
} from './GlobalQueryService';

// Hooks
export { useCommunities, useCommunityColorForEntity, communityState$ } from './hooks/useCommunities';
export { useCommunityPanel } from './hooks/useCommunityPanel';

// Components
export { CommunityPanel } from './components/CommunityPanel';
export { CommunityTree } from './components/CommunityTree';
export { CommunityCard } from './components/CommunityCard';
