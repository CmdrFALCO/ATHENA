import { useEffect } from 'react';
import { Loader2, Sparkles, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { useSimilarNotes, type SimilarNote } from '@/modules/ai/hooks/useSimilarNotes';
import { devSettings$ } from '@/config';
import { DEFAULT_AI_SETTINGS, type AISettings } from '@/modules/ai/types';
import { formatRelativeTime } from '@/shared/utils';
import { uiActions } from '@/store';

interface SimilarNotesPanelProps {
  noteId: string;
  onClose?: () => void;
}

export function SimilarNotesPanel({ noteId, onClose }: SimilarNotesPanelProps) {
  // Get primitive values from devSettings
  const enableAI = useSelector(() => devSettings$.flags.enableAI.get());
  const aiBackend = useSelector(() => devSettings$.flags.aiBackend.get());

  const aiSettings: AISettings = {
    ...DEFAULT_AI_SETTINGS,
    enabled: enableAI,
    provider: aiBackend,
  };

  const { similarNotes, isLoading, error, hasEmbedding, findSimilar, refresh } = useSimilarNotes();

  // Fetch similar notes when noteId changes
  useEffect(() => {
    if (noteId && aiSettings.enabled) {
      findSimilar(noteId);
    }
  }, [noteId, aiSettings.enabled, findSimilar]);

  const handleNoteClick = (id: string) => {
    uiActions.selectEntity(id);
  };

  if (!aiSettings.enabled) {
    return (
      <div className="p-4 text-sm text-athena-muted">
        <p>Enable AI in settings to see similar notes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">Similar Notes</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-athena-surface text-athena-muted hover:text-athena-text disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-athena-surface text-athena-muted hover:text-athena-text"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-athena-muted" />
            <span className="ml-2 text-sm text-athena-muted">Finding similar notes...</span>
          </div>
        ) : error ? (
          <div className="p-4">
            <div className="flex items-start gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : similarNotes.length === 0 ? (
          <div className="p-4 text-sm text-athena-muted">
            {hasEmbedding ? (
              <p>No similar notes found above the similarity threshold.</p>
            ) : (
              <p>This note hasn't been indexed yet. Edit and save it to generate an embedding.</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-athena-border">
            {similarNotes.map((item) => (
              <SimilarNoteItem
                key={item.note.id}
                item={item}
                onClick={() => handleNoteClick(item.note.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer with threshold info */}
      {!isLoading && !error && similarNotes.length > 0 && (
        <div className="px-4 py-2 border-t border-athena-border">
          <p className="text-xs text-athena-muted">
            Showing notes with {'\u2265'}
            {Math.round(aiSettings.suggestions.confidenceThreshold * 100)}% similarity
          </p>
        </div>
      )}
    </div>
  );
}

interface SimilarNoteItemProps {
  item: SimilarNote;
  onClick: () => void;
}

function SimilarNoteItem({ item, onClick }: SimilarNoteItemProps) {
  const { note, similarityPercent } = item;

  // Color based on similarity score
  const getScoreColor = (percent: number) => {
    if (percent >= 90) return 'text-green-400';
    if (percent >= 80) return 'text-green-500';
    if (percent >= 70) return 'text-yellow-400';
    return 'text-athena-muted';
  };

  return (
    <li>
      <button
        onClick={onClick}
        className="w-full px-4 py-3 text-left hover:bg-athena-surface transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-athena-text truncate">
              {note.title || 'Untitled'}
            </p>
            <p className="text-xs text-athena-muted mt-1">
              {formatRelativeTime(note.updated_at)}
            </p>
          </div>
          <div className={`text-sm font-medium ${getScoreColor(similarityPercent)}`}>
            {similarityPercent}%
          </div>
        </div>
      </button>
    </li>
  );
}
