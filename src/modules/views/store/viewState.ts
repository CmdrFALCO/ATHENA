// src/modules/views/store/viewState.ts — WP 8.9: Smart Views

import { observable } from '@legendapp/state';
import type { SmartView, ViewExecutionResult, ViewsConfig } from '../types';

export interface ViewState {
  /** All available views (built-in + custom) */
  views: SmartView[];

  /** Currently selected view ID */
  selectedViewId: string | null;

  /** Last execution result */
  lastResult: ViewExecutionResult | null;

  /** Loading state */
  isExecuting: boolean;

  /** Error message */
  error: string | null;

  /** Panel visibility */
  isPanelOpen: boolean;

  /** Config */
  config: ViewsConfig;
}

export const DEFAULT_VIEWS_CONFIG: ViewsConfig = {
  enabled: true,
  showInSidebar: true,
  recentViewIds: [],
  maxResults: 50,
};

export const viewState$ = observable<ViewState>({
  views: [],
  selectedViewId: null,
  lastResult: null,
  isExecuting: false,
  error: null,
  isPanelOpen: false,
  config: DEFAULT_VIEWS_CONFIG,
});

// Debug access
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_VIEW_STATE__: typeof viewState$ }).__ATHENA_VIEW_STATE__ =
    viewState$;
}
