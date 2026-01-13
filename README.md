# ΛTHENΛ

A "Second Brain" knowledge management system built with React, TypeScript, and SQLite WASM.

## Overview

ATHENA is a local-first web application for managing interconnected knowledge through notes, connections, and semantic search. It uses sql.js (SQLite compiled to WebAssembly) for data persistence and Legend-State for reactive state management.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build**: Vite
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **State**: Legend-State (reactive observables)
- **Database**: sql.js (SQLite WASM, in-memory)
- **Linting**: ESLint + Prettier

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── adapters/           # Data access layer (adapter pattern)
├── app/                # App shell, layout, and routing
│   ├── layout/         # AppLayout, Header, Sidebar components
│   └── routes/         # TanStack Router setup + page components
├── config/             # Feature flags and DevSettings
├── database/           # SQLite WASM initialization
├── shared/types/       # TypeScript type definitions
├── store/              # Legend-State observables and hooks
├── App.tsx             # Root component (RouterProvider wrapper)
└── main.tsx            # React entry point
```

## Development

### DevSettings Panel

Press **Ctrl+Shift+D** to open the DevSettings panel for feature flag management.

### Console Debugging

```javascript
window.__ATHENA_STATE__        // Main app state
window.__ATHENA_DEV_SETTINGS__ // Feature flags
```

## Architecture Decisions

### SQLite Library: sql.js

ATHENA uses [sql.js](https://sql.js.org/) for SQLite WASM. This was chosen after encountering stability issues with wa-sqlite:

- wa-sqlite's IDBBatchAtomicVFS failed with "unable to open database file"
- MemoryAsyncVFS caused "RuntimeError: unreachable" WASM errors
- The sync module unexpectedly returned Promises, causing invalid database handles

sql.js provides a stable, well-tested synchronous API that works reliably in browser environments.

### State Management: Legend-State

Legend-State was chosen for its:
- Fine-grained reactivity (minimal re-renders)
- Built-in persistence plugins
- Simple observable API
- TypeScript support

## Documentation

- [CODEBASE_MAP.md](CODEBASE_MAP.md) - Detailed codebase structure
- [CHANGELOG.md](CHANGELOG.md) - Version history

## License

Private project.
