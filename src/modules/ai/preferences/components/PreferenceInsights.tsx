/**
 * Preference Insights - Statistics panel for preference learning
 * WP 8.4 - Preference Learning
 *
 * Displays preference learning statistics and insights.
 * Can be embedded in DevSettings panel or shown standalone.
 */

import { useEffect } from 'react';
import { observer } from '@legendapp/state/react';
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, Trash2 } from 'lucide-react';
import { preferenceState$ } from '../preferenceState';
import { preferenceActions } from '../preferenceActions';
import { devSettings$ } from '@/config/devSettings';

export const PreferenceInsights = observer(function PreferenceInsights() {
  const stats = preferenceState$.stats.get();
  const loading = preferenceState$.loading.get();
  const showInsights = devSettings$.preferences.showInsights.get();

  useEffect(() => {
    if (showInsights && !stats) {
      preferenceActions.refreshStats();
    }
  }, [showInsights, stats]);

  if (!showInsights) return null;

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw size={14} className="animate-spin" />
          Loading preferences...
        </div>
      </div>
    );
  }

  if (!stats || stats.totalSignals === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <h4 className="font-medium flex items-center gap-2 mb-2">
          <BarChart3 size={16} />
          Preference Learning
        </h4>
        <p className="text-sm text-gray-500">
          No preference data yet. Accept or reject some proposals to start
          learning.
        </p>
      </div>
    );
  }

  const { byType, confidenceAnalysis, totalSignals } = stats;

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <BarChart3 size={16} />
          Preference Learning
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => preferenceActions.refreshStats()}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Refresh stats"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm('Clear all preference history?')) {
                preferenceActions.clearHistory();
              }
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        {totalSignals} decisions recorded
      </div>

      {/* Note stats */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Notes</div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400">
            {byType.note.accepted} accepted
          </span>
          <span className="text-red-600 dark:text-red-400">
            {byType.note.rejected} rejected
          </span>
          <span className="text-gray-500">
            ({(byType.note.acceptRate * 100).toFixed(0)}% accept rate)
          </span>
        </div>
      </div>

      {/* Connection stats */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Connections</div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400">
            {byType.connection.accepted} accepted
          </span>
          <span className="text-red-600 dark:text-red-400">
            {byType.connection.rejected} rejected
          </span>
          <span className="text-gray-500">
            ({(byType.connection.acceptRate * 100).toFixed(0)}% accept rate)
          </span>
        </div>
      </div>

      {/* Confidence calibration */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Confidence Calibration</div>
        <div className="flex items-center gap-2 text-sm">
          {confidenceAnalysis.acceptedAvgConfidence >
          confidenceAnalysis.rejectedAvgConfidence ? (
            <>
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-green-600 dark:text-green-400">
                Well calibrated
              </span>
            </>
          ) : (
            <>
              <TrendingDown size={14} className="text-amber-600" />
              <span className="text-amber-600 dark:text-amber-400">
                Needs adjustment
              </span>
            </>
          )}
          <span className="text-gray-500">
            (accepted avg:{' '}
            {confidenceAnalysis.acceptedAvgConfidence.toFixed(2)}, rejected avg:{' '}
            {confidenceAnalysis.rejectedAvgConfidence.toFixed(2)})
          </span>
        </div>
      </div>
    </div>
  );
});
