export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  -- Entities table (notes, plans, documents)
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('note', 'plan', 'document')),
    subtype TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    valid_at TEXT NOT NULL,
    invalid_at TEXT,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0
  );

  -- Connections table
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES entities(id),
    target_id TEXT NOT NULL REFERENCES entities(id),
    type TEXT NOT NULL CHECK (type IN ('explicit', 'semantic', 'validation')),
    color TEXT NOT NULL CHECK (color IN ('blue', 'green', 'red', 'amber')),
    label TEXT,
    confidence REAL,
    created_by TEXT NOT NULL CHECK (created_by IN ('user', 'ai', 'system')),
    created_at TEXT NOT NULL,
    valid_at TEXT NOT NULL,
    invalid_at TEXT
  );

  -- Embeddings table
  CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    chunk_index INTEGER DEFAULT 0,
    vector TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
  CREATE INDEX IF NOT EXISTS idx_entities_valid ON entities(valid_at, invalid_at);
  CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source_id);
  CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id);
  CREATE INDEX IF NOT EXISTS idx_connections_color ON connections(color);
  CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_id);

  -- Schema version tracking
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '${SCHEMA_VERSION}');
`;
