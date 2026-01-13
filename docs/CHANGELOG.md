# ATHENA Changelog

## [0.2.0] - 2026-01-13

### Added
- SQLite WASM integration using wa-sqlite
- Database module with IndexedDB persistence (IDBBatchAtomicVFS)
- Database initialization with singleton pattern
- Test component showing database status in UI

### Changed
- Updated App.tsx with database test component
- Added Vite config for WASM loading and COOP/COEP headers

### Technical
- Using wa-sqlite-async.mjs for async database operations
- IndexedDB storage via IDBBatchAtomicVFS for cross-session persistence

## [0.1.0] - 2026-01-13

### Added
- Project scaffold with Vite + React 19 + TypeScript
- Tailwind CSS configuration with dark mode
- Folder structure for all planned modules
- Documentation scaffolding (ARCHITECTURE, DECISIONS, LESSONS_LEARNED)
