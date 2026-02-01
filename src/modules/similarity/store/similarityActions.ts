import { similarityState$ } from './similarityState';
import { devSettings$ } from '@/config/devSettings';
import { SimilarityService } from '../services/SimilarityService';
import { MergeService } from '../services/MergeService';
import { SQLiteMergeCandidateAdapter } from '../adapters/MergeCandidateAdapter';
import type { IMergeCandidateAdapter } from '../adapters/MergeCandidateAdapter';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';
import type { IClusterAdapter } from '@/adapters/IClusterAdapter';
import type { DatabaseConnection } from '@/database/init';
import type { CandidateStatus, MergeOptions, MergeResult, ScanProgress } from '../types';

let similarityService: SimilarityService | null = null;
let mergeService: MergeService | null = null;
let candidateAdapter: IMergeCandidateAdapter | null = null;

/**
 * Initialize the similarity module services.
 * Must be called once after adapters are available.
 */
export function initSimilarityServices(
  db: DatabaseConnection,
  noteAdapter: INoteAdapter,
  connectionAdapter: IConnectionAdapter,
  embeddingAdapter: IEmbeddingAdapter,
  clusterAdapter: IClusterAdapter
): void {
  candidateAdapter = new SQLiteMergeCandidateAdapter(db);

  const settings = devSettings$.similarity.get();

  similarityService = new SimilarityService(candidateAdapter, noteAdapter, embeddingAdapter, {
    threshold: settings.threshold,
    weights: settings.weights,
  });

  mergeService = new MergeService(candidateAdapter, noteAdapter, connectionAdapter, clusterAdapter);

  similarityState$.isInitialized.set(true);
}

export const similarityActions = {
  async loadCandidates(): Promise<void> {
    if (!candidateAdapter) return;

    const filter = similarityState$.filterStatus.get();
    const status = filter === 'all' ? undefined : filter;
    const candidates = await candidateAdapter.getAll(status);
    similarityState$.candidates.set(candidates);
  },

  async scanAll(): Promise<ScanProgress> {
    if (!similarityService) {
      return similarityState$.scanProgress.get();
    }

    // Sync config from DevSettings before scanning
    const settings = devSettings$.similarity.get();
    similarityService.updateConfig({
      threshold: settings.threshold,
      weights: settings.weights,
    });

    const progress = await similarityService.scanAll((p) => {
      similarityState$.scanProgress.set({ ...p });
    });

    // Refresh candidates list after scan
    await similarityActions.loadCandidates();
    return progress;
  },

  async scanNote(noteId: string): Promise<void> {
    if (!similarityService) return;

    const settings = devSettings$.similarity.get();
    similarityService.updateConfig({
      threshold: settings.threshold,
      weights: settings.weights,
    });

    await similarityService.scanNote(noteId);
    await similarityActions.loadCandidates();
  },

  abortScan(): void {
    similarityService?.abortScan();
  },

  async merge(candidateId: string, options: MergeOptions): Promise<MergeResult | null> {
    if (!mergeService) return null;

    const result = await mergeService.merge(candidateId, options);
    await similarityActions.loadCandidates();
    return result;
  },

  async reject(candidateId: string): Promise<void> {
    if (!mergeService) return;

    await mergeService.reject(candidateId);
    await similarityActions.loadCandidates();
  },

  setFilterStatus(status: CandidateStatus | 'all'): void {
    similarityState$.filterStatus.set(status);
    // Reload with new filter
    similarityActions.loadCandidates();
  },
};
