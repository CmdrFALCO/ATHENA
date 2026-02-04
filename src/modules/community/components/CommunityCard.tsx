/**
 * Community Card — WP 9B.7
 * Displays a single community with color swatch, summary, keywords, and stale badge.
 */

import type { Community } from '../types';

interface CommunityCardProps {
  community: Community;
  onHighlight: (id: string) => void;
  isHighlighted: boolean;
}

export function CommunityCard({
  community,
  onHighlight,
  isHighlighted,
}: CommunityCardProps) {
  return (
    <button
      onClick={() => onHighlight(community.id)}
      className={`
        w-full text-left p-2 rounded-md transition-all duration-150
        ${isHighlighted
          ? 'ring-1 ring-amber-400 bg-athena-bg/80'
          : 'hover:bg-athena-bg/50'
        }
      `}
    >
      <div className="flex items-start gap-2">
        {/* Color swatch */}
        <div
          className="w-3 h-3 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: community.color }}
        />

        <div className="flex-1 min-w-0">
          {/* Keywords */}
          <div className="flex items-center gap-1 flex-wrap mb-1">
            {community.keywords.slice(0, 4).map((kw) => (
              <span
                key={kw}
                className="text-[10px] px-1.5 py-0.5 rounded bg-athena-bg text-athena-muted"
              >
                {kw}
              </span>
            ))}
            <span className="text-[10px] text-athena-muted">
              ({community.memberCount})
            </span>
            {community.stale && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-amber-900/30 text-amber-400">
                stale
              </span>
            )}
          </div>

          {/* Summary */}
          {community.summary && (
            <p className="text-xs text-athena-muted line-clamp-2">
              {community.summary}
            </p>
          )}

          {!community.summary && (
            <p className="text-xs text-athena-muted italic">No summary</p>
          )}
        </div>
      </div>
    </button>
  );
}
