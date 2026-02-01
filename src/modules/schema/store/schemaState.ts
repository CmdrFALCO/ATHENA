import { observable } from '@legendapp/state';
import type { KnowledgeSchema } from '../types';

export interface SchemaState {
  /** All available schemas */
  schemas: KnowledgeSchema[];
  /** Whether schemas are loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** When schemas were last loaded */
  lastLoaded: string | null;
}

export const schemaState$ = observable<SchemaState>({
  schemas: [],
  loading: false,
  error: null,
  lastLoaded: null,
});

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_SCHEMA_STATE__ = schemaState$;
}
