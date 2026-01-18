import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { ATHENA_COLORS } from '@/shared/theme';
import type { ConnectionColor } from '@/shared/types';
import { SuggestionPopover } from './SuggestionPopover';
import { useSuggestionActions } from '@/modules/ai/hooks/useSuggestionActions';
import { useEdgeViolations } from '../hooks/useEdgeViolations';

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
  // WP 3.6: Source/target IDs for suggestion accept flow
  sourceId?: string;
  targetId?: string;
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
  const [showPopover, setShowPopover] = useState(false);
  const { acceptSuggestion, dismissSuggestion, isAccepting } = useSuggestionActions();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as ConnectionEdgeData | undefined;
  const connectionId = edgeData?.connectionId ?? id;

  // Check for violations on this connection
  const { hasErrors, hasWarnings, edgeStyle } = useEdgeViolations(connectionId);

  const isSuggested = edgeData?.isSuggested ?? false;

  // Determine color: violations override normal color
  const getEdgeColor = () => {
    if (hasErrors) return ATHENA_COLORS.validation.error;
    if (hasWarnings) return ATHENA_COLORS.validation.warning;
    // Fall back to normal color based on connection type
    const themeKey = colorToThemeKey[edgeData?.color ?? 'blue'];
    return ATHENA_COLORS.connection[themeKey];
  };

  const color = getEdgeColor();

  // Stroke width: slightly thicker when there are violations
  const strokeWidth = selected ? 3 : edgeStyle ? 2.5 : 2;

  // Suggested edges have dashed styling; warnings also use dashed
  const getStrokeDasharray = () => {
    if (isSuggested) return '8,4';
    if (hasWarnings && !hasErrors) return '5,5';
    return undefined;
  };

  const strokeDasharray = getStrokeDasharray();
  const opacity = isSuggested ? 0.75 : 1;

  // For suggestions, show similarity percentage if no label is provided
  const displayLabel = edgeData?.label ?? (
    isSuggested && edgeData?.similarity !== undefined
      ? `${Math.round(edgeData.similarity * 100)}%`
      : null
  );

  // Handle click on suggested edge label to show popover
  const handleLabelClick = useCallback(
    (e: React.MouseEvent) => {
      if (isSuggested) {
        e.stopPropagation();
        setShowPopover(true);
      }
    },
    [isSuggested]
  );

  // Handle accept action
  const handleAccept = useCallback(async () => {
    if (!edgeData?.sourceId || !edgeData?.targetId || edgeData?.similarity === undefined) {
      console.error('[ConnectionEdge] Missing data for accepting suggestion');
      return;
    }
    try {
      await acceptSuggestion(
        edgeData.connectionId,
        edgeData.sourceId,
        edgeData.targetId,
        edgeData.similarity
      );
    } catch (err) {
      console.error('[ConnectionEdge] acceptSuggestion error:', err);
    }
    setShowPopover(false);
  }, [edgeData, acceptSuggestion]);

  // Handle dismiss action
  const handleDismiss = useCallback(() => {
    dismissSuggestion(edgeData?.connectionId ?? id);
    setShowPopover(false);
  }, [edgeData?.connectionId, id, dismissSuggestion]);

  // Close popover when clicking elsewhere on the canvas
  // (handled by GraphCanvas pane click which will trigger re-render)

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
          {/* Container for label and popover */}
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            className="nodrag nopan"
          >
            {/* Edge label */}
            <div
              style={{
                backgroundColor: isSuggested
                  ? ATHENA_COLORS.connection.semantic + '20'
                  : ATHENA_COLORS.surface.panel,
                color: isSuggested
                  ? ATHENA_COLORS.connection.semantic
                  : ATHENA_COLORS.text.secondary,
                border: `1px solid ${isSuggested ? ATHENA_COLORS.connection.semantic : ATHENA_COLORS.surface.nodeBorder}`,
                opacity: isSuggested ? 0.9 : 1,
                cursor: isSuggested ? 'pointer' : 'default',
                pointerEvents: 'all',
              }}
              className="px-2 py-0.5 rounded text-xs font-medium nodrag nopan"
              onClick={handleLabelClick}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {displayLabel}
            </div>

            {/* WP 3.6: Suggestion accept/dismiss popover */}
            {isSuggested && showPopover && edgeData?.similarity !== undefined && (
              <SuggestionPopover
                similarity={edgeData.similarity}
                isAccepting={isAccepting}
                onAccept={handleAccept}
                onDismiss={handleDismiss}
              />
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
