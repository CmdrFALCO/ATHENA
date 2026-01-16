# Lessons Learned

## sql.js FTS5 Not Available (WP 4.2)

**Problem:** When implementing full-text search, FTS5 virtual tables failed with:
```
Error: no such module: fts5
```

**Root Cause:** The standard sql.js npm package and CDN builds do NOT include FTS5. SQLite extensions like FTS5 must be compiled in, and sql.js is built without the `-DSQLITE_ENABLE_FTS5` flag.

**Attempted Solutions:**
1. **jsDelivr CDN** - Same build, no FTS5
2. **Local WASM via Vite import** - Still the same npm package build
3. **Different sql.js versions** - None include FTS5 by default

**Solution:** Use FTS3 instead of FTS5. FTS3 IS included in the standard sql.js build (compiled with `-DSQLITE_ENABLE_FTS3`).

**FTS3 Limitations vs FTS5:**
| Feature | FTS3 | FTS5 |
|---------|------|------|
| Basic full-text search | ✅ | ✅ |
| UNINDEXED columns | ❌ | ✅ |
| BM25 ranking | ❌ | ✅ |
| Porter tokenizer | ❌ (compile flag) | ✅ |
| Content sync | Manual triggers | `content=` option |

**Code Change:**
```sql
-- FTS5 (doesn't work with standard sql.js)
CREATE VIRTUAL TABLE entities_fts USING fts5(
  id UNINDEXED,
  title,
  content_text,
  tokenize='porter unicode61'
);

-- FTS3 (works with standard sql.js)
CREATE VIRTUAL TABLE entities_fts USING fts3(
  id,
  title,
  content_text
);
```

**Future Options if FTS5 Needed:**
1. Build sql.js from source with FTS5 enabled ✅ (Done in WP 4.2.1)
2. Use a community fork like `@aspect-analytics/sql.js`
3. Host a custom WASM file with FTS5 compiled in

---

## Custom sql.js Build for FTS5 (WP 4.2.1)

**Goal:** Get FTS5 with bm25() ranking, highlight(), snippet(), and porter tokenizer.

**Solution:** Build sql.js from source with custom Makefile flags.

### Build Steps

1. Clone sql.js repository:
```bash
git clone https://github.com/sql-js/sql.js.git tools/sql.js-custom
```

2. Modify `Makefile` SQLITE_COMPILATION_FLAGS:
```makefile
SQLITE_COMPILATION_FLAGS = \
    -Oz \
    -DSQLITE_OMIT_LOAD_EXTENSION \
    -DSQLITE_DISABLE_LFS \
    -DSQLITE_ENABLE_FTS3 \
    -DSQLITE_ENABLE_FTS3_PARENTHESIS \
    -DSQLITE_ENABLE_FTS5 \           # Added
    -DSQLITE_ENABLE_JSON1 \          # Added
    -DSQLITE_THREADSAFE=0 \
    -DSQLITE_ENABLE_NORMALIZE
```

3. Build with Docker:
```bash
docker run --rm -v ${PWD}:/src emscripten/emsdk:3.1.45 bash -c "cd /src && npm install && npm run rebuild"
```

4. Copy outputs:
```bash
cp dist/sql-wasm.js src/vendor/sql.js/
cp dist/sql-wasm.wasm public/vendor/sql.js/
```

---

## sql.js ES Module Compatibility (WP 4.2.1)

**Problem 1:** Custom sql.js build doesn't export ES module default:
```
Error: does not provide an export named 'default'
```

**Root Cause:** sql.js uses CommonJS exports (`module.exports = initSqlJs`), not ES modules.

**Solution:** Add ES module export at end of `sql-wasm.js`:
```javascript
// ES Module export for Vite/modern bundlers
export default initSqlJs;
```

---

**Problem 2:** CommonJS code throws in ES module context:
```
ReferenceError: module is not defined
```

**Root Cause:** The sql.js wrapper has `module = undefined;` which fails when `module` doesn't exist.

**Solution:** Wrap in try-catch and remove CommonJS export block:
```javascript
// Original (fails)
module = undefined;

// Fixed
try { module = undefined; } catch(e) {}

// Also remove the CommonJS if/else export block at end of file
```

### Vendor Module Pattern

Create `src/vendor/sql.js/index.ts` to re-export with types:
```typescript
import type { SqlJsStatic, Database, SqlValue } from 'sql.js';
// @ts-expect-error - Custom build doesn't have type definitions
import initSqlJsCustom from './sql-wasm.js';

const initSqlJs: (config?: {
  locateFile?: (file: string) => string;
}) => Promise<SqlJsStatic> = initSqlJsCustom;

export default initSqlJs;
export type { SqlJsStatic, Database, SqlValue };
```

Then import from vendor instead of npm:
```typescript
// Before
import initSqlJs from 'sql.js';

// After
import initSqlJs from '@/vendor/sql.js';
```

---

## sql.js WASM Version Mismatch (WP 4.2)

**Problem:** When loading WASM from CDN while using npm package for JavaScript:
```
TypeError: z is not a function
```

**Root Cause:** The JavaScript wrapper (from npm) and WASM binary (from CDN) must be the same version. Mismatched versions cause internal API incompatibilities.

**Solution:** Always match versions:
```typescript
// Check installed version
npm ls sql.js  // e.g., 1.13.0

// Use matching CDN version
locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`
```

**Best Practice:** Use the same CDN consistently, or better yet, serve WASM from your own assets to ensure version consistency.

---

## React Flow Infinite Loop with Store Sync (WP 2.2, 2.4)

**Problem:** Using store state in `useEffect` dependencies caused infinite re-renders.

**Root Cause:** Array/object references change on every render even if contents are the same.

**Solution:**
1. Components subscribe directly to specific store values they need
2. Only trigger sync when IDs actually change (track with refs)
3. Use `EntityNode` to subscribe to `useSelectedEntityIds()` directly

---

## Tiptap Content as JSON (WP 1.4)

**Gotcha:** Tiptap stores content as nested JSON blocks, not plain text.

**Solution for FTS:** Extract plain text before indexing:
```typescript
function extractTextFromTiptap(content: unknown): string {
  // Recursively extract text from Tiptap JSON structure
  // Handle paragraphs, headings, lists, code blocks, etc.
}
```

Store extracted text in separate `content_text` column for FTS indexing.
