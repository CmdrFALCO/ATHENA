// Components
export { CommandPalette, SearchPanel, SearchResults, FacetSidebar } from './components';

// Hooks
export {
  useCommandPalette,
  type UseCommandPaletteReturn,
  type CommandPaletteResult,
  useKeywordSearch,
  type UseKeywordSearchReturn,
  useSemanticSearch,
  type UseSemanticSearchReturn,
  useHybridSearch,
  type UseHybridSearchReturn,
  useSearchPanel,
  type UseSearchPanelReturn,
} from './hooks';

// Services
export { KeywordSearchService, SemanticSearchService, HybridSearchService, FacetService } from './services';

// Types
export {
  type Facet,
  type FacetValue,
  type FacetSelection,
  type DateRangeBucket,
  DATE_BUCKET_LABELS,
} from './types';
