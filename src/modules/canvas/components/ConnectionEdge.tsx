import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { ATHENA_COLORS } from '@/shared/theme';
import type { ConnectionColor } from '@/shared/types';

// Map connection color to theme key
const colorToThemeKey: Record<ConnectionColor, keyof typeof ATHENA_COLORS.connection> = {
  blue: 'explicit',
  green: 'semantic',
  red: 'error',
  amber: 'warning',
};

export interface ConnectionEdgeData extends Record<string, unknown> {
  connectionId: string;
  label?: string | null;
  color: ConnectionColor;
  isSuggested?: boolean;  // WP 3.5: Green suggested connections
  similarity?: number;    // WP 3.5: Similarity score (0-1) for suggestions
}

export const ConnectionEdge = memo(function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as ConnectionEdgeData | undefined;
  const isSuggested = edgeData?.isSuggested ?? false;
  const themeKey = colorToThemeKey[edgeData?.color ?? 'blue'];
  const color = ATHENA_COLORS.connection[themeKey];
  const strokeWidth = selected ? 3 : 2;

  // Suggested edges have dashed styling and reduced opacity
  const strokeDasharray = isSuggested ? '8,4' : undefined;
  const opacity = isSuggested ? 0.75 : 1;

  // For suggestions, show similarity percentage if no label is provided
  const displayLabel = edgeData?.label ?? (
    isSuggested && edgeData?.similarity !== undefined
      ? `${Math.round(edgeData.similarity * 100)}%`
      : null
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray,
          opacity,
          transition: 'stroke-width 150ms ease, opacity 150ms ease',
        }}
      />
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: isSuggested
                ? ATHENA_COLORS.connection.semantic + '20' // Green with transparency
                : ATHENA_COLORS.surface.panel,
              color: isSuggested
                ? ATHENA_COLORS.connection.semantic
                : ATHENA_COLORS.text.secondary,
              border: `1px solid ${isSuggested ? ATHENA_COLORS.connection.semantic : ATHENA_COLORS.surface.nodeBorder}`,
              opacity: isSuggested ? 0.9 : 1,
            }}
            className="px-2 py-0.5 rounded text-xs font-medium"
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
