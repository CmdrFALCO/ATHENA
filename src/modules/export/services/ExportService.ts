import type {
  ExportData,
  ExportEntity,
  ExportConnection,
  ExportOptions,
  ExportSource,
  RenderResult,
} from '../types';
import { rendererRegistry, type IRenderer } from '../renderers/IRenderer';
import { MarkdownRenderer } from '../renderers/MarkdownRenderer';
import { JSONRenderer } from '../renderers/JSONRenderer';
import { CSVRenderer } from '../renderers/CSVRenderer';
import { HTMLRenderer } from '../renderers/HTMLRenderer';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

// Register built-in renderers
rendererRegistry.register(new MarkdownRenderer());
rendererRegistry.register(new JSONRenderer());
rendererRegistry.register(new CSVRenderer());
rendererRegistry.register(new HTMLRenderer());

export interface ExportServiceDependencies {
  noteAdapter: INoteAdapter;
  connectionAdapter: IConnectionAdapter;
}

export class ExportService {
  private deps: ExportServiceDependencies;

  constructor(deps: ExportServiceDependencies) {
    this.deps = deps;
  }

  async export(
    entityIds: string[],
    options: ExportOptions,
    source: ExportSource = 'selection',
  ): Promise<RenderResult> {
    const expandedIds =
      options.expandHops > 0
        ? await this.expandSelection(entityIds, options.expandHops)
        : entityIds;

    const entities = await this.loadEntities(expandedIds);

    const connections = options.includeConnections
      ? await this.loadConnections(expandedIds)
      : [];

    const data: ExportData = {
      source,
      entities,
      connections,
      metadata: {
        exportedAt: new Date().toISOString(),
        athenaVersion: '1.0.0',
        entityCount: entities.length,
        connectionCount: connections.length,
        expandedHops: options.expandHops > 0 ? options.expandHops : undefined,
      },
    };

    const renderer = rendererRegistry.get(options.format);
    if (!renderer) {
      throw new Error(`No renderer found for format: ${options.format}`);
    }

    const context = { source, options };
    if (!renderer.canRender(data, context)) {
      throw new Error(`Renderer ${options.format} cannot render this data`);
    }

    return renderer.render(data, context);
  }

  async exportSynthesis(
    content: string,
    title: string,
    options: ExportOptions,
  ): Promise<RenderResult> {
    const entity: ExportEntity = {
      id: 'synthesis-export',
      title,
      type: 'synthesis',
      content: null,
      contentText: content,
      metadata: { generated: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data: ExportData = {
      source: 'synthesis',
      entities: [entity],
      connections: [],
      metadata: {
        exportedAt: new Date().toISOString(),
        athenaVersion: '1.0.0',
        entityCount: 1,
        connectionCount: 0,
      },
    };

    const renderer = rendererRegistry.get(options.format);
    if (!renderer) {
      throw new Error(`No renderer found for format: ${options.format}`);
    }

    return renderer.render(data, { source: 'synthesis', options });
  }

  private async expandSelection(seedIds: string[], hops: number): Promise<string[]> {
    const visited = new Set<string>(seedIds);
    let frontier = [...seedIds];

    for (let depth = 0; depth < hops; depth++) {
      const nextFrontier: string[] = [];

      for (const id of frontier) {
        const connections = await this.deps.connectionAdapter.getConnectionsFor(id);

        for (const conn of connections) {
          const neighborId = conn.source_id === id ? conn.target_id : conn.source_id;

          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextFrontier.push(neighborId);
          }
        }
      }

      frontier = nextFrontier;
      if (frontier.length === 0) break;
    }

    return Array.from(visited);
  }

  private async loadEntities(ids: string[]): Promise<ExportEntity[]> {
    const entities: ExportEntity[] = [];

    for (const id of ids) {
      const note = await this.deps.noteAdapter.getById(id);
      if (!note) continue;

      entities.push({
        id: note.id,
        title: note.title,
        type: note.type,
        content: note.content,
        contentText: extractTextFromTiptap(note.content),
        metadata: note.metadata || {},
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
    }

    return entities;
  }

  private async loadConnections(entityIds: string[]): Promise<ExportConnection[]> {
    const idSet = new Set(entityIds);
    const connections: ExportConnection[] = [];
    const seenConnections = new Set<string>();

    for (const id of entityIds) {
      const conns = await this.deps.connectionAdapter.getConnectionsFor(id);

      for (const conn of conns) {
        if (!idSet.has(conn.source_id) || !idSet.has(conn.target_id)) continue;
        if (seenConnections.has(conn.id)) continue;
        seenConnections.add(conn.id);

        const sourceNote = await this.deps.noteAdapter.getById(conn.source_id);
        const targetNote = await this.deps.noteAdapter.getById(conn.target_id);

        connections.push({
          id: conn.id,
          sourceId: conn.source_id,
          targetId: conn.target_id,
          sourceTitle: sourceNote?.title || conn.source_id,
          targetTitle: targetNote?.title || conn.target_id,
          label: conn.label || '',
          type: conn.type,
          metadata: {},
          createdAt: conn.created_at,
        });
      }
    }

    return connections;
  }

  getRenderers(): IRenderer[] {
    return rendererRegistry.getAll();
  }
}

// Singleton instance
let exportService: ExportService | null = null;

export function initExportService(deps: ExportServiceDependencies): ExportService {
  exportService = new ExportService(deps);

  if (typeof window !== 'undefined') {
    (window as unknown as { __ATHENA_EXPORT_SERVICE__: () => ExportService | null }).__ATHENA_EXPORT_SERVICE__ =
      () => exportService;
  }

  return exportService;
}

export function getExportService(): ExportService {
  if (!exportService) {
    throw new Error('ExportService not initialized. Call initExportService first.');
  }
  return exportService;
}
