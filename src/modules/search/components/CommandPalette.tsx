import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ClipboardList, FileEdit, Search } from 'lucide-react';
import { useCommandPalette } from '../hooks';
import { uiActions } from '@/store';
import type { Note } from '@/shared/types';

/**
 * Format a date for display in the command palette.
 * Shows relative time for recent dates, or month/day for older dates.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get the icon for an entity type.
 */
function getEntityIcon(type: Note['type']) {
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

interface ResultItemProps {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
}

function ResultItem({ note, isSelected, onClick }: ResultItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
        isSelected
          ? 'bg-zinc-700 text-white'
          : 'text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      <span className="text-zinc-400 flex-shrink-0">
        {getEntityIcon(note.type)}
      </span>
      <span className="flex-1 truncate">{note.title || 'Untitled'}</span>
      <span className="text-xs text-zinc-500 flex-shrink-0">
        {formatDate(note.updated_at)}
      </span>
    </button>
  );
}

export function CommandPalette() {
  const {
    isOpen,
    query,
    results,
    selectedIndex,
    close,
    setQuery,
    selectNext,
    selectPrevious,
    selectCurrent,
  } = useCommandPalette();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Global keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        uiActions.openCommandPalette();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle keyboard navigation when open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          selectCurrent();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, selectNext, selectPrevious, selectCurrent]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close();
    }
  };

  // Handle result click
  const handleResultClick = (index: number) => {
    const note = results[index];
    if (note) {
      uiActions.selectEntity(note.id);
      close();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 bg-transparent text-white text-lg placeholder-zinc-500 outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            results.map((note, index) => (
              <ResultItem
                key={note.id}
                note={note}
                isSelected={index === selectedIndex}
                onClick={() => handleResultClick(index)}
              />
            ))
          ) : (
            <div className="px-4 py-8 text-center text-zinc-500">
              {query ? 'No results found' : 'No notes yet'}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-500 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded">↵</kbd>
            to select
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
