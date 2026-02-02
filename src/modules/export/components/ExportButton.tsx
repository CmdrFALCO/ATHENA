import { Download } from 'lucide-react';
import { exportActions } from '../store/exportActions';
import type { ExportSource } from '../types';

interface ExportButtonProps {
  entityIds: string[];
  source?: ExportSource;
  disabled?: boolean;
}

export function ExportButton({
  entityIds,
  source = 'selection',
  disabled,
}: ExportButtonProps) {
  const isEnabled = entityIds.length > 0 && !disabled;

  const handleClick = () => {
    exportActions.openDialog(source, { entityIds });
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isEnabled}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
        ${
          isEnabled
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
            : 'bg-athena-surface text-athena-muted cursor-not-allowed'
        }
      `}
      title={entityIds.length === 0 ? 'Select items to export' : 'Export selected items'}
    >
      <Download className="w-4 h-4" />
      Export
      {entityIds.length > 0 && (
        <span className="px-1.5 py-0.5 bg-indigo-500/30 rounded text-xs">
          {entityIds.length}
        </span>
      )}
    </button>
  );
}
