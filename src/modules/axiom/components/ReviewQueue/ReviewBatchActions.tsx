/**
 * ReviewBatchActions — Bulk operation toolbar
 * WP 9B.4
 *
 * Shows when 1+ items are selected. Allows bulk approve/reject.
 */

import { Check, X as XIcon, Trash2 } from 'lucide-react';

interface ReviewBatchActionsProps {
  count: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClear: () => void;
}

export function ReviewBatchActions({
  count,
  onApproveAll,
  onRejectAll,
  onClear,
}: ReviewBatchActionsProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border-b border-blue-500/20 shrink-0">
      <span className="text-[11px] text-blue-400 font-medium">
        {count} selected
      </span>

      <button
        onClick={onApproveAll}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium
          text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded
          hover:bg-emerald-500/20 transition-colors"
      >
        <Check className="w-3 h-3" />
        Approve All
      </button>

      <button
        onClick={onRejectAll}
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium
          text-red-400 bg-red-500/10 border border-red-500/30 rounded
          hover:bg-red-500/20 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
        Reject All
      </button>

      <button
        onClick={onClear}
        className="ml-auto p-1 rounded hover:bg-athena-surface text-athena-muted hover:text-athena-text transition-colors"
        title="Clear selection"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
