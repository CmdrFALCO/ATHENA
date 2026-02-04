/**
 * Community Tree — WP 9B.7
 * Expandable hierarchy tree of communities.
 */

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Community, CommunityHierarchy } from '../types';
import { CommunityCard } from './CommunityCard';

interface CommunityTreeProps {
  hierarchy: CommunityHierarchy;
  highlightedCommunityId: string | null;
  onHighlight: (id: string) => void;
}

export function CommunityTree({
  hierarchy,
  highlightedCommunityId,
  onHighlight,
}: CommunityTreeProps) {
  if (hierarchy.roots.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-athena-muted text-sm">
        No communities detected yet.
        <br />
        Click "Detect" to analyze your knowledge graph.
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {hierarchy.roots.map((root) => (
        <CommunityTreeNode
          key={root.id}
          community={root}
          hierarchy={hierarchy}
          highlightedCommunityId={highlightedCommunityId}
          onHighlight={onHighlight}
          depth={0}
        />
      ))}
    </div>
  );
}

interface CommunityTreeNodeProps {
  community: Community;
  hierarchy: CommunityHierarchy;
  highlightedCommunityId: string | null;
  onHighlight: (id: string) => void;
  depth: number;
}

function CommunityTreeNode({
  community,
  hierarchy,
  highlightedCommunityId,
  onHighlight,
  depth,
}: CommunityTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = community.childCommunityIds.length > 0;

  // Get children from hierarchy
  const allCommunities = Array.from(hierarchy.levels.values()).flat();
  const children = allCommunities.filter(
    (c) => community.childCommunityIds.includes(c.id),
  );

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      <div className="flex items-start gap-1">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 mt-1.5 text-athena-muted hover:text-athena-text"
          >
            {expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        <div className="flex-1 min-w-0">
          <CommunityCard
            community={community}
            onHighlight={onHighlight}
            isHighlighted={highlightedCommunityId === community.id}
          />
        </div>
      </div>

      {expanded && children.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <CommunityTreeNode
              key={child.id}
              community={child}
              hierarchy={hierarchy}
              highlightedCommunityId={highlightedCommunityId}
              onHighlight={onHighlight}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
