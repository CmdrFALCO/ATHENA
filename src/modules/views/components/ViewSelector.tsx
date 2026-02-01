// src/modules/views/components/ViewSelector.tsx — WP 8.9: Smart Views

import React, { useState } from 'react';
import {
  ChevronDown,
  Eye,
  Clock,
  Unlink,
  Link,
  Archive,
  Filter,
  AlertCircle,
  Network,
  Plus,
  Star,
} from 'lucide-react';
import { useViews } from '../hooks/useViews';
import type { SmartView } from '../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye,
  Clock,
  Unlink,
  Link,
  Archive,
  Filter,
  AlertCircle,
  Network,
  Star,
};

interface ViewSelectorProps {
  onViewSelect?: (view: SmartView) => void;
  onCreateNew?: () => void;
}

export function ViewSelector({ onViewSelect, onCreateNew }: ViewSelectorProps) {
  const { viewsByCategory, recentViews, selectedViewId, executeView, openPanel } = useViews();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = async (view: SmartView) => {
    setIsOpen(false);

    // If view has required params with no defaults, open panel for parameter input
    const needsParams = view.parameters.some((p) => p.required && p.defaultValue === undefined);
    if (needsParams) {
      openPanel();
      onViewSelect?.(view);
    } else {
      await executeView(view.id);
      openPanel();
      onViewSelect?.(view);
    }
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return Eye;
    return ICON_MAP[iconName] || Eye;
  };

  const categories = [
    { key: 'system', label: 'System' },
    { key: 'sophia', label: 'Knowledge' },
    { key: 'user', label: 'Custom' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-athena-text
                   hover:bg-athena-bg rounded-md transition-colors"
      >
        <Eye className="w-4 h-4" />
        <span>Views</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div
            className="absolute left-0 top-full mt-1 w-64 bg-athena-surface
                        border border-athena-border rounded-lg shadow-lg z-50
                        max-h-[400px] overflow-y-auto"
          >
            {/* Recent Views */}
            {recentViews.length > 0 && (
              <div className="p-2 border-b border-athena-border">
                <div className="text-xs text-athena-muted px-2 py-1">Recent</div>
                {recentViews.map((view) => {
                  const Icon = getIcon(view.icon);
                  return (
                    <button
                      key={view.id}
                      onClick={() => handleSelect(view)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md
                                text-left text-sm hover:bg-athena-bg transition-colors
                                ${selectedViewId === view.id ? 'bg-athena-bg' : ''}`}
                    >
                      <Icon className="w-4 h-4 text-athena-muted" />
                      <span className="truncate">{view.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Categories */}
            {categories.map(({ key, label }) => {
              const categoryViews = viewsByCategory[key] || [];
              if (categoryViews.length === 0) return null;

              return (
                <div key={key} className="p-2 border-b border-athena-border last:border-0">
                  <div className="text-xs text-athena-muted px-2 py-1">{label}</div>
                  {categoryViews.map((view) => {
                    const Icon = getIcon(view.icon);
                    return (
                      <button
                        key={view.id}
                        onClick={() => handleSelect(view)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md
                                  text-left text-sm hover:bg-athena-bg transition-colors
                                  ${selectedViewId === view.id ? 'bg-athena-bg' : ''}`}
                      >
                        <Icon className="w-4 h-4 text-athena-muted" />
                        <span className="truncate">{view.name}</span>
                        {view.createdBy === 'user' && (
                          <Star className="w-3 h-3 text-yellow-500 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Create New */}
            {onCreateNew && (
              <div className="p-2 border-t border-athena-border">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateNew();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md
                            text-left text-sm hover:bg-athena-bg transition-colors
                            text-blue-400"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Custom View...</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
