import { useSelector } from '@legendapp/state/react';
import { devSettings$, devSettingsActions, type SimilarityConfig } from '@/config/devSettings';

export interface UseSimilaritySettingsReturn {
  settings: SimilarityConfig;
  setEnabled: (value: boolean) => void;
  setThreshold: (value: number) => void;
  setRunOnCreate: (value: boolean) => void;
  setWeights: (weights: Partial<SimilarityConfig['weights']>) => void;
  setMergeDefaults: (merge: Partial<SimilarityConfig['merge']>) => void;
}

export function useSimilaritySettings(): UseSimilaritySettingsReturn {
  const settings = useSelector(() => devSettings$.similarity.get());

  return {
    settings,
    setEnabled: devSettingsActions.setSimilarityEnabled,
    setThreshold: devSettingsActions.setSimilarityThreshold,
    setRunOnCreate: devSettingsActions.setSimilarityRunOnCreate,
    setWeights: devSettingsActions.setSimilarityWeights,
    setMergeDefaults: devSettingsActions.setSimilarityMergeDefaults,
  };
}
