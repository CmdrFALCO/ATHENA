/**
 * Extracts plain text from Tiptap JSON content.
 * Used for FTS indexing - strips all formatting.
 */
export function extractTextFromTiptap(content: unknown): string {
  // Handle null/undefined
  if (!content) return '';

  // Handle string (might already be plain text or JSON string)
  if (typeof content === 'string') {
    try {
      const parsed: unknown = JSON.parse(content);
      // If parsed successfully, process the parsed content
      return extractTextFromTiptap(parsed);
    } catch {
      return content; // Already plain text
    }
  }

  // Handle array of blocks
  if (Array.isArray(content)) {
    return content
      .map((block) => extractFromBlock(block))
      .join('\n')
      .trim();
  }

  // Handle single block
  if (typeof content === 'object' && content !== null) {
    return extractFromBlock(content as TiptapNode).trim();
  }

  return '';
}

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

function extractFromBlock(node: TiptapNode): string {
  // Text node - return the text
  if (node.type === 'text' && node.text) {
    return node.text;
  }

  // Node with content - recurse
  if (node.content && Array.isArray(node.content)) {
    const childText = node.content.map((child) => extractFromBlock(child)).join('');

    // Add newline for block-level elements
    const blockTypes = ['paragraph', 'heading', 'blockquote', 'listItem', 'codeBlock'];
    if (node.type && blockTypes.includes(node.type)) {
      return childText + '\n';
    }

    return childText;
  }

  return '';
}
