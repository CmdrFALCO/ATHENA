import { useMemo } from 'react';
import type { Edge } from '@xyflow/react';
import { useConnections } from '@/store';
import type { ConnectionEdgeData } from '../components/ConnectionEdge';

export function useConnectionsAsEdges() {
  const connections = useConnections();

  const edges = useMemo<Edge<ConnectionEdgeData>[]>(() => {
    return connections.map((conn) => ({
      id: conn.id,
      source: conn.source_id,
      target: conn.target_id,
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
