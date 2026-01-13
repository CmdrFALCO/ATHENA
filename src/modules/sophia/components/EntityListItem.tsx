import { FileText } from 'lucide-react';
import { formatRelativeTime } from '@/shared/utils';
import type { Note } from '@/shared/types';

interface EntityListItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (noteId: string) => void;
}

export function EntityListItem({ note, isSelected, onSelect }: EntityListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(note.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(note.id);
        }
      }}
      className={`
        flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
        ${isSelected
          ? 'bg-athena-bg border-l-2 border-blue-500'
          : 'text-athena-text hover:bg-athena-bg border-l-2 border-transparent'
        }
      `}
    >
      <FileText className="w-4 h-4 shrink-0 text-athena-muted" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{note.title || 'Untitled'}</p>
        <p className="text-xs text-athena-muted">
          {formatRelativeTime(note.updated_at)}
        </p>
      </div>
    </div>
  );
}
