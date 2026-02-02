import type { IRenderer } from './IRenderer';
import type {
  ExportData,
  ExportEntity,
  RenderContext,
  RenderResult,
  HTMLExportOptions,
} from '../types';

export class HTMLRenderer implements IRenderer {
  readonly id = 'html';
  readonly name = 'HTML';
  readonly fileExtension = '.html';
  readonly mimeType = 'text/html';

  canRender(): boolean {
    return true;
  }

  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as HTMLExportOptions;
    const html = this.generateHTML(data, options);
    const filename = this.generateFilename(data, options);
    return { content: html, filename, mimeType: this.mimeType };
  }

  private generateHTML(data: ExportData, options: HTMLExportOptions): string {
    const firstEntity = data.entities[0];
    const title =
      data.entities.length === 1 && firstEntity ? firstEntity.title : 'ATHENA Export';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  ${options.includeStyles ? this.getStyles(options.theme) : ''}
</head>
<body>
  <main class="container">
    ${this.renderHeader(data)}
    ${options.includeTableOfContents && data.entities.length > 1 ? this.renderTableOfContents(data) : ''}
    ${this.renderEntities(data, options)}
  </main>
  <footer>
    <p>Exported from ATHENA on ${new Date().toLocaleDateString()}</p>
  </footer>
</body>
</html>`;
  }

  private getStyles(theme: 'dark' | 'light'): string {
    const colors =
      theme === 'dark'
        ? {
            bg: '#0f0f14',
            surface: '#1a1a24',
            border: '#2a2a3a',
            text: '#e0e0e8',
            muted: '#888898',
            accent: '#6366f1',
          }
        : {
            bg: '#ffffff',
            surface: '#f8f8fa',
            border: '#e0e0e8',
            text: '#1a1a24',
            muted: '#666680',
            accent: '#4f46e5',
          };

    return `<style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: ${colors.bg};
        color: ${colors.text};
        line-height: 1.6;
        padding: 2rem;
      }
      .container { max-width: 800px; margin: 0 auto; }
      header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid ${colors.border}; }
      header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      header .meta { color: ${colors.muted}; font-size: 0.875rem; }
      .toc { background: ${colors.surface}; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
      .toc h2 { font-size: 1rem; margin-bottom: 0.5rem; }
      .toc ul { list-style: none; }
      .toc li { margin: 0.25rem 0; }
      .toc a { color: ${colors.accent}; text-decoration: none; }
      .toc a:hover { text-decoration: underline; }
      article { margin-bottom: 2rem; padding: 1.5rem; background: ${colors.surface}; border-radius: 8px; }
      article h2 { font-size: 1.25rem; margin-bottom: 1rem; color: ${colors.accent}; }
      article .content { white-space: pre-wrap; }
      article .metadata { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid ${colors.border}; font-size: 0.875rem; color: ${colors.muted}; }
      .connections { margin-top: 1rem; }
      .connections h3 { font-size: 0.875rem; margin-bottom: 0.5rem; color: ${colors.muted}; }
      .connections ul { list-style: none; }
      .connections li { margin: 0.25rem 0; }
      .connections a { color: ${colors.accent}; text-decoration: none; }
      footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid ${colors.border}; text-align: center; color: ${colors.muted}; font-size: 0.75rem; }
    </style>`;
  }

  private renderHeader(data: ExportData): string {
    const firstEntity = data.entities[0];
    const title =
      data.entities.length === 1 && firstEntity
        ? firstEntity.title
        : 'ATHENA Knowledge Export';

    return `<header>
      <h1>${this.escapeHTML(title)}</h1>
      <p class="meta">${data.entities.length} note${data.entities.length !== 1 ? 's' : ''}${
        data.connections.length > 0
          ? `, ${data.connections.length} connection${data.connections.length !== 1 ? 's' : ''}`
          : ''
      }</p>
    </header>`;
  }

  private renderTableOfContents(data: ExportData): string {
    const items = data.entities
      .map((e) => {
        const anchor = this.toAnchor(e.title);
        return `<li><a href="#${anchor}">${this.escapeHTML(e.title)}</a></li>`;
      })
      .join('\n');

    return `<nav class="toc">
      <h2>Contents</h2>
      <ul>${items}</ul>
    </nav>`;
  }

  private renderEntities(data: ExportData, options: HTMLExportOptions): string {
    return data.entities.map((e) => this.renderEntity(e, data, options)).join('\n');
  }

  private renderEntity(
    entity: ExportEntity,
    data: ExportData,
    options: HTMLExportOptions,
  ): string {
    const anchor = this.toAnchor(entity.title);
    const connections = data.connections.filter(
      (c) => c.sourceId === entity.id || c.targetId === entity.id,
    );

    return `<article id="${anchor}">
      <h2>${this.escapeHTML(entity.title)}</h2>
      <div class="content">${this.escapeHTML(entity.contentText)}</div>
      ${options.includeConnections && connections.length > 0 ? this.renderConnections(entity, connections, data) : ''}
      <div class="metadata">
        <span>Type: ${entity.type}</span> &middot;
        <span>Created: ${new Date(entity.createdAt).toLocaleDateString()}</span> &middot;
        <span>Updated: ${new Date(entity.updatedAt).toLocaleDateString()}</span>
      </div>
    </article>`;
  }

  private renderConnections(
    entity: ExportEntity,
    connections: ExportData['connections'],
    data: ExportData,
  ): string {
    const items = connections
      .map((c) => {
        const isSource = c.sourceId === entity.id;
        const linkedTitle = isSource ? c.targetTitle : c.sourceTitle;
        const linkedId = isSource ? c.targetId : c.sourceId;
        const direction = isSource ? '\u2192' : '\u2190';
        const label = c.label ? ` (${c.label})` : '';

        const inExport = data.entities.some((e) => e.id === linkedId);
        const anchor = this.toAnchor(linkedTitle);

        if (inExport) {
          return `<li>${direction} <a href="#${anchor}">${this.escapeHTML(linkedTitle)}</a>${label}</li>`;
        }
        return `<li>${direction} ${this.escapeHTML(linkedTitle)}${label}</li>`;
      })
      .join('\n');

    return `<div class="connections">
      <h3>Connected Notes</h3>
      <ul>${items}</ul>
    </div>`;
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private toAnchor(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private generateFilename(data: ExportData, options: HTMLExportOptions): string {
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
