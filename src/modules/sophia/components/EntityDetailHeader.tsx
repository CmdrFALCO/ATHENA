import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/shared/utils';
import { useNoteAdapter } from '@/adapters';
import { entityActions, uiActions } from '@/store';
import type { Note } from '@/shared/types';

interface EntityDetailHeaderProps {
  note: Note;
}

export function EntityDetailHeader({ note }: EntityDetailHeaderProps) {
  const noteAdapter = useNoteAdapter();
  const [title, setTitle] = useState(note.title);

  // Sync local state when note changes (e.g., switching notes)
  useEffect(() => {
    setTitle(note.title);
  }, [note.id, note.title]);

  const handleTitleSave = async () => {
    const trimmedTitle = title.trim() || 'Untitled Note';
    if (trimmedTitle !== note.title) {
      await noteAdapter.update(note.id, { title: trimmedTitle });
      entityActions.updateNote(note.id, { title: trimmedTitle, updated_at: new Date().toISOString() });
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${note.title || 'Untitled Note'}"? This cannot be undone.`);
    if (confirmed) {
      await noteAdapter.delete(note.id);
      entityActions.removeNote(note.id);
      uiActions.clearSelection();
    }
  };

  return (
    <div className="border-b border-athena-border p-6 shrink-0">
      <div className="flex items-start justify-between gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Untitled Note"
          className="flex-1 text-2xl font-semibold text-athena-text bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1"
        />
        <button
          onClick={handleDelete}
          className="p-2 rounded text-athena-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
          title="Delete note"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-athena-surface text-athena-muted mt-2">
        {note.subtype || note.type}
      </span>

      <div className="mt-3 text-sm text-athena-muted">
        Created {formatDate(note.created_at)} &bull; Updated {formatRelativeTime(note.updated_at)}
      </div>
    </div>
  );
}
