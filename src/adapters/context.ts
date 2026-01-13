import { createContext } from 'react';
import type { INoteAdapter } from './INoteAdapter';
import type { IConnectionAdapter } from './IConnectionAdapter';
import type { IEmbeddingAdapter } from './IEmbeddingAdapter';

export interface Adapters {
  notes: INoteAdapter;
  connections: IConnectionAdapter;
  embeddings: IEmbeddingAdapter;
}

export const AdapterContext = createContext<Adapters | null>(null);
