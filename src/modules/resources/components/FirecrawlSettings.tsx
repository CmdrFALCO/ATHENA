import { useState, useEffect } from 'react';
import { Key, Check, X, Loader2, ExternalLink } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { getSecureStorage } from '@/services/secureStorage';
import { getWebScraperService } from '../url/WebScraperService';
import { devSettings$ } from '@/config/devSettings';

/**
 * Firecrawl API key configuration component.
 * Used in DevSettings panel or standalone settings.
 */
export function FirecrawlSettings() {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const enabled = useSelector(() => devSettings$.url.firecrawl.enabled.get());
  const timeout = useSelector(() => devSettings$.url.firecrawl.timeout.get());

  useEffect(() => {
    const checkKey = async () => {
      const storage = getSecureStorage();
      const existingKey = await storage.retrieve('firecrawl-api-key');
      setHasKey(!!existingKey);
    };
    checkKey();
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;

    setSaving(true);
    try {
      const storage = getSecureStorage();
      await storage.store('firecrawl-api-key', apiKey.trim());

      // Reload the scraper service
      const scraper = getWebScraperService();
      scraper.getFirecrawlScraper().resetKeyCache();
      await scraper.initialize();

      setHasKey(true);
      setApiKey('');

      // Auto-enable if key is saved
      devSettings$.url.firecrawl.enabled.set(true);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    const storage = getSecureStorage();
    await storage.delete('firecrawl-api-key');

    const scraper = getWebScraperService();
    scraper.getFirecrawlScraper().resetKeyCache();

    setHasKey(false);
    devSettings$.url.firecrawl.enabled.set(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const scraper = getWebScraperService();
      await scraper.initialize();

      const result = await scraper.scrape('https://example.com', {
        formats: ['markdown'],
        timeout: 10000,
      });

      setTestResult(result.scrapedBy === 'firecrawl' && result.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border border-athena-border rounded-lg p-4 bg-athena-surface space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-athena-text flex items-center gap-2">
          <Key size={16} />
          Firecrawl API
        </h4>
        <a
          href="https://www.firecrawl.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
        >
          Get API Key <ExternalLink size={12} />
        </a>
      </div>

      {hasKey ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Check size={14} />
            API key configured
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-athena-text cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => devSettings$.url.firecrawl.enabled.set(e.target.checked)}
                className="rounded"
              />
              Enable Firecrawl
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-athena-muted">Timeout (ms):</label>
            <input
              type="number"
              value={timeout}
              onChange={(e) =>
                devSettings$.url.firecrawl.timeout.set(parseInt(e.target.value) || 30000)
              }
              className="w-24 px-2 py-1 text-sm bg-athena-bg border border-athena-border rounded text-athena-text"
              min={5000}
              max={120000}
              step={5000}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing || !enabled}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : null}
              Test Connection
            </button>
            <button
              onClick={handleRemoveKey}
              className="px-3 py-1.5 text-sm text-red-400 border border-red-500/30 rounded hover:bg-red-500/10"
            >
              Remove Key
            </button>
          </div>

          {testResult && (
            <div
              className={`text-sm flex items-center gap-1 ${
                testResult === 'success' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {testResult === 'success' ? <Check size={14} /> : <X size={14} />}
              {testResult === 'success' ? 'Connection successful!' : 'Connection failed'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter Firecrawl API key"
            className="w-full px-3 py-2 text-sm bg-athena-bg border border-athena-border rounded text-athena-text placeholder:text-athena-muted"
          />
          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || saving}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save API Key
          </button>
          <p className="text-xs text-athena-muted">
            API key is stored securely using Web Crypto API
          </p>
        </div>
      )}
    </div>
  );
}
