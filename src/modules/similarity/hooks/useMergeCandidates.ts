import { useSelector } from '@legendapp/state/react';
import { similarityState$ } from '../store/similarityState';
import { similarityActions } from '../store/similarityActions';
import type { MergeCandidate, CandidateStatus, ScanProgress } from '../types';

export interface UseMergeCandidatesReturn {
  candidates: MergeCandidate[];
  scanProgress: ScanProgress;
  filterStatus: CandidateStatus | 'all';
  isInitialized: boolean;
  scanAll: () => Promise<ScanProgress>;
  abortScan: () => void;
  setFilter: (status: CandidateStatus | 'all') => void;
  refresh: () => Promise<void>;
}

export function useMergeCandidates(): UseMergeCandidatesReturn {
  const candidates = useSelector(() => similarityState$.candidates.get());
  const scanProgress = useSelector(() => similarityState$.scanProgress.get());
  const filterStatus = useSelector(() => similarityState$.filterStatus.get());
  const isInitialized = useSelector(() => similarityState$.isInitialized.get());

  return {
    candidates,
    scanProgress,
    filterStatus,
    isInitialized,
    scanAll: similarityActions.scanAll,
    abortScan: similarityActions.abortScan,
    setFilter: similarityActions.setFilterStatus,
    refresh: similarityActions.loadCandidates,
  };
}
