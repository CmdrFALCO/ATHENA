import { createContext } from 'react';
import type { INoteAdapter } from './INoteAdapter';
import type { IConnectionAdapter } from './IConnectionAdapter';
import type { IEmbeddingAdapter } from './IEmbeddingAdapter';
import type { IClusterAdapter } from './IClusterAdapter';

export interface Adapters {
  notes: INoteAdapter;
  connections: IConnectionAdapter;
  embeddings: IEmbeddingAdapter;
  clusters: IClusterAdapter;
}

export const AdapterContext = createContext<Adapters | null>(null);
