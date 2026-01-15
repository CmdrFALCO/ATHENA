import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IAIService } from './AIService';
import type { Note, Block } from '@/shared/types';

export interface IndexerStatus {
  isRunning: boolean;
  mode: 'idle' | 'indexing' | 'paused';
  queue: string[]; // Entity IDs waiting to be indexed
  processed: number; // Count in current session
  failed: number;
  lastIndexedAt: string | null;
  currentEntityId: string | null;
}

export interface IndexerConfig {
  trigger: 'on-save' | 'on-demand' | 'continuous';
  batchSize: number; // For continuous mode
  idleDelayMs: number; // Wait before starting continuous indexing
  debounceMs: number; // For on-save mode
  retryFailedAfterMs: number; // Retry failed embeddings after this delay
}

const DEFAULT_CONFIG: IndexerConfig = {
  trigger: 'on-save',
  batchSize: 5,
  idleDelayMs: 3000,
  debounceMs: 2000,
  retryFailedAfterMs: 60000,
};

export class IndexerService {
  private status: IndexerStatus = {
    isRunning: false,
    mode: 'idle',
    queue: [],
    processed: 0,
    failed: 0,
    lastIndexedAt: null,
    currentEntityId: null,
  };

  private config: IndexerConfig;
  private saveDebounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private continuousIntervalId: ReturnType<typeof setTimeout> | null = null;
  private idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private failedEntities: Map<string, number> = new Map(); // entityId -> timestamp of failure

  private onStatusChange?: (status: IndexerStatus) => void;

  constructor(
    private aiService: IAIService,
    private embeddingAdapter: IEmbeddingAdapter,
    private noteAdapter: INoteAdapter,
    config?: Partial<IndexerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --- Configuration ---

  updateConfig(config: Partial<IndexerConfig>): void {
    const oldTrigger = this.config.trigger;
    this.config = { ...this.config, ...config };

    // If trigger mode changed, restart accordingly
    if (oldTrigger !== this.config.trigger) {
      this.stop();
      if (this.config.trigger === 'continuous') {
        this.startContinuousMode();
      }
    }
  }

  setStatusCallback(callback: (status: IndexerStatus) => void): void {
    this.onStatusChange = callback;
  }

  // --- Public API ---

  /**
   * Called when a note is saved. Behavior depends on trigger mode.
   */
  onNoteSaved(noteId: string, content: string): void {
    if (this.config.trigger === 'on-demand') {
      // Do nothing - user must explicitly request
      return;
    }

    if (this.config.trigger === 'on-save') {
      this.debouncedIndex(noteId, content);
    }

    if (this.config.trigger === 'continuous') {
      // Add to queue, will be processed in next batch
      this.addToQueue(noteId);
    }
  }

  /**
   * Manually index a specific note (for on-demand mode or re-indexing)
   */
  async indexNote(noteId: string): Promise<boolean> {
    const note = await this.noteAdapter.getById(noteId);
    if (!note) return false;

    const content = this.extractTextContent(note);
    return this.embedNote(noteId, content);
  }

  /**
   * Index all notes that don't have embeddings for current model
   */
  async indexAllUnembedded(): Promise<{ success: number; failed: number }> {
    const model = this.aiService.getActiveEmbeddingModel();
    if (!model) return { success: 0, failed: 0 };

    const allNotes = await this.noteAdapter.getAll();
    let success = 0;
    let failed = 0;

    this.updateStatus({ mode: 'indexing', isRunning: true });

    for (const note of allNotes) {
      const hasEmbedding = await this.embeddingAdapter.hasEmbedding(note.id, model);
      if (hasEmbedding) continue;

      const content = this.extractTextContent(note);
      const result = await this.embedNote(note.id, content);

      if (result) {
        success++;
      } else {
        failed++;
      }

      this.updateStatus({
        processed: this.status.processed + 1,
        currentEntityId: note.id,
      });
    }

    this.updateStatus({ mode: 'idle', isRunning: false, currentEntityId: null });

    return { success, failed };
  }

  /**
   * Start continuous background indexing
   */
  startContinuousMode(): void {
    if (this.config.trigger !== 'continuous') return;
    if (this.continuousIntervalId) return; // Already running

    this.updateStatus({ isRunning: true });
    this.scheduleIdleIndexing();
  }

  /**
   * Stop all indexing activity
   */
  stop(): void {
    // Clear all debounce timers
    this.saveDebounceTimers.forEach((timer) => clearTimeout(timer));
    this.saveDebounceTimers.clear();

    // Clear continuous mode timers
    if (this.continuousIntervalId) {
      clearInterval(this.continuousIntervalId);
      this.continuousIntervalId = null;
    }
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }

    this.updateStatus({ isRunning: false, mode: 'idle', currentEntityId: null });
  }

  /**
   * Pause continuous indexing (e.g., when user is actively typing)
   */
  pause(): void {
    if (this.status.mode === 'indexing') {
      this.updateStatus({ mode: 'paused' });
    }
  }

  /**
   * Resume continuous indexing
   */
  resume(): void {
    if (this.status.mode === 'paused') {
      this.updateStatus({ mode: 'idle' });
      this.scheduleIdleIndexing();
    }
  }

  getStatus(): IndexerStatus {
    return { ...this.status };
  }

  // --- Private Methods ---

  private debouncedIndex(noteId: string, content: string): void {
    // Clear existing timer for this note
    const existingTimer = this.saveDebounceTimers.get(noteId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      this.saveDebounceTimers.delete(noteId);
      await this.embedNote(noteId, content);
    }, this.config.debounceMs);

    this.saveDebounceTimers.set(noteId, timer);
  }

  private async embedNote(noteId: string, content: string): Promise<boolean> {
    if (!content.trim()) {
      return false; // Don't embed empty notes
    }

    this.updateStatus({ currentEntityId: noteId, mode: 'indexing' });

    try {
      const result = await this.aiService.embedAndStore(noteId, content);

      if (result) {
        this.updateStatus({
          processed: this.status.processed + 1,
          lastIndexedAt: new Date().toISOString(),
          mode: 'idle',
          currentEntityId: null,
        });
        this.failedEntities.delete(noteId);
        return true;
      } else {
        this.handleFailure(noteId);
        return false;
      }
    } catch (error) {
      console.error(`Failed to embed note ${noteId}:`, error);
      this.handleFailure(noteId);
      return false;
    }
  }

  private handleFailure(noteId: string): void {
    this.failedEntities.set(noteId, Date.now());
    this.updateStatus({
      failed: this.status.failed + 1,
      mode: 'idle',
      currentEntityId: null,
    });
  }

  private addToQueue(noteId: string): void {
    if (!this.status.queue.includes(noteId)) {
      this.status.queue.push(noteId);
      this.updateStatus({ queue: [...this.status.queue] });
    }
  }

  private scheduleIdleIndexing(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
    }

    this.idleTimeoutId = setTimeout(() => {
      this.processQueueBatch();
    }, this.config.idleDelayMs);
  }

  private async processQueueBatch(): Promise<void> {
    if (this.status.mode === 'paused') return;
    if (this.status.queue.length === 0) {
      // Queue empty, check for unembedded notes
      await this.queueUnembeddedNotes();
    }

    if (this.status.queue.length === 0) {
      // Still empty, nothing to do
      this.scheduleIdleIndexing();
      return;
    }

    this.updateStatus({ mode: 'indexing' });

    const batch = this.status.queue.splice(0, this.config.batchSize);
    this.updateStatus({ queue: [...this.status.queue] });

    for (const noteId of batch) {
      // Check if this is a recently failed entity
      const failedAt = this.failedEntities.get(noteId);
      if (failedAt && Date.now() - failedAt < this.config.retryFailedAfterMs) {
        continue; // Skip, not ready for retry
      }

      const note = await this.noteAdapter.getById(noteId);
      if (note) {
        const content = this.extractTextContent(note);
        await this.embedNote(note.id, content);
      }
    }

    this.updateStatus({ mode: 'idle' });

    // Schedule next batch
    if (this.config.trigger === 'continuous') {
      this.scheduleIdleIndexing();
    }
  }

  private async queueUnembeddedNotes(): Promise<void> {
    const model = this.aiService.getActiveEmbeddingModel();
    if (!model) return;

    const allNotes = await this.noteAdapter.getAll();

    for (const note of allNotes) {
      const hasEmbedding = await this.embeddingAdapter.hasEmbedding(note.id, model);
      if (!hasEmbedding && !this.status.queue.includes(note.id)) {
        this.status.queue.push(note.id);
      }
    }

    this.updateStatus({ queue: [...this.status.queue] });
  }

  private extractTextContent(note: Note): string {
    // Extract plain text from Tiptap JSON content
    // The content is an array of blocks
    if (!note.content || !Array.isArray(note.content)) {
      return note.title || '';
    }

    const textParts: string[] = [note.title];

    const extractFromNode = (node: Block): void => {
      if (node.type === 'text' && node.text) {
        textParts.push(node.text);
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extractFromNode);
      }
    };

    note.content.forEach(extractFromNode);

    return textParts.filter(Boolean).join(' ');
  }

  private updateStatus(updates: Partial<IndexerStatus>): void {
    this.status = { ...this.status, ...updates };
    this.onStatusChange?.(this.status);
  }
}
