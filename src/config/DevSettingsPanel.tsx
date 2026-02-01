import { useDevSettings, useDevSettingsOpen, uiActions, useNotes, entityActions } from '@/store';
import { devSettingsActions, type FeatureFlags } from './devSettings';
import { useEffect, useState, useCallback } from 'react';
import {
  useOptionalAI,
  useOptionalIndexer,
  type AIProviderType,
  PROVIDER_NAMES,
  PROVIDER_MODELS,
} from '@/modules/ai';
import { useNoteAdapter } from '@/adapters';
import { seedTestNotes, deleteTestNotes, countTestNotes } from './seedTestNotes';

interface FlagRowProps {
  label: string;
  flag: keyof FeatureFlags;
  value: boolean | string;
  type?: 'boolean' | 'select';
  options?: string[];
}

function FlagRow({ label, flag, value, type = 'boolean', options }: FlagRowProps) {
  if (type === 'select' && options) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">{label}</span>
        <select
          value={value as string}
          onChange={(e) => devSettingsActions.setFlag(flag, e.target.value as FeatureFlags[typeof flag])}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        onClick={() => devSettingsActions.setFlag(flag, !value as FeatureFlags[typeof flag])}
        className={`w-12 h-6 rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function ConnectionStatus({
  isConfigured,
  isAvailable,
  isLoading,
}: {
  isConfigured: boolean;
  isAvailable: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <span className="animate-spin">&#8987;</span> Checking...
      </span>
    );
  }

  if (!isConfigured) {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        &#9675; Not configured
      </span>
    );
  }

  if (isAvailable) {
    return (
      <span className="text-xs text-green-400 flex items-center gap-1">
        &#10003; Connected
      </span>
    );
  }

  return (
    <span className="text-xs text-red-400 flex items-center gap-1">
      &#10007; Not connected
    </span>
  );
}

/**
 * Format a date as a relative time string (e.g., "2 minutes ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function IndexerStatusSection() {
  const indexer = useOptionalIndexer();
  const [isIndexing, setIsIndexing] = useState(false);

  const handleIndexAll = useCallback(async () => {
    if (!indexer) return;
    setIsIndexing(true);
    try {
      const result = await indexer.indexAll();
      console.log(`Indexed ${result.success} notes, ${result.failed} failed`);
    } finally {
      setIsIndexing(false);
    }
  }, [indexer]);

  if (!indexer || !indexer.isEnabled) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Background Indexer</h3>
        <div className="text-gray-500 text-sm py-2">
          AI is disabled. Enable AI to use the indexer.
        </div>
      </div>
    );
  }

  const { status } = indexer;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">Background Indexer</h3>

      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Status</span>
        <span
          className={`text-sm ${
            status.mode === 'indexing'
              ? 'text-amber-400'
              : status.mode === 'paused'
                ? 'text-yellow-500'
                : 'text-gray-400'
          }`}
        >
          {status.mode}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Processed</span>
        <span className="text-sm text-gray-400">{status.processed}</span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Failed</span>
        <span className={`text-sm ${status.failed > 0 ? 'text-red-400' : 'text-gray-400'}`}>
          {status.failed}
        </span>
      </div>

      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Queue</span>
        <span className="text-sm text-gray-400">{status.queue.length}</span>
      </div>

      {status.lastIndexedAt && (
        <div className="flex items-center justify-between py-2 border-b border-gray-700">
          <span className="text-sm text-gray-300">Last indexed</span>
          <span className="text-sm text-gray-400">
            {formatRelativeTime(new Date(status.lastIndexedAt))}
          </span>
        </div>
      )}

      {status.currentEntityId && (
        <div className="flex items-center justify-between py-2 border-b border-gray-700">
          <span className="text-sm text-gray-300">Current</span>
          <span className="text-xs text-gray-400 font-mono truncate max-w-[150px]">
            {status.currentEntityId.substring(0, 8)}...
          </span>
        </div>
      )}

      <div className="pt-3">
        <button
          onClick={handleIndexAll}
          disabled={isIndexing}
          className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isIndexing ? 'Indexing...' : 'Index All Unembedded Notes'}
        </button>
      </div>
    </div>
  );
}

function TestDataSection() {
  const noteAdapter = useNoteAdapter();
  const notes = useNotes();
  const indexer = useOptionalIndexer();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastResult, setLastResult] = useState<{ action: string; count: number } | null>(null);

  const testNoteCount = countTestNotes(notes);

  const handleSeedNotes = useCallback(async () => {
    setIsSeeding(true);
    setLastResult(null);
    try {
      const result = await seedTestNotes(noteAdapter, entityActions.addNote);
      setLastResult({ action: 'seeded', count: result.created });

      // Trigger indexing for all new notes if indexer is available
      if (indexer && result.notes.length > 0) {
        console.log('[TestDataSection] Triggering index for new notes...');
        await indexer.indexAll();
      }
    } catch (error) {
      console.error('[TestDataSection] Seed failed:', error);
      setLastResult({ action: 'error', count: 0 });
    } finally {
      setIsSeeding(false);
    }
  }, [noteAdapter, indexer]);

  const handleDeleteNotes = useCallback(async () => {
    setIsDeleting(true);
    setLastResult(null);
    try {
      const deleted = await deleteTestNotes(noteAdapter, () => notes, entityActions.removeNote);
      setLastResult({ action: 'deleted', count: deleted });
    } catch (error) {
      console.error('[TestDataSection] Delete failed:', error);
      setLastResult({ action: 'error', count: 0 });
    } finally {
      setIsDeleting(false);
    }
  }, [noteAdapter, notes]);

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">Test Data (Hybrid Search)</h3>

      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Test Notes</span>
        <span className="text-sm text-gray-400">{testNoteCount} / 20</span>
      </div>

      <div className="pt-3 space-y-2">
        <button
          onClick={handleSeedNotes}
          disabled={isSeeding || isDeleting}
          className="w-full px-3 py-2 text-sm bg-amber-700 border border-amber-600 rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSeeding ? 'Seeding...' : 'Seed 20 Test Notes'}
        </button>

        <button
          onClick={handleDeleteNotes}
          disabled={isSeeding || isDeleting || testNoteCount === 0}
          className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Deleting...' : `Delete Test Notes (${testNoteCount})`}
        </button>

        {lastResult && (
          <p
            className={`text-xs mt-2 ${
              lastResult.action === 'error' ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {lastResult.action === 'seeded' && `Created ${lastResult.count} notes`}
            {lastResult.action === 'deleted' && `Deleted ${lastResult.count} notes`}
            {lastResult.action === 'error' && 'Operation failed'}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Seeds diverse notes for testing keyword, semantic, and hybrid search.
      </p>
    </div>
  );
}

function AIConfigSection() {
  const settings = useDevSettings();
  const ai = useOptionalAI();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const provider = settings.flags.aiBackend as AIProviderType | 'none';
  const isEnabled = settings.flags.enableAI;
  const needsApiKey = provider !== 'none' && provider !== 'ollama';

  // Check if API key exists when provider changes
  useEffect(() => {
    if (ai && needsApiKey) {
      ai.hasApiKey(provider as AIProviderType).then(setHasKey);
    } else {
      setHasKey(false);
    }
    setApiKeyInput('');
    setTestResult(null);
  }, [ai, provider, needsApiKey]);

  const handleSetApiKey = useCallback(async () => {
    if (!ai || !apiKeyInput.trim() || provider === 'none') return;
    try {
      await ai.setApiKey(provider as AIProviderType, apiKeyInput.trim());
      setHasKey(true);
      setApiKeyInput('');
      setTestResult(null);
    } catch (error) {
      console.error('Failed to set API key:', error);
    }
  }, [ai, apiKeyInput, provider]);

  const handleClearApiKey = useCallback(async () => {
    if (!ai || provider === 'none') return;
    try {
      await ai.clearApiKey(provider as AIProviderType);
      setHasKey(false);
      setTestResult(null);
    } catch (error) {
      console.error('Failed to clear API key:', error);
    }
  }, [ai, provider]);

  const handleTestConnection = useCallback(async () => {
    if (!ai) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await ai.testConnection();
      setTestResult(result ? 'success' : 'failed');
    } catch {
      setTestResult('failed');
    } finally {
      setIsTesting(false);
    }
  }, [ai]);

  const providerModels = provider !== 'none' ? PROVIDER_MODELS[provider as AIProviderType] : null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">AI Configuration</h3>
        {ai && (
          <ConnectionStatus
            isConfigured={ai.isConfigured}
            isAvailable={ai.isAvailable}
            isLoading={ai.isLoading}
          />
        )}
      </div>

      {/* Enable AI Toggle */}
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Enable AI</span>
        <Toggle
          checked={isEnabled}
          onChange={(checked) => devSettingsActions.setFlag('enableAI', checked)}
        />
      </div>

      {/* Provider Selection */}
      <div className="flex items-center justify-between py-2 border-b border-gray-700">
        <span className="text-sm text-gray-300">Provider</span>
        <select
          value={provider}
          onChange={(e) =>
            devSettingsActions.setFlag('aiBackend', e.target.value as FeatureFlags['aiBackend'])
          }
          disabled={!isEnabled}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1 disabled:opacity-50"
        >
          {Object.entries(PROVIDER_NAMES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Provider-specific settings - only show when AI is enabled and provider is selected */}
      {isEnabled && provider !== 'none' && (
        <>
          {/* API Key Section (not needed for Ollama) */}
          {needsApiKey && (
            <div className="py-3 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">API Key</span>
                {hasKey && (
                  <span className="text-xs text-green-400">Key stored</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={hasKey ? '••••••••' : 'Enter API key'}
                  className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 placeholder-gray-500"
                />
                <button
                  onClick={handleSetApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                {hasKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Test Connection Button */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={!hasKey || isTesting}
                  className="bg-gray-600 text-white text-xs px-3 py-1 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult === 'success' && (
                  <span className="text-xs text-green-400">Connection successful</span>
                )}
                {testResult === 'failed' && (
                  <span className="text-xs text-red-400">Connection failed</span>
                )}
              </div>

              {ai?.error && (
                <p className="mt-2 text-xs text-red-400">{ai.error}</p>
              )}
            </div>
          )}

          {/* Ollama Endpoint (only for Ollama) */}
          {provider === 'ollama' && (
            <div className="py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300 block mb-1">Endpoint</span>
              <input
                type="text"
                defaultValue="http://localhost:11434"
                disabled
                className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ollama must be running locally
              </p>
            </div>
          )}

          {/* Model Selection */}
          {providerModels && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300">Chat Model</span>
                <select
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                  defaultValue={providerModels.chat[0]}
                >
                  {providerModels.chat.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300">Embedding Model</span>
                <select
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                  defaultValue={providerModels.embedding[0]}
                >
                  {providerModels.embedding.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </>
      )}

      {/* Show Green Connections (AI-suggested) */}
      <FlagRow
        label="Show Green Connections"
        flag="showGreenConnections"
        value={settings.flags.showGreenConnections}
      />
    </div>
  );
}

export function DevSettingsPanel() {
  const isOpen = useDevSettingsOpen();
  const settings = useDevSettings();

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        uiActions.toggleDevSettings();
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        uiActions.closeDevSettings();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">DevSettings</h2>
          <button
            onClick={() => uiActions.closeDevSettings()}
            className="text-gray-400 hover:text-white text-xl"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-2 overflow-y-auto max-h-[60vh]">
          {/* AI Configuration Section */}
          <AIConfigSection />

          {/* Canvas Settings Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Canvas</h3>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">AI Suggestions</span>
              <select
                value={settings.canvas.showAiSuggestions}
                onChange={(e) =>
                  devSettingsActions.setShowAiSuggestions(
                    e.target.value as 'always' | 'on-select'
                  )
                }
                className="bg-gray-700 text-white text-sm rounded px-2 py-1"
              >
                <option value="always">Always visible</option>
                <option value="on-select">On select only</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {settings.canvas.showAiSuggestions === 'always'
                ? 'Green connections persist across note selections'
                : 'Green connections clear when you deselect a note'}
            </p>
          </div>

          {/* Background Indexer Section */}
          <IndexerStatusSection />

          {/* Search Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Search (Phase 4)</h3>
            <FlagRow
              label="Semantic Search"
              flag="enableSemanticSearch"
              value={settings.flags.enableSemanticSearch}
            />
            <FlagRow
              label="Hybrid Search (RRF)"
              flag="enableHybridSearch"
              value={settings.flags.enableHybridSearch}
            />
          </div>

          {/* Validation Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Validation (Phase 5)</h3>
            <FlagRow
              label="CPN Validation"
              flag="enableCPNValidation"
              value={settings.flags.enableCPNValidation}
            />
            <FlagRow
              label="Validation Panel"
              flag="showValidationPanel"
              value={settings.flags.showValidationPanel}
            />
          </div>

          {/* Resources Section (Phase 6) */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Resources (Phase 6)</h3>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">Show on Canvas</span>
              <Toggle
                checked={settings.resources?.enabled ?? true}
                onChange={(checked) => devSettingsActions.setResourcesEnabled(checked)}
              />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">Node Color Scheme</span>
              <select
                value={settings.resources?.nodeColorScheme ?? 'per-type'}
                onChange={(e) =>
                  devSettingsActions.setResourceColorScheme(
                    e.target.value as 'unified' | 'per-type'
                  )
                }
                className="bg-gray-700 text-white text-sm rounded px-2 py-1"
              >
                <option value="per-type">Per type (colored)</option>
                <option value="unified">Unified (purple)</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {settings.resources?.nodeColorScheme === 'unified'
                ? 'All resources shown in purple'
                : 'PDF=red, DOCX=blue, XLSX=green, etc.'}
            </p>
          </div>

          {/* Chat Context Section (WP 8.8) */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Chat Context</h3>

            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">Include Traversal</span>
              <Toggle
                checked={settings.chat?.context?.includeTraversal ?? true}
                onChange={(checked) => devSettingsActions.setContextIncludeTraversal(checked)}
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">Traversal Depth</span>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.chat?.context?.traversalDepth ?? 2}
                onChange={(e) => devSettingsActions.setContextTraversalDepth(parseInt(e.target.value) || 2)}
                className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 text-right"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">Traversal Decay</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={settings.chat?.context?.traversalDecay ?? 0.5}
                onChange={(e) => devSettingsActions.setTraversalDecay(parseFloat(e.target.value) || 0.5)}
                className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 text-right"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-300">Max Traversal Nodes</span>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.chat?.context?.maxTraversalNodes ?? 20}
                onChange={(e) => devSettingsActions.setMaxTraversalNodes(parseInt(e.target.value) || 20)}
                className="w-16 bg-gray-700 text-white text-sm rounded px-2 py-1 text-right"
              />
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Score = 0.5 x decay^depth. Depth {settings.chat?.context?.traversalDepth ?? 2} with decay {settings.chat?.context?.traversalDecay ?? 0.5} =&gt; scores: {
                Array.from(
                  { length: settings.chat?.context?.traversalDepth ?? 2 },
                  (_, i) => (0.5 * Math.pow(settings.chat?.context?.traversalDecay ?? 0.5, i)).toFixed(3)
                ).join(', ')
              }
            </p>
          </div>

          {/* Test Data Section */}
          <TestDataSection />

          {/* Debug Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Debug</h3>
            <FlagRow
              label="Show Debug Info"
              flag="showDebugInfo"
              value={settings.flags.showDebugInfo}
            />
            <FlagRow
              label="Log State Changes"
              flag="logStateChanges"
              value={settings.flags.logStateChanges}
            />
            <FlagRow
              label="Log Adapter Calls"
              flag="logAdapterCalls"
              value={settings.flags.logAdapterCalls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between px-4 py-3 border-t border-gray-700">
          <button
            onClick={() => devSettingsActions.resetToDefaults()}
            className="text-sm text-gray-400 hover:text-white"
          >
            Reset to Defaults
          </button>
          <span className="text-xs text-gray-500">Ctrl+Shift+D to toggle</span>
        </div>
      </div>
    </div>
  );
}
