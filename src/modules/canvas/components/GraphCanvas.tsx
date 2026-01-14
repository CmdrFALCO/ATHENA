import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ATHENA_COLORS } from '@/shared/theme';
import { EntityNode, type EntityNodeData } from './EntityNode';
import { useNotesAsNodes } from '../hooks/useNotesAsNodes';

// Register custom node types - must be outside component or memoized
const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

export function GraphCanvas() {
  const { nodes: storeNodes, onNodeSelect } = useNotesAsNodes();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

  // Track previous node IDs to detect actual changes (add/remove)
  const prevNodeIdsRef = useRef<string>(storeNodes.map((n) => n.id).sort().join(','));

  // Only sync when notes are actually added or removed
  useEffect(() => {
    const currentIds = storeNodes.map((n) => n.id).sort().join(',');
    if (currentIds !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = currentIds;
      setNodes(storeNodes);
    }
  }, [storeNodes, setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as EntityNodeData;
      onNodeSelect(data.entityId);
    },
    [onNodeSelect]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ backgroundColor: ATHENA_COLORS.surface.canvas }}
      >
        <Background color={ATHENA_COLORS.surface.nodeBorder} gap={20} />
        <Controls />
        <MiniMap
          style={{
            backgroundColor: ATHENA_COLORS.surface.panel,
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          nodeColor={(node: Node) => {
            const data = node.data as EntityNodeData;
            return ATHENA_COLORS.node[data.type] || ATHENA_COLORS.node.note;
          }}
        />
      </ReactFlow>
    </div>
  );
}
