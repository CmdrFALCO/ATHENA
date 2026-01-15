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
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ATHENA_COLORS } from '@/shared/theme';
import { EntityNode, type EntityNodeData } from './EntityNode';
import { ConnectionEdge, type ConnectionEdgeData } from './ConnectionEdge';
import { ConnectionInspector } from './ConnectionInspector';
import { useNotesAsNodes } from '../hooks/useNotesAsNodes';
import { useConnectionsAsEdges } from '../hooks/useConnectionsAsEdges';
import { useNodePositionSync } from '../hooks/useNodePositionSync';
import { useConnectionHandlers } from '../hooks/useConnectionHandlers';
import { useSelectedConnection } from '../hooks/useSelectedConnection';

// Register custom node types - must be outside component or memoized
const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

const edgeTypes: EdgeTypes = {
  connection: ConnectionEdge,
};

export function GraphCanvas() {
  const { nodes: storeNodes, onNodeSelect } = useNotesAsNodes();
  const { edges: storeEdges } = useConnectionsAsEdges();
  const { saveNodePosition } = useNodePositionSync();
  const { onConnect, onEdgesDelete } = useConnectionHandlers();
  const {
    selectedConnection,
    selectConnection,
    clearConnectionSelection,
  } = useSelectedConnection();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ConnectionEdgeData>>(storeEdges);

  // Track previous IDs to detect actual changes (add/remove)
  const prevNodeIdsRef = useRef<string>(storeNodes.map((n) => n.id).sort().join(','));
  const prevEdgeIdsRef = useRef<string>(storeEdges.map((e) => e.id).sort().join(','));

  // Only sync nodes when notes are actually added or removed
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

  // Only sync edges when connections are actually added or removed
  useEffect(() => {
    const currentIds = storeEdges.map((e) => e.id).sort().join(',');
    if (currentIds !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = currentIds;
      setEdges(storeEdges);
    }
  }, [storeEdges, setEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as EntityNodeData;
      onNodeSelect(data.entityId);
      clearConnectionSelection(); // Clear edge selection when clicking node
    },
    [onNodeSelect, clearConnectionSelection]
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const data = edge.data as ConnectionEdgeData | undefined;
      if (data?.connectionId) {
        selectConnection(data.connectionId);
      }
    },
    [selectConnection]
  );

  const handlePaneClick = useCallback(() => {
    clearConnectionSelection();
  }, [clearConnectionSelection]);

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const data = node.data as EntityNodeData;
      saveNodePosition(data.entityId, node.position.x, node.position.y);
    },
    [saveNodePosition]
  );

  const handleEdgesDelete = useCallback(
    (edgesToDelete: Edge<ConnectionEdgeData>[]) => {
      onEdgesDelete(edgesToDelete);
      clearConnectionSelection();
    },
    [onEdgesDelete, clearConnectionSelection]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStop={handleNodeDragStop}
        onEdgesDelete={handleEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ backgroundColor: ATHENA_COLORS.surface.canvas }}
        nodesDraggable={true}
        snapToGrid={true}
        snapGrid={[20, 20]}
        connectionLineStyle={{
          stroke: ATHENA_COLORS.connection.explicit,
          strokeWidth: 2,
        }}
        defaultEdgeOptions={{
          type: 'connection',
        }}
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

      {/* Connection Inspector Panel */}
      {selectedConnection && (
        <ConnectionInspector
          connection={selectedConnection}
          onClose={clearConnectionSelection}
        />
      )}
    </div>
  );
}
