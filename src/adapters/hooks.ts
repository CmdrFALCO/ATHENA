import { useContext } from 'react';
import { AdapterContext, type Adapters } from './context';
import type { INoteAdapter } from './INoteAdapter';
import type { IConnectionAdapter } from './IConnectionAdapter';
import type { IEmbeddingAdapter } from './IEmbeddingAdapter';
import type { IClusterAdapter } from './IClusterAdapter';

export function useAdapters(): Adapters {
  const ctx = useContext(AdapterContext);
  if (!ctx) {
    throw new Error('useAdapters must be used within AdapterProvider');
  }
  return ctx;
}

export function useNoteAdapter(): INoteAdapter {
  return useAdapters().notes;
}

export function useConnectionAdapter(): IConnectionAdapter {
  return useAdapters().connections;
}

export function useEmbeddingAdapter(): IEmbeddingAdapter {
  return useAdapters().embeddings;
}

export function useClusterAdapter(): IClusterAdapter {
  return useAdapters().clusters;
}
