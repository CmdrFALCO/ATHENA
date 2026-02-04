// Interfaces
export type { INoteAdapter } from './INoteAdapter';
export type { IConnectionAdapter } from './IConnectionAdapter';
export type { IEmbeddingAdapter } from './IEmbeddingAdapter';
export type { IClusterAdapter } from './IClusterAdapter';
export type { ISearchAdapter, SearchResult, ResourceSearchResult, SearchOptions, HybridSearchOptions } from './ISearchAdapter';
export type { IResourceAdapter } from './IResourceAdapter';
export type { ICommunityAdapter } from './ICommunityAdapter';

// SQLite implementations
export { SQLiteNoteAdapter } from './sqlite/SQLiteNoteAdapter';
export { SQLiteConnectionAdapter } from './sqlite/SQLiteConnectionAdapter';
export { SQLiteEmbeddingAdapter } from './sqlite/SQLiteEmbeddingAdapter';
export { SQLiteClusterAdapter } from './sqlite/SQLiteClusterAdapter';
export { SQLiteSearchAdapter } from './sqlite/SQLiteSearchAdapter';
export { SQLiteResourceAdapter } from './sqlite/SQLiteResourceAdapter';
export { SQLiteCommunityAdapter } from './sqlite/SQLiteCommunityAdapter';

// Provider and types
export { AdapterProvider } from './AdapterProvider';
export type { Adapters } from './context';

// Hooks
export {
  useAdapters,
  useNoteAdapter,
  useConnectionAdapter,
  useEmbeddingAdapter,
  useClusterAdapter,
  useSearchAdapter,
  useResourceAdapter,
  useCommunityAdapter,
} from './hooks';
