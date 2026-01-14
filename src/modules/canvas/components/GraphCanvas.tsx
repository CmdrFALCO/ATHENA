import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ATHENA_COLORS } from '@/shared/theme';

export function GraphCanvas() {
  const [nodes, , onNodesChange] = useNodesState<Node>([]);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        style={{ backgroundColor: ATHENA_COLORS.surface.canvas }}
      >
        <Background color={ATHENA_COLORS.surface.nodeBorder} gap={20} />
        <Controls />
        <MiniMap
          style={{
            backgroundColor: ATHENA_COLORS.surface.panel,
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
