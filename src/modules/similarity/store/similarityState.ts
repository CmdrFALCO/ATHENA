import { observable } from '@legendapp/state';
import type { MergeCandidate, ScanProgress, CandidateStatus } from '../types';

export interface SimilarityState {
  candidates: MergeCandidate[];
  scanProgress: ScanProgress;
  filterStatus: CandidateStatus | 'all';
  isInitialized: boolean;
}

export const similarityState$ = observable<SimilarityState>({
  candidates: [],
  scanProgress: {
    status: 'idle',
    notesScanned: 0,
    totalNotes: 0,
    candidatesFound: 0,
  },
  filterStatus: 'pending',
  isInitialized: false,
});
