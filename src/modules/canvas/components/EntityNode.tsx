import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText, Target, FileOutput } from 'lucide-react';
import { ATHENA_COLORS } from '@/shared/theme';
import { useSelectedEntityIds } from '@/store';
import { useViolations } from '@/modules/validation';
import type { EntityType } from '@/shared/types';
import { useNodeViolations } from '../hooks/useNodeViolations';
import { ViolationBadge } from './ViolationBadge';
import { ViolationTooltip } from './ViolationTooltip';

export interface EntityNodeData extends Record<string, unknown> {
  entityId: string;
  title: string;
  type: EntityType;
}

const typeIcons: Record<EntityType, React.ReactNode> = {
  note: <FileText size={14} />,
  plan: <Target size={14} />,
  document: <FileOutput size={14} />,
};

const typeLabels: Record<EntityType, string> = {
  note: 'Note',
  plan: 'Plan',
  document: 'Document',
};

export const EntityNode = memo(function EntityNode({
  data,
  selected,
}: NodeProps) {
  const { entityId, title, type } = data as EntityNodeData;
  const selectedIds = useSelectedEntityIds();
  const isStoreSelected = selectedIds.includes(entityId);

  const [showTooltip, setShowTooltip] = useState(false);

  // Get violations for this node
  const { errorCount, warningCount, hasErrors, hasWarnings, violations } =
    useNodeViolations(entityId);
  const { applyFix } = useViolations();

  const borderColor = ATHENA_COLORS.node[type];
  const isHighlighted = selected || isStoreSelected;

  // Determine glow style based on violations (errors take priority)
  const getGlowStyle = (): React.CSSProperties => {
    if (hasErrors) {
      return { boxShadow: `0 0 0 2px ${ATHENA_COLORS.validation.errorGlow}` };
    }
    if (hasWarnings) {
      return { boxShadow: `0 0 0 2px ${ATHENA_COLORS.validation.warningGlow}` };
    }
    return {};
  };

  return (
    <div className="relative">
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-neutral-500 !w-2 !h-2"
      />

      <div
        className={`
          min-w-[180px] max-w-[280px] rounded-lg overflow-hidden
          transition-all duration-150
          ${isHighlighted
            ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/20'
            : 'shadow-md'
          }
        `}
        style={{
          backgroundColor: ATHENA_COLORS.surface.node,
          borderLeft: `3px solid ${borderColor}`,
          ...getGlowStyle(),
        }}
      >
        {/* Header with type badge */}
        <div
          className="px-3 py-1.5 flex items-center gap-2 border-b"
          style={{
            borderColor: ATHENA_COLORS.surface.nodeBorder,
            color: ATHENA_COLORS.text.secondary,
          }}
        >
          <span style={{ color: borderColor }}>
            {typeIcons[type]}
          </span>
          <span className="text-xs font-medium uppercase tracking-wide">
            {typeLabels[type]}
          </span>
        </div>

        {/* Title */}
        <div
          className="px-3 py-2"
          style={{ color: ATHENA_COLORS.text.primary }}
        >
          <p className="text-sm font-medium truncate">
            {title || 'Untitled'}
          </p>
        </div>
      </div>

      {/* Violation badge */}
      <ViolationBadge
        errorCount={errorCount}
        warningCount={warningCount}
        onClick={() => setShowTooltip(!showTooltip)}
      />

      {/* Violation tooltip */}
      {showTooltip && (
        <ViolationTooltip
          violations={violations}
          onClose={() => setShowTooltip(false)}
          onApplyFix={async (id) => {
            await applyFix(id);
            setShowTooltip(false);
          }}
        />
      )}

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-neutral-500 !w-2 !h-2"
      />
    </div>
  );
});
