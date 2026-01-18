import { useContext } from 'react';
import { AIContext, type AIContextValue } from '../AIContext';
import type { AIProviderType } from '../types';

export function useAI(): AIContextValue {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

export function useAIStatus(): {
  isConfigured: boolean;
  isAvailable: boolean;
  provider: AIProviderType | null;
} {
  const { isConfigured, isAvailable, provider } = useAI();
  return { isConfigured, isAvailable, provider };
}

// Optional hook that doesn't throw if outside provider
export function useOptionalAI(): AIContextValue | null {
  return useContext(AIContext);
}
