/**
 * AXIOMPanel — Main sidebar panel for AXIOM workflow visualization
 * WP 9A.3: AXIOM Visualization
 * WP 9B.4: Review Queue tab
 *
 * Slide-over panel from right (480px, like SynthesisPanel).
 * Top-level tabs: Workflow | Review (N).
 * Workflow sub-tabs: Graph | Tokens | History.
 * Footer with AXIOMControls.
 * Keyboard shortcut: Ctrl+Shift+A to toggle.
 */

import { useEffect } from 'react';
import { useSelector } from '@legendapp/state/react';
import { X } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import { devSettings$ } from '@/config/devSettings';
import { reviewState$ } from '../autonomous/review/reviewState';
import { reviewActions } from '../autonomous/review/reviewState';
import { WorkflowGraph } from './WorkflowGraph';
import { TokenInspector } from './TokenInspector';
import { TransitionLog } from './TransitionLog';
import { AXIOMControls } from './AXIOMControls';
import { ReviewQueueTab } from './ReviewQueue/ReviewQueueTab';
import type { ReviewActiveTab } from '../autonomous/review/reviewState';

type WorkflowTabId = 'graph' | 'tokens' | 'history';

const WORKFLOW_TABS: { id: WorkflowTabId; label: string }[] = [
  { id: 'graph', label: 'Graph' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'history', label: 'History' },
];

export function AXIOMPanel() {
  const isPanelOpen = useSelector(() => axiomState$.panelOpen.get());
  const selectedTab = useSelector(() => axiomState$.selectedTab.get());
  const isRunning = useSelector(() => axiomState$.isRunning.get());
  const lastError = useSelector(() => axiomState$.lastError.get());
  const autoOpenOnError = useSelector(() => devSettings$.axiom.visualization.autoOpenOnError.get());

  // WP 9B.4: Review queue state
  const activeTopTab = useSelector(() => reviewState$.activeTab.get()) as ReviewActiveTab;
  const pendingCount = useSelector(() => reviewState$.stats.pendingCount.get());
  const highlightThreshold = useSelector(() => devSettings$.axiom.reviewQueue.highlightThreshold.get());

  // Auto-open panel on error if configured
  useEffect(() => {
    if (lastError && autoOpenOnError && !isPanelOpen) {
      axiomActions.openPanel();
    }
  }, [lastError, autoOpenOnError, isPanelOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        axiomActions.closePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  if (!isPanelOpen) return null;

  const badgeExceedsThreshold = pendingCount > highlightThreshold;

  return (
    <div
      className="fixed inset-y-0 right-0 w-[480px] bg-athena-bg border-l border-athena-border shadow-xl z-50 flex flex-col"
      role="dialog"
      aria-label="AXIOM Workflow panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-athena-text">AXIOM Workflow</h2>
          {isRunning && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/20 text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Running
            </span>
          )}
        </div>
        <button
          onClick={() => axiomActions.closePanel()}
          className="p-1 rounded hover:bg-athena-surface text-athena-muted"
          aria-label="Close AXIOM panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error banner */}
      {lastError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-xs text-red-400">
          {lastError}
        </div>
      )}

      {/* WP 9B.4: Top-level tab bar (Workflow | Review) */}
      <div className="flex border-b border-athena-border shrink-0">
        <button
          onClick={() => reviewActions.setActiveTab('workflow')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors
            ${activeTopTab === 'workflow'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
              : 'text-athena-muted hover:text-athena-text hover:bg-athena-surface/50'
            }`}
        >
          Workflow
        </button>
        <button
          onClick={() => reviewActions.setActiveTab('review')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
            ${activeTopTab === 'review'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
              : 'text-athena-muted hover:text-athena-text hover:bg-athena-surface/50'
            }`}
        >
          Review
          {pendingCount > 0 && (
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                badgeExceedsThreshold
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Workflow tab content */}
      {activeTopTab === 'workflow' && (
        <>
          {/* Workflow sub-tab bar */}
          <div className="flex border-b border-athena-border shrink-0">
            {WORKFLOW_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => axiomActions.selectTab(tab.id)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors
                  ${selectedTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                    : 'text-athena-muted hover:text-athena-text hover:bg-athena-surface/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {selectedTab === 'graph' && (
              <div className="h-full">
                <WorkflowGraph />
              </div>
            )}
            {selectedTab === 'tokens' && (
              <div className="h-full overflow-y-auto">
                <TokenInspector />
              </div>
            )}
            {selectedTab === 'history' && (
              <div className="h-full">
                <TransitionLog />
              </div>
            )}
          </div>

          {/* Footer with controls */}
          <div className="px-3 py-2.5 border-t border-athena-border shrink-0">
            <AXIOMControls />
          </div>
        </>
      )}

      {/* WP 9B.4: Review tab content */}
      {activeTopTab === 'review' && (
        <div className="flex-1 overflow-hidden">
          <ReviewQueueTab />
        </div>
      )}

      {/* Keyboard hint */}
      <div className="px-4 py-1.5 border-t border-athena-border text-[10px] text-athena-muted flex items-center gap-1 shrink-0">
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded">Ctrl</kbd>
        +
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded">Shift</kbd>
        +
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded">A</kbd>
        {' '}to toggle
      </div>
    </div>
  );
}
