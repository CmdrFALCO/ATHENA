// src/modules/synthesis/store/synthesisState.ts — WP 8.7 (WP 8.7.1: Resource Support)

import { observable } from '@legendapp/state';
import type { SynthesisReport, SynthesisProgress, SynthesisFormat } from '../types';

export interface SynthesisState {
  currentProgress: SynthesisProgress;
  currentReport: SynthesisReport | null;
  isPanelOpen: boolean;
  selectedFormat: SynthesisFormat;
  customPrompt: string;
  maxLength: number;
  includeConnections: boolean;
  includeResources: boolean;
  resourceMaxChars: number;
  recentReports: SynthesisReport[];
}

export const synthesisState$ = observable<SynthesisState>({
  currentProgress: {
    status: 'idle',
    progress: 0,
    partialContent: '',
  },
  currentReport: null,
  isPanelOpen: false,
  selectedFormat: 'summary',
  customPrompt: '',
  maxLength: 500,
  includeConnections: true,
  includeResources: true,
  resourceMaxChars: 5000,
  recentReports: [],
});

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_SYNTHESIS_STATE__: typeof synthesisState$ }).__ATHENA_SYNTHESIS_STATE__ =
    synthesisState$;
}
