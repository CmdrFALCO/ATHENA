/**
 * Faceted Search Types
 * WP 4.6: Faceted Search Panel
 */

export interface Facet {
  id: string;           // e.g., 'type', 'created'
  label: string;        // e.g., 'Type', 'Created'
  type: 'exact' | 'date_range';
  values: FacetValue[];
}

export interface FacetValue {
  value: string;        // e.g., 'note', 'today'
  label: string;        // e.g., 'Note', 'Today'
  count: number;        // Number of results with this value
  selected: boolean;
}

export interface FacetSelection {
  [facetId: string]: string[];  // e.g., { type: ['note'], created: ['today', 'this_week'] }
}

export type DateRangeBucket = 'today' | 'this_week' | 'this_month' | 'older';

export const DATE_BUCKET_LABELS: Record<DateRangeBucket, string> = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  older: 'Older',
};
