import { useDevSettings, useDevSettingsOpen, uiActions } from '@/store';
import { devSettingsActions, type FeatureFlags } from './devSettings';
import { useEffect } from 'react';

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
          {/* AI Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">AI (Phase 3)</h3>
            <FlagRow label="Enable AI" flag="enableAI" value={settings.flags.enableAI} />
            <FlagRow
              label="AI Backend"
              flag="aiBackend"
              value={settings.flags.aiBackend}
              type="select"
              options={['none', 'ollama', 'anthropic', 'openai', 'gemini', 'mistral']}
            />
            <FlagRow
              label="Show Green Connections"
              flag="showGreenConnections"
              value={settings.flags.showGreenConnections}
            />
          </div>

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
