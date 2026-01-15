import { useState, useEffect, useCallback } from 'react';
import { X, Link2, Trash2, Tag } from 'lucide-react';
import { ATHENA_COLORS } from '@/shared/theme';
import { useConnectionAdapter } from '@/adapters';
import { connectionActions, useNote } from '@/store';
import type { Connection, ConnectionColor } from '@/shared/types';
import { formatDate } from '@/shared/utils';

interface ConnectionInspectorProps {
  connection: Connection;
  onClose: () => void;
}

// Map connection color to theme key
const colorToThemeKey: Record<ConnectionColor, keyof typeof ATHENA_COLORS.connection> = {
  blue: 'explicit',
  green: 'semantic',
  red: 'error',
  amber: 'warning',
};

// Map connection color to display label
const colorToLabel: Record<ConnectionColor, string> = {
  blue: 'Explicit',
  green: 'AI Suggested',
  red: 'Validation Error',
  amber: 'Validation Warning',
};

export function ConnectionInspector({ connection, onClose }: ConnectionInspectorProps) {
  const connectionAdapter = useConnectionAdapter();
  const sourceNote = useNote(connection.source_id);
  const targetNote = useNote(connection.target_id);

  const [label, setLabel] = useState(connection.label ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync label when connection changes
  useEffect(() => {
    setLabel(connection.label ?? '');
  }, [connection.label]);

  const handleLabelSave = useCallback(async () => {
    if (label === (connection.label ?? '')) return;

    setIsSaving(true);
    try {
      const newLabel = label.trim() || null;
      await connectionAdapter.update(connection.id, { label: newLabel });
      connectionActions.updateConnection(connection.id, { label: newLabel });
    } catch (error) {
      console.error('Failed to update connection label:', error);
    } finally {
      setIsSaving(false);
    }
  }, [connection.id, connection.label, label, connectionAdapter]);

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm('Delete this connection? This cannot be undone.');
    if (!confirmed) return;

    try {
      await connectionAdapter.delete(connection.id);
      connectionActions.removeConnection(connection.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  }, [connection.id, connectionAdapter, onClose]);

  const themeKey = colorToThemeKey[connection.color];
  const colorLabel = colorToLabel[connection.color];

  return (
    <div
      className="absolute top-4 right-4 w-80 rounded-lg shadow-xl z-50 overflow-hidden connection-inspector"
      style={{
        backgroundColor: ATHENA_COLORS.surface.panel,
        border: `1px solid ${ATHENA_COLORS.surface.nodeBorder}`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: ATHENA_COLORS.surface.nodeBorder }}
      >
        <div className="flex items-center gap-2">
          <Link2 size={18} style={{ color: ATHENA_COLORS.connection[themeKey] }} />
          <span
            className="font-medium"
            style={{ color: ATHENA_COLORS.text.primary }}
          >
            Connection
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-neutral-700 transition-colors"
          style={{ color: ATHENA_COLORS.text.secondary }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Source → Target */}
        <div>
          <div
            className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: ATHENA_COLORS.text.muted }}
          >
            Connection
          </div>
          <div
            className="p-3 rounded-lg space-y-2"
            style={{ backgroundColor: ATHENA_COLORS.surface.canvas }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: ATHENA_COLORS.node.note,
                  color: 'white',
                }}
              >
                FROM
              </span>
              <span
                className="text-sm truncate"
                style={{ color: ATHENA_COLORS.text.primary }}
              >
                {sourceNote?.title ?? 'Unknown'}
              </span>
            </div>
            <div
              className="border-l-2 ml-3 h-3"
              style={{ borderColor: ATHENA_COLORS.connection[themeKey] }}
            />
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: ATHENA_COLORS.node.note,
                  color: 'white',
                }}
              >
                TO
              </span>
              <span
                className="text-sm truncate"
                style={{ color: ATHENA_COLORS.text.primary }}
              >
                {targetNote?.title ?? 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Label */}
        <div>
          <label
            className="text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1"
            style={{ color: ATHENA_COLORS.text.muted }}
          >
            <Tag size={12} />
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Add a label..."
            disabled={isSaving}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{
              backgroundColor: ATHENA_COLORS.surface.canvas,
              color: ATHENA_COLORS.text.primary,
              border: `1px solid ${ATHENA_COLORS.surface.nodeBorder}`,
            }}
          />
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: ATHENA_COLORS.text.muted }}
          >
            Details
          </div>
          <div className="space-y-1.5">
            <MetadataRow label="Type" value={colorLabel} />
            <MetadataRow label="Created by" value={connection.created_by} />
            <MetadataRow label="Created" value={formatDate(connection.created_at)} />
            {connection.confidence !== null && (
              <MetadataRow
                label="Confidence"
                value={`${Math.round(connection.confidence * 100)}%`}
              />
            )}
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/20"
          style={{
            color: ATHENA_COLORS.connection.error,
            border: `1px solid ${ATHENA_COLORS.connection.error}`,
          }}
        >
          <Trash2 size={16} />
          Delete Connection
        </button>
      </div>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: ATHENA_COLORS.text.muted }}>{label}</span>
      <span style={{ color: ATHENA_COLORS.text.secondary }}>{value}</span>
    </div>
  );
}
