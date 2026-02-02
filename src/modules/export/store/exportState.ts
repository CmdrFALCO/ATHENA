import { observable } from '@legendapp/state';
import type { ExportState } from '../types';

export const DEFAULT_EXPORT_STATE: ExportState = {
  dialogOpen: false,
  dialogSource: null,
  entityIds: [],
  resourceIds: [],
  synthesisContent: null,
  isExporting: false,
  error: null,
  lastOptions: null,
};

export const exportState$ = observable<ExportState>(DEFAULT_EXPORT_STATE);

if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_EXPORT_STATE__: typeof exportState$ }).__ATHENA_EXPORT_STATE__ =
    exportState$;
}
