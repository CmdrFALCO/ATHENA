// src/modules/synthesis/components/SynthesisPanel.tsx — WP 8.7 (WP 8.7.1: Resource Support)

import { useEffect } from 'react';
import { useSelector } from '@legendapp/state/react';
import { X, FileText, Save, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { synthesisState$ } from '../store/synthesisState';
import {
  closeSynthesisPanel,
  generateSynthesis,
  saveReportAsNote,
  clearSynthesis,
  setFormat,
  setMaxLength,
  setIncludeConnections,
  setIncludeResources,
  setResourceMaxChars,
  setCustomPrompt,
  initSynthesisAdapters,
} from '../store/synthesisActions';
import { FormatSelector } from './FormatSelector';
import { ReportViewer } from './ReportViewer';
import { useSelectedEntityIds, useSelectedResourceIds } from '@/store';
import { useNoteAdapter, useConnectionAdapter, useResourceAdapter } from '@/adapters';
import { devSettings$ } from '@/config/devSettings';

export function SynthesisPanel() {
  const isPanelOpen = useSelector(() => synthesisState$.isPanelOpen.get());
  const progress = useSelector(() => synthesisState$.currentProgress.get());
  const report = useSelector(() => synthesisState$.currentReport.get());
  const selectedFormat = useSelector(() => synthesisState$.selectedFormat.get());
  const maxLength = useSelector(() => synthesisState$.maxLength.get());
  const includeConnections = useSelector(() => synthesisState$.includeConnections.get());
  const includeResources = useSelector(() => synthesisState$.includeResources.get());
  const resourceMaxChars = useSelector(() => synthesisState$.resourceMaxChars.get());
  const customPrompt = useSelector(() => synthesisState$.customPrompt.get());
  const isEnabled = useSelector(() => devSettings$.synthesis.enabled.get());

  const selectedEntityIds = useSelectedEntityIds();
  const selectedResourceIds = useSelectedResourceIds();
  const noteAdapter = useNoteAdapter();
  const connectionAdapter = useConnectionAdapter();
  const resourceAdapter = useResourceAdapter();

  // Initialize adapters for the SynthesisService
  useEffect(() => {
    initSynthesisAdapters(noteAdapter, connectionAdapter, resourceAdapter);
  }, [noteAdapter, connectionAdapter, resourceAdapter]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSynthesisPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  if (!isEnabled || !isPanelOpen) return null;

  const isGenerating = progress.status === 'generating' || progress.status === 'gathering';
  const hasError = progress.status === 'error';
  const hasReport = report !== null || progress.partialContent.length > 0;

  const effectiveResourceIds = includeResources ? selectedResourceIds : [];
  const totalSelected = selectedEntityIds.length + effectiveResourceIds.length;

  const handleGenerate = () => {
    generateSynthesis(selectedEntityIds, effectiveResourceIds);
  };

  const handleSave = async () => {
    const noteId = await saveReportAsNote(noteAdapter);
    if (noteId) {
      console.log('[SynthesisPanel] Saved as note:', noteId);
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 w-[480px] bg-athena-bg border-l border-athena-border shadow-xl z-50 flex flex-col"
      role="dialog"
      aria-label="Synthesis panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-athena-border">
        <h2 className="text-lg font-semibold text-athena-text">Synthesize Knowledge</h2>
        <button
          onClick={closeSynthesisPanel}
          className="p-1 rounded hover:bg-athena-surface text-athena-muted"
          aria-label="Close synthesis panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selection Info */}
      <div className="px-4 py-3 bg-athena-surface border-b border-athena-border">
        <div className="text-sm text-athena-muted">
          {selectedEntityIds.length} note{selectedEntityIds.length !== 1 ? 's' : ''}
          {selectedResourceIds.length > 0 && (
            <span>
              {' + '}
              {selectedResourceIds.length} resource
              {selectedResourceIds.length !== 1 ? 's' : ''}
            </span>
          )}
          {' selected'}
        </div>
      </div>

      {/* Options (shown before report is generated) */}
      {!hasReport && (
        <div className="p-4 space-y-4 border-b border-athena-border">
          <FormatSelector value={selectedFormat} onChange={setFormat} disabled={isGenerating} />

          {/* Length Control */}
          <div>
            <label className="block text-sm font-medium text-athena-text mb-2">Target Length</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
                disabled={isGenerating}
                className="flex-1"
              />
              <span className="text-sm text-athena-muted w-20">~{maxLength} words</span>
            </div>
          </div>

          {/* Include Connections */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeConnections}
              onChange={(e) => setIncludeConnections(e.target.checked)}
              disabled={isGenerating}
              className="rounded border-athena-border"
            />
            <span className="text-sm text-athena-text">Include relationships between notes</span>
          </label>

          {/* WP 8.7.1: Include Resources */}
          {selectedResourceIds.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeResources}
                onChange={(e) => setIncludeResources(e.target.checked)}
                disabled={isGenerating}
                className="rounded border-athena-border"
              />
              <span className="text-sm text-athena-text">
                Include {selectedResourceIds.length} resource
                {selectedResourceIds.length !== 1 ? 's' : ''} (PDFs, docs, etc.)
              </span>
            </label>
          )}

          {/* WP 8.7.1: Resource truncation control */}
          {includeResources && selectedResourceIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-athena-text mb-2">
                Resource Content Limit
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="1000"
                  value={resourceMaxChars}
                  onChange={(e) => setResourceMaxChars(Number(e.target.value))}
                  disabled={isGenerating}
                  className="flex-1"
                />
                <span className="text-sm text-athena-muted w-24">
                  ~{Math.round(resourceMaxChars / 1000)}k chars
                </span>
              </div>
              <p className="text-xs text-athena-muted mt-1">
                Per resource. Uses document structure summaries when available.
              </p>
            </div>
          )}

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-athena-text mb-2">
              Additional Guidance (optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g., Focus on practical applications..."
              className="w-full px-3 py-2 text-sm rounded bg-athena-surface border border-athena-border text-athena-text placeholder-athena-muted resize-none"
              rows={2}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || totalSelected < 2}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded font-medium flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress.status === 'gathering' ? 'Gathering content...' : 'Generating...'}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate {selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1)}
              </>
            )}
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isGenerating && (
        <div className="px-4 py-2 border-b border-athena-border">
          <div className="h-1.5 bg-athena-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {hasError && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{progress.error || 'Generation failed'}</span>
          </div>
        </div>
      )}

      {/* Report Viewer */}
      <div className="flex-1 overflow-y-auto">
        <ReportViewer
          content={report?.content || progress.partialContent}
          isStreaming={progress.status === 'generating'}
        />
      </div>

      {/* Footer Actions */}
      {hasReport && (
        <div className="p-4 border-t border-athena-border flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!report}
            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded font-medium flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save as Note
          </button>
          <button
            onClick={clearSynthesis}
            className="py-2 px-4 bg-athena-surface hover:bg-athena-border text-athena-text rounded font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            New
          </button>
        </div>
      )}
    </div>
  );
}
