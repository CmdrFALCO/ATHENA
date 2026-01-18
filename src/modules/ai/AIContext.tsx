import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSelector } from '@legendapp/state/react';
import { getAIService } from './AIService';
import type { AIProviderType, AISettings } from './types';
import { DEFAULT_AI_SETTINGS } from './types';
import { devSettings$ } from '@/config';
import { AIContext, type AIContextValue } from './context';

// Re-export for backwards compatibility
export { AIContext, type AIContextValue } from './context';

export function AIProvider({ children }: { children: ReactNode }) {
  const service = useMemo(() => getAIService(), []);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get primitive values from devSettings to avoid object reference issues
  const enableAI = useSelector(() => devSettings$.flags.enableAI.get());
  const aiBackend = useSelector(() => devSettings$.flags.aiBackend.get());

  // Memoize aiSettings to prevent unnecessary re-renders
  const aiSettings = useMemo<AISettings>(() => ({
    ...DEFAULT_AI_SETTINGS,
    enabled: enableAI,
    provider: aiBackend,
  }), [enableAI, aiBackend]);

  const provider = aiSettings.enabled && aiSettings.provider !== 'none'
    ? aiSettings.provider
    : null;

  // Initialize service when settings change
  useEffect(() => {
    let mounted = true;

    async function initService() {
      setIsLoading(true);
      setError(null);

      try {
        await service.initialize(aiSettings);

        if (mounted) {
          setIsConfigured(service.isConfigured());

          // Check availability only if configured
          if (service.isConfigured()) {
            try {
              const available = await service.isAvailable();
              if (mounted) {
                setIsAvailable(available);
              }
            } catch {
              if (mounted) {
                setIsAvailable(false);
              }
            }
          } else {
            setIsAvailable(false);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize AI service');
          setIsConfigured(false);
          setIsAvailable(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initService();

    return () => {
      mounted = false;
    };
  }, [service, aiSettings]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const available = await service.isAvailable();
      setIsAvailable(available);
      if (!available) {
        setError('Connection test failed. Please check your API key and network connection.');
      }
      return available;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      setError(message);
      setIsAvailable(false);
      return false;
    }
  }, [service]);

  const setApiKey = useCallback(async (prov: AIProviderType, key: string): Promise<void> => {
    setError(null);
    try {
      await service.setApiKey(prov, key);
      setIsConfigured(service.isConfigured());

      // Test connection with new key
      if (prov === provider) {
        const available = await service.isAvailable();
        setIsAvailable(available);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set API key';
      setError(message);
      throw err;
    }
  }, [service, provider]);

  const clearApiKey = useCallback(async (prov: AIProviderType): Promise<void> => {
    setError(null);
    try {
      await service.clearApiKey(prov);
      setIsConfigured(service.isConfigured());
      if (prov === provider) {
        setIsAvailable(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear API key';
      setError(message);
      throw err;
    }
  }, [service, provider]);

  const hasApiKey = useCallback(async (prov: AIProviderType): Promise<boolean> => {
    return service.hasApiKey(prov);
  }, [service]);

  const value: AIContextValue = {
    service,
    isConfigured,
    isAvailable,
    isLoading,
    error,
    provider,
    testConnection,
    setApiKey,
    clearApiKey,
    hasApiKey,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// Hooks are exported from ./hooks/useAIContext.ts for fast refresh compatibility
