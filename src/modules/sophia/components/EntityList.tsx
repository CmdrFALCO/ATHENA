import { FileText } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { appState$ } from '@/store';
import { useNotes, useSelectedEntityIds, uiActions } from '@/store';
import { EntityListItem } from './EntityListItem';

export function EntityList() {
  const initialized = useSelector(() => appState$.initialized.get());
  const notes = useNotes();
  const selectedIds = useSelectedEntityIds();

  // Sort notes by updated_at descending (most recent first)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const handleSelect = (noteId: string) => {
    uiActions.selectEntity(noteId);
  };

  // Loading state
  if (!initialized) {
    return (
      <div className="p-4 text-athena-muted text-sm">
        Loading notes...
      </div>
    );
  }

  // Empty state
  if (sortedNotes.length === 0) {
    return (
      <div className="p-4 text-center">
        <FileText className="mx-auto mb-2 text-athena-muted" size={32} />
        <p className="text-athena-muted text-sm">No notes yet</p>
        <p className="text-athena-muted text-xs mt-1">
          Create your first note to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {sortedNotes.map((note) => (
        <EntityListItem
          key={note.id}
          note={note}
          isSelected={selectedIds.includes(note.id)}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
