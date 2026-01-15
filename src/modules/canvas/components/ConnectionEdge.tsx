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
  const themeKey = colorToThemeKey[edgeData?.color ?? 'blue'];
  const color = ATHENA_COLORS.connection[themeKey];
  const strokeWidth = selected ? 3 : 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth,
          transition: 'stroke-width 150ms ease',
        }}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: ATHENA_COLORS.surface.panel,
              color: ATHENA_COLORS.text.secondary,
              border: `1px solid ${ATHENA_COLORS.surface.nodeBorder}`,
            }}
            className="px-2 py-0.5 rounded text-xs font-medium"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
