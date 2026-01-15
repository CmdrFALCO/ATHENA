import { useCallback, useEffect, useRef, useMemo } from 'react';
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
import { useSuggestedEdges } from '../hooks/useSuggestedEdges';
import { useOptionalSuggestions } from '@/modules/ai/hooks/useSuggestions';
import { useLastIndexedNoteId } from '@/store';

// Register custom node types - must be outside component or memoized
const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

const edgeTypes: EdgeTypes = {
  connection: ConnectionEdge,
};

export function GraphCanvas() {
  const { nodes: storeNodes, onNodeSelect, selectedNodeId } = useNotesAsNodes();
  const { edges: storeEdges } = useConnectionsAsEdges();
  const { edges: suggestedEdges } = useSuggestedEdges();
  const { saveNodePosition } = useNodePositionSync();
  const { onConnect, onEdgesDelete } = useConnectionHandlers();
  const {
    selectedConnection,
    selectConnection,
    clearConnectionSelection,
  } = useSelectedConnection();
  const { generateForNote, clearSuggestions } = useOptionalSuggestions();
  const lastIndexedNoteId = useLastIndexedNoteId();

  // Combine explicit connections (blue) with suggestions (green)
  const allEdges = useMemo<Edge<ConnectionEdgeData>[]>(() => {
    return [...storeEdges, ...suggestedEdges];
  }, [storeEdges, suggestedEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ConnectionEdgeData>>(allEdges);

  // Track previous state to detect actual changes
  const prevNodeIdsRef = useRef<string>(storeNodes.map((n) => n.id).sort().join(','));
  const prevNodeDataRef = useRef<string>(JSON.stringify(storeNodes.map((n) => ({ id: n.id, data: n.data }))));
  const prevEdgeIdsRef = useRef<string>(allEdges.map((e) => e.id).sort().join(','));

  // Generate suggestions when a note is selected (WP 3.5)
  const prevSelectedNodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevSelectedNodeRef.current) {
      prevSelectedNodeRef.current = selectedNodeId;
      // Generate suggestions for the newly selected note
      generateForNote(selectedNodeId);
    } else if (!selectedNodeId && prevSelectedNodeRef.current) {
      // Clear suggestions when deselecting
      prevSelectedNodeRef.current = null;
      clearSuggestions();
    }
  }, [selectedNodeId, generateForNote, clearSuggestions]);

  // Regenerate suggestions when the selected note is re-indexed (WP 3.5)
  // Uses global Legend-State observable to detect when ANY indexer instance indexes a note
  const prevIndexedNoteRef = useRef<string | null>(null);
  useEffect(() => {
    // Skip if no note was indexed or same note was already processed
    if (!lastIndexedNoteId || lastIndexedNoteId === prevIndexedNoteRef.current) {
      return;
    }
    prevIndexedNoteRef.current = lastIndexedNoteId;

    // If the currently selected note was just re-indexed, regenerate suggestions
    if (lastIndexedNoteId === prevSelectedNodeRef.current) {
      console.log(`[GraphCanvas] Note ${lastIndexedNoteId} re-indexed, regenerating suggestions`);
      generateForNote(lastIndexedNoteId);
    }
  }, [lastIndexedNoteId, generateForNote]);

  // Sync nodes when notes are added or removed (preserve positions)
  useEffect(() => {
    const currentIds = storeNodes.map((n) => n.id).sort().join(',');
    if (currentIds !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = currentIds;
      prevNodeDataRef.current = JSON.stringify(storeNodes.map((n) => ({ id: n.id, data: n.data })));
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

  // Sync node data (title, type) when it changes without affecting positions
  useEffect(() => {
    const currentDataStr = JSON.stringify(storeNodes.map((n) => ({ id: n.id, data: n.data })));
    if (currentDataStr === prevNodeDataRef.current) {
      return; // No data change, skip update
    }
    prevNodeDataRef.current = currentDataStr;

    const storeDataMap = new Map(
      storeNodes.map((n) => [n.id, n.data])
    );
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const newData = storeDataMap.get(node.id);
        if (newData) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
  }, [storeNodes, setNodes]);

  // Only sync edges when connections are actually added or removed
  useEffect(() => {
    const currentIds = allEdges.map((e) => e.id).sort().join(',');
    if (currentIds !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = currentIds;
      setEdges(allEdges);
    }
  }, [allEdges, setEdges]);

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
      // Don't open inspector for suggested edges (they're not persisted yet)
      if (data?.connectionId && !data?.isSuggested) {
        selectConnection(data.connectionId);
      }
      // For suggested edges, we could add accept/dismiss UI here in WP 3.6
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
        zoomOnScroll={true}
        zoomOnPinch={true}
        preventScrolling={true}
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
