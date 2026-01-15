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
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ATHENA_COLORS } from '@/shared/theme';
import { EntityNode, type EntityNodeData } from './EntityNode';
import { useNotesAsNodes } from '../hooks/useNotesAsNodes';
import { useNodePositionSync } from '../hooks/useNodePositionSync';

// Register custom node types - must be outside component or memoized
const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

export function GraphCanvas() {
  const { nodes: storeNodes, onNodeSelect } = useNotesAsNodes();
  const { saveNodePosition } = useNodePositionSync();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

  // Track previous node IDs to detect actual changes (add/remove)
  const prevNodeIdsRef = useRef<string>(storeNodes.map((n) => n.id).sort().join(','));

  // Only sync when notes are actually added or removed
  useEffect(() => {
    const currentIds = storeNodes.map((n) => n.id).sort().join(',');
    if (currentIds !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = currentIds;
      // Preserve positions of existing nodes when syncing
      setNodes((currentNodes) => {
        const currentPositions = new Map(
          currentNodes.map((n) => [n.id, n.position])
        );
        return storeNodes.map((storeNode) => ({
          ...storeNode,
          position: currentPositions.get(storeNode.id) ?? storeNode.position,
        }));
      });
    }
  }, [storeNodes, setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as EntityNodeData;
      onNodeSelect(data.entityId);
    },
    [onNodeSelect]
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const data = node.data as EntityNodeData;
      saveNodePosition(data.entityId, node.position.x, node.position.y);
    },
    [saveNodePosition]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ backgroundColor: ATHENA_COLORS.surface.canvas }}
        nodesDraggable={true}
        snapToGrid={true}
        snapGrid={[20, 20]}
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
