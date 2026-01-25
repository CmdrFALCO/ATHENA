/**
 * MentionSuggestions - Autocomplete dropdown for @mentions
 * WP 7.6 - Spatial Awareness
 *
 * Shows matching notes when the user types @ in the chat input.
 * Supports keyboard navigation (Arrow keys, Enter, Escape).
 */

import { useRef, useEffect } from 'react';
import { FileText, Folder, File } from 'lucide-react';
import type { MentionSuggestion } from '../hooks/useMentions';

interface MentionSuggestionsProps {
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
  onClose: () => void;
}

export function MentionSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
}: MentionSuggestionsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'plan':
        return <Folder className="w-4 h-4 text-purple-500" />;
      case 'document':
        return <File className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-athena-muted" />;
    }
  };

  if (suggestions.length === 0) {
    return (
      <div
        ref={listRef}
        className="absolute bottom-full left-0 right-0 mb-1 bg-athena-surface border border-athena-border
                   rounded-lg shadow-lg overflow-hidden z-50"
      >
        <div className="px-3 py-2 text-sm text-athena-muted italic">
          No matching notes found
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-athena-surface border border-athena-border
                 rounded-lg shadow-lg overflow-hidden z-50 max-h-[200px] overflow-y-auto"
    >
      <div className="py-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            ref={index === selectedIndex ? selectedRef : null}
            onClick={() => onSelect(suggestion)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                       transition-colors hover:bg-athena-hover
                       ${index === selectedIndex ? 'bg-athena-hover' : ''}`}
          >
            {getIcon(suggestion.type)}
            <span className="truncate flex-1 text-athena-text">{suggestion.title}</span>
            <span className="text-xs text-athena-muted capitalize">{suggestion.type}</span>
          </button>
        ))}
      </div>

      <div className="px-3 py-1.5 text-xs text-athena-muted border-t border-athena-border bg-athena-bg/50">
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded text-[10px]">
          ↑↓
        </kbd>{' '}
        navigate{' '}
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded text-[10px]">
          Enter
        </kbd>{' '}
        select{' '}
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded text-[10px]">
          Esc
        </kbd>{' '}
        close
      </div>
    </div>
  );
}
