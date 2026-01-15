import { ATHENA_COLORS } from '@/shared/theme';

export interface SuggestionPopoverProps {
  similarity: number;
  isAccepting: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export function SuggestionPopover({
  similarity,
  isAccepting,
  onAccept,
  onDismiss,
}: SuggestionPopoverProps) {
  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onAccept();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDismiss();
  };

  return (
    <div
      style={{
        marginTop: '8px',
        backgroundColor: ATHENA_COLORS.surface.panel,
        border: `1px solid ${ATHENA_COLORS.surface.nodeBorder}`,
        pointerEvents: 'all',
      }}
      className="rounded-lg shadow-lg p-2"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Similarity badge */}
      <div
        style={{
          color: ATHENA_COLORS.connection.semantic,
          backgroundColor: ATHENA_COLORS.connection.semantic + '20',
        }}
        className="text-xs font-medium px-2 py-0.5 rounded mb-2 text-center"
      >
        {Math.round(similarity * 100)}% similar
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isAccepting}
          style={{
            backgroundColor: isAccepting ? ATHENA_COLORS.ui.hover : ATHENA_COLORS.connection.semantic,
            pointerEvents: 'all',
          }}
          className="px-3 py-1.5 text-white text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
        >
          {isAccepting ? 'Accepting...' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={isAccepting}
          style={{
            backgroundColor: ATHENA_COLORS.ui.hover,
            pointerEvents: 'all',
          }}
          className="px-3 py-1.5 text-white text-sm font-medium rounded hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
