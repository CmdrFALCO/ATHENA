import { schemaState$ } from './schemaState';
import { SQLiteSchemaAdapter } from '../adapters/SchemaAdapter';
import { SchemaService } from '../services/SchemaService';
import { getDatabase } from '@/database';
import { devSettings$ } from '@/config/devSettings';
import type { CreateSchemaInput, UpdateSchemaInput, KnowledgeSchema } from '../types';

// Lazy-initialized services
let adapter: SQLiteSchemaAdapter | null = null;
let service: SchemaService | null = null;

function getServices() {
  if (!adapter || !service) {
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');
    adapter = new SQLiteSchemaAdapter(db);
    service = new SchemaService(adapter);
  }
  return { adapter, service };
}

export const schemaActions = {
  /**
   * Load all schemas from database
   */
  async loadSchemas(): Promise<void> {
    schemaState$.loading.set(true);
    schemaState$.error.set(null);

    try {
      const { adapter } = getServices();
      const schemas = await adapter.getAll();
      schemaState$.schemas.set(schemas);
      schemaState$.lastLoaded.set(new Date().toISOString());
    } catch (error) {
      schemaState$.error.set(
        error instanceof Error ? error.message : 'Failed to load schemas'
      );
    } finally {
      schemaState$.loading.set(false);
    }
  },

  /**
   * Set the active schema
   */
  setActiveSchema(schemaId: string | null): void {
    devSettings$.schema.activeSchemaId.set(schemaId);
    devSettings$.lastModified.set(new Date().toISOString());
  },

  /**
   * Get the currently active schema from local state
   */
  getActiveSchema(): KnowledgeSchema | null {
    const activeId = devSettings$.schema.activeSchemaId.get();
    if (!activeId) return null;
    return schemaState$.schemas.get().find(s => s.id === activeId) || null;
  },

  /**
   * Create a new custom schema
   */
  async createSchema(input: CreateSchemaInput): Promise<KnowledgeSchema> {
    const { adapter } = getServices();
    const schema = await adapter.create(input);

    // Update local state
    schemaState$.schemas.set([...schemaState$.schemas.get(), schema]);

    return schema;
  },

  /**
   * Update an existing schema
   */
  async updateSchema(id: string, input: UpdateSchemaInput): Promise<KnowledgeSchema | null> {
    const { adapter } = getServices();
    const updated = await adapter.update(id, input);

    if (updated) {
      const schemas = schemaState$.schemas.get();
      const index = schemas.findIndex(s => s.id === id);
      if (index !== -1) {
        const newSchemas = [...schemas];
        newSchemas[index] = updated;
        schemaState$.schemas.set(newSchemas);
      }
    }

    return updated;
  },

  /**
   * Delete a custom schema
   */
  async deleteSchema(id: string): Promise<boolean> {
    const { adapter } = getServices();
    const deleted = await adapter.delete(id);

    if (deleted) {
      schemaState$.schemas.set(
        schemaState$.schemas.get().filter(s => s.id !== id)
      );

      // Clear active if this was active
      if (devSettings$.schema.activeSchemaId.get() === id) {
        devSettings$.schema.activeSchemaId.set(null);
        devSettings$.lastModified.set(new Date().toISOString());
      }
    }

    return deleted;
  },

  /**
   * Record schema usage (called when extraction uses a schema)
   */
  async recordUsage(schemaId: string): Promise<void> {
    const { service } = getServices();
    await service.recordUsage(schemaId);

    // Update local count
    const schemas = schemaState$.schemas.get();
    const index = schemas.findIndex(s => s.id === schemaId);
    if (index !== -1) {
      const newSchemas = [...schemas];
      newSchemas[index] = { ...newSchemas[index], usageCount: newSchemas[index].usageCount + 1 };
      schemaState$.schemas.set(newSchemas);
    }
  },

  /**
   * Get schema prompt addition for current active schema
   */
  async getSchemaPromptAddition(): Promise<string | null> {
    const { service } = getServices();
    return service.buildSchemaPromptAddition();
  },
};

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_SCHEMAS__ = schemaActions;
}
