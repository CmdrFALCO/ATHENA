import { formatDate, formatRelativeTime } from '@/shared/utils';
import type { Note } from '@/shared/types';

interface EntityDetailHeaderProps {
  note: Note;
}

export function EntityDetailHeader({ note }: EntityDetailHeaderProps) {
  return (
    <div className="border-b border-athena-border p-6 shrink-0">
      <h1 className="text-2xl font-semibold text-athena-text mb-2">
        {note.title || 'Untitled'}
      </h1>

      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-athena-surface text-athena-muted">
        {note.subtype || note.type}
      </span>

      <div className="mt-3 text-sm text-athena-muted">
        Created {formatDate(note.created_at)} &bull; Updated {formatRelativeTime(note.updated_at)}
      </div>
    </div>
  );
}
