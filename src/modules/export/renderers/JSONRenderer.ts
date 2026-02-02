import type { IRenderer } from './IRenderer';
import type { ExportData, RenderContext, RenderResult, JSONExportOptions } from '../types';

export class JSONRenderer implements IRenderer {
  readonly id = 'json';
  readonly name = 'JSON';
  readonly fileExtension = '.json';
  readonly mimeType = 'application/json';

  canRender(): boolean {
    return true;
  }

  async render(data: ExportData, context: RenderContext): Promise<RenderResult> {
    const options = context.options as JSONExportOptions;

    const output =
      options.shape === 'graph'
        ? this.renderAsGraph(data, options)
        : this.renderAsObjects(data, options);

    const content = options.prettyPrint
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);

    const filename = this.generateFilename(data, options);
    return { content, filename, mimeType: this.mimeType };
  }

  private renderAsObjects(
    data: ExportData,
    options: JSONExportOptions,
  ): Record<string, unknown> {
    return {
      metadata: data.metadata,
      entities: data.entities.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        content: options.includeContent ? e.content : undefined,
        contentText: options.includeContent ? e.contentText : undefined,
        metadata: e.metadata,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      connections: options.includeConnections
        ? data.connections.map((c) => ({
            id: c.id,
            sourceId: c.sourceId,
            targetId: c.targetId,
            label: c.label,
            type: c.type,
            metadata: c.metadata,
            createdAt: c.createdAt,
          }))
        : undefined,
    };
  }

  private renderAsGraph(
    data: ExportData,
    options: JSONExportOptions,
  ): Record<string, unknown> {
    return {
      graph: {
        metadata: data.metadata,
        nodes: data.entities.map((e) => ({
          id: e.id,
          label: e.title,
          metadata: {
            type: e.type,
            content: options.includeContent ? e.contentText : undefined,
            ...e.metadata,
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
          },
        })),
        edges: options.includeConnections
          ? data.connections.map((c) => ({
              source: c.sourceId,
              target: c.targetId,
              label: c.label,
              metadata: {
                id: c.id,
                type: c.type,
                ...c.metadata,
              },
            }))
          : [],
      },
    };
  }

  private generateFilename(data: ExportData, options: JSONExportOptions): string {
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
    const suffix = options.shape === 'graph' ? '-graph' : '';
    return `athena-export-${date}${suffix}${this.fileExtension}`;
  }
}
