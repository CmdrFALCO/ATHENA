import { useState, useCallback } from 'react';
import type { Note, Block } from '@/shared/types';
import { useNoteAdapter } from '@/adapters';
import { entityActions } from '@/store';
import { useDebouncedCallback } from '@/shared/hooks';
import { NoteEditor } from './NoteEditor';
import { useOptionalIndexer } from '@/modules/ai';

interface EditorContainerProps {
  note: Note;
}

/**
 * Extract plain text content from Tiptap blocks for embedding.
 */
function extractTextFromBlocks(blocks: Block[], title: string): string {
  const textParts: string[] = [title];

  const extractFromNode = (node: Block): void => {
    if (node.type === 'text' && node.text) {
      textParts.push(node.text);
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractFromNode);
    }
  };

  blocks.forEach(extractFromNode);
  return textParts.filter(Boolean).join(' ');
}

export function EditorContainer({ note }: EditorContainerProps) {
  const noteAdapter = useNoteAdapter();
  const indexer = useOptionalIndexer();
  const [isSaving, setIsSaving] = useState(false);

  const saveContent = useCallback(
    async (content: Block[]) => {
      setIsSaving(true);
      try {
        await noteAdapter.update(note.id, { content });
        entityActions.updateNote(note.id, { content });

        // Trigger embedding (respects trigger mode setting)
        if (indexer) {
          const textContent = extractTextFromBlocks(content, note.title);
          indexer.onNoteSaved(note.id, textContent);
        }
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [noteAdapter, note.id, note.title, indexer]
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
