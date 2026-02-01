import { useCallback, useState } from 'react';
import { similarityActions } from '../store/similarityActions';
import type { MergeOptions, MergeResult } from '../types';

export interface UseMergeReturn {
  merge: (candidateId: string, options: MergeOptions) => Promise<MergeResult | null>;
  reject: (candidateId: string) => Promise<void>;
  isMerging: boolean;
  lastResult: MergeResult | null;
}

export function useMerge(): UseMergeReturn {
  const [isMerging, setIsMerging] = useState(false);
  const [lastResult, setLastResult] = useState<MergeResult | null>(null);

  const merge = useCallback(async (candidateId: string, options: MergeOptions) => {
    setIsMerging(true);
    try {
      const result = await similarityActions.merge(candidateId, options);
      setLastResult(result);
      return result;
    } finally {
      setIsMerging(false);
    }
  }, []);

  const reject = useCallback(async (candidateId: string) => {
    await similarityActions.reject(candidateId);
  }, []);

  return { merge, reject, isMerging, lastResult };
}
