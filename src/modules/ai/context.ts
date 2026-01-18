import { createContext } from 'react';
import type { IAIService } from './AIService';
import type { AIProviderType } from './types';

export interface AIContextValue {
  service: IAIService;
  isConfigured: boolean;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  provider: AIProviderType | null;

  // Actions
  testConnection: () => Promise<boolean>;
  setApiKey: (provider: AIProviderType, key: string) => Promise<void>;
  clearApiKey: (provider: AIProviderType) => Promise<void>;
  hasApiKey: (provider: AIProviderType) => Promise<boolean>;
}

export const AIContext = createContext<AIContextValue | null>(null);
