import { Sparkles } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { devSettings$ } from '@/config';

interface SimilarNotesButtonProps {
  onClick: () => void;
  isActive?: boolean;
}

export function SimilarNotesButton({ onClick, isActive }: SimilarNotesButtonProps) {
  const enableAI = useSelector(() => devSettings$.flags.enableAI.get());
  const aiBackend = useSelector(() => devSettings$.flags.aiBackend.get());

  // Don't show button if AI is disabled
  if (!enableAI || aiBackend === 'none') {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1 text-sm rounded
        transition-colors
        ${
          isActive
            ? 'bg-green-500/20 text-green-400'
            : 'text-athena-muted hover:text-athena-text hover:bg-athena-surface'
        }
      `}
      title="Find similar notes"
    >
      <Sparkles className="w-4 h-4" />
      <span>Similar</span>
    </button>
  );
}
