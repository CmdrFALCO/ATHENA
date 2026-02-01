import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import type { DocumentTree } from '../extraction/types';

interface DocumentOutlineProps {
  tree: DocumentTree;
  onSectionClick?: (nodeId: string) => void;
}

export function DocumentOutline({ tree, onSectionClick }: DocumentOutlineProps) {
  return (
    <div className="border border-athena-border rounded-lg p-3 bg-athena-surface">
      <h4 className="text-sm font-medium text-athena-muted mb-2 flex items-center gap-2">
        <FileText size={14} />
        Document Structure
      </h4>
      <TreeNode node={tree} depth={0} onSectionClick={onSectionClick} />
    </div>
  );
}

interface TreeNodeProps {
  node: DocumentTree;
  depth: number;
  onSectionClick?: (nodeId: string) => void;
}

function TreeNode({ node, depth, onSectionClick }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`
          flex items-start gap-1 py-1 px-1 rounded cursor-pointer
          hover:bg-athena-bg transition-colors
          ${depth === 0 ? 'font-medium text-athena-text' : 'text-sm text-athena-muted'}
        `}
        style={{ paddingLeft: `${depth * 12}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSectionClick?.(node.node_id);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown size={14} className="mt-0.5 shrink-0 text-athena-muted" />
          ) : (
            <ChevronRight size={14} className="mt-0.5 shrink-0 text-athena-muted" />
          )
        ) : (
          <span className="w-3.5" />
        )}

        <div className="flex-1 min-w-0">
          <div className="truncate">{node.title}</div>
          {expanded && node.summary && depth > 0 && (
            <div className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
              {node.summary}
            </div>
          )}
        </div>

        <span className="text-xs text-neutral-500 shrink-0">
          p.{node.start_page}-{node.end_page}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.node_id}
              node={child}
              depth={depth + 1}
              onSectionClick={onSectionClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
