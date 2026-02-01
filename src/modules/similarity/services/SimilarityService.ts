import type { IMergeCandidateAdapter } from '../adapters/MergeCandidateAdapter';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';
import type { SimilarityWeights, ScanProgress, MergeCandidate } from '../types';
import { computeSimilarityScores, DEFAULT_WEIGHTS } from '../algorithms/combined';

export interface SimilarityServiceConfig {
  threshold: number; // Minimum combined score to create candidate
  weights: SimilarityWeights;
}

const DEFAULT_CONFIG: SimilarityServiceConfig = {
  threshold: 0.85,
  weights: DEFAULT_WEIGHTS,
};

export class SimilarityService {
  private scanProgress: ScanProgress = {
    status: 'idle',
    notesScanned: 0,
    totalNotes: 0,
    candidatesFound: 0,
  };
  private abortController: AbortController | null = null;

  constructor(
    private candidateAdapter: IMergeCandidateAdapter,
    private noteAdapter: INoteAdapter,
    private embeddingAdapter: IEmbeddingAdapter,
    private config: SimilarityServiceConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Scan all notes for similarity, creating merge candidates.
   *
   * Notes without embeddings are still compared using title + content
   * similarity only (graceful degradation). The combined score weights
   * are redistributed proportionally in that case.
   */
  async scanAll(onProgress?: (progress: ScanProgress) => void): Promise<ScanProgress> {
    this.abortController = new AbortController();

    const allNotes = await this.noteAdapter.getAll();

    // Build a map of embeddings keyed by entity ID
    const embeddingMap = new Map<string, number[]>();
    for (const note of allNotes) {
      const record = await this.embeddingAdapter.getForEntity(note.id);
      if (record) {
        embeddingMap.set(note.id, record.vector);
      }
    }

    this.scanProgress = {
      status: 'scanning',
      notesScanned: 0,
      totalNotes: allNotes.length,
      candidatesFound: 0,
      startedAt: new Date().toISOString(),
    };
    onProgress?.(this.scanProgress);

    try {
      // Compare each pair (O(n^2) but necessary for similarity)
      for (let i = 0; i < allNotes.length; i++) {
        if (this.abortController.signal.aborted) {
          this.scanProgress.status = 'idle';
          break;
        }

        const noteA = allNotes[i];

        for (let j = i + 1; j < allNotes.length; j++) {
          const noteB = allNotes[j];

          // Skip if candidate already exists
          const exists = await this.candidateAdapter.exists(noteA.id, noteB.id);
          if (exists) continue;

          const scores = computeSimilarityScores(
            {
              title: noteA.title,
              content: noteA.content,
              embedding: embeddingMap.get(noteA.id),
            },
            {
              title: noteB.title,
              content: noteB.content,
              embedding: embeddingMap.get(noteB.id),
            },
            this.config.weights
          );

          if (scores.combined >= this.config.threshold) {
            await this.candidateAdapter.create(noteA.id, noteB.id, scores);
            this.scanProgress.candidatesFound++;
          }
        }

        this.scanProgress.notesScanned = i + 1;

        if (i % 10 === 0) {
          onProgress?.(this.scanProgress);
        }
      }

      if (this.scanProgress.status === 'scanning') {
        this.scanProgress.status = 'complete';
        this.scanProgress.completedAt = new Date().toISOString();
      }
    } catch (error) {
      this.scanProgress.status = 'error';
      this.scanProgress.error = error instanceof Error ? error.message : 'Unknown error';
    }

    onProgress?.(this.scanProgress);
    return this.scanProgress;
  }

  /**
   * Check a single note against all others.
   * Call this when a new note is created or updated.
   */
  async scanNote(noteId: string): Promise<MergeCandidate[]> {
    const note = await this.noteAdapter.getById(noteId);
    if (!note) return [];

    const noteEmbedding = await this.embeddingAdapter.getForEntity(noteId);
    const allNotes = await this.noteAdapter.getAll();
    const candidates: MergeCandidate[] = [];

    for (const other of allNotes) {
      if (other.id === noteId) continue;

      const exists = await this.candidateAdapter.exists(note.id, other.id);
      if (exists) continue;

      const otherEmbedding = await this.embeddingAdapter.getForEntity(other.id);

      const scores = computeSimilarityScores(
        {
          title: note.title,
          content: note.content,
          embedding: noteEmbedding?.vector,
        },
        {
          title: other.title,
          content: other.content,
          embedding: otherEmbedding?.vector,
        },
        this.config.weights
      );

      if (scores.combined >= this.config.threshold) {
        const candidate = await this.candidateAdapter.create(note.id, other.id, scores);
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  abortScan(): void {
    this.abortController?.abort();
  }

  getProgress(): ScanProgress {
    return this.scanProgress;
  }

  updateConfig(config: Partial<SimilarityServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
