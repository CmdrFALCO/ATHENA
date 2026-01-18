/**
 * FacetSidebar - Facet filter sidebar for search panel
 * WP 4.6: Faceted Search Panel
 */

import { FileText, Calendar, Folder } from 'lucide-react';
import type { Facet, FacetSelection } from '../types/facets';

interface FacetSidebarProps {
  facets: Facet[];
  selection: FacetSelection;
  onFacetChange: (facetId: string, value: string) => void;
  onClear: () => void;
}

function FacetIcon({ facetId }: { facetId: string }) {
  switch (facetId) {
    case 'type':
      return <FileText className="w-4 h-4" />;
    case 'created':
      return <Calendar className="w-4 h-4" />;
    default:
      return <Folder className="w-4 h-4" />;
  }
}

interface FacetGroupProps {
  facet: Facet;
  selected: string[];
  onChange: (value: string) => void;
}

function FacetGroup({ facet, selected, onChange }: FacetGroupProps) {
  return (
    <div className="mb-6">
      <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-2">
        <FacetIcon facetId={facet.id} />
        {facet.label}
      </h4>
      <ul className="space-y-1">
        {facet.values.map((value) => (
          <li key={value.value}>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800/50 px-2 py-1.5 rounded transition-colors">
              <input
                type="checkbox"
                checked={selected.includes(value.value)}
                onChange={() => onChange(value.value)}
                className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="flex-1 text-sm text-zinc-300">{value.label}</span>
              <span className="text-xs text-zinc-500">({value.count})</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FacetSidebar({
  facets,
  selection,
  onFacetChange,
  onClear,
}: FacetSidebarProps) {
  const hasSelection = Object.values(selection).some((arr) => arr.length > 0);

  return (
    <aside className="w-56 border-r border-zinc-700 p-4 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-zinc-300">Filters</h3>
        {hasSelection && (
          <button
            onClick={onClear}
            className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {facets.map((facet) => (
        <FacetGroup
          key={facet.id}
          facet={facet}
          selected={selection[facet.id] || []}
          onChange={(value) => onFacetChange(facet.id, value)}
        />
      ))}

      {facets.length === 0 && (
        <p className="text-sm text-zinc-500">Search to see filters</p>
      )}
    </aside>
  );
}
