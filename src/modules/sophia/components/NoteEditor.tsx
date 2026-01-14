import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Block } from '@/shared/types';
import { EditorToolbar } from './EditorToolbar';

interface NoteEditorProps {
  content: Block[];
  onUpdate: (content: Block[]) => void;
}

export function NoteEditor({ content, onUpdate }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content: content.length > 0 ? { type: 'doc', content } : undefined,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onUpdate((json.content as Block[]) || []);
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto prose prose-invert max-w-none p-6"
      />
    </div>
  );
}
