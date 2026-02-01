// src/modules/views/store/viewActions.ts — WP 8.9: Smart Views

import { viewState$ } from './viewState';
import { ViewService } from '../services/ViewService';
import { SQLiteViewAdapter } from '../adapters/SQLiteViewAdapter';
import type { CreateViewInput, UpdateViewInput } from '../types';
import { builtInViews } from '../data/builtInViews';
import type { DatabaseConnection } from '@/database';

let viewService: ViewService | null = null;

/**
 * Initialize the views module with a database connection.
 * Called once during app startup after the database is ready.
 */
export function initViewsModule(db: DatabaseConnection): void {
  const adapter = new SQLiteViewAdapter(db);
  viewService = new ViewService(adapter);
  viewService.setDatabase(db);
}

function getViewService(): ViewService {
  if (!viewService) {
    throw new Error('[Views] Module not initialized — call initViewsModule() first');
  }
  return viewService;
}

export const viewActions = {
  /**
   * Initialize views (load built-in + custom).
   */
  async initialize(): Promise<void> {
    try {
      const service = getViewService();
      const allViews = await service.getAllViews();
      viewState$.views.set(allViews);
    } catch (error) {
      console.error('[Views] Failed to initialize:', error);
      // Fall back to built-in only
      viewState$.views.set([...builtInViews]);
    }
  },

  /**
   * Execute a view.
   */
  async executeView(
    viewId: string,
    parameterValues: Record<string, string | number> = {},
  ): Promise<void> {
    viewState$.isExecuting.set(true);
    viewState$.error.set(null);
    viewState$.selectedViewId.set(viewId);

    try {
      const service = getViewService();
      const result = await service.executeView(viewId, parameterValues);
      viewState$.lastResult.set(result);

      // Update recent views
      const recentIds = viewState$.config.recentViewIds.get();
      const updated = [viewId, ...recentIds.filter((id) => id !== viewId)].slice(0, 3);
      viewState$.config.recentViewIds.set(updated);
    } catch (error) {
      viewState$.error.set((error as Error).message);
      viewState$.lastResult.set(null);
    } finally {
      viewState$.isExecuting.set(false);
    }
  },

  /**
   * Create a custom view.
   */
  async createView(input: CreateViewInput): Promise<string | null> {
    try {
      const service = getViewService();

      // Validate SQL before saving
      const validation = await service.validateSql(input.sql);
      if (!validation.valid) {
        viewState$.error.set(`Invalid SQL: ${validation.error}`);
        return null;
      }

      const adapter = viewService!['viewAdapter'] as SQLiteViewAdapter;
      const view = await adapter.create(input);

      // Refresh views list
      await viewActions.initialize();

      return view.id;
    } catch (error) {
      viewState$.error.set((error as Error).message);
      return null;
    }
  },

  /**
   * Update a custom view.
   */
  async updateView(id: string, input: UpdateViewInput): Promise<boolean> {
    try {
      const adapter = viewService!['viewAdapter'] as SQLiteViewAdapter;
      const updated = await adapter.update(id, input);

      if (updated) {
        await viewActions.initialize();
        return true;
      }
      return false;
    } catch (error) {
      viewState$.error.set((error as Error).message);
      return false;
    }
  },

  /**
   * Delete a custom view.
   */
  async deleteView(id: string): Promise<boolean> {
    try {
      const adapter = viewService!['viewAdapter'] as SQLiteViewAdapter;
      const deleted = await adapter.delete(id);

      if (deleted) {
        await viewActions.initialize();

        // Clear selection if deleted view was selected
        if (viewState$.selectedViewId.get() === id) {
          viewState$.selectedViewId.set(null);
          viewState$.lastResult.set(null);
        }
        return true;
      }
      return false;
    } catch (error) {
      viewState$.error.set((error as Error).message);
      return false;
    }
  },

  /**
   * Open/close panel.
   */
  openPanel(): void {
    viewState$.isPanelOpen.set(true);
  },

  closePanel(): void {
    viewState$.isPanelOpen.set(false);
  },

  togglePanel(): void {
    viewState$.isPanelOpen.set((v) => !v);
  },

  /**
   * Clear results.
   */
  clearResults(): void {
    viewState$.lastResult.set(null);
    viewState$.selectedViewId.set(null);
    viewState$.error.set(null);
  },
};

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_VIEWS__: typeof viewActions }).__ATHENA_VIEWS__ = viewActions;
}
