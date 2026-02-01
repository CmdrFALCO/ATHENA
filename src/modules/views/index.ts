// src/modules/views/index.ts — WP 8.9: Smart Views (Canned Queries)

// Types
export type {
  ViewParameter,
  SmartView,
  ViewResult,
  ViewExecutionResult,
  ViewsConfig,
  CreateViewInput,
  UpdateViewInput,
} from './types';

// Data
export { builtInViews, getBuiltInView, getBuiltInViewsByCategory } from './data/builtInViews';

// Adapters
export type { IViewAdapter } from './adapters/IViewAdapter';
export { SQLiteViewAdapter } from './adapters/SQLiteViewAdapter';

// Services
export { ViewService } from './services/ViewService';

// Store
export { viewState$, DEFAULT_VIEWS_CONFIG } from './store/viewState';
export { viewActions, initViewsModule } from './store/viewActions';

// Hooks
export { useViews, useView } from './hooks/useViews';

// Components
export { ViewSelector } from './components/ViewSelector';
export { ViewResultsPanel } from './components/ViewResultsPanel';
export { ViewParameterForm } from './components/ViewParameterForm';
