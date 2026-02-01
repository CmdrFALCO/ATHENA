interface SimilarityBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

function getScoreColor(score: number): string {
  if (score >= 0.95) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 0.85) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

export function SimilarityBadge({ score, size = 'md' }: SimilarityBadgeProps) {
  const pct = Math.round(score * 100);
  const colorClass = getScoreColor(score);
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${colorClass} ${sizeClass}`}>
      {pct}%
    </span>
  );
}
