import { memo } from 'react';
import { X, Wrench, Eye } from 'lucide-react';
import { ATHENA_COLORS } from '@/shared/theme/colors';
import type { Violation } from '@/modules/validation';

interface ViolationTooltipProps {
  violations: Violation[];
  onClose: () => void;
  onShowInPanel?: (violationId: string) => void;
  onApplyFix?: (violationId: string) => void;
}

/**
 * Tooltip/popover showing violation details when badge is clicked.
 * Displays list of violations with severity indicators and action buttons.
 */
export const ViolationTooltip = memo(function ViolationTooltip({
  violations,
  onClose,
  onShowInPanel,
  onApplyFix,
}: ViolationTooltipProps) {
  if (violations.length === 0) return null;

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50
                 rounded-lg shadow-lg min-w-[250px] max-w-[350px] nodrag nopan"
      style={{
        backgroundColor: ATHENA_COLORS.surface.panel,
        border: `1px solid ${ATHENA_COLORS.surface.nodeBorder}`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: `1px solid ${ATHENA_COLORS.surface.nodeBorder}` }}
      >
        <span
          className="text-sm font-medium"
          style={{ color: ATHENA_COLORS.text.primary }}
        >
          {violations.length} Violation{violations.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClose}
          className="hover:opacity-80 transition-opacity"
          style={{ color: ATHENA_COLORS.text.muted }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Violation list */}
      <div className="max-h-[200px] overflow-y-auto">
        {violations.map((v) => (
          <div
            key={v.id}
            className="px-3 py-2"
            style={{ borderBottom: `1px solid ${ATHENA_COLORS.surface.nodeBorder}` }}
          >
            <div className="flex items-start gap-2">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  backgroundColor:
                    v.severity === 'error'
                      ? ATHENA_COLORS.validation.error
                      : ATHENA_COLORS.validation.warning,
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm"
                  style={{ color: ATHENA_COLORS.text.primary }}
                >
                  {v.message}
                </p>
                {v.suggestion && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: ATHENA_COLORS.text.muted }}
                  >
                    {v.suggestion.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2 ml-4">
              {v.suggestion?.autoApplicable && onApplyFix && (
                <button
                  onClick={() => onApplyFix(v.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs
                           rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                  }}
                >
                  <Wrench className="w-3 h-3" />
                  Fix
                </button>
              )}
              {onShowInPanel && (
                <button
                  onClick={() => onShowInPanel(v.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs
                           rounded hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: ATHENA_COLORS.surface.nodeBorder,
                    color: ATHENA_COLORS.text.muted,
                  }}
                >
                  <Eye className="w-3 h-3" />
                  Details
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
