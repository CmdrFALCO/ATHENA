import { useCallback } from 'react';
import type { Connection as FlowConnection, Edge } from '@xyflow/react';
import { useConnectionAdapter } from '@/adapters';
import { connectionActions } from '@/store';
import type { ConnectionEdgeData } from '../components/ConnectionEdge';

export function useConnectionHandlers() {
  const connectionAdapter = useConnectionAdapter();

  const onConnect = useCallback(
    async (params: FlowConnection) => {
      // Prevent self-connections
      if (!params.source || !params.target || params.source === params.target) {
        return;
      }

      try {
        // Create explicit (blue) connection
        const newConnection = await connectionAdapter.create({
          source_id: params.source,
          target_id: params.target,
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
