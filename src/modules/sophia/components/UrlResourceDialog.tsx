import { useState, useEffect } from 'react';
import { useSelector } from '@legendapp/state/react';
import { X, Link, Loader2 } from 'lucide-react';
import { addUrlResource, setResourceAdapter } from '@/store/resourceActions';
import { useResourceAdapter } from '@/adapters';
import { devSettings$ } from '@/config/devSettings';
import type { UrlMode } from '@/shared/types/resources';

interface UrlResourceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (resourceId: string) => void;
  initialPosition?: { x: number; y: number };
}

export function UrlResourceDialog({
  isOpen,
  onClose,
  onSuccess,
  initialPosition,
}: UrlResourceDialogProps) {
  const resourceAdapter = useResourceAdapter();
  const defaultMode = useSelector(() => devSettings$.url?.defaultMode.get()) ?? 'reference';

  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<UrlMode>(defaultMode);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set adapter reference for actions
  useEffect(() => {
    setResourceAdapter(resourceAdapter);
  }, [resourceAdapter]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setMode(defaultMode);
      setNotes('');
      setError(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const isValidUrl = (str: string): boolean => {
    try {
      const parsed = new URL(str);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL (http:// or https://)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resourceId = await addUrlResource(url, mode, notes, initialPosition);
      onSuccess?.(resourceId);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setMode(defaultMode);
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-athena-surface rounded-lg shadow-xl w-full max-w-md mx-4 border border-athena-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
          <h2 className="text-lg font-semibold text-athena-text flex items-center gap-2">
            <Link className="w-5 h-5" />
            Add URL Resource
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 hover:bg-athena-bg rounded text-athena-muted hover:text-athena-text disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* URL Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-athena-muted">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              disabled={isLoading}
              className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-athena-text placeholder:text-athena-muted disabled:opacity-50"
            />
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-athena-muted">Mode</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="urlMode"
                  value="reference"
                  checked={mode === 'reference'}
                  onChange={() => setMode('reference')}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-athena-text">Reference</span>
                  <span className="text-athena-muted ml-2">— bookmark only, instant</span>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="urlMode"
                  value="extracted"
                  checked={mode === 'extracted'}
                  onChange={() => setMode('extracted')}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-athena-text">AI Extract</span>
                  <span className="text-athena-muted ml-2">— fetch & summarize content</span>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-athena-muted">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is this link relevant?"
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-athena-text placeholder:text-athena-muted disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-athena-border bg-athena-bg/50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-athena-muted hover:text-athena-text hover:bg-athena-surface rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !url}
            className={`
              px-4 py-2 rounded font-medium transition-colors flex items-center gap-2
              ${
                url && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-athena-border text-athena-muted cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'extracted' ? 'Extracting...' : 'Adding...'}
              </>
            ) : (
              'Add URL'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
