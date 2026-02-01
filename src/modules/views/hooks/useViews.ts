// src/modules/views/hooks/useViews.ts — WP 8.9: Smart Views

import { useSelector } from '@legendapp/state/react';
import { viewState$ } from '../store/viewState';
import { viewActions } from '../store/viewActions';
import type { SmartView } from '../types';

/**
 * Hook for Smart Views state and actions.
 */
export function useViews() {
  const views = useSelector(() => viewState$.views.get());
  const selectedViewId = useSelector(() => viewState$.selectedViewId.get());
  const lastResult = useSelector(() => viewState$.lastResult.get());
  const isExecuting = useSelector(() => viewState$.isExecuting.get());
  const error = useSelector(() => viewState$.error.get());
  const isPanelOpen = useSelector(() => viewState$.isPanelOpen.get());
  const config = useSelector(() => viewState$.config.get());

  const selectedView = views.find((v) => v.id === selectedViewId) || null;

  // Group views by category
  const viewsByCategory = views.reduce(
    (acc, view) => {
      const category = view.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(view);
      return acc;
    },
    {} as Record<string, SmartView[]>,
  );

  // Get recent views
  const recentViews = config.recentViewIds
    .map((id) => views.find((v) => v.id === id))
    .filter((v): v is SmartView => v !== undefined);

  return {
    // State
    views,
    viewsByCategory,
    recentViews,
    selectedView,
    selectedViewId,
    lastResult,
    isExecuting,
    error,
    isPanelOpen,
    config,

    // Actions
    ...viewActions,
  };
}

/**
 * Hook for a single view by ID.
 */
export function useView(viewId: string) {
  const views = useSelector(() => viewState$.views.get());
  return views.find((v) => v.id === viewId) || null;
}
