import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ATHENA_COLORS, getResourceColors } from '@/shared/theme';
import { EntityNode, type EntityNodeData } from './EntityNode';
import { ResourceNode, type ResourceNodeData } from './ResourceNode';
import { ConnectionEdge, type ConnectionEdgeData } from './ConnectionEdge';
import { ConnectionInspector } from './ConnectionInspector';
import { useNotesAsNodes } from '../hooks/useNotesAsNodes';
import { useResourcesAsNodes } from '../hooks/useResourcesAsNodes';
import { useConnectionsAsEdges } from '../hooks/useConnectionsAsEdges';
import { useNodePositionSync } from '../hooks/useNodePositionSync';
import { useConnectionHandlers } from '../hooks/useConnectionHandlers';
import { useSelectedConnection } from '../hooks/useSelectedConnection';
import { useSuggestedEdges } from '../hooks/useSuggestedEdges';
import { useOptionalSuggestions } from '@/modules/ai/hooks/useSuggestions';
import { useLastIndexedNoteId, useCanvasConfig, uiActions, selectResource, updateResource } from '@/store';

// Register custom node types - must be outside component or memoized
const nodeTypes: NodeTypes = {
  entity: EntityNode,
  resource: ResourceNode,
};

const edgeTypes: EdgeTypes = {
  connection: ConnectionEdge,
};

/**
 * Helper component that handles centering on externally selected nodes.
 * Must be rendered inside ReactFlow to use useReactFlow hook.
 */
function ExternalSelectionHandler({
  selectedNodeId,
  internalClickRef,
}: {
  selectedNodeId: string | null;
  internalClickRef: React.MutableRefObject<boolean>;
}) {
  const reactFlowInstance = useReactFlow();

  // WP 5.6: Center on selected node when selection comes from external source (validation panel, search)
  useEffect(() => {
    if (!selectedNodeId) {
      internalClickRef.current = false;
      return;
    }

    // If selection was from internal node click, skip centering (user is already looking there)
    if (internalClickRef.current) {
      internalClickRef.current = false;
      return;
    }

    // Selection came from external source - center on the node
    const node = reactFlowInstance.getNode(selectedNodeId);
    if (node) {
      // Small delay to ensure React Flow state is synced
      setTimeout(() => {
        reactFlowInstance.fitView({
          nodes: [{ id: selectedNodeId }],
          padding: 0.5,
          duration: 300,
        });
      }, 50);
    }
  }, [selectedNodeId, reactFlowInstance, internalClickRef]);

  return null;
}

function GraphCanvasInner() {
  const { nodes: entityNodes, onNodeSelect: onEntitySelect, selectedNodeId: selectedEntityNodeId } = useNotesAsNodes();
  const { nodes: resourceNodes, onNodeSelect: onResourceSelect, selectedNodeId: selectedResourceNodeId } = useResourcesAsNodes();
  const { edges: storeEdges } = useConnectionsAsEdges();
  const { edges: suggestedEdges } = useSuggestedEdges();

  // Combine entity and resource nodes
  const storeNodes = useMemo(() => [...entityNodes, ...resourceNodes], [entityNodes, resourceNodes]);

  // Get selected node ID (entity or resource)
  const selectedNodeId = selectedEntityNodeId || selectedResourceNodeId;
  const { saveNodePosition } = useNodePositionSync();
  const { onConnect, onEdgesDelete } = useConnectionHandlers();
  const {
    selectedConnection,
    selectConnection,
    clearConnectionSelection,
  } = useSelectedConnection();
  const { generateForNote, clearSuggestions } = useOptionalSuggestions();
  const lastIndexedNoteId = useLastIndexedNoteId();
  const showAiSuggestions = useCanvasConfig('showAiSuggestions');

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

  // Track if selection was triggered by internal node click (vs external source like validation panel)
  const internalClickRef = useRef<boolean>(false);

  // Generate suggestions when a note is selected (WP 3.5)
  // WP 5.1.1: Respect showAiSuggestions setting
  const prevSelectedNodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevSelectedNodeRef.current) {
      prevSelectedNodeRef.current = selectedNodeId;
      // Generate suggestions for the newly selected note
      generateForNote(selectedNodeId);
    } else if (!selectedNodeId && prevSelectedNodeRef.current) {
      prevSelectedNodeRef.current = null;
      // Only clear suggestions when deselecting if setting is 'on-select'
      // When 'always', suggestions persist and accumulate as you select notes
      if (showAiSuggestions === 'on-select') {
        clearSuggestions();
      }
    }
  }, [selectedNodeId, generateForNote, clearSuggestions, showAiSuggestions]);

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
    (event, node) => {
      internalClickRef.current = true; // Mark as internal click (no need to center)
      clearConnectionSelection(); // Clear edge selection when clicking node

      const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey;

      // Check if this is a resource node (ID starts with 'resource-')
      if (node.id.startsWith('resource-')) {
        const resourceId = node.id.replace('resource-', '');

        if (isMultiSelect) {
          // WP 8.7.1: Shift+click toggles resource in multi-selection
          uiActions.toggleResourceSelection(resourceId);
        } else {
          // Normal click: single-select for detail panel
          onResourceSelect(resourceId);
          uiActions.clearSelection(); // Deselect any entity
        }
      } else {
        const data = node.data as EntityNodeData;

        if (isMultiSelect) {
          // WP 8.7.1: Shift+click toggles entity in multi-selection
          uiActions.toggleEntitySelection(data.entityId);
        } else {
          // Normal click: single-select for detail panel
          onEntitySelect(data.entityId);
          selectResource(null); // Deselect any resource
        }
      }
    },
    [onEntitySelect, onResourceSelect, clearConnectionSelection]
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
    uiActions.clearSelection(); // Deselect entity nodes when clicking canvas background
    selectResource(null); // Deselect resource nodes
  }, [clearConnectionSelection]);

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      // Check if this is a resource node
      if (node.id.startsWith('resource-')) {
        const resourceId = node.id.replace('resource-', '');
        updateResource(resourceId, {
          positionX: Math.round(node.position.x),
          positionY: Math.round(node.position.y),
        });
      } else {
        const data = node.data as EntityNodeData;
        saveNodePosition(data.entityId, node.position.x, node.position.y);
      }
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
            // Handle resource nodes
            if (node.id.startsWith('resource-')) {
              const resourceData = node.data as ResourceNodeData;
              const colors = getResourceColors(resourceData.resource.type, 'per-type');
              return colors.accent;
            }
            // Handle entity nodes
            const data = node.data as EntityNodeData;
            return ATHENA_COLORS.node[data.type] || ATHENA_COLORS.node.note;
          }}
        />
        {/* Handler for external selection (validation panel, search) */}
        <ExternalSelectionHandler
          selectedNodeId={selectedNodeId}
          internalClickRef={internalClickRef}
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

/**
 * GraphCanvas - Main canvas component wrapped in ReactFlowProvider
 */
export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
