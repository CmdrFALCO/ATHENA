/**
 * Custom sql.js build with FTS5 and JSON1 extensions enabled.
 *
 * This re-exports the custom WASM build from tools/sql.js-custom
 * which was compiled with:
 *   -DSQLITE_ENABLE_FTS5
 *   -DSQLITE_ENABLE_JSON1
 *
 * The WASM binary is served from public/vendor/sql.js/sql-wasm.wasm
 */

// Use types from the original sql.js package
import type { SqlJsStatic, Database, SqlValue } from 'sql.js';

// Import the custom build (the actual JS file)
// @ts-expect-error - Custom build doesn't have type definitions
import initSqlJsCustom from './sql-wasm.js';

// Re-export the init function with proper typing
const initSqlJs: (config?: {
  locateFile?: (file: string) => string;
}) => Promise<SqlJsStatic> = initSqlJsCustom;

export default initSqlJs;
export type { SqlJsStatic, Database, SqlValue };
