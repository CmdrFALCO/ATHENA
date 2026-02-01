// src/modules/views/adapters/IViewAdapter.ts — WP 8.9: Smart Views

import type { SmartView, CreateViewInput, UpdateViewInput } from '../types';

/**
 * Adapter interface for Smart View persistence.
 */
export interface IViewAdapter {
  /** Get all custom (user-created) views */
  getAll(): Promise<SmartView[]>;

  /** Get a view by ID */
  getById(id: string): Promise<SmartView | null>;

  /** Create a new custom view */
  create(input: CreateViewInput): Promise<SmartView>;

  /** Update an existing custom view */
  update(id: string, input: UpdateViewInput): Promise<SmartView | null>;

  /** Delete a custom view */
  delete(id: string): Promise<boolean>;

  /** Check if a view exists */
  exists(id: string): Promise<boolean>;
}
