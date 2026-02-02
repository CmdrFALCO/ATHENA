import { exportState$ } from './exportState';
import { getExportService } from '../services/ExportService';
import { downloadResult } from '../services/DownloadService';
import type { ExportOptions, ExportSource } from '../types';

export const exportActions = {
  openDialog(
    source: ExportSource,
    options: {
      entityIds?: string[];
      resourceIds?: string[];
      synthesisContent?: string;
    } = {},
  ): void {
    exportState$.dialogOpen.set(true);
    exportState$.dialogSource.set(source);
    exportState$.entityIds.set(options.entityIds || []);
    exportState$.resourceIds.set(options.resourceIds || []);
    exportState$.synthesisContent.set(options.synthesisContent || null);
    exportState$.error.set(null);
  },

  closeDialog(): void {
    exportState$.dialogOpen.set(false);
    exportState$.dialogSource.set(null);
    exportState$.entityIds.set([]);
    exportState$.resourceIds.set([]);
    exportState$.synthesisContent.set(null);
  },

  async doExport(options: ExportOptions): Promise<void> {
    const state = exportState$.peek();

    try {
      exportState$.isExporting.set(true);
      exportState$.error.set(null);

      const service = getExportService();
      let result;

      if (state.dialogSource === 'synthesis' && state.synthesisContent) {
        result = await service.exportSynthesis(
          state.synthesisContent,
          'Synthesis Report',
          options,
        );
      } else {
        result = await service.export(
          state.entityIds,
          options,
          state.dialogSource || 'selection',
        );
      }

      downloadResult(result);
      exportState$.lastOptions.set(options);
      exportActions.closeDialog();
    } catch (error) {
      console.error('[Export] Error:', error);
      exportState$.error.set(
        error instanceof Error ? error.message : 'Export failed',
      );
    } finally {
      exportState$.isExporting.set(false);
    }
  },

  async quickExport(
    entityIds: string[],
    format: ExportOptions['format'],
    source: ExportSource = 'selection',
  ): Promise<void> {
    const lastOptions = exportState$.lastOptions.peek();
    const options = buildDefaultOptions(format, lastOptions);

    try {
      exportState$.isExporting.set(true);
      exportState$.error.set(null);

      const service = getExportService();
      const result = await service.export(entityIds, options, source);

      downloadResult(result);
      exportState$.lastOptions.set(options);
    } catch (error) {
      console.error('[Export] Quick export error:', error);
      exportState$.error.set(
        error instanceof Error ? error.message : 'Export failed',
      );
    } finally {
      exportState$.isExporting.set(false);
    }
  },
};

function buildDefaultOptions(
  format: ExportOptions['format'],
  lastOptions?: Partial<ExportOptions> | null,
): ExportOptions {
  const base = {
    includeConnections: lastOptions?.includeConnections ?? true,
    expandHops: lastOptions?.expandHops ?? 0,
  };

  switch (format) {
    case 'markdown':
      return {
        ...base,
        format: 'markdown',
        includeFrontmatter: true,
        includeConnectionsSection: true,
        linkFormat: 'wiki',
      };
    case 'json':
      return {
        ...base,
        format: 'json',
        shape: 'objects',
        includeContent: true,
        prettyPrint: true,
      };
    case 'csv':
      return {
        ...base,
        format: 'csv',
        includeContent: false,
        delimiter: ',',
        columns: [],
      };
    case 'html':
      return {
        ...base,
        format: 'html',
        includeStyles: true,
        theme: 'dark',
        includeTableOfContents: true,
      };
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_EXPORT__: typeof exportActions }).__ATHENA_EXPORT__ =
    exportActions;
}
