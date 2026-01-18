import { useMemo } from 'react';
import type { Edge } from '@xyflow/react';
import { useConnections } from '@/store';
import type { ConnectionEdgeData } from '../components/ConnectionEdge';
import type { NodeType } from '@/shared/types/connections';

/**
 * Helper to get React Flow node ID from connection endpoint.
 * Entity nodes use their ID directly, resource nodes use `resource-{id}` prefix.
 */
function getNodeId(nodeType: NodeType, nodeId: string): string {
  return nodeType === 'resource' ? `resource-${nodeId}` : nodeId;
}

export function useConnectionsAsEdges() {
  const connections = useConnections();

  const edges = useMemo<Edge<ConnectionEdgeData>[]>(() => {
    return connections.map((conn) => ({
      id: conn.id,
      source: getNodeId(conn.source_type, conn.source_id),
      target: getNodeId(conn.target_type, conn.target_id),
      type: 'connection',
      data: {
        connectionId: conn.id,
        label: conn.label,
        color: conn.color,
      },
    }));
  }, [connections]);

  return { edges };
}
