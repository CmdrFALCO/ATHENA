# Architecture Decision Records (ADRs)

## ADR-001: SQLite WASM Library Selection

**Date:** 2026-01-13

**Status:** Accepted

**Context:**
ATHENA requires local-first persistence in the browser. Several SQLite WASM options were considered:
- `wa-sqlite` - Lightweight, flexible VFS system
- `sql.js` - More mature, larger bundle size
- `@sqlite.org/sqlite-wasm` - Official SQLite team implementation

**Decision:**
Use `wa-sqlite` with `IDBBatchAtomicVFS` for IndexedDB-based persistence.

**Rationale:**
1. **Flexibility**: wa-sqlite provides multiple VFS options (OPFS, IndexedDB, Memory)
2. **Performance**: IDBBatchAtomicVFS uses batch atomic writes for better performance
3. **Browser Compatibility**: Works in main thread, no Web Worker required for basic usage
4. **Bundle Size**: Smaller than sql.js
5. **Active Maintenance**: Well-maintained with good documentation

**Storage Backend:**
- **Primary**: IndexedDB via `IDBBatchAtomicVFS`
- **Future**: OPFS can be added later for better performance (requires Web Worker)

**Consequences:**
- WASM files need proper MIME type configuration
- COOP/COEP headers needed for SharedArrayBuffer features (optional)
- Database persists in IndexedDB across sessions

## ADR-002: Async SQLite Build

**Date:** 2026-01-13

**Status:** Accepted

**Context:**
wa-sqlite provides both sync and async WASM builds.

**Decision:**
Use `wa-sqlite-async.mjs` (async build) with Asyncify support.

**Rationale:**
1. IDBBatchAtomicVFS requires async operations
2. Better compatibility with browser async patterns
3. Required for any VFS that uses IndexedDB or OPFS

**Consequences:**
- Slightly larger WASM file (~1.1MB vs ~558KB)
- All database operations return Promises

## ADR-003: Adapter Pattern for Data Access

**Date:** 2026-01-13

**Status:** Accepted

**Context:**
ATHENA needs a data access layer that:
- Abstracts database implementation details
- Enables future backend changes (local, remote, sync)
- Provides clean interfaces for React components

**Decision:**
Use the Adapter Pattern with interfaces (INoteAdapter, IConnectionAdapter, IEmbeddingAdapter) and concrete SQLite implementations.

**Rationale:**
1. **Testability**: Easy to mock adapters for unit tests
2. **Flexibility**: Can swap SQLite for remote API without changing components
3. **Separation of Concerns**: Components don't know about SQL
4. **Dependency Injection**: AdapterProvider enables React context-based DI

**Interface Design:**
- CRUD operations (getById, getAll, create, update, delete)
- Query methods (findByType, findByTitle, getConnectionsFor)
- Bi-temporal support (soft delete via invalidate)

**Consequences:**
- Additional abstraction layer
- All data access goes through adapters
- Schema changes require adapter updates

## ADR-004: Bi-Temporal Data Model

**Date:** 2026-01-13

**Status:** Accepted

**Context:**
ATHENA needs to support:
- Soft deletes (undo, recovery)
- Historical queries (what was the state at time X?)
- Audit trails

**Decision:**
Implement bi-temporal fields on entities and connections:
- `valid_at`: When the record became true/active
- `invalid_at`: When the record was invalidated (null = current)

**Rationale:**
1. **Recovery**: Deleted data can be restored
2. **History**: Can query historical state
3. **Simple**: Avoids complex versioning systems

**Consequences:**
- Queries must filter by `invalid_at IS NULL` for current data
- Storage grows over time (invalidated records kept)
- May need cleanup/archival strategy later
