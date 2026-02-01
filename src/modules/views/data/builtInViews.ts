// src/modules/views/data/builtInViews.ts — WP 8.9: Smart Views

import type { SmartView } from '../types';

/**
 * System-provided Smart Views.
 * These are read-only and always available.
 */
export const builtInViews: SmartView[] = [
  {
    id: 'orphan-notes',
    name: 'Orphan Notes',
    description: 'Notes with no connections to other notes',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at
      FROM entities e
      WHERE e.type = 'note'
        AND e.invalid_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM connections c
          WHERE (c.source_id = e.id OR c.target_id = e.id)
            AND c.invalid_at IS NULL
        )
      ORDER BY e.updated_at DESC
      LIMIT :limit
    `,
    parameters: [
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
    ],
    category: 'sophia',
    icon: 'Unlink',
    createdBy: 'system',
  },
  {
    id: 'recent-notes',
    name: 'Recent Notes',
    description: 'Notes created in the last N days',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at
      FROM entities e
      WHERE e.type = 'note'
        AND e.invalid_at IS NULL
        AND e.created_at >= datetime('now', '-' || :days || ' days')
      ORDER BY e.created_at DESC
      LIMIT :limit
    `,
    parameters: [
      { name: 'days', label: 'Days', type: 'number', required: true, defaultValue: 7 },
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
    ],
    category: 'sophia',
    icon: 'Clock',
    createdBy: 'system',
  },
  {
    id: 'weakly-connected',
    name: 'Weakly Connected',
    description: 'Notes with only one connection (may need more integration)',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at,
             COUNT(c.id) as connection_count
      FROM entities e
      LEFT JOIN connections c ON (c.source_id = e.id OR c.target_id = e.id)
        AND c.invalid_at IS NULL
      WHERE e.type = 'note'
        AND e.invalid_at IS NULL
      GROUP BY e.id
      HAVING COUNT(c.id) = 1
      ORDER BY e.updated_at DESC
      LIMIT :limit
    `,
    parameters: [
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
    ],
    category: 'sophia',
    icon: 'Link',
    createdBy: 'system',
  },
  {
    id: 'stale-notes',
    name: 'Stale Notes',
    description: 'Notes not updated in N days (may need review)',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at
      FROM entities e
      WHERE e.type = 'note'
        AND e.invalid_at IS NULL
        AND e.updated_at < datetime('now', '-' || :days || ' days')
      ORDER BY e.updated_at ASC
      LIMIT :limit
    `,
    parameters: [
      { name: 'days', label: 'Days Since Update', type: 'number', required: true, defaultValue: 30 },
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
    ],
    category: 'sophia',
    icon: 'Archive',
    createdBy: 'system',
  },
  {
    id: 'by-type',
    name: 'By Type',
    description: 'Filter entities by type',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at
      FROM entities e
      WHERE e.type = :type
        AND e.invalid_at IS NULL
      ORDER BY e.updated_at DESC
      LIMIT :limit
    `,
    parameters: [
      {
        name: 'type',
        label: 'Entity Type',
        type: 'select',
        required: true,
        defaultValue: 'note',
        options: [
          { value: 'note', label: 'Note' },
          { value: 'plan', label: 'Plan' },
          { value: 'document', label: 'Document' },
        ],
      },
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
    ],
    category: 'sophia',
    icon: 'Filter',
    createdBy: 'system',
  },
  {
    id: 'unembedded-notes',
    name: 'Unembedded Notes',
    description: 'Notes missing embeddings (search may not find them)',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at
      FROM entities e
      WHERE e.type = 'note'
        AND e.invalid_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM embeddings emb
          WHERE emb.entity_id = e.id
        )
      ORDER BY e.created_at DESC
      LIMIT :limit
    `,
    parameters: [
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 50 },
    ],
    category: 'system',
    icon: 'AlertCircle',
    createdBy: 'system',
  },
  {
    id: 'most-connected',
    name: 'Most Connected',
    description: 'Notes with the most connections (knowledge hubs)',
    sql: `
      SELECT e.id, e.title, e.type, e.content, e.created_at, e.updated_at,
             COUNT(c.id) as connection_count
      FROM entities e
      LEFT JOIN connections c ON (c.source_id = e.id OR c.target_id = e.id)
        AND c.invalid_at IS NULL
      WHERE e.type = 'note'
        AND e.invalid_at IS NULL
      GROUP BY e.id
      HAVING COUNT(c.id) >= :minConnections
      ORDER BY connection_count DESC
      LIMIT :limit
    `,
    parameters: [
      { name: 'minConnections', label: 'Min Connections', type: 'number', required: true, defaultValue: 3 },
      { name: 'limit', label: 'Max Results', type: 'number', required: false, defaultValue: 20 },
    ],
    category: 'sophia',
    icon: 'Network',
    createdBy: 'system',
  },
];

export function getBuiltInView(id: string): SmartView | undefined {
  return builtInViews.find((v) => v.id === id);
}

export function getBuiltInViewsByCategory(category: SmartView['category']): SmartView[] {
  return builtInViews.filter((v) => v.category === category);
}
