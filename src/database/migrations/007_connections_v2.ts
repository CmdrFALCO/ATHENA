import type { DatabaseConnection } from '../init';

/**
 * Migration 007: Add node type columns to connections
 *
 * This migration adds source_type and target_type columns to the connections table
 * to support connections between different node types (entities and resources).
 *
 * Existing connections are preserved with 'entity' as the default type.
 */
export async function upgradeConnections(db: DatabaseConnection): Promise<void> {
  // Check if columns already exist
  const columns = await db.exec<{ name: string }>(
    "SELECT name FROM pragma_table_info('connections')"
  );
  const hasSourceType = columns.some((col) => col.name === 'source_type');
  const hasTargetType = columns.some((col) => col.name === 'target_type');

  // Add source_type column if not exists
  if (!hasSourceType) {
    await db.run(
      `ALTER TABLE connections ADD COLUMN source_type TEXT NOT NULL DEFAULT 'entity'`
    );
  }

  // Add target_type column if not exists
  if (!hasTargetType) {
    await db.run(
      `ALTER TABLE connections ADD COLUMN target_type TEXT NOT NULL DEFAULT 'entity'`
    );
  }

  // Create composite indexes for efficient node lookups
  // Note: These indexes help with getForNode() queries
  await db.run(`CREATE INDEX IF NOT EXISTS idx_connections_source_typed ON connections(source_type, source_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_connections_target_typed ON connections(target_type, target_id)`);
}
