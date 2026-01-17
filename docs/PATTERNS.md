# Code Patterns

This document describes the key patterns used throughout the ATHENA codebase with examples and guidance on when to use each pattern.

---

## Table of Contents

1. [Database Singleton](#database-singleton)
2. [Adapter Pattern](#adapter-pattern)
3. [Bi-temporal Data](#bi-temporal-data)
4. [Dependency Injection](#dependency-injection)
5. [Observable State](#observable-state)
6. [N-way Relationships (Clusters)](#n-way-relationships)
7. [Secure Storage](#secure-storage)
8. [AI Backend Abstraction](#ai-backend-abstraction)
9. [Embedding Storage](#embedding-storage)
10. [Background Indexer](#background-indexer)
11. [Global Event Broadcasting](#global-event-broadcasting)
12. [Faceted Search](#faceted-search)

---

## Database Singleton

**Location:** `src/database/init.ts`

**Purpose:** Ensure single database instance with lazy initialization.

### Implementation

```typescript
// src/database/init.ts
let dbInstance: DatabaseConnection | null = null;

export async function initDatabase(): Promise<DatabaseConnection> {
  if (dbInstance) {
    return dbInstance;
  }

  // Initialize SQL.js WASM
  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });

  dbInstance = new SQL.Database();

  // Run migrations
  await runMigrations(dbInstance);

  return dbInstance;
}

export function getDatabase(): DatabaseConnection {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}
```

### Usage

```typescript
import { initDatabase, getDatabase } from '@/database';

// At app startup
await initDatabase();

// In adapters/services
const db = getDatabase();
await db.run('INSERT INTO entities ...', [params]);
```

### When to Use

- Single shared resource that needs initialization
- Resources that should persist across component remounts
- Expensive-to-create resources (WASM loading, connections)

---

## Adapter Pattern

**Location:** `src/adapters/`

**Purpose:** Separate interface from implementation for testability and flexibility.

### Implementation

```typescript
// Interface definition
// src/adapters/INoteAdapter.ts
export interface INoteAdapter {
  getAll(): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  create(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note>;
  update(id: string, updates: Partial<Note>): Promise<Note>;
  delete(id: string): Promise<void>;
}

// SQLite implementation
// src/adapters/sqlite/SQLiteNoteAdapter.ts
export class SQLiteNoteAdapter implements INoteAdapter {
  constructor(private db: DatabaseConnection) {}

  async getAll(): Promise<Note[]> {
    return this.db.exec<Note>('SELECT * FROM entities WHERE type = ?', ['note']);
  }

  async getById(id: string): Promise<Note | null> {
    const results = await this.db.exec<Note>(
      'SELECT * FROM entities WHERE id = ?',
      [id]
    );
    return results[0] || null;
  }

  // ... other methods
}
```

### Usage

```typescript
// Create adapter instance
const noteAdapter = new SQLiteNoteAdapter(database);

// Use through interface (could be mock in tests)
const notes = await noteAdapter.getAll();
```

### When to Use

- Database operations that may have different backends
- Operations that need mocking in tests
- Features that may switch implementations (SQLite → IndexedDB)

---

## Bi-temporal Data

**Location:** All entities, connections, clusters

**Purpose:** Support soft delete and point-in-time queries with `valid_at`/`invalid_at` timestamps.

### Implementation

```typescript
// Type definition
interface Entity {
  id: string;
  // ... other fields
  created_at: string;
  updated_at: string;
  valid_at: string;         // When this version became valid
  invalid_at: string | null; // When invalidated (null = current)
}

// Querying current records
const currentEntities = await db.exec<Entity>(
  'SELECT * FROM entities WHERE invalid_at IS NULL'
);

// Soft delete (invalidate, don't remove)
await db.run(
  'UPDATE entities SET invalid_at = ? WHERE id = ?',
  [new Date().toISOString(), id]
);

// Point-in-time query
const entitiesAtDate = await db.exec<Entity>(
  `SELECT * FROM entities
   WHERE valid_at <= ?
   AND (invalid_at IS NULL OR invalid_at > ?)`,
  [pointInTime, pointInTime]
);
```

### When to Use

- Data that needs audit history
- Undo/restore functionality
- Point-in-time reporting
- Collaborative editing with conflict resolution

---

## Dependency Injection

**Location:** `src/adapters/AdapterProvider.tsx`

**Purpose:** Provide adapters to React component tree via context.

### Implementation

```typescript
// Context definition
// src/adapters/context.ts
export interface Adapters {
  noteAdapter: INoteAdapter;
  connectionAdapter: IConnectionAdapter;
  embeddingAdapter: IEmbeddingAdapter;
  clusterAdapter: IClusterAdapter;
}

const AdaptersContext = createContext<Adapters | null>(null);

// Provider component
// src/adapters/AdapterProvider.tsx
export function AdapterProvider({
  adapters,
  children
}: {
  adapters: Adapters;
  children: ReactNode;
}) {
  return (
    <AdaptersContext.Provider value={adapters}>
      {children}
    </AdaptersContext.Provider>
  );
}

// Hooks for consuming
// src/adapters/hooks.ts
export function useAdapters(): Adapters {
  const adapters = useContext(AdaptersContext);
  if (!adapters) {
    throw new Error('useAdapters must be used within AdapterProvider');
  }
  return adapters;
}

export function useNoteAdapter(): INoteAdapter {
  return useAdapters().noteAdapter;
}
```

### Usage

```typescript
// In App.tsx
const adapters = {
  noteAdapter: new SQLiteNoteAdapter(db),
  connectionAdapter: new SQLiteConnectionAdapter(db),
  embeddingAdapter: new SQLiteEmbeddingAdapter(db),
  clusterAdapter: new SQLiteClusterAdapter(db),
};

<AdapterProvider adapters={adapters}>
  <App />
</AdapterProvider>

// In components
function MyComponent() {
  const noteAdapter = useNoteAdapter();
  const notes = await noteAdapter.getAll();
}
```

### When to Use

- Providing dependencies to deeply nested components
- Testing with mock implementations
- Swapping implementations without prop drilling

---

## Observable State

**Location:** `src/store/state.ts`

**Purpose:** Reactive state management with Legend-State for fine-grained updates.

### Implementation

```typescript
// src/store/state.ts
import { observable } from '@legendapp/state';

export const appState$ = observable({
  ui: {
    selectedEntityId: null as string | null,
    sidebarOpen: true,
  },
  entities: {} as Record<string, Entity>,
  connections: {} as Record<string, Connection>,
  clusters: {} as Record<string, Cluster>,
  entitiesLoading: true,
  connectionsLoading: true,
  clustersLoading: true,
});

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).__ATHENA_STATE__ = appState$;
}

// src/store/hooks.ts
import { useSelector } from '@legendapp/state/react';

export function useNotes(): Note[] {
  return useSelector(() => Object.values(appState$.entities.get()));
}

export function useNote(id: string): Note | undefined {
  return useSelector(() => appState$.entities[id].get());
}

export const entityActions = {
  setNotes: (notes: Note[]) => {
    const map = Object.fromEntries(notes.map(n => [n.id, n]));
    appState$.entities.set(map);
  },
  addNote: (note: Note) => {
    appState$.entities[note.id].set(note);
  },
  updateNote: (id: string, updates: Partial<Note>) => {
    appState$.entities[id].assign(updates);
  },
  removeNote: (id: string) => {
    appState$.entities[id].delete();
  },
};
```

### Usage

```typescript
import { useNotes, entityActions } from '@/store';

function MyComponent() {
  const notes = useNotes(); // Reactive - rerenders on change

  const handleCreate = async (note: Note) => {
    await noteAdapter.create(note);
    entityActions.addNote(note);
  };
}
```

### When to Use

- UI state that needs to sync across components
- Data that changes frequently and needs efficient updates
- State that needs to be observable for debugging

---

## N-way Relationships

**Location:** Clusters schema and types

**Purpose:** Model relationships between multiple entities using junction pattern.

### Implementation

```typescript
// Types
// src/shared/types/clusters.ts
type ClusterType = 'concept' | 'sequence' | 'hierarchy' | 'contradiction' | 'dependency';
type MemberRole = 'source' | 'target' | 'participant' | 'hub' | 'evidence' | 'claim';

interface ClusterMember {
  entity_id: string;
  role: MemberRole;
  position?: number;    // For ordered clusters (sequence)
  added_at: string;
}

interface Cluster {
  id: string;
  label: string;
  description?: string;
  type: ClusterType;
  color: 'blue' | 'green' | 'red' | 'amber';
  members?: ClusterMember[];
  created_by: 'user' | 'ai' | 'system';
  confidence?: number;
  created_at: string;
  valid_at: string;
  invalid_at: string | null;
}

// Database schema
CREATE TABLE clusters (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  -- ... other fields
);

CREATE TABLE cluster_members (
  cluster_id TEXT REFERENCES clusters(id),
  entity_id TEXT REFERENCES entities(id),
  role TEXT NOT NULL,
  position INTEGER,
  added_at TEXT NOT NULL,
  PRIMARY KEY (cluster_id, entity_id)
);
```

### Usage

```typescript
const clusterAdapter = useClusterAdapter();

// Create cluster with members
const cluster = await clusterAdapter.create({
  label: 'Thermal Runaway Discussion',
  type: 'concept',
  color: 'blue',
  created_by: 'user',
  members: [
    { entity_id: 'note-1', role: 'participant' },
    { entity_id: 'note-2', role: 'participant' },
  ]
});

// Find clusters containing an entity
const clusters = await clusterAdapter.getForEntity('note-1');
```

### When to Use

- Grouping more than 2 entities
- Relationships with roles/positions
- AI-suggested groupings with confidence scores

---

## Secure Storage

**Location:** `src/services/secureStorage/`

**Purpose:** Encrypt sensitive data using Web Crypto API with IndexedDB persistence.

### Implementation

```typescript
// src/services/secureStorage/crypto.ts
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return { ciphertext, iv };
}

export async function decrypt(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// src/services/secureStorage/SecureStorage.ts
export interface ISecureStorage {
  store(key: string, value: string): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  isLocked(): boolean;
  unlock(password?: string): Promise<boolean>;
  lock(): void;
  setPasswordProtection(password: string): Promise<void>;
  removePasswordProtection(): Promise<void>;
  isPasswordProtected(): boolean;
}
```

### Usage

```typescript
import { getSecureStorage } from '@/services/secureStorage';

const storage = getSecureStorage();

// Store encrypted value
await storage.store('api-key-gemini', 'your-api-key');

// Retrieve decrypted value
const key = await storage.retrieve('api-key-gemini');

// Delete value
await storage.delete('api-key-gemini');
```

### When to Use

- Storing API keys
- User credentials
- Any sensitive configuration

---

## AI Backend Abstraction

**Location:** `src/modules/ai/`

**Purpose:** Unified interface for multiple AI providers.

### Implementation

```typescript
// src/modules/ai/types.ts
export interface IAIBackend {
  readonly id: string;
  readonly name: string;
  readonly type: AIProviderType;

  embed(text: string): Promise<EmbeddingResult>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  isAvailable(): Promise<boolean>;
  configure(config: ProviderConfig): void;
  getEmbeddingDimensions(): number;
  getSupportedModels(): ModelInfo[];
}

// src/modules/ai/backends/GeminiBackend.ts
export class GeminiBackend implements IAIBackend {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type: AIProviderType = 'gemini';

  async embed(text: string): Promise<EmbeddingResult> {
    // Gemini-specific implementation
  }

  async generate(prompt: string): Promise<GenerateResult> {
    // Gemini-specific implementation
  }
}
```

### Usage

```typescript
import { useAI } from '@/modules/ai';

function MyComponent() {
  const { service, isAvailable } = useAI();

  if (!isAvailable) return <ConfigureAI />;

  const embedding = await service.embed('Text to embed');
  const response = await service.generate('Hello!');
}
```

### When to Use

- Supporting multiple AI providers
- Allowing user choice of AI backend
- Testing with mock AI responses

---

## Embedding Storage

**Location:** `src/adapters/sqlite/SQLiteEmbeddingAdapter.ts`

**Purpose:** Vector storage with JavaScript-based cosine similarity.

### Implementation

```typescript
// Cosine similarity calculation
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Finding similar embeddings
async findSimilar(
  entityId: string,
  limit = 10,
  threshold = 0.7
): Promise<SimilarityResult[]> {
  // Get source embedding
  const source = await this.getForEntity(entityId, this.currentModel);
  if (!source) return [];

  // Get all other embeddings
  const all = await this.db.exec<EmbeddingRow>(
    'SELECT * FROM embeddings WHERE entity_id != ? AND model = ?',
    [entityId, this.currentModel]
  );

  // Calculate similarities
  const results = all
    .map(row => ({
      entity_id: row.entity_id,
      similarity: cosineSimilarity(source.vector, JSON.parse(row.vector)),
      embedding: { ...row, vector: JSON.parse(row.vector) }
    }))
    .filter(r => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}
```

### When to Use

- Semantic similarity search
- Content-based recommendations
- Finding related documents

---

## Background Indexer

**Location:** `src/modules/ai/IndexerService.ts`

**Purpose:** Configurable background embedding generation with multiple trigger modes.

### Implementation

```typescript
// src/modules/ai/IndexerService.ts
export interface IndexerConfig {
  trigger: 'on-save' | 'on-demand' | 'continuous';
  batchSize: number;
  idleDelayMs: number;
  debounceMs: number;
  retryFailedAfterMs: number;
}

export class IndexerService {
  private queue: string[] = [];
  private processing = false;

  async queueForIndexing(entityId: string): Promise<void> {
    if (!this.queue.includes(entityId)) {
      this.queue.push(entityId);
    }
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const entityId = this.queue.shift()!;
      await this.indexEntity(entityId);
    }

    this.processing = false;
  }
}
```

### Trigger Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `on-save` | Index when note saved (debounced) | Real-time updates |
| `on-demand` | Only when user requests | Controlled indexing |
| `continuous` | Background process during idle | Bulk indexing |

### Usage

```typescript
import { useIndexer, useIdleDetection } from '@/modules/ai';

// Trigger on save
const { onNoteSaved } = useIndexer();
onNoteSaved(noteId, content);

// Pause during activity
const { pause, resume } = useIndexer();
useIdleDetection({
  idleThresholdMs: 3000,
  onIdle: resume,
  onActive: pause,
});
```

### When to Use

- Automatic embedding generation
- Background processing that shouldn't block UI
- Batch operations during idle time

---

## Global Event Broadcasting

**Location:** `src/store/state.ts`, `src/store/hooks.ts`

**Purpose:** Broadcast events globally via Legend-State when class instances can't share callbacks.

### Problem

When React hooks create class instances (like `IndexerService`), each component gets its own instance. Callbacks set on one instance aren't visible to others:

```typescript
// GraphCanvas creates IndexerService A
const indexer = useOptionalIndexer();
indexer.setOnNoteIndexed((noteId) => { /* never called */ });

// EditorContainer creates IndexerService B
const indexer = useOptionalIndexer();
indexer.onNoteSaved(noteId, content); // fires callback on B, not A
```

### Solution

Use Legend-State observable to broadcast events globally:

```typescript
// src/store/state.ts
export const appState$ = observable({
  indexer: {
    lastIndexedNoteId: null as string | null,
    lastIndexedAt: null as string | null,
  },
});

// src/store/hooks.ts
export function useLastIndexedNoteId(): string | null {
  return useSelector(() => appState$.indexer.lastIndexedNoteId.get());
}

export const indexerActions = {
  noteIndexed(noteId: string) {
    appState$.indexer.lastIndexedNoteId.set(noteId);
    appState$.indexer.lastIndexedAt.set(new Date().toISOString());
  },
};
```

### Implementation

```typescript
// In IndexerService - broadcast when note is indexed
import { indexerActions } from '@/store';

private async embedNote(noteId: string, content: string): Promise<boolean> {
  const result = await this.aiService.embedAndStore(noteId, content);
  if (result) {
    // Broadcast globally via Legend-State
    indexerActions.noteIndexed(noteId);
    return true;
  }
  return false;
}

// In GraphCanvas - subscribe to global events
import { useLastIndexedNoteId } from '@/store';

const lastIndexedNoteId = useLastIndexedNoteId();
const prevIndexedRef = useRef<string | null>(null);

useEffect(() => {
  if (!lastIndexedNoteId || lastIndexedNoteId === prevIndexedRef.current) {
    return;
  }
  prevIndexedRef.current = lastIndexedNoteId;

  // React to the indexed event
  if (lastIndexedNoteId === selectedNoteId) {
    generateSuggestions(lastIndexedNoteId);
  }
}, [lastIndexedNoteId, selectedNoteId]);
```

### When to Use

- Services created per-component that need to communicate
- Events that multiple components need to react to
- Cross-cutting concerns where prop drilling is impractical
- When class instances can't share state through React context

---

## Faceted Search

**Location:** `src/modules/search/`

**Purpose:** Extract facets from search results and apply filters with OR within / AND across logic.

### Implementation

```typescript
// src/modules/search/types/facets.ts
export interface Facet {
  id: string;           // e.g., 'type', 'created'
  label: string;        // e.g., 'Type', 'Created'
  type: 'exact' | 'date_range';
  values: FacetValue[];
}

export interface FacetValue {
  value: string;        // e.g., 'note', 'today'
  label: string;        // e.g., 'Note', 'Today'
  count: number;        // Number of results with this value
  selected: boolean;
}

export interface FacetSelection {
  [facetId: string]: string[];  // e.g., { type: ['note'], created: ['today'] }
}

// src/modules/search/services/FacetService.ts
export class FacetService {
  /**
   * Extract facets from search results.
   * Counts occurrences of each facet value.
   */
  extractFacets(results: SearchResult[], selection: FacetSelection = {}): Facet[] {
    return [
      this.buildTypeFacet(results, selection.type || []),
      this.buildDateFacet(results, selection.created || []),
    ].filter(f => f.values.length > 0);
  }

  /**
   * Apply selected facets to filter results.
   * Multiple selections within a facet = OR (expands)
   * Selections across facets = AND (narrows)
   */
  applyFacets(results: SearchResult[], selection: FacetSelection): SearchResult[] {
    return results.filter(result => {
      for (const [facetId, values] of Object.entries(selection)) {
        if (!values || values.length === 0) continue;

        // Within a facet, use OR logic
        let passed = false;
        if (facetId === 'type') {
          passed = values.includes(result.type);
        } else if (facetId === 'created') {
          const bucket = this.getDateBucket(new Date(result.createdAt));
          passed = values.includes(bucket);
        }

        if (!passed) return false; // AND across facets
      }
      return true;
    });
  }
}
```

### Usage

```typescript
import { FacetService } from '@/modules/search/services/FacetService';

const facetService = new FacetService();

// Extract facets from all results
const facets = facetService.extractFacets(results, currentSelection);

// Apply filters to get visible results
const filteredResults = facetService.applyFacets(results, selection);
```

### Filter Logic

| Scenario | Logic | Example |
|----------|-------|---------|
| Multiple values in same facet | OR | `type: ['note', 'plan']` → notes OR plans |
| Values in different facets | AND | `type: ['note'], created: ['today']` → notes AND today |
| No values selected in facet | Skip | `type: []` → no filter applied |

### When to Use

- Search interfaces with multiple filter categories
- Drill-down exploration of result sets
- Datasette-style faceted navigation

---

## Conventions

### Path Alias

Use `@/` for imports from `src/`:

```typescript
import { useNoteAdapter } from '@/adapters';
import type { Note } from '@/shared/types';
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EntityList.tsx` |
| Utilities | camelCase | `formatTime.ts` |
| Types | types.ts or types/ | `types/entities.ts` |
| Interfaces | IName.ts | `INoteAdapter.ts` |

### Import Order

1. React/external libraries
2. Internal modules (`@/`)
3. Relative imports (`./`)
4. Types (with `type` keyword)

### Module Exports

- Each module has `index.ts` barrel export
- Export interfaces separately from implementations

---

## Related Documentation

- [Module Documentation](modules/) - Detailed module docs
- [Phase History](PHASE_HISTORY.md) - Implementation timeline
- [Architecture](ARCHITECTURE.md) - System design
