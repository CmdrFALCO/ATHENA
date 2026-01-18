import { useCallback } from 'react';
import type { Connection as FlowConnection, Edge } from '@xyflow/react';
import { useConnectionAdapter } from '@/adapters';
import { connectionActions } from '@/store';
import type { ConnectionEdgeData } from '../components/ConnectionEdge';
import type { NodeType } from '@/shared/types/connections';

/**
 * Parse a React Flow node ID to determine if it's a resource node.
 * Resource nodes have IDs like "resource-{uuid}", entity nodes use plain UUIDs.
 */
function parseNodeId(flowNodeId: string): { nodeType: NodeType; nodeId: string } {
  if (flowNodeId.startsWith('resource-')) {
    return {
      nodeType: 'resource',
      nodeId: flowNodeId.replace('resource-', ''),
    };
  }
  return {
    nodeType: 'entity',
    nodeId: flowNodeId,
  };
}

export function useConnectionHandlers() {
  const connectionAdapter = useConnectionAdapter();

  const onConnect = useCallback(
    async (params: FlowConnection) => {
      // Prevent self-connections
      if (!params.source || !params.target || params.source === params.target) {
        return;
      }

      // Parse source and target to determine node types
      const source = parseNodeId(params.source);
      const target = parseNodeId(params.target);

      try {
        // Create explicit (blue) connection
        const newConnection = await connectionAdapter.create({
          source_id: source.nodeId,
          target_id: target.nodeId,
          source_type: source.nodeType,
          target_type: target.nodeType,
          type: 'explicit',
          color: 'blue',
          label: null,
          confidence: null,
          created_by: 'user',
        });

        // Add to store
        connectionActions.addConnection(newConnection);
      } catch (error) {
        console.error('Failed to create connection:', error);
      }
    },
    [connectionAdapter]
  );

  const deleteConnection = useCallback(
    async (connectionId: string) => {
      try {
        await connectionAdapter.delete(connectionId);
        connectionActions.removeConnection(connectionId);
      } catch (error) {
        console.error('Failed to delete connection:', error);
      }
    },
    [connectionAdapter]
  );

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge<ConnectionEdgeData>[]) => {
      edgesToDelete.forEach((edge) => {
        const edgeData = edge.data as ConnectionEdgeData | undefined;
        if (edgeData?.connectionId) {
          deleteConnection(edgeData.connectionId);
        }
      });
    },
    [deleteConnection]
  );

  return { onConnect, deleteConnection, onEdgesDelete };
}
