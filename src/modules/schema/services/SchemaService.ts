import type { ISchemaAdapter } from '../adapters/SchemaAdapter';
import type { KnowledgeSchema } from '../types';
import { devSettings$ } from '@/config/devSettings';

/**
 * Service for applying schemas to AI prompts and managing schema state.
 * WP 8.5 - Knowledge Schema Templates
 */
export class SchemaService {
  constructor(private adapter: ISchemaAdapter) {}

  /**
   * Get the currently active schema (if any)
   */
  async getActiveSchema(): Promise<KnowledgeSchema | null> {
    const config = devSettings$.schema.get();
    if (!config.enabled || !config.activeSchemaId) {
      return null;
    }
    return this.adapter.getById(config.activeSchemaId);
  }

  /**
   * Build extraction prompt additions for the active schema.
   * Returns null if no schema is active or prompts are disabled.
   */
  async buildSchemaPromptAddition(): Promise<string | null> {
    const config = devSettings$.schema.get();
    if (!config.enabled || !config.includeInPrompts) {
      return null;
    }

    const schema = await this.getActiveSchema();
    if (!schema) return null;

    const noteTypesList = schema.noteTypes.map(t => t.name).join(', ');
    const connectionTypesList = schema.connectionTypes.map(t => t.label).join(', ');
    const hintsList = schema.extractionHints.map(h => `- ${h}`).join('\n');

    return `
## Knowledge Schema: ${schema.name}

**Suggested entity types:** ${noteTypesList}

**Suggested relationship types:** ${connectionTypesList}

**Extraction guidance:**
${hintsList}

Use these types when they fit naturally. Don't force-fit — if content doesn't match the schema, use appropriate free-form types instead.
`.trim();
  }

  /**
   * Record that a schema was used for extraction
   */
  async recordUsage(schemaId: string): Promise<void> {
    await this.adapter.incrementUsage(schemaId);
  }

  /**
   * Get all schemas grouped by category
   */
  async getSchemasGrouped(): Promise<{
    builtIn: KnowledgeSchema[];
    custom: KnowledgeSchema[];
  }> {
    const [builtIn, custom] = await Promise.all([
      this.adapter.getBuiltIn(),
      this.adapter.getCustom(),
    ]);
    return { builtIn, custom };
  }

  /**
   * Get suggested node types for the active schema
   */
  async getSuggestedNodeTypes(): Promise<string[]> {
    const schema = await this.getActiveSchema();
    return schema ? schema.noteTypes.map(t => t.name) : [];
  }

  /**
   * Get suggested connection types for the active schema
   */
  async getSuggestedConnectionTypes(): Promise<string[]> {
    const schema = await this.getActiveSchema();
    return schema ? schema.connectionTypes.map(t => t.label) : [];
  }
}
