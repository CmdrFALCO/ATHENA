import { useState, useCallback } from 'react';
import type { Note, Block } from '@/shared/types';
import { useNoteAdapter } from '@/adapters';
import { entityActions } from '@/store';
import { useDebouncedCallback } from '@/shared/hooks';
import { NoteEditor } from './NoteEditor';

interface EditorContainerProps {
  note: Note;
}

export function EditorContainer({ note }: EditorContainerProps) {
  const noteAdapter = useNoteAdapter();
  const [isSaving, setIsSaving] = useState(false);

  const saveContent = useCallback(
    async (content: Block[]) => {
      setIsSaving(true);
      try {
        await noteAdapter.update(note.id, { content });
        entityActions.updateNote(note.id, { content });
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [noteAdapter, note.id]
  );

  const debouncedSave = useDebouncedCallback(saveContent, 500);

  const handleUpdate = useCallback(
    (content: Block[]) => {
      debouncedSave(content);
    },
    [debouncedSave]
  );

  return (
    <div className="flex-1 flex flex-col relative">
      {isSaving && (
        <div className="absolute top-2 right-2 text-xs text-athena-muted z-10">
          Saving...
        </div>
      )}
      <NoteEditor key={note.id} content={note.content} onUpdate={handleUpdate} />
    </div>
  );
}
