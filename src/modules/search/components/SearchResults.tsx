/**
 * SearchResults - Display list of search results with actions
 * WP 4.6: Faceted Search Panel
 */

import { FileText, ClipboardList, FileEdit, Map, Loader2 } from 'lucide-react';
import type { SearchResult } from '@/adapters/ISearchAdapter';
import type { EntityType } from '@/shared/types';

interface SearchResultsProps {
  results: SearchResult[];
  isSearching: boolean;
  query: string;
  onResultClick: (entityId: string) => void;
  onShowOnCanvas: (entityId: string) => void;
}

/**
 * Get the icon for an entity type.
 */
function getEntityIcon(type: EntityType) {
  switch (type) {
    case 'note':
      return <FileText className="w-4 h-4" />;
    case 'plan':
      return <ClipboardList className="w-4 h-4" />;
    case 'document':
      return <FileEdit className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

/**
 * Get CSS classes for match type badge.
 */
function getMatchTypeBadgeClasses(matchType: SearchResult['matchType']): string {
  const base = 'text-xs px-1.5 py-0.5 rounded font-medium';
  switch (matchType) {
    case 'hybrid':
      return `${base} bg-purple-900/50 text-purple-300`;
    case 'keyword':
      return `${base} bg-blue-900/50 text-blue-300`;
    case 'semantic':
      return `${base} bg-green-900/50 text-green-300`;
    default:
      return base;
  }
}

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
  onShowOnCanvas: () => void;
}

function SearchResultItem({ result, onClick, onShowOnCanvas }: SearchResultItemProps) {
  return (
    <li className="border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors">
      <div className="flex items-start gap-2">
        <button
          onClick={onClick}
          className="flex-1 p-3 text-left hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-zinc-400">{getEntityIcon(result.type)}</span>
            <span className="font-medium text-zinc-100 truncate">{result.title}</span>
            <span className={getMatchTypeBadgeClasses(result.matchType)}>
              {result.matchType}
            </span>
          </div>

          {result.snippet && (
            <p
              className="text-sm text-zinc-400 line-clamp-2 pl-6"
              dangerouslySetInnerHTML={{ __html: result.snippet }}
            />
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 pl-6">
            <span>Score: {result.score.toFixed(4)}</span>
            <span className="capitalize">{result.type}</span>
          </div>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowOnCanvas();
          }}
          className="p-3 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          title="Show on canvas"
        >
          <Map className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

export function SearchResults({
  results,
  isSearching,
  query,
  onResultClick,
  onShowOnCanvas,
}: SearchResultsProps) {
  // Empty state - no query
  if (!query.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <p>Enter a search term to find notes</p>
      </div>
    );
  }

  // Loading state
  if (isSearching) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <p>No results for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-sm text-zinc-500 mb-4">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </p>

      <ul className="space-y-3">
        {results.map((result) => (
          <SearchResultItem
            key={result.entityId}
            result={result}
            onClick={() => onResultClick(result.entityId)}
            onShowOnCanvas={() => onShowOnCanvas(result.entityId)}
          />
        ))}
      </ul>
    </div>
  );
}
