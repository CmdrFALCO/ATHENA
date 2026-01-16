// Interfaces
export type { INoteAdapter } from './INoteAdapter';
export type { IConnectionAdapter } from './IConnectionAdapter';
export type { IEmbeddingAdapter } from './IEmbeddingAdapter';
export type { IClusterAdapter } from './IClusterAdapter';
export type { ISearchAdapter, SearchResult, SearchOptions } from './ISearchAdapter';

// SQLite implementations
export { SQLiteNoteAdapter } from './sqlite/SQLiteNoteAdapter';
export { SQLiteConnectionAdapter } from './sqlite/SQLiteConnectionAdapter';
export { SQLiteEmbeddingAdapter } from './sqlite/SQLiteEmbeddingAdapter';
export { SQLiteClusterAdapter } from './sqlite/SQLiteClusterAdapter';
export { SQLiteSearchAdapter } from './sqlite/SQLiteSearchAdapter';

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
} from './hooks';
