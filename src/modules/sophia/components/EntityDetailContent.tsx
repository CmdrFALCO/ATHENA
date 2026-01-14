import type { Note, Block } from '@/shared/types';

interface EntityDetailContentProps {
  note: Note;
}

/**
 * Temporary helper - extracts text from Tiptap Block[]
 * Will be replaced by Tiptap editor in WP 1.4
 */
function extractTextFromBlocks(blocks: Block[]): string {
  function extractText(node: Block | { type: string; text?: string; content?: unknown[] }): string {
    if (node.type === 'text' && 'text' in node) {
      return node.text || '';
    }
    if ('content' in node && Array.isArray(node.content)) {
      return (node.content as { type: string; text?: string; content?: unknown[] }[])
        .map(extractText)
        .join('');
    }
    return '';
  }

  return blocks.map(extractText).join('\n\n');
}

export function EntityDetailContent({ note }: EntityDetailContentProps) {
  if (!note.content || note.content.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-athena-muted">
        <p>No content yet</p>
      </div>
    );
  }

  const textContent = extractTextFromBlocks(note.content);

  if (!textContent.trim()) {
    return (
      <div className="flex-1 flex items-center justify-center text-athena-muted">
        <p>No content yet</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="prose prose-invert max-w-none whitespace-pre-wrap text-athena-text">
        {textContent}
      </div>
    </div>
  );
}
