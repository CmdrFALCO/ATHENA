// src/modules/views/services/ViewService.ts — WP 8.9: Smart Views

import type { SmartView, ViewResult, ViewExecutionResult, ViewParameter } from '../types';
import type { IViewAdapter } from '../adapters/IViewAdapter';
import { builtInViews, getBuiltInView } from '../data/builtInViews';
import type { DatabaseConnection } from '@/database';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

/** Raw row shape from entity queries (column names match SQL aliases) */
interface EntityRow {
  id: string;
  title: string | null;
  type: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  connection_count?: number;
}

/**
 * Service for executing Smart Views.
 */
export class ViewService {
  private db: DatabaseConnection | null = null;

  constructor(private viewAdapter: IViewAdapter) {}

  setDatabase(db: DatabaseConnection): void {
    this.db = db;
  }

  /**
   * Get all available views (built-in + custom).
   */
  async getAllViews(): Promise<SmartView[]> {
    const customViews = await this.viewAdapter.getAll();
    return [...builtInViews, ...customViews];
  }

  /**
   * Get a view by ID (checks built-in first, then custom).
   */
  async getView(id: string): Promise<SmartView | null> {
    const builtIn = getBuiltInView(id);
    if (builtIn) return builtIn;
    return this.viewAdapter.getById(id);
  }

  /**
   * Execute a view with parameter values.
   */
  async executeView(
    viewId: string,
    parameterValues: Record<string, string | number> = {},
  ): Promise<ViewExecutionResult> {
    if (!this.db) {
      throw new Error('Database not initialized — call setDatabase() first');
    }

    const startTime = performance.now();

    const view = await this.getView(viewId);
    if (!view) {
      throw new Error(`View not found: ${viewId}`);
    }

    // Merge defaults with provided values
    const resolvedParams = this.resolveParameters(view.parameters, parameterValues);

    // Substitute parameters into SQL
    const sql = this.substituteParameters(view.sql, resolvedParams);

    // Execute query — returns array of objects
    const rows = await this.db.exec<EntityRow>(sql);

    // Transform results
    const results = this.transformResults(rows);

    const endTime = performance.now();

    return {
      view,
      results,
      executedAt: new Date().toISOString(),
      executionTimeMs: Math.round(endTime - startTime),
      parameterValues: resolvedParams,
    };
  }

  /**
   * Validate a SQL query (for custom view creation).
   */
  async validateSql(sql: string): Promise<{ valid: boolean; error?: string }> {
    if (!this.db) {
      return { valid: false, error: 'Database not initialized' };
    }

    try {
      // Use EXPLAIN to validate without executing; replace param placeholders with 1
      await this.db.exec(`EXPLAIN ${sql.replace(/:\w+/g, '1')}`);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  /**
   * Resolve parameter values with defaults.
   */
  private resolveParameters(
    parameters: ViewParameter[],
    provided: Record<string, string | number>,
  ): Record<string, string | number> {
    const resolved: Record<string, string | number> = {};

    for (const param of parameters) {
      if (provided[param.name] !== undefined) {
        resolved[param.name] = provided[param.name];
      } else if (param.defaultValue !== undefined) {
        resolved[param.name] = param.defaultValue;
      } else if (param.required) {
        throw new Error(`Required parameter missing: ${param.name}`);
      }
    }

    return resolved;
  }

  /**
   * Substitute :param placeholders with values.
   */
  private substituteParameters(
    sql: string,
    params: Record<string, string | number>,
  ): string {
    let result = sql;

    for (const [name, value] of Object.entries(params)) {
      const placeholder = new RegExp(`:${name}\\b`, 'g');
      const safeValue =
        typeof value === 'string'
          ? `'${value.replace(/'/g, "''")}'` // Escape single quotes
          : String(value);
      result = result.replace(placeholder, safeValue);
    }

    return result;
  }

  /**
   * Transform raw rows to ViewResult[].
   */
  private transformResults(rows: EntityRow[]): ViewResult[] {
    return rows.map((row) => {
      let preview = '';

      if (row.content) {
        try {
          const parsed = JSON.parse(row.content);
          preview = extractTextFromTiptap(parsed).slice(0, 100);
        } catch {
          preview = String(row.content).slice(0, 100);
        }
      }

      return {
        id: row.id,
        title: row.title || 'Untitled',
        type: row.type || 'note',
        preview,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        connectionCount: row.connection_count,
      };
    });
  }
}
