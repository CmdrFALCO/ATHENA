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
