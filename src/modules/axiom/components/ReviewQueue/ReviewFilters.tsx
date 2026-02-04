/**
 * ReviewFilters — Sort and filter controls for the review queue
 * WP 9B.4
 *
 * Compact single-row layout with sort buttons and filter dropdown.
 */

import type { ReviewSortField, ReviewFilterReason } from '../../autonomous/review/types';

interface ReviewFiltersProps {
  sort: ReviewSortField;
  filter: ReviewFilterReason;
  onSort: (field: ReviewSortField) => void;
  onFilter: (reason: ReviewFilterReason) => void;
}

const SORT_OPTIONS: { value: ReviewSortField; label: string }[] = [
  { value: 'confidence_asc', label: 'Conf. \u2191' },
  { value: 'confidence_desc', label: 'Conf. \u2193' },
  { value: 'date_desc', label: 'Newest' },
  { value: 'date_asc', label: 'Oldest' },
  { value: 'reason', label: 'Reason' },
];

const FILTER_OPTIONS: { value: ReviewFilterReason; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low_confidence', label: 'Low Confidence' },
  { value: 'floor_veto', label: 'Floor Veto' },
  { value: 'validation_failed', label: 'Validation Failed' },
  { value: 'rate_limited', label: 'Rate Limited' },
  { value: 'scope_restricted', label: 'Scope Restricted' },
];

export function ReviewFilters({ sort, filter, onSort, onFilter }: ReviewFiltersProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-athena-border shrink-0">
      <span className="text-[10px] text-athena-muted">Sort:</span>
      <div className="flex gap-0.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSort(opt.value)}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              sort === opt.value
                ? 'bg-blue-500/20 text-blue-400 font-medium'
                : 'text-athena-muted hover:text-athena-text hover:bg-athena-surface'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <span className="text-athena-border ml-auto">|</span>

      <span className="text-[10px] text-athena-muted">Filter:</span>
      <select
        value={filter}
        onChange={(e) => onFilter(e.target.value as ReviewFilterReason)}
        className="text-[10px] bg-athena-surface border border-athena-border rounded px-1.5 py-0.5
          text-athena-text focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
