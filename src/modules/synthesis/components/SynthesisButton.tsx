// src/modules/synthesis/components/SynthesisButton.tsx — WP 8.7 (WP 8.7.1: Resource Support)

import { Sparkles } from 'lucide-react';
import { openSynthesisPanel } from '../store/synthesisActions';

interface SynthesisButtonProps {
  selectedNoteCount: number;
  selectedResourceCount: number;
  disabled?: boolean;
}

export function SynthesisButton({
  selectedNoteCount,
  selectedResourceCount,
  disabled,
}: SynthesisButtonProps) {
  const totalCount = selectedNoteCount + selectedResourceCount;
  const isEnabled = totalCount >= 2 && !disabled;

  return (
    <button
      onClick={openSynthesisPanel}
      disabled={!isEnabled}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
        ${
          isEnabled
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-athena-surface text-athena-muted cursor-not-allowed'
        }
      `}
      title={totalCount < 2 ? 'Select 2+ items to synthesize' : 'Synthesize selected items'}
    >
      <Sparkles className="w-4 h-4" />
      Synthesize
      {totalCount >= 2 && (
        <span className="px-1.5 py-0.5 bg-purple-500/30 rounded text-xs">
          {selectedNoteCount > 0 && selectedNoteCount}
          {selectedNoteCount > 0 && selectedResourceCount > 0 && '+'}
          {selectedResourceCount > 0 && `${selectedResourceCount}R`}
        </span>
      )}
    </button>
  );
}
