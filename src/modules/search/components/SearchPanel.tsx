/**
 * SearchPanel - Main search panel with faceted filtering
 * WP 4.6: Faceted Search Panel
 *
 * "Power search" interface for complex queries with filters.
 * Complementary to Command Palette (Cmd+K) which handles quick jumps.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useHybridSearch } from '../hooks/useHybridSearch';
import { FacetSidebar } from './FacetSidebar';
import { SearchResults } from './SearchResults';
import { FacetService } from '../services/FacetService';
import { uiActions } from '@/store';
import type { FacetSelection } from '../types/facets';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<FacetSelection>({});
  const { results, isSearching, search, clear } = useHybridSearch();

  const facetService = useMemo(() => new FacetService(), []);

  // Extract facets from all results (before filtering)
  const facets = useMemo(
    () => facetService.extractFacets(results, selection),
    [facetService, results, selection]
  );

  // Apply facet filters to results
  const filteredResults = useMemo(
    () => facetService.applyFacets(results, selection),
    [facetService, results, selection]
  );

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query, { limit: 50 });
      } else {
        clear();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search, clear, isOpen]);

  // Reset state when panel opens/closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelection({});
      clear();
    }
  }, [isOpen, clear]);

  const handleFacetChange = useCallback((facetId: string, value: string) => {
    setSelection((prev) => {
      const current = prev[facetId] || [];
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [facetId]: newValues };
    });
  }, []);

  const clearFacets = useCallback(() => setSelection({}), []);

  const handleResultClick = useCallback(
    (entityId: string) => {
      // Select the entity and close the panel
      uiActions.selectEntity(entityId);
      onClose();
    },
    [onClose]
  );

  const handleShowOnCanvas = useCallback(
    (entityId: string) => {
      // Close search panel
      onClose();
      // Navigate to sophia (canvas view) if not already there
      navigate({ to: '/sophia' });
      // Select the entity - this will center on it when the canvas loads
      // Using a small delay to ensure the route transition completes
      setTimeout(() => {
        uiActions.selectEntity(entityId);
      }, 100);
    },
    [onClose, navigate]
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div className="relative w-full max-w-4xl mx-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header with Search Input */}
        <div className="p-4 border-b border-zinc-700 shrink-0">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, plans, documents..."
              className="flex-1 bg-transparent text-white text-lg placeholder-zinc-500 outline-none"
              autoFocus
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Facets + Results */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <FacetSidebar
            facets={facets}
            selection={selection}
            onFacetChange={handleFacetChange}
            onClear={clearFacets}
          />
          <SearchResults
            results={filteredResults}
            isSearching={isSearching}
            query={query}
            onResultClick={handleResultClick}
            onShowOnCanvas={handleShowOnCanvas}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-500 flex items-center gap-4 shrink-0">
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">Cmd</kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">Shift</kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">K</kbd>
            {' '}to toggle
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">Cmd</kbd>
            +
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">K</kbd>
            {' '}for quick jump
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
