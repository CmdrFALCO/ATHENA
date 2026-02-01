// src/modules/synthesis/prompts/synthesisPrompts.ts — WP 8.7 (WP 8.7.1: Resource Support)

import type { SynthesisFormat } from '../types';
import type { Entity, Block } from '@/shared/types/entities';
import type { Resource } from '@/shared/types/resources';
import type { Connection } from '@/shared/types/connections';
import type { DocumentTree } from '@/modules/resources/extraction/types';

const FORMAT_INSTRUCTIONS: Record<SynthesisFormat, string> = {
  summary: `Write a concise summary that:
- Captures the main themes and key points
- Synthesizes information across all sources
- Uses clear, direct prose
- Avoids excessive detail`,

  outline: `Create a hierarchical outline that:
- Uses clear headers for main themes
- Groups related points under appropriate headers
- Uses bullet points for specific details
- Shows logical organization of the knowledge`,

  report: `Write a comprehensive report that:
- Opens with an executive summary
- Organizes content into logical sections
- Provides detailed analysis and connections
- Concludes with key takeaways
- Uses prose with clear section headers`,
};

export interface PromptContext {
  entities: Entity[];
  resources: Resource[];
  connections: Connection[];
  format: SynthesisFormat;
  maxLength?: number;
  customPrompt?: string;
  resourceMaxChars: number;
}

export function buildSynthesisPrompt(context: PromptContext): string {
  const { entities, resources, connections, format, maxLength, customPrompt, resourceMaxChars } =
    context;

  const entityContent = entities
    .map((e, i) => {
      const content = extractTextContent(e.content);
      return `### Note ${i + 1}: ${e.title}\n${content}`;
    })
    .join('\n\n');

  // WP 8.7.1: Build resource content section
  let resourceContent = '';
  if (resources.length > 0) {
    resourceContent =
      '\n\n## Source Documents\n\n' +
      resources
        .map((r, i) => {
          const content = truncateResourceContent(r, resourceMaxChars);
          const typeLabel = getResourceTypeLabel(r.type);
          return `### ${typeLabel} ${i + 1}: ${r.name}\n${content}`;
        })
        .join('\n\n');
  }

  // Build connections section (updated to include resource connections)
  let connectionContent = '';
  if (connections.length > 0) {
    const descriptions = connections
      .map((c) => {
        const sourceName = findNodeName(c.source_id, c.source_type, entities, resources);
        const targetName = findNodeName(c.target_id, c.target_type, entities, resources);
        if (sourceName && targetName) {
          return `- "${sourceName}" ${c.label || '\u2192'} "${targetName}"`;
        }
        return null;
      })
      .filter(Boolean);

    if (descriptions.length > 0) {
      connectionContent = `\n\n## Relationships\n${descriptions.join('\n')}`;
    }
  }

  const lengthInstruction = maxLength
    ? `\nTarget length: approximately ${maxLength} words.`
    : '';

  const customInstruction = customPrompt ? `\n\nAdditional guidance: ${customPrompt}` : '';

  const sourceTypesNote =
    resources.length > 0
      ? '\n\nNote: "Notes" contain curated knowledge; "Source Documents" contain extracted primary material.'
      : '';

  return `You are synthesizing knowledge from a personal knowledge graph. Your task is to create a cohesive ${format} from the following notes${resources.length > 0 ? ' and source documents' : ''}.

${FORMAT_INSTRUCTIONS[format]}
${lengthInstruction}
${customInstruction}
${sourceTypesNote}

---

## Notes

${entityContent}
${resourceContent}
${connectionContent}

---

Generate the ${format} now. Do not include preamble like "Here is..." \u2014 start directly with the content.`;
}

/**
 * Extract plain text from Tiptap Block[] content.
 */
function extractTextContent(content: Block[] | unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return (content as Block[])
      .map((block) => {
        if ((block.type === 'paragraph' || block.type === 'heading') && block.content) {
          return block.content.map((node) => node.text || '').join('');
        }
        if (block.type === 'bulletList' && block.content) {
          return block.content
            .map((item) => {
              if (item.content) {
                return (
                  '- ' +
                  item.content
                    .map((p) => (p.content ? p.content.map((n) => n.text || '').join('') : ''))
                    .join('')
                );
              }
              return '';
            })
            .join('\n');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '';
}

/**
 * Truncate resource content to max chars, preferring document tree sections if available.
 */
function truncateResourceContent(resource: Resource, maxChars: number): string {
  // If document has tree structure (WP 8.2), use section summaries
  if (resource.structure) {
    try {
      const tree: DocumentTree =
        typeof resource.structure === 'string'
          ? JSON.parse(resource.structure)
          : resource.structure;

      const summaries = collectTreeSummaries(tree, maxChars);
      if (summaries.length > 0) {
        return summaries.join('\n\n');
      }
    } catch {
      // Fall through to raw text
    }
  }

  // Fall back to extracted_text with truncation
  const text = resource.extractedText || '';
  if (text.length === 0) {
    return '[No extracted content available]';
  }
  if (text.length <= maxChars) {
    return text;
  }

  return text.slice(0, maxChars) + '\n\n[...content truncated...]';
}

/**
 * Collect summaries from document tree up to maxChars.
 */
function collectTreeSummaries(
  node: DocumentTree,
  maxChars: number,
  collected: string[] = [],
): string[] {
  let totalChars = collected.reduce((sum, s) => sum + s.length, 0);

  if (node.summary && totalChars + node.summary.length <= maxChars) {
    collected.push(`**${node.title}:** ${node.summary}`);
    totalChars += node.summary.length;
  }

  if (node.children) {
    for (const child of node.children) {
      if (totalChars >= maxChars) break;
      collectTreeSummaries(child, maxChars, collected);
      totalChars = collected.reduce((sum, s) => sum + s.length, 0);
    }
  }

  return collected;
}

/**
 * Get human-readable label for resource type.
 */
function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    pdf: 'PDF',
    docx: 'Document',
    xlsx: 'Spreadsheet',
    md: 'Markdown',
    image: 'Image',
    url: 'Web Page',
  };
  return labels[type] || 'Document';
}

/**
 * Find node name by ID and type across entities and resources.
 */
function findNodeName(
  id: string,
  nodeType: 'entity' | 'resource',
  entities: Entity[],
  resources: Resource[],
): string | null {
  if (nodeType === 'entity') {
    return entities.find((e) => e.id === id)?.title || null;
  }
  return resources.find((r) => r.id === id)?.name || null;
}

/**
 * Generate a title for the synthesis report.
 */
export function generateReportTitle(
  entities: Entity[],
  resources: Resource[],
  format: SynthesisFormat,
): string {
  const label = format.charAt(0).toUpperCase() + format.slice(1);
  const totalCount = entities.length + resources.length;

  if (totalCount === 1) {
    const item = entities[0] || resources[0];
    const name = 'title' in item ? item.title : item.name;
    return `${label}: ${name}`;
  }

  if (totalCount <= 3) {
    const names = [...entities.map((e) => e.title), ...resources.map((r) => r.name)];
    return `${label}: ${names.join(', ')}`;
  }

  const parts: string[] = [];
  if (entities.length > 0)
    parts.push(`${entities.length} Note${entities.length > 1 ? 's' : ''}`);
  if (resources.length > 0)
    parts.push(`${resources.length} Resource${resources.length > 1 ? 's' : ''}`);

  return `${label} of ${parts.join(' + ')}`;
}
