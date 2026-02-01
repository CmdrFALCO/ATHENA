/**
 * Knowledge Schema Templates — Type Definitions
 * WP 8.5 - Optional schemas that guide AI extraction toward consistent entity/relationship types
 */

/**
 * A knowledge schema template that guides AI extraction
 */
export interface KnowledgeSchema {
  id: string;
  name: string;
  description: string;

  /** Suggested note/entity types */
  noteTypes: SchemaNodeType[];

  /** Suggested connection/relationship types */
  connectionTypes: SchemaConnectionType[];

  /** Hints added to extraction prompts */
  extractionHints: string[];

  /** Whether this is a built-in schema (non-deletable) */
  isBuiltIn: boolean;

  /** When created */
  createdAt: string;

  /** How many times this schema has been used */
  usageCount: number;
}

/**
 * A suggested entity/note type within a schema
 */
export interface SchemaNodeType {
  /** Type name (e.g., "Person", "Concept", "Action Item") */
  name: string;
  /** Lucide icon name (optional) */
  icon?: string;
  /** Suggested color for visualization (optional) */
  color?: string;
  /** Brief description of when to use this type */
  description?: string;
}

/**
 * A suggested connection/relationship type within a schema
 */
export interface SchemaConnectionType {
  /** Relationship label (e.g., "CITES", "ASSIGNED_TO") */
  label: string;
  /** If set, restrict source node types */
  sourceTypes?: string[];
  /** If set, restrict target node types */
  targetTypes?: string[];
  /** Whether relationship is bidirectional */
  bidirectional?: boolean;
  /** Brief description */
  description?: string;
}

/**
 * Schema configuration in DevSettings
 */
export interface SchemaConfig {
  /** Enable schema features */
  enabled: boolean;
  /** Currently active schema ID (null = no schema) */
  activeSchemaId: string | null;
  /** Show schema hints in chat input area */
  showHintsInChat: boolean;
  /** Include schema guidance in extraction prompts */
  includeInPrompts: boolean;
}

/**
 * Input for creating a new schema
 */
export type CreateSchemaInput = Omit<KnowledgeSchema, 'id' | 'isBuiltIn' | 'createdAt' | 'usageCount'>;

/**
 * Input for updating an existing schema
 */
export type UpdateSchemaInput = Partial<Omit<KnowledgeSchema, 'id' | 'isBuiltIn' | 'createdAt'>>;
