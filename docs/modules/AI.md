# AI Module

**Location:** `src/modules/ai/`
**Status:** Implemented in WP 3.1-3.6

## Purpose

Flexible AI backend abstraction for embeddings, text generation, embedding storage, background indexing, and similarity discovery.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Module barrel export |
| `types.ts` | AI types (IAIBackend, AISettings, etc.) |
| `AIService.ts` | Service orchestrator + embedding integration |
| `AIContext.tsx` | React context (AIProvider, useAI) |
| `IndexerService.ts` | Background indexer service (WP 3.3) |
| `SuggestionService.ts` | Generates connection suggestions (WP 3.5) |
| `backends/index.ts` | Backend exports |
| `backends/GeminiBackend.ts` | Google Gemini implementation |
| `hooks/index.ts` | Hook exports |
| `hooks/useEmbeddings.ts` | Embedding operations hook |
| `hooks/useIndexer.ts` | Indexer control hook (WP 3.3) |
| `hooks/useIdleDetection.ts` | User activity detection (WP 3.3) |
| `hooks/useSimilarNotes.ts` | Similar notes discovery hook (WP 3.4) |
| `hooks/useSuggestions.ts` | Suggestion management hook (WP 3.5) |
| `hooks/useSuggestionActions.ts` | Accept/dismiss actions hook (WP 3.6) |

---

## Public API

```typescript
// src/modules/ai/index.ts
export * from './types';
export { getAIService, resetAIService, type IAIService } from './AIService';
export { AIProvider, useAI, useAIStatus, useOptionalAI } from './AIContext';
export { GeminiBackend } from './backends';
export { useEmbeddings, useOptionalEmbeddings, type UseEmbeddingsResult } from './hooks';
export { useIndexer, useOptionalIndexer, type UseIndexerResult } from './hooks';
export { useIdleDetection, type IdleDetectionOptions } from './hooks';
export { useSimilarNotes, useOptionalSimilarNotes, type SimilarNote, type UseSimilarNotesResult } from './hooks';
export { useSuggestions, useOptionalSuggestions, type UseSuggestionsResult } from './hooks';
export { useSuggestionActions, type UseSuggestionActionsResult } from './hooks';
export { IndexerService, type IndexerStatus, type IndexerConfig } from './IndexerService';
export { SuggestionService, type ISuggestionService, type SuggestionConfig } from './SuggestionService';
```

---

## Core Types

### AIProviderType

```typescript
type AIProviderType = 'gemini' | 'ollama' | 'anthropic' | 'openai' | 'mistral';
```

### IAIBackend

```typescript
interface IAIBackend {
  readonly id: string;
  readonly name: string;
  readonly type: AIProviderType;

  embed(text: string): Promise<EmbeddingResult>;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  isAvailable(): Promise<boolean>;
  configure(config: ProviderConfig): void;
  getEmbeddingDimensions(): number;
  getSupportedModels(): ModelInfo[];
}
```

### EmbeddingResult

```typescript
interface EmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
  tokenCount?: number;
}
```

### GenerateResult

```typescript
interface GenerateResult {
  text: string;
  model: string;
  tokenCount?: { prompt: number; completion: number; total: number };
  finishReason?: 'stop' | 'length' | 'error';
}
```

---

## React Context

### AIContextValue

```typescript
interface AIContextValue {
  service: IAIService;
  isConfigured: boolean;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  provider: AIProviderType | null;

  testConnection: () => Promise<boolean>;
  setApiKey: (provider: AIProviderType, key: string) => Promise<void>;
  clearApiKey: (provider: AIProviderType) => Promise<void>;
  hasApiKey: (provider: AIProviderType) => Promise<boolean>;
}
```

### Usage

```typescript
import { useAI, useAIStatus } from '@/modules/ai';

// Full context
function MyComponent() {
  const { service, isConfigured, isAvailable, testConnection, setApiKey } = useAI();

  // Generate text
  const result = await service.generate('Hello, world!');

  // Get embeddings
  const embedding = await service.embed('Some text to embed');
}

// Status only (lighter)
function StatusIndicator() {
  const { isConfigured, isAvailable, provider } = useAIStatus();
  return <span>{isAvailable ? 'Connected' : 'Not connected'}</span>;
}
```

---

## Embedding Storage (WP 3.2)

### AIService Integration

```typescript
interface IAIService {
  // Embedding storage integration
  setEmbeddingAdapter(adapter: IEmbeddingAdapter): void;
  embedAndStore(entityId: string, text: string): Promise<EmbeddingRecord | null>;
  findSimilarNotes(entityId: string, limit?: number, threshold?: number): Promise<SimilarityResult[]>;
  getActiveEmbeddingModel(): string | null;
  handleModelChange(oldModel: string, newModel: string): Promise<void>;
}
```

### useEmbeddings Hook

```typescript
interface UseEmbeddingsResult {
  embedNote: (noteId: string, content: string) => Promise<EmbeddingRecord | null>;
  findSimilar: (noteId: string, limit?: number, threshold?: number) => Promise<SimilarityResult[]>;
  getEmbeddingStatus: (noteId: string) => Promise<{ hasEmbedding: boolean; model: string | null }>;
  deleteEmbedding: (noteId: string, model?: string) => Promise<void>;
  getEmbeddingCount: (model?: string) => Promise<number>;
  hasEmbedding: (noteId: string, model: string) => Promise<boolean>;
}
```

### Usage

```typescript
import { useEmbeddings } from '@/modules/ai';

function MyComponent() {
  const { embedNote, findSimilar, getEmbeddingStatus } = useEmbeddings();

  // Embed a note
  const embedding = await embedNote('note-123', 'Note content here...');

  // Find similar notes
  const similar = await findSimilar('note-123', 5, 0.7);

  // Check embedding status
  const status = await getEmbeddingStatus('note-123');
  // { hasEmbedding: true, model: 'text-embedding-004' }
}
```

---

## Background Indexer (WP 3.3)

### IndexerConfig

```typescript
interface IndexerConfig {
  trigger: 'on-save' | 'on-demand' | 'continuous';
  batchSize: number;        // For continuous mode
  idleDelayMs: number;      // Wait before starting continuous indexing
  debounceMs: number;       // For on-save mode
  retryFailedAfterMs: number;
}
```

### IndexerStatus

```typescript
interface IndexerStatus {
  isRunning: boolean;
  mode: 'idle' | 'indexing' | 'paused';
  queue: string[];
  processed: number;
  failed: number;
  lastIndexedAt: string | null;
  currentEntityId: string | null;
}
```

### Trigger Modes

| Mode | Behavior |
|------|----------|
| `on-save` | Embed when a note is saved (2s debounce) |
| `on-demand` | Only embed when user explicitly requests |
| `continuous` | Background process indexes during idle time |

### useIndexer Hook

```typescript
interface UseIndexerResult {
  status: IndexerStatus;
  onNoteSaved: (noteId: string, content: string) => void;
  indexNote: (noteId: string) => Promise<boolean>;
  indexAll: () => Promise<{ success: number; failed: number }>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isEnabled: boolean;
}
```

### Usage

```typescript
import { useIndexer, useIdleDetection } from '@/modules/ai';

// In EditorContainer - trigger on save
const { onNoteSaved } = useIndexer();
onNoteSaved(noteId, textContent);

// In AppLayout - pause/resume on activity
const { pause, resume } = useIndexer();
useIdleDetection({
  idleThresholdMs: 3000,
  onIdle: resume,
  onActive: pause,
});

// Manual index all
const { indexAll } = useIndexer();
const result = await indexAll();
// { success: 10, failed: 0 }
```

---

## Similarity Query (WP 3.4)

### SimilarNote Type

```typescript
interface SimilarNote {
  note: Note;
  similarity: number;       // 0-1
  similarityPercent: number; // 0-100 for display
}
```

### useSimilarNotes Hook

```typescript
interface UseSimilarNotesResult {
  similarNotes: SimilarNote[];
  isLoading: boolean;
  error: string | null;
  hasEmbedding: boolean;
  findSimilar: (noteId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}
```

### Usage

```typescript
import { useSimilarNotes } from '@/modules/ai';

function MyComponent({ noteId }: { noteId: string }) {
  const { similarNotes, isLoading, findSimilar } = useSimilarNotes({
    limit: 5,
    threshold: 0.7,
  });

  // Find similar notes
  await findSimilar(noteId);

  // Display results
  return similarNotes.map(({ note, similarityPercent }) => (
    <div key={note.id}>
      {note.title} - {similarityPercent}%
    </div>
  ));
}
```

---

## Green Suggestions (WP 3.5)

### SuggestionService

Service that generates connection suggestions based on embedding similarity.

```typescript
interface ISuggestionService {
  generateForNote(noteId: string, config?: Partial<SuggestionConfig>): Promise<SuggestedConnection[]>;
  generateForCanvas(visibleNoteIds: string[], config?: Partial<SuggestionConfig>): Promise<SuggestedConnection[]>;
}

interface SuggestionConfig {
  minSimilarity: number;  // Default: 0.7
  maxSuggestions: number; // Default: 5
  excludeExisting: boolean; // Default: true
}
```

### useSuggestions Hook

```typescript
interface UseSuggestionsResult {
  suggestions: SuggestedConnection[];
  isGenerating: boolean;
  error: string | null;
  generateForNote: (noteId: string) => Promise<void>;
  generateForCanvas: (visibleNoteIds: string[]) => Promise<void>;
  dismissSuggestion: (id: string) => void;
  clearSuggestions: () => void;
}
```

### Usage

```typescript
import { useSuggestions } from '@/modules/ai';

function MyComponent({ selectedNoteId }: { selectedNoteId: string }) {
  const { suggestions, isGenerating, generateForNote, dismissSuggestion } = useSuggestions();

  // Generate suggestions when note is selected
  useEffect(() => {
    if (selectedNoteId) {
      generateForNote(selectedNoteId);
    }
  }, [selectedNoteId, generateForNote]);

  // Suggestions appear as green dashed edges on canvas
  return suggestions.map(s => (
    <div key={s.id}>
      {s.sourceId} → {s.targetId} ({Math.round(s.similarity * 100)}%)
      <button onClick={() => dismissSuggestion(s.id)}>Dismiss</button>
    </div>
  ));
}
```

### Global Indexer Events

The indexer broadcasts note indexed events globally via Legend-State to fix multi-instance issues:

```typescript
// In IndexerService - when a note is indexed
import { indexerActions } from '@/store';
indexerActions.noteIndexed(noteId);

// In GraphCanvas - subscribe to indexed events
import { useLastIndexedNoteId } from '@/store';

const lastIndexedNoteId = useLastIndexedNoteId();

useEffect(() => {
  if (lastIndexedNoteId === selectedNodeId) {
    generateForNote(lastIndexedNoteId);
  }
}, [lastIndexedNoteId]);
```

---

## Accept/Dismiss Suggestions (WP 3.6)

### useSuggestionActions Hook

Hook for accepting or dismissing AI suggestions with human-in-the-loop decision.

```typescript
interface UseSuggestionActionsResult {
  isAccepting: boolean;
  error: string | null;
  acceptSuggestion: (
    suggestionId: string,
    sourceId: string,
    targetId: string,
    similarity: number
  ) => Promise<Connection | null>;
  dismissSuggestion: (suggestionId: string) => void;
}
```

### Accept Flow

When user clicks Accept:
1. Check if connection already exists between entities
2. Create persisted blue connection via `connectionAdapter.create()`
3. Add to Legend-State store via `connectionActions.addConnection()`
4. Remove suggestion via `suggestionActions.removeSuggestion()`

```typescript
// Connection created with these fields
{
  source_id: sourceId,
  target_id: targetId,
  type: 'semantic',       // Indicates AI origin
  color: 'blue',          // Now explicit/accepted
  label: null,            // User can add label later
  confidence: similarity, // Preserve score
  created_by: 'ai',       // Audit trail
}
```

### Dismiss Flow

When user clicks Dismiss:
- Simply removes suggestion from state
- Suggestion is NOT persisted (ephemeral)

### Usage

```typescript
import { useSuggestionActions } from '@/modules/ai';

function SuggestionPopover({ suggestionId, sourceId, targetId, similarity }) {
  const { acceptSuggestion, dismissSuggestion, isAccepting } = useSuggestionActions();

  const handleAccept = async () => {
    await acceptSuggestion(suggestionId, sourceId, targetId, similarity);
  };

  const handleDismiss = () => {
    dismissSuggestion(suggestionId);
  };

  return (
    <div>
      <button onClick={handleAccept} disabled={isAccepting}>
        {isAccepting ? 'Accepting...' : 'Accept'}
      </button>
      <button onClick={handleDismiss}>Dismiss</button>
    </div>
  );
}
```

---

## Implemented Backends

| Backend | Status | Description |
|---------|--------|-------------|
| GeminiBackend | ✅ Complete | Google Gemini API (embeddings + generation) |
| OllamaBackend | ⏳ Planned | Local Ollama |
| AnthropicBackend | ⏳ Planned | Claude API |
| OpenAIBackend | ⏳ Planned | OpenAI API |
| MistralBackend | ⏳ Planned | Mistral API |

---

## DevSettings UI

Access via **Ctrl+Shift+D**

Features:
- Enable/disable AI toggle
- Provider selection dropdown
- API key input with Save/Clear buttons
- Test Connection button with status indicator
- Chat and embedding model selection
- Connection status indicator (✓ Connected / ✗ Not connected / ○ Not configured)
- Background Indexer status panel (WP 3.3)

---

## Related Patterns

- **AI Abstraction** - Backend interface + service orchestrator
- **Embedding Storage** - Vector storage + JS-based cosine similarity
- **Background Indexer** - Configurable trigger modes with debouncing
- **Secure Storage** - Web Crypto API + IndexedDB for API keys

---

## Related Documentation

- [Adapters Module](ADAPTERS.md) - IEmbeddingAdapter interface
- [Sophia Module](SOPHIA.md) - SimilarNotesPanel integration
- [App Module](APP.md) - DevSettingsPanel location
- [Secure Storage](../PATTERNS.md#secure-storage) - API key encryption
