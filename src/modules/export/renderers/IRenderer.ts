import type { ExportData, RenderContext, RenderResult } from '../types';

/**
 * Interface for export renderers.
 * Following Datasette's plugin pattern for extensibility.
 */
export interface IRenderer {
  readonly id: string;
  readonly name: string;
  readonly fileExtension: string;
  readonly mimeType: string;

  canRender(data: ExportData, context: RenderContext): boolean;
  render(data: ExportData, context: RenderContext): Promise<RenderResult>;
}

/**
 * Registry of available renderers.
 * New renderers can be added here for extensibility.
 */
export class RendererRegistry {
  private renderers: Map<string, IRenderer> = new Map();

  register(renderer: IRenderer): void {
    this.renderers.set(renderer.id, renderer);
  }

  get(id: string): IRenderer | undefined {
    return this.renderers.get(id);
  }

  getAll(): IRenderer[] {
    return Array.from(this.renderers.values());
  }
}

export const rendererRegistry = new RendererRegistry();
