// src/modules/views/components/ViewResultsPanel.tsx — WP 8.9: Smart Views

import React, { useEffect } from 'react';
import { X, FileText, Clock, ExternalLink, RotateCw, Settings } from 'lucide-react';
import { useViews } from '../hooks/useViews';
import type { ViewResult } from '../types';
import { formatRelativeTime } from '@/shared/utils/formatTime';
import { uiActions } from '@/store';

interface ViewResultsPanelProps {
  onNavigate?: (entityId: string) => void;
}

export function ViewResultsPanel({ onNavigate }: ViewResultsPanelProps) {
  const {
    isPanelOpen,
    closePanel,
    lastResult,
    isExecuting,
    error,
    selectedView,
    executeView,
  } = useViews();

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isPanelOpen) {
        e.preventDefault();
        closePanel();
      }
    }

    if (isPanelOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) return null;

  const handleResultClick = (result: ViewResult) => {
    uiActions.selectEntity(result.id);
    onNavigate?.(result.id);
  };

  const handleRefresh = () => {
    if (selectedView && lastResult) {
      executeView(selectedView.id, lastResult.parameterValues);
    }
  };

  return (
    <div
      className="fixed right-0 top-0 bottom-0 w-[400px] bg-athena-surface
                  border-l border-athena-border shadow-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-athena-text">
            {selectedView?.name || 'Smart Views'}
          </h2>
          {lastResult && (
            <span className="text-xs text-athena-muted">
              ({lastResult.results.length} results)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedView && (
            <button
              onClick={handleRefresh}
              disabled={isExecuting}
              className="p-1.5 hover:bg-athena-bg rounded-md transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={closePanel}
            className="p-1.5 hover:bg-athena-bg rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {selectedView && (
        <div className="px-4 py-2 text-sm text-athena-muted border-b border-athena-border">
          {selectedView.description}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading */}
        {isExecuting && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-athena-muted">
              <RotateCw className="w-5 h-5 animate-spin" />
              <span>Executing view...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isExecuting && (
          <div className="p-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isExecuting && !error && lastResult && lastResult.results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-athena-muted">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p>No results found</p>
          </div>
        )}

        {/* Results */}
        {!isExecuting && !error && lastResult && lastResult.results.length > 0 && (
          <div className="divide-y divide-athena-border">
            {lastResult.results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full p-4 text-left hover:bg-athena-bg transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-athena-text truncate">{result.title}</h3>
                    {result.preview && (
                      <p className="text-sm text-athena-muted mt-1 line-clamp-2">
                        {result.preview}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-athena-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(result.updatedAt)}
                      </span>
                      {result.connectionCount !== undefined && (
                        <span>{result.connectionCount} connections</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-athena-muted flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No view selected */}
        {!isExecuting && !error && !lastResult && (
          <div className="flex flex-col items-center justify-center py-12 text-athena-muted">
            <Settings className="w-12 h-12 mb-3 opacity-50" />
            <p>Select a view to see results</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {lastResult && (
        <div className="px-4 py-2 border-t border-athena-border text-xs text-athena-muted">
          Executed in {lastResult.executionTimeMs}ms
        </div>
      )}
    </div>
  );
}
