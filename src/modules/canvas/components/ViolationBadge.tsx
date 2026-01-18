import { memo } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ATHENA_COLORS } from '@/shared/theme/colors';

interface ViolationBadgeProps {
  errorCount: number;
  warningCount: number;
  onClick?: () => void;
}

/**
 * Badge showing violation counts on canvas nodes.
 * Shows error count if any errors, otherwise warning count.
 * Positioned absolutely in top-right of parent node.
 */
export const ViolationBadge = memo(function ViolationBadge({
  errorCount,
  warningCount,
  onClick,
}: ViolationBadgeProps) {
  if (errorCount === 0 && warningCount === 0) return null;

  const hasErrors = errorCount > 0;
  const color = hasErrors
    ? ATHENA_COLORS.validation.error
    : ATHENA_COLORS.validation.warning;
  const Icon = hasErrors ? AlertCircle : AlertTriangle;
  const count = hasErrors ? errorCount : warningCount;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="absolute -top-2 -right-2 flex items-center justify-center
                 min-w-[20px] h-5 px-1 rounded-full text-xs font-medium
                 text-white shadow-md hover:scale-110 transition-transform
                 nodrag nopan z-10"
      style={{ backgroundColor: color }}
      title={`${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
    >
      <Icon className="w-3 h-3 mr-0.5" />
      {count}
    </button>
  );
});
