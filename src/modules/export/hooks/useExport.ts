import { useSelector } from '@legendapp/state/react';
import { useNoteAdapter, useConnectionAdapter } from '@/adapters';
import { exportState$ } from '../store/exportState';
import { exportActions } from '../store/exportActions';
import { initExportService } from '../services/ExportService';
import { useEffect } from 'react';
import type { ExportFormat, ExportSource } from '../types';

/**
 * Hook to initialize the export service and provide export actions.
 * Call once near the top of the component tree (inside AdapterProvider).
 */
export function useExportInit(): void {
  const noteAdapter = useNoteAdapter();
  const connectionAdapter = useConnectionAdapter();

  useEffect(() => {
    initExportService({ noteAdapter, connectionAdapter });
  }, [noteAdapter, connectionAdapter]);
}

/**
 * Hook for components that need export state and actions.
 */
export function useExport() {
  const isExporting = useSelector(() => exportState$.isExporting.get());
  const dialogOpen = useSelector(() => exportState$.dialogOpen.get());
  const error = useSelector(() => exportState$.error.get());

  return {
    isExporting,
    dialogOpen,
    error,

    openDialog: (
      source: ExportSource,
      options?: {
        entityIds?: string[];
        resourceIds?: string[];
        synthesisContent?: string;
      },
    ) => exportActions.openDialog(source, options),

    closeDialog: () => exportActions.closeDialog(),

    quickExport: (
      entityIds: string[],
      format: ExportFormat,
      source?: ExportSource,
    ) => exportActions.quickExport(entityIds, format, source),
  };
}
