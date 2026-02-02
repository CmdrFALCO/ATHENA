import type { IRenderer } from './IRenderer';
import type {
  ExportData,
  ExportEntity,
  RenderContext,
  RenderResult,
  MarkdownExportOptions,
} from '../types';

export class MarkdownRenderer implements IRenderer {
  readonly id = 'markdown';
  readonly name = 'Markdown';
  readonly fileExtension = '.md';
  readonly mimeType = 'text/markdown';

  canRender(): boolean {
    return true;
  }

  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as MarkdownExportOptions;
    let content: string;

    const firstEntity = data.entities[0];
    if (data.entities.length === 1 && firstEntity) {
      content = this.renderEntity(firstEntity, data, options);
    } else {
      content = this.renderMultipleEntities(data, options);
    }

    const filename = this.generateFilename(data, options);
    return { content, filename, mimeType: this.mimeType };
  }

  private renderEntity(
    entity: ExportEntity,
    data: ExportData,
    options: MarkdownExportOptions,
  ): string {
    const parts: string[] = [];

    if (options.includeFrontmatter) {
      parts.push(this.renderFrontmatter(entity));
    }

    parts.push(`# ${entity.title}`);
    parts.push(entity.contentText);

    if (options.includeConnectionsSection && data.connections.length > 0) {
      const section = this.renderConnectionsSection(entity, data, options);
      if (section) parts.push(section);
    }

    return parts.join('\n\n');
  }

  private renderFrontmatter(entity: ExportEntity): string {
    const frontmatter: Record<string, unknown> = {
      title: entity.title,
      type: entity.type,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };

    if (entity.metadata.tags) {
      frontmatter.tags = entity.metadata.tags;
    }

    const yaml = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.join(', ')}]`;
        }
        return `${key}: "${value}"`;
      })
      .join('\n');

    return `---\n${yaml}\n---`;
  }

  private renderConnectionsSection(
    entity: ExportEntity,
    data: ExportData,
    options: MarkdownExportOptions,
  ): string {
    const connections = data.connections.filter(
      (c) => c.sourceId === entity.id || c.targetId === entity.id,
    );

    if (connections.length === 0) return '';

    const lines = ['## Connected Notes', ''];

    for (const conn of connections) {
      const isSource = conn.sourceId === entity.id;
      const linkedTitle = isSource ? conn.targetTitle : conn.sourceTitle;
      const linkedId = isSource ? conn.targetId : conn.sourceId;
      const direction = isSource ? '\u2192' : '\u2190';

      const link =
        options.linkFormat === 'wiki'
          ? `[[${linkedTitle}]]`
          : `[${linkedTitle}](${linkedId})`;

      const label = conn.label ? ` (${conn.label})` : '';
      lines.push(`- ${direction} ${link}${label}`);
    }

    return lines.join('\n');
  }

  private renderMultipleEntities(data: ExportData, options: MarkdownExportOptions): string {
    const parts: string[] = [];

    parts.push('# ATHENA Export');
    parts.push(`*Exported ${data.entities.length} notes on ${new Date().toLocaleDateString()}*`);
    parts.push('---');

    // Table of contents
    parts.push('## Contents\n');
    for (const entity of data.entities) {
      const anchor = entity.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      parts.push(`- [${entity.title}](#${anchor})`);
    }

    for (const entity of data.entities) {
      parts.push('---');
      parts.push(this.renderEntity(entity, data, options));
    }

    return parts.join('\n\n');
  }

  private generateFilename(data: ExportData, options: MarkdownExportOptions): string {
    if (options.filename) {
      return `${options.filename}${this.fileExtension}`;
    }

    const singleEntity = data.entities[0];
    if (data.entities.length === 1 && singleEntity) {
      const slug = singleEntity.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
      return `${slug}${this.fileExtension}`;
    }

    const date = new Date().toISOString().split('T')[0];
    return `athena-export-${date}${this.fileExtension}`;
  }
}
