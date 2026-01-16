import { createContext } from 'react';
import type { INoteAdapter } from './INoteAdapter';
import type { IConnectionAdapter } from './IConnectionAdapter';
import type { IEmbeddingAdapter } from './IEmbeddingAdapter';
import type { IClusterAdapter } from './IClusterAdapter';
import type { ISearchAdapter } from './ISearchAdapter';

export interface Adapters {
  notes: INoteAdapter;
  connections: IConnectionAdapter;
  embeddings: IEmbeddingAdapter;
  clusters: IClusterAdapter;
  search: ISearchAdapter;
}

export const AdapterContext = createContext<Adapters | null>(null);
