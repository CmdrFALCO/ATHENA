# Adapters Module

**Location:** `src/adapters/`
**Status:** Implemented in WP 0.3, extended in WP 0.5, WP 3.2

## Purpose

Database adapter layer providing interface abstraction over SQLite implementations. Enables dependency injection and testability.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Barrel exports |
| `context.ts` | React context + Adapters type |
| `hooks.ts` | useAdapters, useNoteAdapter, useClusterAdapter, etc. |
| `AdapterProvider.tsx` | Provider component for dependency injection |
| `INoteAdapter.ts` | Note adapter interface |
| `IConnectionAdapter.ts` | Connection adapter interface |
| `IEmbeddingAdapter.ts` | Enhanced embedding adapter interface (WP 3.2) |
| `IClusterAdapter.ts` | Cluster adapter interface (WP 0.5) |
| `sqlite/SQLiteNoteAdapter.ts` | SQLite note implementation |
| `sqlite/SQLiteConnectionAdapter.ts` | SQLite connection implementation |
| `sqlite/SQLiteEmbeddingAdapter.ts` | SQLite embedding with similarity (WP 3.2) |
| `sqlite/SQLiteClusterAdapter.ts` | SQLite cluster implementation (WP 0.5) |

---

## Public API

### Interfaces

```typescript
export type { INoteAdapter } from './INoteAdapter';
export type { IConnectionAdapter } from './IConnectionAdapter';
export type { IEmbeddingAdapter } from './IEmbeddingAdapter';
export type { IClusterAdapter } from './IClusterAdapter';
```

### SQLite Implementations

```typescript
export { SQLiteNoteAdapter } from './sqlite/SQLiteNoteAdapter';
export { SQLiteConnectionAdapter } from './sqlite/SQLiteConnectionAdapter';
export { SQLiteEmbeddingAdapter } from './sqlite/SQLiteEmbeddingAdapter';
export { SQLiteClusterAdapter } from './sqlite/SQLiteClusterAdapter';
```

### Provider and Hooks

```typescript
export { AdapterProvider } from './AdapterProvider';
export { useAdapters, useNoteAdapter, useConnectionAdapter, useEmbeddingAdapter, useClusterAdapter } from './hooks';
```

---

## Usage Examples

### Setting Up Adapters

```typescript
import { AdapterProvider, useNoteAdapter, useClusterAdapter } from '@/adapters';

// In App.tsx
<AdapterProvider adapters={adapters}>
  <MyComponent />
</AdapterProvider>
```

### Using Adapters in Components

```typescript
// In component
const noteAdapter = useNoteAdapter();
const clusterAdapter = useClusterAdapter();

const notes = await noteAdapter.getAll();
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
```

### Embedding Operations

```typescript
const embeddingAdapter = useEmbeddingAdapter();

// Store an embedding
await embeddingAdapter.store(entityId, vector, model);

// Find similar entities
const similar = await embeddingAdapter.findSimilar(entityId, 5, 0.7);

// Check if entity has embedding
const hasEmbed = await embeddingAdapter.hasEmbedding(entityId, model);
```

---

## Interface Definitions

### INoteAdapter

```typescript
interface INoteAdapter {
  getAll(): Promise<Note[]>;
  getById(id: string): Promise<Note | null>;
  create(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note>;
  update(id: string, updates: Partial<Note>): Promise<Note>;
  delete(id: string): Promise<void>;
}
```

### IEmbeddingAdapter (WP 3.2)

```typescript
interface IEmbeddingAdapter {
  store(entityId: string, vector: number[], model: string): Promise<EmbeddingRecord>;
  getForEntity(entityId: string, model: string): Promise<EmbeddingRecord | null>;
  getAllForEntity(entityId: string): Promise<EmbeddingRecord[]>;
  findSimilar(entityId: string, limit?: number, threshold?: number): Promise<SimilarityResult[]>;
  deleteForEntity(entityId: string, model?: string): Promise<void>;
  deleteByModel(model: string): Promise<void>;
  hasEmbedding(entityId: string, model: string): Promise<boolean>;
  getCount(model?: string): Promise<number>;
}
```

### IClusterAdapter (WP 0.5)

```typescript
interface IClusterAdapter {
  getAll(): Promise<Cluster[]>;
  getById(id: string): Promise<Cluster | null>;
  getForEntity(entityId: string): Promise<Cluster[]>;
  create(cluster: Omit<Cluster, 'id' | 'created_at'>): Promise<Cluster>;
  update(id: string, updates: Partial<Cluster>): Promise<Cluster>;
  delete(id: string): Promise<void>;
  addMember(clusterId: string, member: ClusterMember): Promise<void>;
  removeMember(clusterId: string, entityId: string): Promise<void>;
}
```

---

## Related Patterns

- **Adapter Pattern** - Interface + implementation separation
- **Dependency Injection** - React context for adapters via `AdapterProvider`
- **Bi-temporal** - All adapters support `valid_at`/`invalid_at` for soft delete

---

## Related Documentation

- [Store Module](STORE.md) - State management that consumes adapters
- [AI Module](AI.md) - Uses IEmbeddingAdapter for vector storage
- [Code Patterns](../PATTERNS.md) - Detailed pattern documentation
